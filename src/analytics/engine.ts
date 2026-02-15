/**
 * SolanaLens Analytics Engine
 * Processes on-chain data to produce insights, rankings, and anomaly alerts.
 */

import {
  SolanaClient,
  BlockProduction,
  NetworkStats,
  getProgramLabel,
  categorizeProgram,
} from "../solana/index.js";

export interface ProgramRanking {
  programId: string;
  label: string;
  category: string;
  invocationCount: number;
  share: number; // percentage of total
}

export interface NetworkSnapshot {
  timestamp: number;
  stats: NetworkStats;
  topPrograms: ProgramRanking[];
  blockSummary: BlockSummary;
  anomalies: Anomaly[];
}

export interface BlockSummary {
  blocksAnalyzed: number;
  totalTransactions: number;
  successRate: number;
  avgTxPerBlock: number;
  avgFeePerTx: number;
}

export interface Anomaly {
  type: AnomalyType;
  severity: "low" | "medium" | "high";
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type AnomalyType =
  | "high_failure_rate"
  | "tps_spike"
  | "tps_drop"
  | "program_surge"
  | "large_block"
  | "empty_block"
  | "new_program_detected";

interface HistoricalDataPoint {
  timestamp: number;
  tps: number;
  txCount: number;
  successRate: number;
  programCounts: Map<string, number>;
}

export class AnalyticsEngine {
  private client: SolanaClient;
  private history: HistoricalDataPoint[] = [];
  private maxHistoryLength = 100;
  private knownPrograms = new Set<string>();
  private baselineTps: number | null = null;

  constructor(client: SolanaClient) {
    this.client = client;
  }

  async takeSnapshot(numBlocks: number = 5): Promise<NetworkSnapshot> {
    const [stats, blocks, programCounts] = await Promise.all([
      this.client.getNetworkStats(),
      this.client.getRecentBlockProduction(numBlocks),
      this.client.getTopProgramsFromRecentBlocks(numBlocks),
    ]);

    const blockSummary = this.summarizeBlocks(blocks);
    const topPrograms = this.rankPrograms(programCounts);
    const anomalies = this.detectAnomalies(stats, blockSummary, topPrograms, programCounts);

    // Update history
    this.history.push({
      timestamp: Date.now(),
      tps: stats.tps,
      txCount: blockSummary.totalTransactions,
      successRate: blockSummary.successRate,
      programCounts,
    });
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // Update baseline TPS (moving average)
    if (this.baselineTps === null) {
      this.baselineTps = stats.tps;
    } else {
      this.baselineTps = this.baselineTps * 0.9 + stats.tps * 0.1;
    }

    // Track known programs
    for (const programId of programCounts.keys()) {
      this.knownPrograms.add(programId);
    }

    return {
      timestamp: Date.now(),
      stats,
      topPrograms,
      blockSummary,
      anomalies,
    };
  }

  private summarizeBlocks(blocks: BlockProduction[]): BlockSummary {
    if (blocks.length === 0) {
      return {
        blocksAnalyzed: 0,
        totalTransactions: 0,
        successRate: 0,
        avgTxPerBlock: 0,
        avgFeePerTx: 0,
      };
    }

    const totalTx = blocks.reduce((sum, b) => sum + b.numTransactions, 0);
    const totalSuccess = blocks.reduce((sum, b) => sum + b.numSuccessful, 0);

    return {
      blocksAnalyzed: blocks.length,
      totalTransactions: totalTx,
      successRate: totalTx > 0 ? (totalSuccess / totalTx) * 100 : 0,
      avgTxPerBlock: totalTx / blocks.length,
      avgFeePerTx: 0, // Would need fee data per tx
    };
  }

