import type { DailyStat, GlobalStats, SvmOnSlotContext, Wallet } from "envio";

/** The ZARsc mint, a Token-2022 mint with 6 decimals. */
export const MINT = "5ekaHEqpRUXH4RoZVRMErdJE74bibWAzihMtPcjKyceQ";

/** The mint authority. It issues ZARsc and sends most issuer payouts. */
export const ISSUER = "UuicDY26j4dUf5QraXJ99PwPzGwZjRWZmnxcyMhJAgk";

/** The one row of mint-wide totals. */
export const STATS_ID = "solana";

/** Only the listed fields are fetched, so every handler shares this minimal set. */
export const fields = {
  instruction: ["accounts", "args", "path", "isInner"],
  transaction: ["signature", "transactionIndex"],
  // Each token account's owner and balances around the transaction.
  accountActivity: ["address", "token.mint", "token.owner", "token.preAmount", "token.postAmount"],
  block: ["time"],
} as const;

type Located = {
  readonly path: readonly number[];
  readonly block: { readonly slot: number };
  readonly transaction: { readonly transactionIndex: number };
};

/** Unique per instruction: slot, transaction position, then the call path. */
export const instructionId = (i: Located) =>
  `${i.block.slot}-${i.transaction.transactionIndex}-${i.path.join(".")}`;

export const utcDay = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toISOString().slice(0, 10);

type Activity = {
  readonly address: string;
  readonly token: {
    readonly mint: string;
    readonly owner: string;
    readonly preAmount: bigint | undefined;
    readonly postAmount: bigint | undefined;
  } | undefined;
};

/** A ZARsc token account's owner wallet and its balance around the transaction. */
export const tokenAccount = (activities: readonly Activity[], address: string) => {
  const token = activities.find((a) => a.address === address && a.token?.mint === MINT)?.token;
  if (!token) return undefined;
  return { owner: token.owner, pre: token.preAmount ?? 0n, post: token.postAmount ?? 0n };
};

export const getStats = async (context: SvmOnSlotContext): Promise<GlobalStats> =>
  context.GlobalStats.getOrCreate({
    id: STATS_ID,
    wallets: 0,
    holders: 0,
    transfers: 0,
    peerTransfers: 0,
    programTransfers: 0,
    transferVolume: 0n,
    mints: 0,
    minted: 0n,
    burns: 0,
    burned: 0n,
    feesPaid: 0n,
    lastActivityAt: 0,
  });

export const getDay = async (context: SvmOnSlotContext, day: string): Promise<DailyStat> =>
  context.DailyStat.getOrCreate({
    id: day,
    day,
    transfers: 0,
    peerTransfers: 0,
    volume: 0n,
    peerVolume: 0n,
    minted: 0n,
    burned: 0n,
    newWallets: 0,
    activeWallets: 0,
    holders: 0,
  });

/** Counts a wallet as active on a day, once. */
export const markActive = async (context: SvmOnSlotContext, day: DailyStat, wallet: string): Promise<DailyStat> => {
  const id = `${day.day}-${wallet}`;
  if (await context.DailyActive.get(id)) return day;
  context.DailyActive.set({ id, day: day.day });
  return { ...day, activeWallets: day.activeWallets + 1 };
};

/**
 * Loads a wallet's row, creating it on first sight. A wallet seen mid-history
 * starts from its pre-transaction balance, so wallets that held ZARsc before
 * the indexer's start slot still count as holders.
 */
export const loadWallet = async (
  context: SvmOnSlotContext,
  stats: GlobalStats,
  day: DailyStat,
  owner: string,
  account: string,
  startingBalance: bigint,
  time: number,
): Promise<{ wallet: Wallet; stats: GlobalStats; day: DailyStat }> => {
  const existing = await context.Wallet.get(owner);
  if (existing) return { wallet: existing, stats, day };
  return {
    wallet: {
      id: owner,
      tokenAccount: account,
      balance: startingBalance,
      sent: 0n,
      received: 0n,
      sentCount: 0,
      receivedCount: 0,
      firstSeenAt: time,
      lastActiveAt: time,
      isIssuer: owner === ISSUER,
    },
    stats: {
      ...stats,
      wallets: stats.wallets + 1,
      holders: stats.holders + (startingBalance > 0n ? 1 : 0),
    },
    day: { ...day, newWallets: day.newWallets + 1 },
  };
};

/** Moves a wallet's balance and keeps the holder count in step. */
export const setBalance = (wallet: Wallet, stats: GlobalStats, balance: bigint) => ({
  wallet: { ...wallet, balance },
  stats: {
    ...stats,
    holders: stats.holders + (balance > 0n ? 1 : 0) - (wallet.balance > 0n ? 1 : 0),
  },
});
