import { describe, it } from "vitest";
import { createTestIndexer } from "envio";

const SOLANA = 7565164;
const START_SLOT = 403_000_000;
const ISSUER = "UuicDY26j4dUf5QraXJ99PwPzGwZjRWZmnxcyMhJAgk";

// Replays ZARsc's real history from HyperSync up to a pinned slot, so the
// handlers are checked against on-chain data. Needs ENVIO_API_TOKEN.
describe("on-chain history", () => {
  it("indexes ZARsc as of slot 462,500,000", async (t) => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: { [SOLANA]: { startBlock: START_SLOT, endBlock: 462_500_000 } },
    });

    t.expect(await indexer.GlobalStats.getOrThrow("solana")).toMatchObject({
      wallets: 749,
      holders: 687,
      transfers: 3221,
      peerTransfers: 1616,
      programTransfers: 49,
      transferVolume: 9_597_036_072_133n,
      mints: 5,
      minted: 4_150_000_000_000n,
      burns: 0,
      feesPaid: 0n,
    });

    // The mint authority is flagged and its transfers split out of "peer" traffic.
    t.expect(await indexer.Wallet.getOrThrow(ISSUER)).toMatchObject({ isIssuer: true, sentCount: 1605 });
  }, 600_000);
});
