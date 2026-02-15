/**
 * Well-known Solana program identifiers for labeling.
 */

export const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "Token-2022",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Associated Token Account",
  "ComputeBudget111111111111111111111111111111": "Compute Budget",
  "Vote111111111111111111111111111111111111111": "Vote Program",
  "Stake11111111111111111111111111111111111111": "Stake Program",
  "Config1111111111111111111111111111111111111": "Config Program",
  "BPFLoaderUpgradeab1e11111111111111111111111": "BPF Loader Upgradeable",
  "BPFLoader2111111111111111111111111111111111": "BPF Loader",
  "BPFLoader1111111111111111111111111111111111": "BPF Loader (Deprecated)",
  "SysvarC1ock11111111111111111111111111111111": "Sysvar Clock",
  "SysvarRent111111111111111111111111111111111": "Sysvar Rent",
  "SysvarS1otHashes111111111111111111111111111": "Sysvar Slot Hashes",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr": "Memo Program v2",
  "Memo1UhkJBfCR6MNBAxoGRGWfLs68tk5sJHCFiy553J": "Memo Program v1",
  // DEX Programs
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter v6",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpools",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum DEX v3",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": "Serum DEX v4",
  // NFT / Metaplex
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": "Metaplex Token Metadata",
  "cndy3Z4yapfJBmearMhi7hipHMbSy6vrQFsFYD4KZm": "Candy Machine v2",
  "Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g": "Candy Guard",
  // Lending / DeFi
  "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA": "Marinade Finance",
  "So1endDq2YkqhipRh3WViPa8hFb7w2oSTY1BoqEG4xB": "Solend (Deprecated)",
  "jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR": "Jito Staking",
  "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1": "Orca Token Swap",
  // Infrastructure
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX": "Name Service",
  "noopb9bkMVfRPU8AsBRBV8cn9CG5qawRUMkdJVsB8TQ": "SPL Noop",
  "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg": "SPL Auth Rules",
};

export function getProgramLabel(programId: string): string {
  return KNOWN_PROGRAMS[programId] || shortenAddress(programId);
}

export function shortenAddress(address: string): string {
  if (address.length <= 11) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export const PROGRAM_CATEGORIES: Record<string, string[]> = {
  "Core": [
    "11111111111111111111111111111111",
    "ComputeBudget111111111111111111111111111111",
    "Vote111111111111111111111111111111111111111",
    "Stake11111111111111111111111111111111111111",
  ],
  "Token": [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  ],
  "DEX": [
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  ],
  "NFT": [
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    "cndy3Z4yapfJBmearMhi7hipHMbSy6vrQFsFYD4KZm",
  ],
  "DeFi": [
    "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
    "So1endDq2YkqhipRh3WViPa8hFb7w2oSTY1BoqEG4xB",
    "jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR",
  ],
};

export function categorizeProgram(programId: string): string {
  for (const [category, programs] of Object.entries(PROGRAM_CATEGORIES)) {
    if (programs.includes(programId)) return category;
  }
  return "Other";
}
