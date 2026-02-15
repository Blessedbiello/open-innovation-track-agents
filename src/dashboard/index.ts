/**
 * SolanaLens Terminal Dashboard
 * Real-time terminal UI showing Solana network analytics.
 */

import { SolanaClient, NetworkStats, getProgramLabel } from "../solana/index.js";
import { AnalyticsEngine, NetworkSnapshot, Anomaly, ProgramRanking } from "../analytics/index.js";

const REFRESH_INTERVAL = 10_000; // 10 seconds

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - stripped.length);
  return align === "right" ? " ".repeat(padding) + text : text + " ".repeat(padding);
}

function horizontalLine(width: number = 80): string {
  return c("dim", "─".repeat(width));
}

function boxTop(title: string, width: number = 80): string {
  const titleLen = title.length + 2;
  const remaining = width - titleLen - 2;
  const left = Math.floor(remaining / 2);
  const right = remaining - left;
  return c("dim", "┌" + "─".repeat(left)) + ` ${c("bold", title)} ` + c("dim", "─".repeat(right) + "┐");
}

function boxBottom(width: number = 80): string {
  return c("dim", "└" + "─".repeat(width - 2) + "┘");
}

function boxLine(content: string, width: number = 80): string {
  const stripped = content.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - 4 - stripped.length);
  return c("dim", "│ ") + content + " ".repeat(padding) + c("dim", " │");
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function severityColor(severity: string): keyof typeof colors {
  switch (severity) {
    case "high": return "red";
    case "medium": return "yellow";
    case "low": return "cyan";
    default: return "white";
  }
}

function renderHeader(): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(c("cyan", c("bold", "  ╔═══════════════════════════════════════════════════════════╗")));
  lines.push(c("cyan", c("bold", "  ║        SolanaLens — Network Intelligence Dashboard       ║")));
  lines.push(c("cyan", c("bold", "  ╚═══════════════════════════════════════════════════════════╝")));
  lines.push("");
  return lines.join("\n");
}

function renderNetworkStats(stats: NetworkStats): string {
  const lines: string[] = [];
  const w = 62;

  lines.push(boxTop("Network Overview", w));
  lines.push(boxLine(
    `Slot: ${c("green", formatNumber(stats.currentSlot))}    ` +
    `Block Height: ${c("green", formatNumber(stats.blockHeight))}    ` +
    `TPS: ${c("yellow", stats.tps.toString())}`,
    w
  ));
  lines.push(boxLine(
    `Epoch: ${c("cyan", stats.epochInfo.epoch.toString())}    ` +
    `Progress: ${c("cyan", ((stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100).toFixed(1) + "%")}    ` +
    `Validators: ${c("green", formatNumber(stats.validatorCount))}`,
    w
  ));

  // Epoch progress bar
  const progress = stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch;
  const barWidth = 40;
  const filled = Math.round(progress * barWidth);
  const bar = c("green", "█".repeat(filled)) + c("dim", "░".repeat(barWidth - filled));
  lines.push(boxLine(`Epoch Progress: ${bar}`, w));
  lines.push(boxBottom(w));

  return lines.join("\n");
}

function renderTopPrograms(programs: ProgramRanking[]): string {
  const lines: string[] = [];
  const w = 62;

  lines.push(boxTop("Top Programs (Recent Blocks)", w));
  lines.push(boxLine(
    `${pad("Program", 30)} ${pad("Invocations", 14, "right")} ${pad("Share", 10, "right")}`,
    w
  ));
  lines.push(boxLine(horizontalLine(w - 4), w));

  const top10 = programs.slice(0, 10);
  for (const prog of top10) {
    const label = prog.label.length > 28 ? prog.label.slice(0, 25) + "..." : prog.label;
    const countStr = formatNumber(prog.invocationCount);
    const shareStr = prog.share.toFixed(1) + "%";

    // Color by category
    let colorKey: keyof typeof colors = "white";
    switch (prog.category) {
      case "Core": colorKey = "blue"; break;
      case "Token": colorKey = "green"; break;
      case "DEX": colorKey = "magenta"; break;
      case "NFT": colorKey = "yellow"; break;
      case "DeFi": colorKey = "cyan"; break;
    }

    lines.push(boxLine(
      `${pad(c(colorKey, label), 30 + 9)} ${pad(countStr, 14, "right")} ${pad(shareStr, 10, "right")}`,
      w
    ));
  }

  lines.push(boxBottom(w));
  return lines.join("\n");
}

