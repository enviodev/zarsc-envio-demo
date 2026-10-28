import { useEffect, useRef, useState } from "react";

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || "/v1/graphql";

/** Dev proxies /v1/graphql to the local indexer; a production build needs VITE_GRAPHQL_URL. */
export const INDEXER_CONFIGURED = !import.meta.env.PROD || Boolean(import.meta.env.VITE_GRAPHQL_URL);

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(body.errors.map((e: { message: string }) => e.message).join("; "));
  return body.data as T;
}

/** Re-runs a query on an interval; keeps the last good data while a refresh is in flight. */
export function usePolling<T>(query: string, variables: Record<string, unknown>, intervalMs: number, enabled = true) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const key = JSON.stringify(variables);
  const latest = useRef(key);
  latest.current = key;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setData(undefined);
    const run = () =>
      gql<T>(query, variables)
        .then((d) => {
          if (cancelled || latest.current !== key) return;
          setData(d);
          setError(undefined);
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [query, key, intervalMs, enabled]);

  return { data, error };
}

/** Amounts are base units (6 decimals); Hasura returns BigInt as a string. */
type Amount = string | number;

export type Stats = {
  wallets: number;
  holders: number;
  transfers: number;
  peerTransfers: number;
  programTransfers: number;
  transferVolume: Amount;
  mints: number;
  minted: Amount;
  burns: number;
  burned: Amount;
  feesPaid: Amount;
  lastActivityAt: number;
};

export type Day = {
  day: string;
  transfers: number;
  peerTransfers: number;
  volume: Amount;
  peerVolume: Amount;
  minted: Amount;
  newWallets: number;
  activeWallets: number;
  holders: number;
};

export type WalletRow = {
  id: string;
  balance: Amount;
  sent: Amount;
  received: Amount;
  sentCount: number;
  receivedCount: number;
  firstSeenAt: number;
  lastActiveAt: number;
  isIssuer: boolean;
};

export type TransferRow = {
  id: string;
  timestamp: number;
  amount: Amount;
  txSignature: string;
  fromIssuer: boolean;
  toIssuer: boolean;
  viaProgram: boolean;
  from_id: string;
  to_id: string;
};

const TRANSFER_FIELDS = "id timestamp amount txSignature fromIssuer toIssuer viaProgram from_id to_id";

// ---------- Overview ----------

export type OverviewData = {
  _meta: { progressBlock: number; isReady: boolean }[];
  GlobalStats: Stats[];
  DailyStat: Day[];
  recent: TransferRow[];
  top: WalletRow[];
};

export const OVERVIEW_QUERY = /* GraphQL */ `
  query Overview {
    _meta { progressBlock isReady }
    GlobalStats {
      wallets holders transfers peerTransfers programTransfers transferVolume mints minted burns burned feesPaid lastActivityAt
    }
    DailyStat(order_by: { day: asc }, limit: 1000) {
      day transfers peerTransfers volume peerVolume minted newWallets activeWallets holders
    }
    recent: Transfer(order_by: [{ timestamp: desc }, { id: desc }], limit: 10) { ${TRANSFER_FIELDS} }
    top: Wallet(order_by: { balance: desc }, limit: 10) {
      id balance sent received sentCount receivedCount firstSeenAt lastActiveAt isIssuer
    }
  }
`;

// ---------- Insights ----------

export type InsightsData = {
  GlobalStats: Stats[];
  DailyStat: Day[];
  balances: { id: string; balance: Amount; isIssuer: boolean }[];
  sizes: { amount: Amount; fromIssuer: boolean }[];
  mints: { id: string; timestamp: number; amount: Amount; txSignature: string; recipient_id: string }[];
  programs: { amount: Amount }[];
};

export const INSIGHTS_QUERY = /* GraphQL */ `
  query Insights {
    GlobalStats {
      wallets holders transfers peerTransfers programTransfers transferVolume mints minted burns burned feesPaid lastActivityAt
    }
    DailyStat(order_by: { day: asc }, limit: 1000) {
      day transfers peerTransfers volume peerVolume minted newWallets activeWallets holders
    }
    balances: Wallet(where: { balance: { _gt: 0 } }, order_by: { balance: desc }, limit: 5000) { id balance isIssuer }
    sizes: Transfer(order_by: { timestamp: desc }, limit: 10000) { amount fromIssuer }
    mints: Mint(order_by: { timestamp: desc }, limit: 50) { id timestamp amount txSignature recipient_id }
    programs: Transfer(where: { viaProgram: { _eq: true } }, limit: 10000) { amount }
  }
`;

// ---------- One wallet ----------

export type WalletData = {
  Wallet_by_pk: (WalletRow & { tokenAccount: string }) | null;
  outgoing: TransferRow[];
  incoming: TransferRow[];
};

export const WALLET_QUERY = /* GraphQL */ `
  query WalletView($id: String!) {
    Wallet_by_pk(id: $id) {
      id tokenAccount balance sent received sentCount receivedCount firstSeenAt lastActiveAt isIssuer
    }
    outgoing: Transfer(where: { from_id: { _eq: $id } }, order_by: { timestamp: desc }, limit: 25) { ${TRANSFER_FIELDS} }
    incoming: Transfer(where: { to_id: { _eq: $id } }, order_by: { timestamp: desc }, limit: 25) { ${TRANSFER_FIELDS} }
  }
`;
