import { useState } from "react";
import { usePolling, WALLET_QUERY, type TransferRow, type WalletData } from "../api";
import { ago, compactR, ISSUER, isAddress, longDate, num, R, shortAddress, solscanAccount, solscanTx } from "../format";
import { useNav } from "../nav";
import { Section, Stat, WalletLink } from "../ui";
import { kindOf } from "./Overview";

export function WalletView({ address, now }: { address?: string; now: number }) {
  const { hrefTo, linkTo, navigate } = useNav();
  const [input, setInput] = useState(address ?? "");
  const valid = address ? isAddress(address) : false;
  const { data, error } = usePolling<WalletData>(WALLET_QUERY, { id: address ?? "" }, 10_000, valid);

  return (
    <>
      <section className="hero compact">
        <div>
          <span className="kicker">Wallet lookup</span>
          <h1>
            Any <span className="accent">ZARsc</span> wallet
          </h1>
          <p className="lede">Paste a Solana wallet address (the owner, not the token account) to see its balance and recent transfers.</p>
        </div>
      </section>

      <form
        className="lookup"
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddress(input.trim())) navigate({ view: "wallet", address: input.trim() });
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Wallet address" spellCheck={false} aria-label="Wallet address" />
        <button type="submit" disabled={!isAddress(input.trim())}>
          Look up
        </button>
        <a className="ghost-button" href={hrefTo({ view: "wallet", address: ISSUER })} onClick={linkTo({ view: "wallet", address: ISSUER })}>
          Try the issuer
        </a>
      </form>

      {address && !valid && <p className="error">That does not look like a Solana address.</p>}
      {valid && error && !data && <p className="error">Could not reach the indexer GraphQL API: {error}</p>}
      {valid && data && !data.Wallet_by_pk && <p className="muted">No ZARsc activity found for {shortAddress(address!)} since 27 Feb 2026.</p>}
      {valid && data?.Wallet_by_pk && <Details wallet={data.Wallet_by_pk} data={data} now={now} />}
    </>
  );
}

function Details({ wallet, data, now }: { wallet: NonNullable<WalletData["Wallet_by_pk"]>; data: WalletData; now: number }) {
  const rows = [...data.outgoing, ...data.incoming]
    .filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 25);
  const direction = (t: TransferRow) => (t.from_id === wallet.id ? "out" : "in");

  return (
    <>
      <div className="stats">
        <Stat label="Balance" value={R(wallet.balance)} sub={wallet.isIssuer ? "Mint authority and issuer" : `Token account ${shortAddress(wallet.tokenAccount)}`} />
        <Stat label="Sent" value={compactR(wallet.sent)} sub={`${num(wallet.sentCount)} transfers`} />
        <Stat label="Received" value={compactR(wallet.received)} sub={`${num(wallet.receivedCount)} transfers`} />
        <Stat label="First seen" value={longDate(wallet.firstSeenAt)} sub={`Last active ${ago(wallet.lastActiveAt, now)}`} />
      </div>
      <Section
        title="Recent transfers"
        subtitle={`Latest ${rows.length} in or out`}
        aside={
          <a className="ghost-button" href={solscanAccount(wallet.id)} target="_blank" rel="noreferrer">
            Solscan ↗
          </a>
        }
      >
        <ul className="feed">
          {rows.map((t) => (
            <li key={t.id}>
              <div className="feed-main">
                <span className="feed-route">
                  <span className={`dir ${direction(t)}`}>{direction(t) === "out" ? "Sent to" : "Received from"}</span>{" "}
                  <WalletLink id={direction(t) === "out" ? t.to_id : t.from_id} />
                </span>
                <span className="feed-meta">
                  <span className={`tag ${t.fromIssuer ? "issuer" : t.viaProgram ? "program" : ""}`}>{kindOf(t)}</span>
                  <a href={solscanTx(t.txSignature)} target="_blank" rel="noreferrer">
                    {ago(t.timestamp, now)}
                  </a>
                </span>
              </div>
              <b className={`amount ${direction(t)}`}>
                {direction(t) === "out" ? "−" : "+"}
                {R(t.amount)}
              </b>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