function renderBlockSummary(snapshot: NetworkSnapshot): string {
  const lines: string[] = [];
  const w = 62;
  const bs = snapshot.blockSummary;

  lines.push(boxTop("Block Analysis", w));
  lines.push(boxLine(
    `Blocks Analyzed: ${c("cyan", bs.blocksAnalyzed.toString())}    ` +
    `Total Tx: ${c("green", formatNumber(bs.totalTransactions))}    ` +
    `Avg/Block: ${c("yellow", bs.avgTxPerBlock.toFixed(0))}`,
    w
  ));

  const successColor = bs.successRate >= 95 ? "green" : bs.successRate >= 80 ? "yellow" : "red";
  lines.push(boxLine(
    `Success Rate: ${c(successColor, bs.successRate.toFixed(1) + "%")}`,
    w
  ));

  lines.push(boxBottom(w));
  return lines.join("\n");
}

function renderAnomalies(anomalies: Anomaly[]): string {
  const lines: string[] = [];
  const w = 62;

  lines.push(boxTop("Anomaly Detection", w));

  if (anomalies.length === 0) {
    lines.push(boxLine(c("green", "No anomalies detected — network operating normally"), w));
  } else {
    for (const anomaly of anomalies.slice(0, 5)) {
      const icon = anomaly.severity === "high" ? "!!!" : anomaly.severity === "medium" ? " ! " : " i ";
      const sColor = severityColor(anomaly.severity);
      lines.push(boxLine(
        `${c(sColor, `[${icon}]`)} ${anomaly.message.slice(0, 50)}`,
        w
      ));
    }
  }

  lines.push(boxBottom(w));
  return lines.join("\n");
}

function renderFooter(): string {
  const now = new Date().toISOString().replace("T", " ").split(".")[0];
  return c("dim", `  Last updated: ${now} UTC  |  Refresh: ${REFRESH_INTERVAL / 1000}s  |  Press Ctrl+C to exit`);
}

function renderSnapshot(snapshot: NetworkSnapshot): string {
  const parts: string[] = [];
  parts.push(renderHeader());
  parts.push(renderNetworkStats(snapshot.stats));
  parts.push("");
  parts.push(renderTopPrograms(snapshot.topPrograms));
  parts.push("");
  parts.push(renderBlockSummary(snapshot));
  parts.push("");
  parts.push(renderAnomalies(snapshot.anomalies));
  parts.push("");
  parts.push(renderFooter());
  parts.push("");
  return parts.join("\n");
}

export async function startDashboard(rpcUrl?: string, refreshInterval?: number): Promise<void> {
  const interval = refreshInterval || REFRESH_INTERVAL;
  const client = new SolanaClient(rpcUrl);
  const engine = new AnalyticsEngine(client);

  console.clear();
  console.log(renderHeader());
  console.log(c("yellow", "  Connecting to Solana network..."));

  const refresh = async () => {
    try {
      const snapshot = await engine.takeSnapshot(5);
      console.clear();
      console.log(renderSnapshot(snapshot));
    } catch (err: any) {
      console.error(c("red", `  Error: ${err.message}`));
      console.log(c("dim", "  Retrying on next interval..."));
    }
  };

  await refresh();
  setInterval(refresh, interval);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log(c("yellow", "\n  SolanaLens shutting down..."));
    process.exit(0);
  });
}

// Also export a one-shot snapshot renderer for CLI
export async function printSnapshot(rpcUrl?: string, numBlocks?: number): Promise<void> {
  const client = new SolanaClient(rpcUrl);
  const engine = new AnalyticsEngine(client);

  console.log(renderHeader());
  console.log(c("yellow", "  Fetching Solana network data..."));

  const snapshot = await engine.takeSnapshot(numBlocks || 5);
  console.clear();
  console.log(renderSnapshot(snapshot));
}
