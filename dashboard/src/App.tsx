import { useEffect, useState } from "react";
import { INDEXER_CONFIGURED } from "./api";
import { CollabLockup, EnvioCta, LINKS, TokenButton } from "./brand";
import { MINT, solscanToken } from "./format";
import { NavContext } from "./nav";
import { routePath, useRoute, type Route } from "./router";
import { Insights } from "./views/Insights";
import { Overview } from "./views/Overview";
import { WalletView } from "./views/WalletView";

const VIEWS: { id: "overview" | "insights" | "wallet"; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "insights", label: "Insights" },
  { id: "wallet", label: "Wallet lookup" },
];

function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function App() {
  const now = useNow();
  const { route, linkTo, navigate } = useRoute();

  return (
    <NavContext.Provider value={{ hrefTo: routePath, linkTo, navigate }}>
      <div className="page">
        <header className="masthead">
          <div className="masthead-row">
            <CollabLockup />
            <TokenButton label="Get an Envio API token" />
          </div>
          <nav className="masthead-row">
            <div className="views" role="tablist" aria-label="Views">
              {VIEWS.map((v) => {
                const to: Route = v.id === "wallet" ? { view: "wallet" } : { view: v.id };
                return (
                  <a
                    key={v.id}
                    role="tab"
                    aria-selected={route.view === v.id}
                    className={route.view === v.id ? "view active" : "view"}
                    href={routePath(to)}
                    onClick={linkTo(to)}
                  >
                    {v.label}
                  </a>
                );
              })}
            </div>
            <a className="mint-link" href={solscanToken(MINT)} target="_blank" rel="noreferrer" title="ZARsc mint on Solscan">
              Mint {MINT.slice(0, 4)}…{MINT.slice(-4)} ↗
            </a>
          </nav>
        </header>

        <main>
          {!INDEXER_CONFIGURED && (
            <EnvioCta title="The indexer is almost live">
              This build isn't connected to an indexer yet. Deploy the HyperIndex indexer to Envio Cloud, then rebuild with
              its GraphQL endpoint in <code>VITE_GRAPHQL_URL</code>.
            </EnvioCta>
          )}
          {INDEXER_CONFIGURED && route.view === "overview" && <Overview now={now} />}
          {INDEXER_CONFIGURED && route.view === "insights" && <Insights />}
          {INDEXER_CONFIGURED && route.view === "wallet" && <WalletView key={route.address ?? ""} address={route.address} now={now} />}
          {INDEXER_CONFIGURED && route.view === "overview" && (
            <EnvioCta title="Index ZARsc, or any token, in minutes" />
          )}
        </main>

        <footer className="site-footer">
          <span>
            An unofficial demo by{" "}
            <a href={LINKS.envio} target="_blank" rel="noreferrer">
              Envio
            </a>{" "}
            for{" "}
            <a href={LINKS.supercoin} target="_blank" rel="noreferrer">
              Supercoin
            </a>
            , built from public on-chain data. History starts at 27 Feb 2026, where HyperSync's Solana archive begins.
          </span>
          <span>
            <a href={LINKS.envioToken} target="_blank" rel="noreferrer">
              Get an API token
            </a>{" "}
            ·{" "}
            <a href={LINKS.envioDocs} target="_blank" rel="noreferrer">
              Docs
            </a>{" "}
            ·{" "}
            <a href={LINKS.repo} target="_blank" rel="noreferrer">
              Source
            </a>
          </span>
        </footer>
      </div>
    </NavContext.Provider>
  );
}
