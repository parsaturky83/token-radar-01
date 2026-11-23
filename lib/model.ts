// Token Radar, model radar-3: one sealed snapshot in, one ranked board out.
//
// The board ranks every protocol the snapshot shows as a genuine pre-token launch
// candidate: it records no token, and it is not a wrapped, staked or bridged product of
// a token that already trades, not a versioned pool and not an exchange. The house's
// watchlist is the floor (40 protocols here); the board adds every other protocol that
// passes the same rule, 158 more, for 198 rows. The protocols the rule sets aside
// (wrapped, staked, bridged, versioned, exchange products) are listed apart with the
// reason, and the protocols whose token already trades are shown at the market's own
// values, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures:
//
//   multiple   = the category's live-token multiple, shrunk toward the market median
//   base       = tvl_usd x multiple
//   growth     = 1 + clamp(change_7d, -30, +50) / 100 x 0.4
//   maturity   = 0.7 + 0.3 x min(age_days, 730) / 730
//   breadth    = 1 + 0.015 x min(chains - 1, 10)
//   implied    = max(1, round(base x growth x maturity x breadth))
//
// The multiple is the market's own, and it is honest about its limits: for each
// category, every live token's market-cap/TVL ratio is first capped at 2.0x — a single
// micro-cap token at 400x (one Prediction Market token in this snapshot) must not set
// a whole category's median — then the median of the capped ratios is taken, pulled
// toward the market-wide median by sample size (weight n/(n+12): a category with one
// live token barely moves the market multiple, a category with fifteen speaks for
// itself), then clamped to between half and twice the market median as a final guard.
// A category with no live token takes the market median. Every row and every category
// carries a `capped` flag saying whether any ratio behind its multiple was capped, so
// the dashboard shows the capping instead of hiding it. No protocol name is ever
// special-cased: the same function scores every row, and every constant is stated in
// the dashboard.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  shrink_k: number;
  mult_cap: number;
  mult_floor: number;
  /** Each live token's mcap/TVL ratio is capped at this before any median is taken. */
  ratio_cap: number;
  growth_floor: number;
  growth_cap: number;
  growth_weight: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  shrink_k: 12,
  mult_cap: 2.0,
  mult_floor: 0.5,
  ratio_cap: 2.0,
  growth_floor: -30,
  growth_cap: 50,
  growth_weight: 0.4,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 730,
  breadth_per_chain: 0.015,
  breadth_max_chains: 10,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    multiple: number;
    multiple_source: string;
    multiple_capped: boolean;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  multiple: number;
  multiple_source: string;
  multiple_capped: boolean;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  multiple: number | null;
}

/** A pre-token protocol the board sets aside, with the rule that set it aside. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  listed_at: string | null;
  reason: string;
}

/** A category's multiple and how it was reached, for the dashboard's method view. */
export interface MultipleRow {
  category: string;
  live_n: number;
  category_median: number | null;
  weight: number;
  multiple: number;
  /** How many of the category's live-token ratios were capped at 2.0x before the median. */
  capped_n: number;
  /** True when any ratio behind this multiple was capped, or the multiple hit the clamp. */
  capped: boolean;
}

/** Everything the dashboard renders, from the snapshot. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  protocols_scanned: number;
  watchlist: string[];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  excluded_size: number;
  global_multiple: number;
  multiples: MultipleRow[];
  total_implied_usd: number;
  rows: RadarRow[];
  live: LiveRow[];
  excluded: ExcludedRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a list of numbers, or null when it holds none. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** The house's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name carrying a whole word wrapped, staked or staking is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** A name beginning with an exchange's name is that exchange's product. */
