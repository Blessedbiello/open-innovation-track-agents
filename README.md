# SolanaLens

**Real-time Solana program analytics, anomaly detection, and network intelligence dashboard.**

Built autonomously by [SentinelPrime](https://github.com/Blessedbiello), an AI agent powered by Claude Opus 4.6, for the Superteam Earn "Open Innovation Track: Build Anything on Solana" bounty.

---

## What is SolanaLens?

SolanaLens is a command-line tool and REST API that provides real-time intelligence about the Solana blockchain. It connects directly to Solana RPC nodes, indexes recent block activity, identifies top programs, and detects network anomalies — all from your terminal.

### Features

- **Live Terminal Dashboard** — A rich, auto-refreshing TUI showing network stats, top programs, block analysis, and anomaly alerts
- **Program Analytics** — Deep-dive into any Solana program's recent activity: transaction history, fees, success rates, inner instruction complexity
- **Anomaly Detection** — Automatic detection of TPS spikes/drops, high failure rates, program surges, empty blocks, and new program appearances
- **REST API** — Full HTTP API for programmatic access to all analytics data
- **Account Lookup** — Query any Solana account's balance, owner, data size, and executable status
- **Supply Dashboard** — Real-time SOL supply breakdown (total, circulating, non-circulating)
- **Known Program Labeling** — 30+ well-known Solana programs labeled by name (Jupiter, Raydium, Orca, Metaplex, etc.)

## Why It's Novel

Most Solana analytics tools are web-based, require heavy infrastructure, or depend on third-party indexers. SolanaLens is:

1. **Zero-infrastructure** — Connects directly to any Solana RPC. No database, no indexer, no cloud.
2. **Terminal-native** — Designed for developers who live in the terminal. Beautiful TUI with ANSI colors.
3. **Anomaly-aware** — Not just data display, but intelligent anomaly detection with historical baselining.
4. **Fully self-contained** — Single `npm install` and you're running. No API keys needed (uses public RPC by default).
5. **Built entirely by an AI agent** — Every line of code was conceived, designed, and written autonomously.

## How Solana Is Used

SolanaLens uses Solana **directly and meaningfully**:

- **RPC Integration** — Direct `@solana/web3.js` connection to Solana mainnet-beta (or any cluster)
- **Block Analysis** — Fetches and parses recent blocks to extract transaction counts, success rates, and program invocations
- **Program Indexing** — Identifies which Solana programs are most active by counting instruction invocations across recent blocks
- **Transaction Parsing** — Deep-dives into individual transactions to extract fee data, account interactions, and inner instruction complexity
- **Epoch Tracking** — Monitors epoch progress, validator counts, and network-wide TPS
- **Account Inspection** — Queries account state including lamport balance, owner program, data size, and executable flag
- **Supply Monitoring** — Tracks total, circulating, and non-circulating SOL supply

## How the AI Agent Operated

This project was built autonomously by **SentinelPrime**, an AI bounty-hunting agent:

1. **Discovery** — SentinelPrime discovered the "Open Innovation Track" bounty on Superteam Earn
2. **Ideation** — The agent autonomously decided to build a Solana network analytics tool after evaluating what would be novel, useful, and feasible to build in a single session
3. **Architecture** — Designed a modular architecture: Solana RPC client → Analytics engine → API server + Terminal dashboard
4. **Implementation** — Wrote all code from scratch: TypeScript, with clean separation of concerns across modules
5. **Testing** — Verified the build compiles cleanly and tested against Solana mainnet
6. **Documentation** — Wrote this README, LICENSE, and submission docs

The agent made all decisions independently: what to build, which libraries to use, how to structure the code, what features to include, and how to present the work.

**Agent identity:** SentinelPrime (Claude Opus 4.6), orchestrated by the Mastra framework.

## Installation

```bash
git clone https://github.com/Blessedbiello/open-innovation-track-agents.git
cd open-innovation-track-agents
npm install
npm run build
```

## Usage

### Live Dashboard

Start the auto-refreshing terminal dashboard:

```bash
node dist/index.js watch
```

Options:
- `--rpc <url>` — Custom Solana RPC URL
- `--interval <ms>` — Refresh interval (default: 10000ms)

### One-Shot Snapshot

Take a single network snapshot and exit:

```bash
node dist/index.js snapshot
node dist/index.js snapshot --blocks 10
```

### Analyze a Program

Deep-dive into a specific program's activity:

```bash
# Analyze Jupiter v6
node dist/index.js analyze JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4

# Analyze with more transactions
node dist/index.js analyze TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --limit 50
```

### Account Lookup

Query any Solana account:

```bash
node dist/index.js account <address>
```

### Network Stats

Quick network statistics:

```bash
node dist/index.js stats
```

### SOL Supply

View supply breakdown:

```bash
node dist/index.js supply
```

### REST API Server

Start the HTTP API:

```bash
node dist/index.js serve
node dist/index.js serve --port 8080
```

API endpoints:
| Endpoint | Description |
|----------|-------------|
| `GET /api/snapshot` | Full network snapshot with anomaly detection |
| `GET /api/stats` | Network statistics |
| `GET /api/programs/top` | Top programs by invocation count |
| `GET /api/programs/known` | Known program label directory |
| `GET /api/programs/:id/activity` | Program-specific transaction history |
| `GET /api/accounts/:address` | Account information |
| `GET /api/blocks/recent` | Recent block production data |
| `GET /api/supply` | SOL supply breakdown |
| `GET /api/anomalies` | Anomaly detection results |

## Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── solana/
│   ├── client.ts         # Solana RPC client wrapper
│   ├── programs.ts       # Known program labels and categories
│   └── index.ts
├── analytics/
│   ├── engine.ts         # Analytics engine with anomaly detection
│   └── index.ts
├── api/
│   ├── server.ts         # Express REST API
│   └── index.ts
└── dashboard/
    └── index.ts          # Terminal UI renderer
```

## Configuration

Set a custom RPC URL via environment variable or CLI flag:

```bash
export SOLANA_RPC_URL=https://your-rpc-endpoint.com
# or
node dist/index.js watch --rpc https://your-rpc-endpoint.com
```

By default, SolanaLens uses Solana's public mainnet-beta RPC endpoint.

## Tech Stack

- **TypeScript** — Type-safe codebase
- **@solana/web3.js** — Direct Solana RPC interaction
- **Express** — REST API server
- **Commander.js** — CLI argument parsing
- **ANSI Terminal Rendering** — Custom TUI without heavy dependencies

## License

MIT License — see [LICENSE](LICENSE)
