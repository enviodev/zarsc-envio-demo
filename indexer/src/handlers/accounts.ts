import { indexer } from "envio";
import { fields, getDay, getStats, loadWallet, MINT, utcDay } from "../shared.js";

// A new ZARsc token account: the moment a wallet joins, before it holds any.
indexer.onInstruction(
  { program: "Token2022", instruction: "initializeAccount3", fields, where: { accounts: { mint: MINT } } },
  async ({ instruction, context }) => {
    const owner: string = instruction.args.owner;
    const time = instruction.block.time;
    const stats = await getStats(context);
    const day = await getDay(context, utcDay(time));
    const loaded = await loadWallet(context, stats, day, owner, instruction.accounts.account.address, 0n, time);
    if (loaded.stats === stats) return; // already known
    context.Wallet.set(loaded.wallet);
    context.GlobalStats.set({ ...loaded.stats, lastActivityAt: time });
    context.DailyStat.set({ ...loaded.day, holders: loaded.stats.holders });
  },
);
