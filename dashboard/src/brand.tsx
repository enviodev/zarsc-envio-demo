import type { ReactNode } from "react";
import logo from "./assets/supercoin-logo.svg";

export const LINKS = {
  envioToken: "https://envio.dev/app/api-tokens",
  envioDocs: "https://docs.envio.dev/docs/HyperIndex/overview",
  envio: "https://envio.dev",
  supercoin: "https://www.supercoin.co.za/",
  repo: "https://github.com/enviodev/zarsc-envio-demo",
};

export function EnvioWordmark({ className = "" }: { className?: string }) {
  return <span className={`envio-wordmark ${className}`}>Envio</span>;
}

export function CollabLockup() {
  return (
    <span className="lockup">
      <a href={LINKS.supercoin} target="_blank" rel="noreferrer" className="lockup-brand" aria-label="Supercoin">
        <img src={logo} alt="Supercoin" height={22} />
      </a>
      <span className="lockup-x" aria-hidden>
        ×
      </span>
      <a href={LINKS.envio} target="_blank" rel="noreferrer" aria-label="Envio">
        <EnvioWordmark />
      </a>
    </span>
  );
}

export function TokenButton({ label = "Get a free Envio API token" }: { label?: string }) {
  return (
    <a className="token-button" href={LINKS.envioToken} target="_blank" rel="noreferrer">
      {label}
      <span aria-hidden>→</span>
    </a>
  );
}

/** What powers the page, and an invite to build with Envio. */
export function EnvioCta({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="cta">
      <div className="cta-copy">
        <span className="kicker">ZARsc × Envio</span>
        <h2>{title}</h2>
        <p>
          {children ?? (
            <>
              Every number on this page is indexed live from the ZARsc mint on Solana with <b>Envio HyperIndex</b>.
              Transfers, mints, balances and holder counts come out of a GraphQL API you own, with no RPC polling and
              no hand-written aggregate queries. Point it at any Solana program or token and it works the same way.
            </>
          )}
        </p>
        <div className="cta-actions">
          <TokenButton />
          <a className="ghost-button" href={LINKS.envioDocs} target="_blank" rel="noreferrer">
            Read the docs
          </a>
          <a className="ghost-button" href={LINKS.repo} target="_blank" rel="noreferrer">
            See this indexer's code
          </a>
        </div>
      </div>
      <pre className="terminal" aria-label="Get started with Envio">
        <span className="terminal-bar">
          <i />
          <i />
          <i />
        </span>
        <code>
          <span className="t-muted">$</span> pnpx envio init svm{"\n"}
          <span className="t-muted">? Name your indexer</span> zarsc{"\n"}
          <span className="t-ok">✓</span> Indexer ready{"\n"}
          <span className="t-muted">$</span> pnpm dev{"\n"}
          <span className="t-ok">✓</span> Synced 3,221 transfers{"\n"}
          <span className="t-accent">→ GraphQL on localhost:8080</span>
        </code>
      </pre>
    </section>
  );
}