  private rankPrograms(programCounts: Map<string, number>): ProgramRanking[] {
    const total = Array.from(programCounts.values()).reduce((a, b) => a + b, 0);

    return Array.from(programCounts.entries())
      .map(([programId, count]) => ({
        programId,
        label: getProgramLabel(programId),
        category: categorizeProgram(programId),
        invocationCount: count,
        share: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.invocationCount - a.invocationCount)
      .slice(0, 20);
  }

  private detectAnomalies(
    stats: NetworkStats,
    blockSummary: BlockSummary,
    _topPrograms: ProgramRanking[],
    programCounts: Map<string, number>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = Date.now();

    // High failure rate
    if (blockSummary.successRate < 80 && blockSummary.totalTransactions > 10) {
      anomalies.push({
        type: "high_failure_rate",
        severity: blockSummary.successRate < 50 ? "high" : "medium",
        message: `Transaction success rate is ${blockSummary.successRate.toFixed(1)}% (below 80% threshold)`,
        data: {
          successRate: blockSummary.successRate,
          totalTransactions: blockSummary.totalTransactions,
        },
        timestamp: now,
      });
    }

    // TPS anomalies (only after we have a baseline)
    if (this.baselineTps !== null && this.baselineTps > 0) {
      const tpsRatio = stats.tps / this.baselineTps;

      if (tpsRatio > 2) {
        anomalies.push({
          type: "tps_spike",
          severity: tpsRatio > 3 ? "high" : "medium",
          message: `TPS spike detected: ${stats.tps} (${tpsRatio.toFixed(1)}x baseline of ${this.baselineTps.toFixed(0)})`,
          data: { currentTps: stats.tps, baselineTps: this.baselineTps, ratio: tpsRatio },
          timestamp: now,
        });
      } else if (tpsRatio < 0.3 && stats.tps > 0) {
        anomalies.push({
          type: "tps_drop",
          severity: tpsRatio < 0.1 ? "high" : "medium",
          message: `TPS drop detected: ${stats.tps} (${(tpsRatio * 100).toFixed(0)}% of baseline ${this.baselineTps.toFixed(0)})`,
          data: { currentTps: stats.tps, baselineTps: this.baselineTps, ratio: tpsRatio },
          timestamp: now,
        });
      }
    }

    // Large block detection
    if (blockSummary.avgTxPerBlock > 2000) {
      anomalies.push({
        type: "large_block",
        severity: blockSummary.avgTxPerBlock > 5000 ? "high" : "low",
        message: `Large blocks detected: avg ${blockSummary.avgTxPerBlock.toFixed(0)} tx/block`,
        data: { avgTxPerBlock: blockSummary.avgTxPerBlock },
        timestamp: now,
      });
    }

    // Empty block detection
    if (blockSummary.avgTxPerBlock < 5 && blockSummary.blocksAnalyzed > 0) {
      anomalies.push({
        type: "empty_block",
        severity: "medium",
        message: `Near-empty blocks: avg ${blockSummary.avgTxPerBlock.toFixed(1)} tx/block`,
        data: { avgTxPerBlock: blockSummary.avgTxPerBlock },
        timestamp: now,
      });
    }

    // New program detection (programs not seen in previous snapshots)
    if (this.history.length > 3) {
      const previousPrograms = new Set<string>();
      for (const h of this.history.slice(-5)) {
        for (const p of h.programCounts.keys()) {
          previousPrograms.add(p);
        }
      }

      for (const programId of programCounts.keys()) {
        if (!previousPrograms.has(programId) && !this.knownPrograms.has(programId)) {
          anomalies.push({
            type: "new_program_detected",
            severity: "low",
            message: `New program detected in recent blocks: ${getProgramLabel(programId)}`,
            data: { programId, invocations: programCounts.get(programId) },
            timestamp: now,
          });
        }
      }
    }

    // Program surge detection
    if (this.history.length > 2) {
      const lastSnapshot = this.history[this.history.length - 1];
      for (const [programId, count] of programCounts.entries()) {
        const prevCount = lastSnapshot.programCounts.get(programId) ?? 0;
        if (prevCount > 5 && count > prevCount * 3) {
          anomalies.push({
            type: "program_surge",
            severity: count > prevCount * 10 ? "high" : "medium",
            message: `Surge in ${getProgramLabel(programId)}: ${prevCount} → ${count} invocations`,
            data: { programId, previousCount: prevCount, currentCount: count },
            timestamp: now,
          });
        }
      }
    }

    return anomalies;
  }

  getHistory(): HistoricalDataPoint[] {
    return [...this.history];
  }

  getBaselineTps(): number | null {
    return this.baselineTps;
  }
}
