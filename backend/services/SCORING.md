# PipeChamp Scoring Methodology

This document is the source of truth for how PipeChamp grades a pipeline. It is
deliberately transparent — it's meant to survive the question every consultant
and founder asks: **"where did this number come from?"**

## The model: two funnels, one grade

Analytics are bucketed into the two jobs a revenue org actually has:

1. **Marketing** — generate leads and convert them to Sales-Qualified (Lead → SQL).
2. **Sales** — take SQLs and convert them to customers (SQL → Opportunity → Won).

(Retention / repeat is a deliberate future third funnel, not scored yet.)

Each funnel gets a **0–100 score** and a **letter grade**. A single **overall
grade** (50/50 blend of the two funnels, renormalized to whatever data exists) is
the headline — credit-score style — with the two sub-scores as the breakdown so
you can see *which half* is broken.

## Dimensions & weights

### Marketing
| Dimension | Weight | Benchmark | Source |
|---|---|---|---|
| Lead → SQL conversion | 45% | 13% = par | Aggregated B2B funnel benchmarks (Salesforce/Implisit) |
| Follow-up coverage (% of active contacts with ≥1 touch) | 30% | >90% | Activity-hygiene target |
| Source diversity (no single source >70% of leads) | 25% | <70% concentration | Diversification guardrail |

### Sales
| Dimension | Weight | Benchmark | Source |
|---|---|---|---|
| **Deal-stage conversion %** | 30% | per-stage, vs the deal's own history | Ever-reached-stage → won methodology |
| Win rate | 25% | 20% = par | Aggregate B2B close-rate benchmarks |
| Stalled deals (% of open $ stuck past stage window) | 20% | minimize | Stage-aging |
| Speed-to-lead (median first response) | 15% | <1h excellent | Lead Response Mgmt Study; HBR "Short Life of Online Sales Leads" |
| Sales cycle length | 10% | deal-size-adjusted norm | Internal |

Benchmarks live in `BENCHMARKS` in `scoring.js` and are **swappable** — the whole
point is that when real per-industry data exists (e.g. an agency's construction
clients), you replace these defaults and every grade re-weights.

## Deal-stage conversion — the important methodology detail

Deals **skip stages**. Measuring linear stage→stage conversion is therefore
wrong. Instead, for each stage we ask:

> Of all deals that **ever entered** this stage, what % are now closed-won?

"Ever entered" is read from each deal's `dealstage` **property history**
(`propertiesWithHistory=dealstage` on the deals batch-read endpoint), so a deal
that jumped from Qualified straight to Closed Won still counts as having reached
every stage it actually touched. Stages with fewer than 3 deals are marked
`lowSample` and excluded from the score.

## Revenue impact

Estimated $ opportunity is **grounded in the portal's own numbers** — its real
average won-deal size and real record counts — never a fabricated multiplier.
Each line shows its derivation. Current estimates:

- **Win-rate gap**: `(20% benchmark − your win rate) × your closed-deal count × your avg deal size`
- **Un-touched leads**: `count of active no-touch leads × your lead→customer rate × your avg deal size`
- **Stalled deals**: `sum of stuck open-deal value × your win rate`

If there are no won deals yet, revenue impact is suppressed rather than guessed.

## Data sources

All figures derive from HubSpot CRM data already pulled via `getCachedData()`:
contacts (lifecycle-stage dates), deals (stage, amount, dates), deal pipeline
definitions, and deal stage history. No data leaves the session cache.