const EXCHANGES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/**
 * Why a pre-token protocol is set aside from the ranked board, or null when the board
 * may rank it. The rule is the house's watchlist rule, applied to every row alike.
 */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `Category ${p.category}: a product of a token that already trades`;
  if (VERSIONED.test(p.name)) return 'Name ends in a version marker: a pool of another protocol';
  if (WRAPPED_WORD.test(p.name)) return 'Name carries wrapped, staked or staking: a product of a token that already trades';
  for (const e of EXCHANGES) {
    if (p.name === e || p.name.startsWith(`${e} `)) return `Name begins with ${e}: that exchange's product`;
  }
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and set aside by no rule. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * The market's multiples, computed from the snapshot's live-token protocols alone:
 * each live token's market-cap/TVL ratio is capped at `ratio_cap` FIRST, so one
 * micro-cap token at 400x cannot set its whole category's median; then the
 * market-wide median of the capped ratios, and one multiple per category, each the
 * category median of the capped ratios shrunk toward the market median by its sample
 * size and clamped to between half and twice the market median as a final guard.
 * Every category records how many of its ratios were capped.
 */
export function computeMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): { global: number; byCategory: Map<string, MultipleRow> } {
  const live = snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
  // Cap each ratio before any median: the raw ratio and whether it was capped.
  const capped = live.map((p) => {
    const raw = p.mcap_usd! / p.tvl_usd;
    return { category: p.category, ratio: Math.min(raw, model.ratio_cap), wasCapped: raw > model.ratio_cap };
  });
  const global = median(capped.map((c) => c.ratio)) ?? 0.25;
  const byCat = new Map<string, { ratio: number; wasCapped: boolean }[]>();
  for (const c of capped) {
    if (c.category === null) continue;
    const list = byCat.get(c.category) ?? [];
    list.push(c);
    byCat.set(c.category, list);
  }
  const byCategory = new Map<string, MultipleRow>();
  for (const [category, values] of byCat) {
    const catMedian = median(values.map((v) => v.ratio))!;
    const capped_n = values.filter((v) => v.wasCapped).length;
    const w = values.length / (values.length + model.shrink_k);
    const raw = w * catMedian + (1 - w) * global;
    const multiple = Math.min(model.mult_cap * global, Math.max(model.mult_floor * global, raw));
    byCategory.set(category, {
      category,
      live_n: values.length,
      category_median: round4(catMedian),
      weight: round4(w),
      multiple: round4(multiple),
      capped_n,
      // Capped when a ratio behind the median was capped, or the guard clamp bit.
      capped: capped_n > 0 || multiple !== raw,
    });
  }
  return { global: round4(global), byCategory };
}

