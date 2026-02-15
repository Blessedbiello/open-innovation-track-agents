#!/usr/bin/env node
/**
 * SolanaLens CLI
 * Real-time Solana program analytics, anomaly detection, and network intelligence.
 *
 * Built autonomously by SentinelPrime
 */

import { Command } from "commander";
import { startDashboard, printSnapshot } from "./dashboard/index.js";
import { createServer } from "./api/server.js";
import { SolanaClient, getProgramLabel } from "./solana/index.js";
import { AnalyticsEngine } from "./analytics/index.js";

const program = new Command();

program
  .name("solana-lens")
  .description("Real-time Solana program analytics, anomaly detection, and network intelligence")
  .version("1.0.0");

program
  .command("watch")
  .description("Start the live terminal dashboard")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .option("-i, --interval <ms>", "Refresh interval in milliseconds", "10000")
  .action(async (opts) => {
    await startDashboard(opts.rpc, parseInt(opts.interval, 10));
  });

program
  .command("snapshot")
  .description("Take a one-time network snapshot")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .option("-b, --blocks <count>", "Number of recent blocks to analyze", "5")
  .action(async (opts) => {
    await printSnapshot(opts.rpc, parseInt(opts.blocks, 10));
  });

program
  .command("analyze")
  .description("Analyze a specific Solana program")
  .argument("<programId>", "Program ID to analyze")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .option("-l, --limit <count>", "Number of recent transactions to fetch", "25")
  .action(async (programId, opts) => {
    const client = new SolanaClient(opts.rpc);
    console.log(`\nAnalyzing program: ${getProgramLabel(programId)}`);
    console.log(`Program ID: ${programId}\n`);

    const activity = await client.getProgramActivity(programId, parseInt(opts.limit, 10));

    if (activity.length === 0) {
      console.log("No recent activity found for this program.");
      return;
    }

    console.log(`Found ${activity.length} recent transactions:\n`);
    console.log(
      padStr("Signature", 20) +
      padStr("Slot", 12) +
      padStr("Fee (SOL)", 12) +
      padStr("Status", 10) +
      padStr("Inner Ix", 10) +
      "Time"
    );
    console.log("─".repeat(80));

    for (const inv of activity) {
      const sig = inv.signature.slice(0, 16) + "...";
      const time = inv.blockTime
        ? new Date(inv.blockTime * 1000).toISOString().replace("T", " ").split(".")[0]
        : "unknown";
      const status = inv.success ? "OK" : "FAIL";
      console.log(
        padStr(sig, 20) +
        padStr(inv.slot.toString(), 12) +
        padStr(inv.fee.toFixed(6), 12) +
        padStr(status, 10) +
        padStr(inv.innerInstructions.toString(), 10) +
        time
      );
    }

    // Summary stats
    const totalFees = activity.reduce((sum, a) => sum + a.fee, 0);
    const successRate = (activity.filter((a) => a.success).length / activity.length) * 100;
    const avgInner = activity.reduce((sum, a) => sum + a.innerInstructions, 0) / activity.length;

    console.log("\n─".repeat(80));
    console.log(`Total Fees:     ${totalFees.toFixed(6)} SOL`);
    console.log(`Success Rate:   ${successRate.toFixed(1)}%`);
    console.log(`Avg Inner Ix:   ${avgInner.toFixed(1)}`);
    console.log(`Unique Accounts: ${new Set(activity.flatMap((a) => a.accounts)).size}`);
  });

program
  .command("account")
  .description("Look up a Solana account")
  .argument("<address>", "Account address")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .action(async (address, opts) => {
    const client = new SolanaClient(opts.rpc);
    const info = await client.getAccountInfo(address);

    if (!info) {
      console.log("Account not found.");
      return;
    }

    console.log(`\nAccount: ${address}`);
    console.log(`Owner:      ${getProgramLabel(info.owner)}`);
    console.log(`Balance:    ${(info.lamports / 1e9).toFixed(9)} SOL`);
    console.log(`Executable: ${info.executable}`);
    console.log(`Data Size:  ${info.dataSize} bytes`);
  });

program
  .command("serve")
  .description("Start the REST API server")
  .option("-p, --port <port>", "Port to listen on", "3420")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .action(async (opts) => {
    const { start } = createServer(parseInt(opts.port, 10), opts.rpc);
    start();
  });

program
  .command("supply")
  .description("Show SOL supply information")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .action(async (opts) => {
    const client = new SolanaClient(opts.rpc);
    const supply = await client.getSupplyInfo();

    console.log("\nSOL Supply:");
    console.log(`  Total:          ${formatNum(supply.total)} SOL`);
    console.log(`  Circulating:    ${formatNum(supply.circulating)} SOL`);
    console.log(`  Non-Circulating: ${formatNum(supply.nonCirculating)} SOL`);
  });

program
  .command("stats")
  .description("Show current network statistics")
  .option("-r, --rpc <url>", "Solana RPC URL")
  .action(async (opts) => {
    const client = new SolanaClient(opts.rpc);
    const stats = await client.getNetworkStats();

    console.log("\nSolana Network Stats:");
    console.log(`  Current Slot:   ${stats.currentSlot.toLocaleString()}`);
    console.log(`  Block Height:   ${stats.blockHeight.toLocaleString()}`);
    console.log(`  Epoch:          ${stats.epochInfo.epoch}`);
    console.log(`  Epoch Progress: ${((stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100).toFixed(1)}%`);
    console.log(`  TPS:            ${stats.tps}`);
    console.log(`  Validators:     ${stats.validatorCount}`);
    if (stats.epochInfo.transactionCount) {
      console.log(`  Total Tx Count: ${stats.epochInfo.transactionCount.toLocaleString()}`);
    }
  });

function padStr(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

function formatNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

program.parse();
