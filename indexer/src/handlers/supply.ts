import { indexer, type SvmOnSlotContext } from "envio";
import { fields, getDay, getStats, instructionId, loadWallet, markActive, MINT, setBalance, tokenAccount, utcDay } from "../shared.js";

const where = { accounts: { mint: MINT } };

type Call = { readonly instruction: any; readonly context: SvmOnSlotContext };

const handleMint = async ({ instruction, context }: Call, amount: bigint) => {
  const { destination, authority } = instruction.accounts;
  const to = tokenAccount(instruction.transaction.accountActivities, destination.address);
  if (!to) {
    context.log.warn(`mint ${instruction.transaction.signature}: token account owner not found`);
    return;
  }
  const time: number = instruction.block.time;
  const dayKey = utcDay(time);
  let stats = await getStats(context);
  let day = await getDay(context, dayKey);
  const loaded = await loadWallet(context, stats, day, to.owner, destination.address, to.pre, time);
  ({ stats, day } = loaded);

  const { wallet, stats: next } = setBalance(
    { ...loaded.wallet, tokenAccount: destination.address, lastActiveAt: time },
    stats,
    to.post,
  );
  context.Wallet.set(wallet);
  day = await markActive(context, day, to.owner);

  context.Mint.set({
    id: instructionId(instruction),
    recipient_id: to.owner,
    amount,
    authority: authority.address,
    timestamp: time,
    slot: instruction.block.slot,
    txSignature: instruction.transaction.signature,
  });
  context.GlobalStats.set({ ...next, mints: next.mints + 1, minted: next.minted + amount, lastActivityAt: time });
  context.DailyStat.set({ ...day, minted: day.minted + amount, holders: next.holders });
};

const handleBurn = async ({ instruction, context }: Call, amount: bigint) => {
  const { source } = instruction.accounts;
  const from = tokenAccount(instruction.transaction.accountActivities, source.address);
  if (!from) {
    context.log.warn(`burn ${instruction.transaction.signature}: token account owner not found`);
    return;
  }
  const time: number = instruction.block.time;
  const dayKey = utcDay(time);
  let stats = await getStats(context);
  let day = await getDay(context, dayKey);
  const loaded = await loadWallet(context, stats, day, from.owner, source.address, from.pre, time);
  ({ stats, day } = loaded);

  const { wallet, stats: next } = setBalance(
    { ...loaded.wallet, tokenAccount: source.address, lastActiveAt: time },
    stats,
    from.post,
  );
  context.Wallet.set(wallet);
  day = await markActive(context, day, from.owner);

  context.Burn.set({
    id: instructionId(instruction),
    owner_id: from.owner,
    amount,
    timestamp: time,
    slot: instruction.block.slot,
    txSignature: instruction.transaction.signature,
  });
  context.GlobalStats.set({ ...next, burns: next.burns + 1, burned: next.burned + amount, lastActivityAt: time });
  context.DailyStat.set({ ...day, burned: day.burned + amount, holders: next.holders });
};

indexer.onInstruction({ program: "Token2022", instruction: "mintToChecked", fields, where }, (c) => handleMint(c, c.instruction.args.amount));
indexer.onInstruction({ program: "Token2022", instruction: "mintTo", fields, where }, (c) => handleMint(c, c.instruction.args.amount));
indexer.onInstruction({ program: "Token2022", instruction: "burnChecked", fields, where }, (c) => handleBurn(c, c.instruction.args.amount));
indexer.onInstruction({ program: "Token2022", instruction: "burn", fields, where }, (c) => handleBurn(c, c.instruction.args.amount));
