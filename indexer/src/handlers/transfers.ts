import { indexer, type SvmOnSlotContext } from "envio";
import {
  fields,
  getDay,
  getStats,
  instructionId,
  ISSUER,
  loadWallet,
  markActive,
  MINT,
  setBalance,
  tokenAccount,
  utcDay,
} from "../shared.js";

type Call = {
  readonly instruction: any;
  readonly context: SvmOnSlotContext;
};

/** A transfer between two ZARsc token accounts, with or without the fee extension. */
const handleTransfer = async ({ instruction, context }: Call, amount: bigint, fee: bigint) => {
  const { source, destination } = instruction.accounts;
  const activities = instruction.transaction.accountActivities;
  const from = tokenAccount(activities, source.address);
  const to = tokenAccount(activities, destination.address);
  if (!from || !to) {
    context.log.warn(`transfer ${instruction.transaction.signature}: token account owner not found`);
    return;
  }

  const time: number = instruction.block.time;
  const dayKey = utcDay(time);
  let stats = await getStats(context);
  let day = await getDay(context, dayKey);

  let sender = await loadWallet(context, stats, day, from.owner, source.address, from.pre, time);
  ({ stats, day } = sender);
  let receiver = await loadWallet(context, stats, day, to.owner, destination.address, to.pre, time);
  ({ stats, day } = receiver);

  // A transfer to oneself nets out, so both sides read the same row.
  const self = from.owner === to.owner;
  const fromIssuer = from.owner === ISSUER;
  const toIssuer = to.owner === ISSUER;

  let senderWallet = {
    ...sender.wallet,
    tokenAccount: source.address,
    sent: sender.wallet.sent + amount,
    sentCount: sender.wallet.sentCount + 1,
    lastActiveAt: time,
  };
  ({ wallet: senderWallet, stats } = setBalance(senderWallet, stats, from.post));
  if (self) {
    context.Wallet.set({ ...senderWallet, received: senderWallet.received + amount, receivedCount: senderWallet.receivedCount + 1 });
  } else {
    context.Wallet.set(senderWallet);
    let receiverWallet = {
      ...receiver.wallet,
      tokenAccount: destination.address,
      received: receiver.wallet.received + amount,
      receivedCount: receiver.wallet.receivedCount + 1,
      lastActiveAt: time,
    };
    ({ wallet: receiverWallet, stats } = setBalance(receiverWallet, stats, to.post));
    context.Wallet.set(receiverWallet);
  }

  day = await markActive(context, day, from.owner);
  if (!self) day = await markActive(context, day, to.owner);

  const viaProgram = instruction.isInner as boolean;
  context.Transfer.set({
    id: instructionId(instruction),
    from_id: from.owner,
    to_id: to.owner,
    amount,
    fee,
    timestamp: time,
    day: dayKey,
    slot: instruction.block.slot,
    txSignature: instruction.transaction.signature,
    fromIssuer,
    toIssuer,
    viaProgram,
  });

  context.GlobalStats.set({
    ...stats,
    transfers: stats.transfers + 1,
    peerTransfers: stats.peerTransfers + (fromIssuer ? 0 : 1),
    programTransfers: stats.programTransfers + (viaProgram ? 1 : 0),
    transferVolume: stats.transferVolume + amount,
    feesPaid: stats.feesPaid + fee,
    lastActivityAt: time,
  });
  context.DailyStat.set({
    ...day,
    transfers: day.transfers + 1,
    peerTransfers: day.peerTransfers + (fromIssuer ? 0 : 1),
    volume: day.volume + amount,
    peerVolume: day.peerVolume + (fromIssuer ? 0n : amount),
    holders: stats.holders,
  });
};

const where = { accounts: { mint: MINT } };

indexer.onInstruction(
  { program: "Token2022", instruction: "transferChecked", fields, where },
  (call) => handleTransfer(call, call.instruction.args.amount, 0n),
);

indexer.onInstruction(
  { program: "Token2022", instruction: "transferCheckedWithFee", fields, where },
  (call) => handleTransfer(call, call.instruction.args.amount, call.instruction.args.fee),
);
