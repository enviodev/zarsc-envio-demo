import { INSIGHTS_QUERY, usePolling, type InsightsData } from "../api";
import { BucketBars, DailyBars, Legend } from "../charts";
import { compactR, daysBetween, longDate, num, pct, R, rand, solscanTx } from "../format";
import { Section, Stat, WalletLink } from "../ui";

const fillDays = <T extends { day: string }>(rows: T[], empty: (day: string) => T) => {
  if (!rows.length) return [];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return daysBetween(rows[0].day, rows[rows.length - 1].day).map((d) => byDay.get(d) ?? empty(d));
};

const BALANCE_BUCKETS = [
  { label: "Under R10", max: 10 },
  { label: "R10 – R100", max: 100 },
  { label: "R100 – R1,000", max: 1_000 },
  { label: "R1,000 – R10,000", max: 10_000 },
  { label: "R10,000 – R100,000", max: 100_000 },
  { label: "R100,000+", max: Infinity },
];

const SIZE_BUCKETS = [
  { label: "Under R100", max: 100 },
  { label: "R100 – R1,000", max: 1_000 },
  { label: "R1,000 – R10,000", max: 10_000 },
  { label: "R10,000 – R100,000", max: 100_000 },
  { label: "R100,000+", max: Infinity },
];

const bucket = (buckets: { label: string; max: number }[], values: number[]) =>
  buckets.map((b, i) => {
    const min = i === 0 ? 0 : buckets[i - 1].max;
    return { label: b.label, value: values.filter((v) => v >= min && v < b.max).length };
  });

export function Insights() {
  const { data, error } = usePolling<InsightsData>(INSIGHTS_QUERY, {}, 15_000);
  if (!data) return <p className={error ? "error" : "loading muted"}>{error ? `Could not reach the indexer GraphQL API: ${error}` : "Loading insights…"}</p>;
  const stats = data.GlobalStats[0];
  if (!stats) return <p className="loading muted">The indexer has not seen any ZARsc activity yet.</p>;

  const days = fillDays(data.DailyStat, (day) => ({ day, transfers: 0, peerTransfers: 0, volume: 0, peerVolume: 0, minted: 0, newWallets: 0, activeWallets: 0, holders: 0 }));
  const nonIssuer = data.balances.filter((w) => !w.isIssuer);
  const held = nonIssuer.reduce((sum, w) => sum + Number(w.balance), 0);
  const top10 = nonIssuer.slice(0, 10).reduce((sum, w) => sum + Number(w.balance), 0);
  const programVolume = data.programs.reduce((sum, t) => sum + Number(t.amount), 0);
  const peerVolume = days.reduce((sum, d) => sum + Number(d.peerVolume), 0);
  const volume = Number(stats.transferVolume);
  const engaged = nonIssuer.filter((w) => rand(w.balance) >= 1).length;

  return (
    <>
      <section className="hero compact">
        <div>
          <span className="kicker">For the Supercoin team</span>
          <h1>
            How ZARsc is <span className="accent">used</span>
          </h1>
          <p className="lede">
            Who holds ZARsc, how big the payments are, and how much moves without the issuer. All of it comes straight from
            the indexer's entities: no spreadsheets, no RPC scraping.
          </p>
        </div>
      </section>

      <div className="stats">
        <Stat label="Peer-to-peer share" value={pct(peerVolume, volume)} sub={`of ${compactR(volume)} moved, not sent by the issuer`} />
        <Stat label="Top 10 holders" value={pct(top10, held)} sub="of balances outside the issuer" />
        <Stat label="Wallets with R1+" value={num(engaged)} sub={`of ${num(stats.holders)} holders, the rest hold dust`} />
        <Stat label="Via other programs" value={pct(stats.programTransfers, stats.transfers, 1)} sub={`${num(stats.programTransfers)} transfers, ${compactR(programVolume)}`} />
      </div>

      <div className="grid two">
        <Section title="Daily volume" subtitle="Rand moved, issuer payouts under everything else">
          <Legend items={[{ label: "Issuer payouts", color: "var(--series-1)" }, { label: "Everything else", color: "var(--series-2)" }]} />
          <DailyBars
            data={days.map((d) => ({ day: d.day, a: rand(d.volume) - rand(d.peerVolume), b: rand(d.peerVolume) }))}
            label="Daily volume in Rand"
            aLabel="Issuer payouts"
            bLabel="Everything else"
            format={(n) => R(n * 1e6, 0)}
            axisFormat={(n) => compactR(n * 1e6)}
          />
        </Section>
        <Section title="New and active wallets" subtitle="First-time wallets under returning ones">
          <Legend items={[{ label: "New wallets", color: "var(--series-1)" }, { label: "Returning wallets", color: "var(--series-2)" }]} />
          <DailyBars
            data={days.map((d) => ({ day: d.day, a: d.newWallets, b: Math.max(0, d.activeWallets - d.newWallets) }))}
            label="New and returning wallets active each day"
            aLabel="New wallets"
            bLabel="Returning wallets"
          />
        </Section>
      </div>

      <div className="grid two">
        <Section title="Balance distribution" subtitle="Holders by current balance">
          <BucketBars rows={bucket(BALANCE_BUCKETS, nonIssuer.map((w) => rand(w.balance)))} unit="wallets" />
        </Section>
        <Section title="Payment sizes" subtitle="Transfers by amount">
          <BucketBars rows={bucket(SIZE_BUCKETS, data.sizes.map((t) => rand(t.amount)))} unit="transfers" />
        </Section>
      </div>

      <Section title="Mints" subtitle="New ZARsc issued since the indexer's start slot">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>To</th>
                <th className="num">Amount</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {data.mints.map((m) => (
                <tr key={m.id}>
                  <td>{longDate(m.timestamp)}</td>
                  <td>
                    <WalletLink id={m.recipient_id} />
                  </td>
                  <td className="num">{R(m.amount, 0)}</td>
                  <td>
                    <a href={solscanTx(m.txSignature)} target="_blank" rel="noreferrer">
                      Solscan ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
