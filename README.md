# Token Radar — pre-token protocols ranked by implied value

[![Token Radar](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/parsaturky83/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/parsaturky83/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

An entry for [make.fun's token launch radar bounty](https://make.fun/bounty/token-radar-01): a
dashboard that finds the protocols whose token does not exist yet, ranks them by what that
token would be worth, and shows a reader how to farm each one.

## What it does

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama snapshot at
`/input/snapshot.json`, scores every genuine pre-token protocol, and writes:

- `board.json` — 198 ranked rows (the 40-protocol watchlist plus 158 more below the floor)
- `data.js` — the dashboard's dataset, so the page and the board can never disagree
- `dashboard/` — the static page: board, detail view per protocol, live-token and set-aside
  views, filters, sorting, and the method
- `screenshots/` — the board, a detail view, and a filtered view, rendered from this code
- `dossier.json` — built with the vendored `vendor/makefun-board.ts`

## The model (radar-2)

Implied value follows only from the snapshot's own figures — no protocol name is ever
special-cased:

```
implied = TVL × multiple × growth × maturity × breadth
multiple  = category median market-cap/TVL of live tokens, shrunk toward the
            market median by sample size, clamped to [0.5×, 2×] of it
growth    = 1 + clamp(7-day TVL change, −30%, +50%) × 0.4
maturity  = 0.7 + 0.3 × min(age with no token, 730d) / 730d
breadth   = 1 + 0.015 × min(chains − 1, 10)
```

A protocol ranks when its record carries no token and no rule sets it aside: its category
is not Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC or CEX; its
name ends in no version marker and carries no whole word wrapped, staked or staking; and it
does not begin with an exchange's name. That is the house's own watchlist rule, applied to
every row alike — so WBTC, Binance staked ETH and USDT0 sit in Set aside, not at the top
of the board. Protocols whose token already trades are shown at the market's own values.

Top of the board (snapshot 2026-11-14, total implied value $7.15B):

| Rank | Protocol | TVL | Implied value |
| --- | --- | --- | --- |
| 1 | Steakhouse Financial | $2.75B | $1.43B |
| 2 | Sentora Curator | $2.76B | $1.24B |
| 3 | Gauntlet | $1.58B | $842.7M |
| 4 | Veda | $1.56B | $313.0M |
| 5 | USDD | $1.06B | $225.2M |

Implied value is this radar's own model claim. It is not a prediction that a token is
issued, or when, or at what price — and "records no token" means the snapshot's record
carries none, not that the protocol has none.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

The program is deterministic: the same snapshot always writes the same bytes. Open
`out/dashboard/index.html` in a browser (it reads `out/data.js`, no network) — `#detail=<slug>`
opens a protocol's detail view, `#cat=<category>` filters the board.

## License

MIT — see [LICENSE](LICENSE).
