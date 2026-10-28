# ZARsc on-chain: Envio HyperIndex demo

An [Envio HyperIndex](https://docs.envio.dev) indexer for **ZARsc**, the
Rand-pegged stablecoin from [Supercoin](https://www.supercoin.co.za/) on Solana,
plus a live dashboard built on its GraphQL API.

- `indexer/`: HyperIndex project (`ecosystem: svm`)
- `dashboard/`: Vite + React dashboard, branded Supercoin × Envio, polling the indexer every 5 seconds. Three views:
  - **Overview** (`/`): holders, transfers, volume, mints, daily activity, holders over time, latest transfers, biggest holders
  - **Insights** (`/insights`): peer-to-peer share, concentration, balance and payment-size distributions, new vs returning wallets, every mint
  - **Wallet lookup** (`/wallet/<address>`): any wallet's balance, totals and recent transfers

This is an independent demo built from public on-chain data. It is not an
official Supercoin product.

## The token

ZARsc is not a program of its own. It is a mint of the SPL **Token-2022** program:
[`5ekaHEqpRUXH4RoZVRMErdJE74bibWAzihMtPcjKyceQ`](https://solscan.io/token/5ekaHEqpRUXH4RoZVRMErdJE74bibWAzihMtPcjKyceQ)
(6 decimals, mint authority `UuicDY26…JAgk`). It uses the metadata pointer,
transfer hook, interest-bearing, pausable, transfer-fee, permanent-delegate and
close-authority extensions.

So the indexer subscribes to Token-2022 instructions and narrows them to this
mint with `where: { accounts: { mint } }`, which HyperSync applies server-side.
Only the program's single-byte instructions that name the mint are decoded:

| Byte | Instruction | Calls so far | Used for |
|---|---|---|---|
| `0x0c` | `transferChecked` | 3,219 | Transfers, volume, peer-to-peer vs issuer payouts |
| `0x1a01` | `transferCheckedWithFee` | 2 | Same, with the transfer-fee extension's fee |
| `0x0e` / `0x07` | `mintToChecked` / `mintTo` | 5 / 0 | Issuance |
| `0x0f` / `0x08` | `burnChecked` / `burn` | 0 / 0 | Redemptions (none on-chain yet) |
| `0x12` | `initializeAccount3` | 705 | Wallets joining before they hold anything |

Balances are not summed from instruction amounts. Each handler reads the
token account's owner and **post-balance** from the transaction's account
activity, so they stay correct for wallets that held ZARsc before the indexer's
first slot, and the holder count follows from balance changes crossing zero.

### What the data shows

As of slot 462,500,000 (28 Oct 2026):

| | |
|---|---|
| Transfers | 3,221 (R9.6M moved) |
| Minted | R4.15M in 5 mints (Jul 8 – Aug 26, 2026) |
| Burned | none |
| Wallets / holders | 749 / 687 |
| Sent by the issuer | 1,605 transfers; the rest are peer-to-peer or via other programs (49 CPIs) |

### History limit

HyperSync's Solana archive starts at slot ~403,000,000 (27 Feb 2026) and stalls
on anything earlier, so ZARsc's first months (it launched in Aug 2025) are not
indexed. Minted totals are therefore "since 27 Feb 2026", while on-chain supply
today is about R8.18M. Balances are unaffected, because they come from
post-balances.

## Running it

You need Node 22.15+ (24 recommended), pnpm, Docker, and an Envio API token
([envio.dev/app/api-tokens](https://envio.dev/app/api-tokens)) for HyperSync.

```bash
# 1. Indexer: Postgres + Hasura in Docker, GraphQL on http://localhost:8080
cd indexer
pnpm install
echo 'ENVIO_API_TOKEN=<your-token>' > .env
pnpm dev

# 2. Dashboard, in a second terminal: http://localhost:5173
cd dashboard
pnpm install
pnpm dev
```

A full backfill takes a minute or two, then the indexer follows the chain head.
The dashboard proxies `/v1/graphql` to `localhost:8080`; set
`GRAPHQL_PROXY_TARGET`, or `VITE_GRAPHQL_URL` for a deployed indexer, to change it.

```bash
cd indexer && pnpm test   # HyperSync replay pinned to slot 462,500,000
```

The test calls HyperSync, so CI needs an `ENVIO_API_TOKEN` repository secret.

## Deploying

### Indexer on Envio Cloud

```bash
npx envio-cloud login
npx envio-cloud indexer add \
  --org enviodev \
  --name zarsc \
  --repo zarsc-envio-demo \
  --branch main \
  --root-dir indexer/ \
  --config-file config.yaml
npx envio-cloud deployment status zarsc <commit> --watch-till-synced
npx envio-cloud deployment endpoint zarsc <commit>   # the GraphQL URL for the dashboard
```

Envio Cloud only sees commits pushed after the indexer is added, so the first
deployment starts with the next push.

### Dashboard on GitHub Pages

`.github/workflows/pages.yml` builds `dashboard/` on every push to `main` that
touches it.

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → **Variables**: set
   `ENVIO_GRAPHQL_URL` to the endpoint from the step above.
3. Push to `main` or run the "Dashboard (GitHub Pages)" workflow. The site is
   served at `https://enviodev.github.io/zarsc-envio-demo/`.

Until the variable is set the site deploys with a "not connected yet" notice.
