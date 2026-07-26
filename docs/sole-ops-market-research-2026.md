# Sole Ops — Secondhand Market Research & Pricing Roadmap (2026)

Research summary driving the comps-based pricing redesign. Recovered/rewritten 2026-07-26
after the original doc from a prior session was never actually saved.

## Is thrifting still a thing in 2026?

Yes — heavily.

- ~42% of U.S. consumers bought secondhand clothing or accessories in the past year.
- Secondhand apparel, accessories, and footwear spending reached roughly **$55.5B in 2025**,
  ~12% of category spending, with share still increasing in early 2026.
- The secondhand apparel market is projected to reach **$393B by 2030**.
- Primary motivations: saving money, finding unique products, accessing brands at lower
  prices, sustainability, and earning money from items already owned.
- eBay's recommerce research: 86% of U.S. consumers felt good about money saved through
  pre-owned purchases.

## The shoe market has shifted (why AI estimates from memory run high)

The market is active but far more fragmented than the peak hype-resale era. Demand is
moving toward:

- ASICS and runner-inspired models; performance basketball shoes (esp. Kobe models)
- Slimmer soccer and retro silhouettes; New Balance and less obvious brands
- Wearable everyday shoes rather than only hype releases

StockX 2025: ASICS +45% YoY, Saucony +38%, Mizuno +148%, Brooks +1,500%; Kobe 6 Protro
sales more than doubled. Meanwhile Nike/Jordan market share declined and Dunk trading
dropped significantly. **A broad AI estimate can feel too high because it remembers the
older, hype-driven resale environment rather than the exact shoe's current liquidity.**

## How Sole Ops calculates prices

Not: *"AI thinks this shoe is worth $180."*

Instead: *"Nine comparable pairs sold in the past 14 days. Five were the exact size. The
condition-adjusted median was $132. List at $145 and expect an accepted price near $135."*

### Comp hierarchy (evidence quality, best → worst)

1. Exact SKU, exact size, comparable condition
2. Exact SKU, adjacent size, comparable condition
3. Exact model + colorway, exact size
4. Exact model + colorway, adjacent size
5. Broader model-family results

Lower-quality evidence reduces the confidence score.

### Weighted median, not simple average

Each comp is weighted by **recency × identity match × size match × condition match ×
box match × source reliability**. Exclude: active listings, replicas, replacement-box
listings, bundles, parts-only, extreme outliers, wrong colorways, unrelated youth/women's
sizing, and listings whose condition can't be determined.

### Outputs

| Recommendation | Meaning |
| --- | --- |
| Quick sale | Competitive price near the lower recent range |
| Market price | Condition-adjusted recent median |
| Patient price | Upper range with slower-sale warning |
| Expected accepted price | Realistic negotiated transaction amount |
| Estimated net | Amount after fees and shipping |
| Maximum buy price | Highest sourcing cost that still meets the desired margin |

**The most important number for a reseller is often max buy price, not market value.**

### Show liquidity, not just value

Display comp count, sales in the past 14 days, evidence window, exact-size count, price
direction, expected days to sell, and confidence. A $160 recommendation supported by two
old sales should look weaker than a $125 recommendation supported by twenty recent sales.

## Implemented (2026-07-26, `sole-ops/app.html` + `~/sole-ops-worker`)

- Anthropic web search (`web_search_20260209`, ≤3 searches) via the metered proxy; each
  search bills 2,000 weighted tokens (~$0.01) against device + global budgets.
- Model returns sold comps with `sold_price`, `date`, `days_ago`, `size_match`
  (exact/adjacent/other/unknown), `condition` (new/like_new/used/beat/unknown).
- **Client-side weighted median** (recency 14-day half-life × size × condition-distance
  weights) computes Quick (wP25) / Market (wP50) / Patient (wP75) / Expected Accepted
  (0.9×market) / Est. Net (eBay fees + shipping setting) / Max Buy (net ÷ (1+margin)).
- Tap-to-exclude any comp → instant recalculation, zero API calls.
- Confidence from comp quality: high = ≥5 comps ≤14d and ≥2 exact size; medium = ≥3 ≤30d
  with size evidence; <3 usable comps → model-estimate mode, clearly labeled.
- Comps win the headline; the AI's own range shows as a secondary line with a warning
  when they disagree by more than ~30%.
- Settings: target margin % (default 30) and est. shipping (default $12), persisted.

## Roadmap (deferred, in order)

1. **Thrift Sourcing Mode** — dedicated camera workflow: photograph shoe + size/SKU tag,
   enter the store price → BUY/PASS verdict with expected sale range, expected net,
   expected profit, and confidence ("BUY — expected net $94–$107, store price $32,
   profit $62–$75, high confidence, 14 recent sold comps").
2. **Broader category support** — running, performance basketball, vintage, outdoor/
   workwear, women's footwear; everyday ASICS/NB/Saucony/Brooks/Mizuno, not just hype.
3. **Stale-inventory intelligence** — for listed items, compare fresh comps and recommend
   hold / reduce / relist / change platform / bundle / liquidate.
4. **Learn from actual sales** — capture recommended vs. listed vs. accepted price,
   platform, days-to-sell, condition, size, confidence at the moment a pair sells. Key
   model metric: absolute % difference between predicted and actual accepted price. This
   feedback loop is what eventually makes Sole Ops more accurate than searching eBay
   manually.