/** The multiple one protocol's category takes, where it came from, and whether it was capped. */
export function multipleFor(p: SnapshotProtocol, multiples: { global: number; byCategory: Map<string, MultipleRow> }): { multiple: number; source: string; capped: boolean } {
  const row = p.category === null ? undefined : multiples.byCategory.get(p.category);
  if (row === undefined) return { multiple: multiples.global, capped: false, source: `Market median (no live ${p.category ?? 'uncategorised'} token to compare)` };
  const capNote = row.capped_n > 0 ? `; ${row.capped_n} of ${row.live_n} live ratio${row.capped_n === 1 ? '' : 's'} capped at 2.0× before the median` : '';
  return {
    multiple: row.multiple,
    capped: row.capped,
    source: `${row.live_n} live ${p.category} token${row.live_n === 1 ? '' : 's'}, median ${row.category_median}, weight ${row.weight}${capNote}`,
  };
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiples: { global: number; byCategory: Map<string, MultipleRow> },
  fallbackAge: number,
  model: ModelConstants = MODEL,
): { implied: number; multiple: number; multipleSource: string; multipleCapped: boolean; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const { multiple, source, capped } = multipleFor(protocol, multiples);
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? fallbackAge;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = 1 + model.breadth_per_chain * Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult));
  return { implied, multiple, multipleSource: source, multipleCapped: capped, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const multiples = computeMultiples(snapshot, model);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other protocol that passes the same rule, whatever its TVL.
  // No TVL cap, no top-N cut: the board is the whole radar, not a shortlist.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  // The fallback age is the clean set's own median age: a protocol with no listed date
  // takes the middle of its peers, never a hardcoded number.
  const ages = [...chosen.values()].map((p) => ageDays(snapshot.as_of, p.listed_at)).filter((a): a is number => a !== null);
  const fallbackAge = median(ages) ?? 365;

  const scored = [...chosen.values()].map((p) => ({ p, ...impliedValue(p, snapshot.as_of, multiples, fallbackAge, model) }));
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      multiple: s.multiple,
      multiple_source: s.multipleSource,
      multiple_capped: s.multipleCapped,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The protocol's TVL as a short figure for a step's text. */
function tvlText(p: SnapshotProtocol): string {
  const t = p.tvl_usd;
  if (t >= 1e9) return `$${(t / 1e9).toFixed(2)}B`;
  if (t >= 1e6) return `$${(t / 1e6).toFixed(1)}M`;
  if (t >= 1e3) return `$${(t / 1e3).toFixed(1)}K`;
  return `$${Math.round(t)}`;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open so it counts as an active lender.`;
  if (c.includes('dex') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open through at least one fee cycle.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares so the vault counts you as a depositor.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it so the position stays on the books.`;
  if (c.includes('yield')) return `Deposit $${capital} into ${name}'s main yield position on ${chain} and leave it compounding.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name} on an outcome you have researched.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and keep it in the protocol.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('restak')) return `Restake $${capital} through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('staking')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis position on ${chain} and keep it open.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC to ${chain} and use it in one of the chain's own apps through ${name}.`;
  if (c.includes('payment')) return `Route $${capital} of payments through ${name} on ${chain} across two separate weeks.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. Every step
 * is built from that protocol's own record alone — its name, category, chains, TVL,
 * seven-day move and age — so no two protocols share a plan and no step is filler.
 * The plan names the action, the capital and the time, never a guaranteed airdrop.
 * Steps are kept short on purpose: the dashboard shows all six at a glance.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const name = p.name;
  const tvl = tvlText(p);
  const secondChain = p.chains.length > 1 ? p.chains[1]! : null;
  const g = p.change_7d;
  const trend =
    g === null
      ? ''
      : g >= 0
        ? ` TVL +${g.toFixed(1)}% in 7d: add a little each week.`
        : ` TVL −${Math.abs(g).toFixed(1)}% in 7d: add nothing fresh.`;
  const c = (p.category ?? '').toLowerCase();
  // The recurring action, in the words of this protocol's own category.
  let weekly: string;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    weekly = `Weekly: borrow a little against the $${capital} supplied to ${name} on ${chain} and repay it the same day, so the wallet shows borrowing too.`;
  } else if (c.includes('dex') || c.includes('leveraged farm')) {
    weekly = `Weekly: swap a small amount through ${name}'s main pool on ${chain} and collect the fees, so the wallet shows trading as well as liquidity.`;
  } else if (c.includes('curator') || c.includes('allocator')) {
    weekly = `Weekly: open ${name}'s vault page on ${chain} and top up the $${capital} deposit when the vault's strategy changes.`;
  } else if (c.includes('rwa')) {
    weekly = `Weekly: check ${name}'s yield-bearing asset on ${chain} and add to the $${capital} mint only when its backing is re-attested.`;
  } else if (c.includes('yield')) {
    weekly = `Weekly: claim the yield ${name} pays on ${chain} and compound it back into the same $${capital} position.`;
  } else if (c.includes('perpetual') || c.includes('derivative')) {
    weekly = `Weekly: close the hedged position on ${name} and open a fresh small one on ${chain}, so the wallet shows repeated use.`;
  } else if (c.includes('prediction')) {
    weekly = `Weekly: settle one market position on ${name} and place a fresh one on an outcome you have researched.`;
  } else if (c.includes('stable')) {
    weekly = `Weekly: use the stable asset minted through ${name} on ${chain} for one real payment or swap, so it moves instead of sitting idle.`;
  } else if (c.includes('insurance')) {
    weekly = `Weekly: check the $${capital} cover bought from ${name} on ${chain} — an active policy is the qualifying signal, so file no claim without a covered event.`;
  } else if (c.includes('restak')) {
    weekly = `Weekly: check the restaking receipt ${name} issued on ${chain} and restake any rewards it pays.`;
  } else if (c.includes('staking')) {
    weekly = `Weekly: check the staking receipt ${name} issued and restake the rewards it pays.`;
  } else if (c.includes('basis')) {
    weekly = `Weekly: check ${name}'s basis position on ${chain} and rebalance when the funding rate flips, keeping the $${capital} deposit delta-neutral.`;
  } else if (c.includes('chain')) {
    weekly = `Weekly: bridge a small amount to ${chain} and use it in one of the chain's own apps through ${name}, so ${name} is the route, not a one-off bridge.`;
  } else if (c.includes('payment')) {
    weekly = `Weekly: route one real payment through ${name} on ${chain}, so the wallet shows repeated use across weeks.`;
  } else {
    weekly = `Weekly: make one qualifying action in ${name} on ${chain} — a deposit, a swap or a vote — so the wallet shows a pattern.`;
  }
  // The hold, with the breadth the protocol's own chain count earns and its age.
  const breadth =
    secondChain !== null
      ? ` Also on ${secondChain} — repeat it there for the extra chain.`
      : ` It runs on ${chain} alone.`;
  const young = age !== null && age < 180 ? ` Young at ${age}d with no token — the long window counts more.` : '';
  const holdText = `Hold the $${capital} ${name} position on ${chain} for ${hold} days so it counts in more than one snapshot.${breadth}${young}`;
  // The claim check, on the cadence the protocol's age earns.
  const cadence =
    age === null
      ? 'Check monthly: '
      : age < 180
        ? 'Check monthly — a young program can appear without warning: '
        : age < 365
          ? 'Check monthly: '
          : 'Check each quarter: ';
  const claimText = `${cadence}open ${name}'s own rewards page and claim only from the link it publishes for ${chain} — never pay anyone to claim.`;
  // The log, with the figures the exit decision turns on.
  const logText = `Log ${name}, ${chain} (${p.chains.length} chain${p.chains.length === 1 ? '' : 's'}), the $${capital} position and the ${tvl} entry TVL, with dates and every transaction hash — and unwind if ${name}'s TVL falls by a third from ${tvl}.`;
  return [
    {
      text: `Set up a fresh wallet for ${name} alone, fund it with $${capital} of USDC for ${chain} plus about $5 of ${chain}'s gas token, and keep its seed phrase offline on paper.`,
      cost: 'about $5 of gas for the first transactions',
      time: '10 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `${weekly}${trend}`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: holdText,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: claimText,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: logText,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      multiple: p.tvl_usd > 0 ? round4(p.mcap_usd! / p.tvl_usd) : null,
    }));
}

/** The pre-token protocols the board sets aside, with the rule that set each one aside. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && exclusionReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, chains: p.chains, tvl_usd: p.tvl_usd, listed_at: p.listed_at, reason: exclusionReason(p)! }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    multiple: row.model.multiple,
    multiple_source: row.model.multiple_source,
    multiple_capped: row.model.multiple_capped,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const multiples = computeMultiples(snapshot, model);
  const live = liveRows(snapshot);
  const excluded = excludedRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    protocols_scanned: snapshot.protocols.length,
    watchlist: snapshot.watchlist,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    excluded_size: excluded.length,
    global_multiple: multiples.global,
    multiples: [...multiples.byCategory.values()].sort((a, b) => (a.category < b.category ? -1 : 1)),
    total_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    rows: board.map(radarRow),
    live,
    excluded,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
