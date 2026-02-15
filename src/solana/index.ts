export { SolanaClient } from "./client.js";
export type {
  SlotInfo,
  BlockProduction,
  ProgramInvocation,
  AccountActivity,
  NetworkStats,
} from "./client.js";
export {
  KNOWN_PROGRAMS,
  PROGRAM_CATEGORIES,
  getProgramLabel,
  shortenAddress,
  categorizeProgram,
} from "./programs.js";
