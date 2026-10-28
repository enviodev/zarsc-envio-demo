import { OVERVIEW_QUERY, usePolling, type OverviewData, type TransferRow } from "../api";
import { DailyBars, DailyLine, Legend } from "../charts";
import { ago, compactR, daysBetween, num, pct, R, solscanTx } from "../format";
import { Section, Stat, WalletLink } from "../ui";
import { useNav } from "../nav";

/** Fills quiet days with zero so the chart's x axis is a true timeline. */
const fillDays = <T extends { day: string }>(rows: T[], empty: (day: string) => T) => {
  if (!rows.length) return [];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return daysBetween(rows[0].day, rows[rows.length - 1].day).map((d) => byDay.get(d) ?? empty(d));
};

export const kindOf = (t: Pick<TransferRow, "fromIssuer" | "toIssuer" | "viaProgram">) =>
  t.fromIssuer ? "Issuer payout" : t.toIssuer ? "To issuer" : t.viaProgram ? "Via program" : "Peer to peer";

export function Overview({ now }: { now: number }) {
  const { hrefTo, linkTo } = useNav();
  const { data, error } = usePolling<OverviewData>(OVERVIEW_QUERY, {}, 5_000);
  if (!data) return <p className={error ? "error" : "loading muted"}>{error ? `Could not reach the indexer GraphQL API: ${error}` : "Loading ZARsc…"}</p>;

  const stats = data.GlobalStats[0];
  if (!stats) return <p className="loading muted">The indexer has not seen any ZARsc activity yet.</p>;
  const days = fillDays(data.DailyStat, (day) => ({ day, transfers: 0, peerTransfers: 0, volume: 0, peerVolume: 0, minted: 0, newWallets: 0, activeWallets: 0, holders: 0 }));
  // Holder counts only change on active days, so quiet days carry the last value forward.
  let carried = 0;
  const holders = days.map((d) => ({ day: d.day, value: (carried = d.holders || carried) }));
  const meta = data._meta[0];

  return (
    <>
      <section className="hero">
        <div>
          <span className="kicker">Live from Solana</span>
          <h1>
            ZARsc, <span className="accent">on-chain</span>
          </h1>
          <p className="lede">
            Every transfer and mint of the Rand stablecoin, as it happens. Indexed from the ZARsc Token-2022 mint with Envio
            HyperIndex, refreshed every five seconds.
          </p>
        </div>
        <div className="live-pill" title="Latest activity indexed">
          <span className="live-dot" />
          {meta?.isReady ? `Last transfer ${ago(stats.lastActivityAt, now)}` : "Syncing history…"}
        </div>
      </section>

      <div className="stats">
        <Stat label="Holders" value={num(stats.holders)} sub={`${num(stats.wallets)} wallets since 27 Feb`} />
        <Stat label="Transfers" value={num(stats.transfers)} sub={`${pct(stats.peerTransfers, stats.transfers)} not from the issuer`} />
        <Stat label="Volume moved" value={compactR(stats.transferVolume)} sub="Rand, all transfers" />
        <Stat label="Minted" value={compactR(stats.minted)} sub={`${num(stats.mints)} mints, ${num(stats.burns)} burns`} />
      </div>

      <div className="grid two">
        <Section title="Daily transfers" subtitle="Issuer payouts under peer-to-peer and program transfers">
          <Legend items={[{ label: "Issuer payouts", color: "var(--series-1)" }, { label: "Everything else", color: "var(--series-2)" }]} />
          <DailyBars
            data={days.map((d) => ({ day: d.day, a: d.transfers - d.peerTransfers, b: d.peerTransfers }))}
            label="Daily transfers split into issuer payouts and other transfers"
            aLabel="Issuer payouts"
            bLabel="Everything else"
          />
        </Section>
        <Section title="Holders over time" subtitle="Wallets with a balance above zero">
          <DailyLine data={holders} label="Holders over time" seriesLabel="Holders" />
        </Section>
      </div>

      <div className="grid two">
        <Section title="Latest transfers" subtitle="Newest first">
          <ul className="feed">
            {data.recent.map((t) => (
              <li key={t.id}>
                <div className="feed-main">
                  <span className="feed-route">
                    <WalletLink id={t.from_id} /> <span className="arrow">→</span> <WalletLink id={t.to_id} />
                  </span>
                  <span className="feed-meta">
                    <span className={`tag ${t.fromIssuer ? "issuer" : t.viaProgram ? "program" : ""}`}>{kindOf(t)}</span>
                    <a href={solscanTx(t.txSignature)} target="_blank" rel="noreferrer">
                      {ago(t.timestamp, now)}
                    </a>
                  </span>
                </div>
                <b className="amount">{R(t.amount)}</b>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Biggest holders" subtitle="By current balance">
          <ol className="leaders">
            {data.top.map((w, i) => (
              <li key={w.id}>
                <span className="rank">{i + 1}</span>
                <WalletLink id={w.id} />
                <span className="grow" />
                <b>{compactR(w.balance)}</b>
              </li>
            ))}
          </ol>
          <p className="note">
            Browse any wallet at <a href={hrefTo({ view: "wallet" })} onClick={linkTo({ view: "wallet" })}>/wallet</a>.
          </p>
        </Section>
      </div>
    </>
  );
}
