export const MINT = "5ekaHEqpRUXH4RoZVRMErdJE74bibWAzihMtPcjKyceQ";
export const ISSUER = "UuicDY26j4dUf5QraXJ99PwPzGwZjRWZmnxcyMhJAgk";
export const DECIMALS = 6;

export const num = (n: number) => n.toLocaleString("en-US");

/** Base units (6 decimals) as a number of Rand. */
export const rand = (baseUnits: string | number | bigint) => Number(baseUnits) / 10 ** DECIMALS;

/** "R 1,234.50" */
export const R = (baseUnits: string | number | bigint, digits = 2) =>
  `R${rand(baseUnits).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** "R3.4M", "R12.5k", "R480" */
export const compactR = (baseUnits: string | number | bigint) => {
  const v = rand(baseUnits);
  return `R${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: v >= 1e6 ? 2 : 1 }).format(v)}`;
};

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}`;
export const solscanAccount = (a: string) => `https://solscan.io/account/${a}`;
export const solscanToken = (a: string) => `https://solscan.io/token/${a}`;

export const shortDay = (day: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export const longDate = (t: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(t * 1000);

export const ago = (t: number, now = Date.now() / 1000) => {
  const s = Math.max(0, Math.round(now - t));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
};

export const pct = (part: number, whole: number, digits = 0) =>
  whole === 0 ? "0%" : `${((part / whole) * 100).toFixed(digits)}%`;

/** Every calendar day from `first` to `last`, inclusive, as YYYY-MM-DD. */
export const daysBetween = (first: string, last: string) => {
  const out: string[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
};

export const isAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
