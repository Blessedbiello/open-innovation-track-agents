/**
 * SolanaLens REST API Server
 * Provides programmatic access to Solana network analytics.
 */

import express from "express";
import cors from "cors";
import { SolanaClient } from "../solana/index.js";
import { AnalyticsEngine } from "../analytics/index.js";
import { KNOWN_PROGRAMS, getProgramLabel, categorizeProgram } from "../solana/programs.js";

export function createServer(port: number = 3420, rpcUrl?: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const client = new SolanaClient(rpcUrl);
  const engine = new AnalyticsEngine(client);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "solana-lens", timestamp: Date.now() });
  });

  // Full network snapshot (analytics + anomalies)
  app.get("/api/snapshot", async (_req, res) => {
    try {
      const numBlocks = parseInt((_req.query.blocks as string) || "5", 10);
      const snapshot = await engine.takeSnapshot(Math.min(numBlocks, 20));
      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Network stats only
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await client.getNetworkStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Top programs from recent blocks
  app.get("/api/programs/top", async (req, res) => {
    try {
      const numBlocks = parseInt((req.query.blocks as string) || "5", 10);
      const programCounts = await client.getTopProgramsFromRecentBlocks(
        Math.min(numBlocks, 20)
      );
      const total = Array.from(programCounts.values()).reduce((a, b) => a + b, 0);

      const ranked = Array.from(programCounts.entries())
        .map(([programId, count]) => ({
          programId,
          label: getProgramLabel(programId),
          category: categorizeProgram(programId),
          invocationCount: count,
          share: total > 0 ? ((count / total) * 100).toFixed(2) + "%" : "0%",
        }))
        .sort((a, b) => b.invocationCount - a.invocationCount)
        .slice(0, 20);

      res.json({ blocksAnalyzed: numBlocks, totalInvocations: total, programs: ranked });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Program-specific activity
  app.get("/api/programs/:programId/activity", async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || "25", 10);
      const activity = await client.getProgramActivity(
        req.params.programId,
        Math.min(limit, 100)
      );
      res.json({
        programId: req.params.programId,
        label: getProgramLabel(req.params.programId),
        invocations: activity,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Account info
  app.get("/api/accounts/:address", async (req, res) => {
    try {
      const info = await client.getAccountInfo(req.params.address);
      if (!info) {
        res.status(404).json({ error: "Account not found" });
        return;
      }
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Recent blocks
  app.get("/api/blocks/recent", async (req, res) => {
    try {
      const count = parseInt((req.query.count as string) || "5", 10);
      const blocks = await client.getRecentBlockProduction(Math.min(count, 20));
      res.json({ blocks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supply info
  app.get("/api/supply", async (_req, res) => {
    try {
      const supply = await client.getSupplyInfo();
      res.json(supply);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List known programs
  app.get("/api/programs/known", (_req, res) => {
    const programs = Object.entries(KNOWN_PROGRAMS).map(([id, name]) => ({
      programId: id,
      label: name,
      category: categorizeProgram(id),
    }));
    res.json({ programs });
  });

  // Anomaly history
  app.get("/api/anomalies", async (_req, res) => {
    try {
      const snapshot = await engine.takeSnapshot();
      res.json({
        anomalies: snapshot.anomalies,
        baselineTps: engine.getBaselineTps(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return { app, start: () => {
    app.listen(port, () => {
      console.log(`SolanaLens API running on http://localhost:${port}`);
      console.log(`Endpoints:`);
      console.log(`  GET /api/snapshot         - Full network snapshot with anomaly detection`);
      console.log(`  GET /api/stats            - Network statistics`);
      console.log(`  GET /api/programs/top      - Top programs by invocation count`);
      console.log(`  GET /api/programs/known    - List of known program labels`);
      console.log(`  GET /api/programs/:id/activity - Program-specific activity`);
      console.log(`  GET /api/accounts/:addr    - Account information`);
      console.log(`  GET /api/blocks/recent     - Recent block production`);
      console.log(`  GET /api/supply            - SOL supply information`);
      console.log(`  GET /api/anomalies         - Anomaly detection`);
    });
  }};
}

// Run directly
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  const port = parseInt(process.env.PORT || "3420", 10);
  const { start } = createServer(port);
  start();
}
