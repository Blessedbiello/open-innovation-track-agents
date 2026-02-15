/**
 * SolanaLens — Solana RPC Client
 * Handles all direct interactions with the Solana blockchain.
 */

import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  ParsedInstruction,
  PartiallyDecodedInstruction,
  AccountInfo,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

export interface SlotInfo {
  slot: number;
  parent: number;
  root: number;
}

export interface BlockProduction {
  slot: number;
  leader: string;
  numTransactions: number;
  numSuccessful: number;
  numFailed: number;
  blockTime: number | null;
}

export interface ProgramInvocation {
  signature: string;
  programId: string;
  slot: number;
  blockTime: number | null;
  fee: number;
  success: boolean;
  accounts: string[];
  innerInstructions: number;
}

export interface AccountActivity {
  address: string;
  lamports: number;
  owner: string;
  executable: boolean;
  dataSize: number;
}

export interface NetworkStats {
  currentSlot: number;
  blockHeight: number;
  epochInfo: {
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    transactionCount: number | null;
  };
  tps: number;
  validatorCount: number;
}

export class SolanaClient {
  private connection: Connection;
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");
    this.connection = new Connection(this.rpcUrl, {
      commitment: "confirmed",
    });
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [slot, blockHeight, epochInfo, voteAccounts] = await Promise.all([
      this.connection.getSlot(),
      this.connection.getBlockHeight(),
      this.connection.getEpochInfo(),
      this.connection.getVoteAccounts(),
    ]);

    // Estimate TPS from recent performance samples
    let tps = 0;
    try {
      const perfSamples = await this.connection.getRecentPerformanceSamples(5);
      if (perfSamples.length > 0) {
        const totalTx = perfSamples.reduce((sum, s) => sum + s.numTransactions, 0);
        const totalSlots = perfSamples.reduce((sum, s) => sum + s.numSlots, 0);
        // ~400ms per slot
        const totalSeconds = totalSlots * 0.4;
        tps = Math.round(totalTx / totalSeconds);
      }
    } catch {
      // Performance samples may not be available on all RPCs
    }

    return {
      currentSlot: slot,
      blockHeight,
      epochInfo: {
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        absoluteSlot: epochInfo.absoluteSlot,
        transactionCount: epochInfo.transactionCount ?? null,
      },
      tps,
      validatorCount: voteAccounts.current.length + voteAccounts.delinquent.length,
    };
  }

  async getRecentBlockProduction(numSlots: number = 10): Promise<BlockProduction[]> {
    const currentSlot = await this.connection.getSlot();
    const results: BlockProduction[] = [];

    for (let i = 0; i < numSlots; i++) {
      const targetSlot = currentSlot - i;
      try {
        const block = await this.connection.getBlock(targetSlot, {
          maxSupportedTransactionVersion: 0,
          transactionDetails: "full",
          rewards: false,
        });

        if (block) {
          const numTx = block.transactions.length;
          const numFailed = block.transactions.filter(
            (tx) => tx.meta?.err !== null
          ).length;

          results.push({
            slot: targetSlot,
            leader: "", // Leader identity requires extra call
            numTransactions: numTx,
            numSuccessful: numTx - numFailed,
            numFailed,
            blockTime: block.blockTime,
          });
        }
      } catch {
        // Skip slots that are unavailable
      }
    }

    return results;
  }

  async getProgramActivity(
    programId: string,
    limit: number = 50
  ): Promise<ProgramInvocation[]> {
    const pubkey = new PublicKey(programId);
    const signatures = await this.connection.getSignaturesForAddress(pubkey, {
      limit,
    });

    const invocations: ProgramInvocation[] = [];

    // Fetch transactions in batches of 10
    const batchSize = 10;
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const txPromises = batch.map((sig) =>
        this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      );

      const transactions = await Promise.all(txPromises);

      for (let j = 0; j < batch.length; j++) {
        const sig = batch[j];
        const tx = transactions[j];

        if (tx) {
          const accounts = tx.transaction.message.accountKeys.map((ak) =>
            ak.pubkey.toBase58()
          );
          const innerCount =
            tx.meta?.innerInstructions?.reduce(
              (sum, inner) => sum + inner.instructions.length,
              0
            ) ?? 0;

          invocations.push({
            signature: sig.signature,
            programId,
            slot: sig.slot,
            blockTime: sig.blockTime ?? null,
            fee: (tx.meta?.fee ?? 0) / LAMPORTS_PER_SOL,
            success: sig.err === null,
            accounts,
            innerInstructions: innerCount,
          });
        }
      }
    }

    return invocations;
  }

  async getTopProgramsFromRecentBlocks(
    numBlocks: number = 5
  ): Promise<Map<string, number>> {
    const programCounts = new Map<string, number>();
    const currentSlot = await this.connection.getSlot();

    for (let i = 0; i < numBlocks; i++) {
      const targetSlot = currentSlot - i;
      try {
        const block = await this.connection.getParsedBlock(targetSlot, {
          maxSupportedTransactionVersion: 0,
          transactionDetails: "full",
          rewards: false,
        });

        if (block) {
          for (const tx of block.transactions) {
            for (const ix of (tx.transaction as any).message.instructions) {
              const programId = ix.programId.toBase58();
              programCounts.set(
                programId,
                (programCounts.get(programId) ?? 0) + 1
              );
            }
          }
        }
      } catch {
        // Skip unavailable slots
      }
    }

    return programCounts;
  }

  async getAccountInfo(address: string): Promise<AccountActivity | null> {
    try {
      const pubkey = new PublicKey(address);
      const info = await this.connection.getAccountInfo(pubkey);
      if (!info) return null;

      return {
        address,
        lamports: info.lamports,
        owner: info.owner.toBase58(),
        executable: info.executable,
        dataSize: info.data.length,
      };
    } catch {
      return null;
    }
  }

  async getLargestAccounts(
    filter?: "circulating" | "nonCirculating"
  ): Promise<{ address: string; lamports: number }[]> {
    const result = await this.connection.getLargestAccounts({ filter });
    return result.value.map((a) => ({
      address: a.address.toBase58(),
      lamports: a.lamports,
    }));
  }

  async getRecentSignatures(limit: number = 20): Promise<ConfirmedSignatureInfo[]> {
    // Get recent transactions by looking at the latest slot's block
    const slot = await this.connection.getSlot();
    try {
      const block = await this.connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: "signatures",
        rewards: false,
      });
      if (block) {
        return block.transactions.slice(0, limit).map((tx) => ({
          signature: tx.transaction.signatures[0],
          slot,
          blockTime: block.blockTime,
          err: tx.meta?.err ?? null,
          memo: null,
          confirmationStatus: "confirmed" as const,
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  }

  async getSupplyInfo(): Promise<{
    total: number;
    circulating: number;
    nonCirculating: number;
  }> {
    const supply = await this.connection.getSupply();
    return {
      total: supply.value.total / LAMPORTS_PER_SOL,
      circulating: supply.value.circulating / LAMPORTS_PER_SOL,
      nonCirculating: supply.value.nonCirculating / LAMPORTS_PER_SOL,
    };
  }

  async subscribeToSlots(
    callback: (slot: SlotInfo) => void
  ): Promise<number> {
    return this.connection.onSlotChange((slotInfo) => {
      callback({
        slot: slotInfo.slot,
        parent: slotInfo.parent,
        root: slotInfo.root,
      });
    });
  }

  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeSlotChangeListener(subscriptionId);
  }
}
