# PipeChamp — Full Project Briefing

> A self-contained teaching doc. Read this to understand what PipeChamp is, who it's for, how it's built, what its IP is, and how it fits a larger product suite. Written to onboard another project or a fresh agent with zero prior context.

_Last updated: 2026-07-28._

---

## 1. What it is (in one breath)

**PipeChamp** (codename "hubspot-leak-finder") is a B2B SaaS revenue-intelligence tool. It connects to a HubSpot portal (read-only OAuth) and, in ~60 seconds, grades the health of that company's pipeline, shows exactly where revenue is leaking, and tells them what to do about it.

**The core promise:** _HubSpot shows you the data. PipeChamp tells you what's broken and how to fix it._

It is live at **pipechamp.app** and currently in beta.

---

## 2. Positioning — it's an action/upsell engine, not a passive report

The differentiator is the **"so what do I do?"** layer. Every weak area carries a chain:

> **gap → what's happening → recommended fix**

…where the fix is often a concrete next action or an upgrade/connect CTA (a HubSpot Pro workflow for speed-to-lead, an integration to unlock ROI, or a consultant's service for strategy). This is realized in `backend/services/recommendations.js` → rendered as a "What to do next" section on the Scorecard.

A key strategic frame: PipeChamp can be used by **HubSpot reps / partners / consultants as a sales tool to upgrade customers** — show a customer their biggest gaps and how HubSpot Pro (or an integration, or a consultant) closes them. Build recommendation/upsell affordances into every weak dimension.

**Consultant "Advisor lens" — DESIGNED, PARKED.** An upsell-first framing + aggregated upsell-opportunity summary + client-report framing for agencies. Not a separate app; a lens on the same engine. Parked until there's demand. **Hard constraint:** business owners must NOT see the consultant/upsell view. Because auth = "you connected a HubSpot portal" (no real user accounts), and a consultant connects their _client's_ portal, Advisor mode needs an explicit gate (leading idea: an access code; later an account/plan type once billing exists).

---

## 3. Who it's for (audience — this was a deliberate pivot)

PipeChamp is **NOT** for professional sales reps (they have tools and won't work inside it). The real audiences, from deep agency-owner feedback (Everbrave, construction vertical, 2026-07-10):

1. **Consultants / agencies** — use it as an audit tool to win and serve clients; run it repeatedly across an entire client base ("147 clients"); would pay per report run. Audits are a core agency lead-gen motion.
2. **Founders / leaders** — an accountability view to hold marketing vs sales accountable; solopreneurs finding where to focus.
3. **Starter-tier HubSpot users** — SMBs on HubSpot Free/Starter ($15–20/mo) who can't afford HubSpot Professional ($100+/seat/mo) but need Pro-level pipeline intelligence.

---

## 4. The Champ product suite (the bigger vision)

PipeChamp is app #1 in a planned family of "Champ" apps that share fundamentals:

- **PipeChamp** (current) — HubSpot pipeline analytics + scorecard. Later: variants for **Shopify, Stripe, SaaS**.
- **DataChamp** (priority #1 next) — evaluates a HubSpot portal for data cleanliness / hygiene.
- **CustomerChamp** (priority #2) — builds segments + personas from CRM/transaction data and answers "who buys, and where do I find more like them." (This is the held-back "customer-analysis app," see §7.)
- **CampaignChamp** (far out) — takes CustomerChamp output and generates messaging/creative + Meta/Google/TikTok/YouTube campaigns.

**Architecture direction to enable the suite** (do as deliberate refactors, not premature):
1. **Connector/adapter layer + normalized data model** — the biggest lever. Today analysis reads HubSpot-specific fields directly (`hs_analytics_source`, `dealstage`, `hs_lifecyclestage_*_date`, `num_contacted_notes`). Introduce a normalized model (Customer, Deal/Order, Activity, Source) with per-source adapters (HubSpot, Shopify, Stripe) so analysis becomes source-agnostic. Best moment to start: when DataChamp begins.
2. **DB-backed accounts + connections** — move tokens/connections out of the cookie-session into Postgres (encrypted), tied to real user accounts. Enables multi-source, shared accounts across apps, billing, the consultant multi-portal view, and scheduled reports.
3. **Monorepo + shared packages** (connectors, OAuth framework, core UI + design system, auth) — extract WHEN the 2nd app starts, not before; keep code modular now so extraction is cheap.
4. **Generalize OAuth** — 3 near-identical flows already exist (HubSpot, GA4, GSC). A provider-config-driven connector makes adding Shopify/Stripe/Meta trivial.

**Cheap discipline to keep now:** analysis should be pure functions on data; don't reference `hs_*` fields directly in new code; funnel all source-specific mapping through the connector.

---

## 5. The product surface (what's in the app)

Navigation (sidebar), grouped:

**ANALYZE**
- **Scorecard** (the hero / home; internal id still `dashboard`) — overall grade + Marketing and Sales sub-grades, goal/current/expected-close pipeline $, and the "What to do next" recommendation cards.
- **Growth Funnel / Marketing** (`MarketingPipeline.jsx`) — Impressions → Traffic → Lead → MQL → SQL, drop-off %, powered by GA4 + Search Console where connected.
- **Sales** (`SalesPipeline.jsx`) — SQL → Opportunity → Won, deal-stage conversion %, win rate.
- **At Risk** — deals about to go dark (risk scoring).
- **Lead Sources** — wins + revenue + opportunity-by-source + conversion% by source; handles "offline" sources.
- **Lead Response** (`SpeedToLead.jsx`) — median first-response time, "not contacted" list, spam-triage flow.
- **Revenue** (`RevenueTab.jsx`) — forecasting via deal-stage conversion, why-deals-lose (`closed_lost_reason`), time-to-win vs time-to-lose, revenue by job title.
- **Report** (`PipelineReport.jsx`) — exportable/schedulable report modules.

**PLAYBOOK**
- **Insights** — surfaced findings.
- **Ask PipeCoach** (`LaJefaChat.jsx`) — a plain-English AI chat over the pipeline data ("which rep has the best win rate?", "biggest drop-off stage?").

Plus **Integrations** and a **PRO** badge / **Disconnect** in the sidebar footer.

---

## 6. The scoring model — this is the core IP

Full source of truth: `backend/services/SCORING.md` and `backend/services/scoring.js`. **Read SCORING.md before touching scoring.** The doc is written to survive the question every consultant asks: **"where did this number come from?"**

**Two funnels, one grade:**
- **Marketing** — generate leads and convert to Sales-Qualified (Lead → SQL).
- **Sales** — convert SQLs to customers (SQL → Opportunity → Won).
- (Retention/repeat is a deliberate future third funnel, not scored yet.)

Each funnel gets a 0–100 score + letter grade. A single **overall grade** (50/50 blend, renormalized to whatever data exists) is the headline (credit-score style), with the two sub-scores as the breakdown so you can see _which half_ is broken.

**Dimensions & weights:**

_Marketing:_ Lead→SQL conversion (45%, par 13%), follow-up coverage (30%, >90%), source diversity (25%, no single source >70%).

_Sales:_ **Deal-stage conversion %** (30%), win rate (25%, par 20%), stalled deals (20%), speed-to-lead (15%, <1h excellent), sales cycle length (10%).

**The flagship methodology detail — deal-stage conversion %:** deals **skip stages**, so linear stage→stage measurement is wrong. Instead, for each stage: _"of all deals that **ever entered** this stage, what % are now closed-won?"_ "Ever entered" is read from each deal's `dealstage` **property history** (`propertiesWithHistory=dealstage`), so a deal that jumped straight to Won still counts every stage it touched. Stages with <3 deals are `lowSample` and excluded. This is the customization real consultants do for every client; a real anecdote (client assumed quote→close was 80%, actual 56%) is why it lands.

**Benchmarks are swappable** — `BENCHMARKS` in `scoring.js`. When real per-industry data exists, replace the defaults and every grade re-weights. Credibility is everything; benchmarks people believe are the moat.

**Adaptive tuning:** onboarding answers (business type, hubs, revenue, growth challenge, goal) tune the scorecard via `resolveScoreProfile(profile)` — **banded preset nudges, NOT per-portal statistics** — returning a `tunedFor` label + `methodology` notes ("why these weights?"). Sales-only/marketing-only profiles lock the unused funnel (rendered blurred = an intentional upsell hook). Stored in the session cookie (`GET/POST /api/reports/onboarding`).

**Revenue impact** is always **grounded in the portal's own numbers** (real average won-deal size, real record counts) — never a fabricated multiplier. Each line shows its derivation.

---

## 7. Hard-won product principles (don't relearn these the hard way)

- **Lifecycle stages are unreliable; be deal-first.** Many target SMBs (referral/offline-driven) don't maintain HubSpot **lifecycle stages**. Live test: Everbrave had 7,956 contacts, 40 won deals, $1.17M revenue, but **0 MQLs/SQLs/Customers**. Anything leaning on `hs_lifecyclestage_*_date` (Marketing funnel, Lead→SQL) looks empty/misleading, while **deal-based** metrics (win rate, revenue, deal-stage conversion) are the truth. TODO: detect empty lifecycle stages and fall back to deal-based funnel metrics or clearly flag "lifecycle stages not maintained."
- **Spam skews speed-to-lead.** Form contacts are largely spam, which drags response-time metrics down. There's a spam-triage flow ("mark these as spam" → recompute clean metrics). Only then is the "not contacted" list meaningful.
- **Deal profiles are behavioral-only, on purpose.** "Your best deals look like this" shows only behavioral signals from HubSpot (source, speed-to-lead, follow-up touches, deal-stage discipline, value/cycle ranges). It deliberately does NOT do personas/job-titles/firmographics/enrichment/"where to find more." Stats: percentile segments (top ~25%, not the single top deal), medians + IQR ranges (not means), modes for categories, minimum sample gates.
- **Don't give away the cow.** The identity/enrichment/"where to find more like them" layer is held for the future **CustomerChamp** app. In PipeChamp, surface a CTA that _tests interest_ ("Want to know WHO your best customers are & where to find more? →") instead of building it.

---

## 8. Brand system

- **The orange dot is the shared brand centerpiece** across the whole Champ suite — the one visual atom tying the apps together. Canonical color **`#F77333`** (decided 2026-07-28), chosen over HubSpot's own `#FF7A59` so the mark stays independent as the suite extends beyond HubSpot. Each app expresses the dot in its own motif: **PipeChamp = the dot coming out of the base of a funnel** (the lead/deal dropping out). The **favicon is the bare dot** (app-agnostic atom).
  - _Migration debt:_ some UI accents still use `#FF7A59` (CTA buttons) and `#E8562A` (status dots, funnel mark); migrate toward `#F77333` over time.
- **Landing-page palette (current):** navy `#243A52`, blue `#1B72C7`, teal `#0091AE`, mint `#2EBF9A` accents, orange `#E8562A` CTAs. The old **"Pine & Gold" system is DEAD — do not use it.**
- **Type:** Inter (Google Fonts). **No em dashes, no emojis, no stoplight red/amber/green used decoratively.**
- Logo lockups (funnel + dot, horizontal/stacked, full-color/navy/white) live in `frontend/public/logos/` and a `PipeChamp_Logo_Suite` in Downloads.

---

## 9. Architecture & stack

- **`frontend/`** — React SPA (Create React App), port 3000. Routing is a simple conditional in `App.js`: connected → `DashboardPage`, else → `ConnectPage` (no react-router).
- **`backend/`** — Express API, port 3001. `server.js` registers all routes + session middleware.
- **No persistent database by default.** State lives in HubSpot + a signed session cookie + an in-memory cache on the backend. (Postgres is optional — see §10 snapshots.)
- **Analysis engines** in `backend/services/`: `scoring.js`, `funnelAnalysis.js`, `insightEngine.js`, `leadScoring.js`, `ltvAnalysis.js`, `metricCalculations.js`, `pipelineHealth.js`, `recommendations.js`, `revenueInsights.js`, `dealProfiles.js`, `behavioralAnalysis.js`, `activityAnalysis.js`, `emailDigest.js`, `alertEngine.js`, plus `hubspot.js` / `ga4.js` / `gsc.js` clients.
- **Routes** in `backend/routes/`: `auth, funnel, insights, leads, revenue, export, alerts, reports, ga4, gsc, chat, analytics, admin`.
- **Feature tiers:** `frontend/src/utils/plan.js` (free/starter/pro). `BETA_ALL_ACCESS = true` currently gives everyone full Pro. Gating is **frontend-only — no backend enforcement.**

### Auth
HubSpot OAuth (`backend/routes/auth.js`), fully env-driven. Scopes: `crm.objects.contacts.read/write`, `crm.objects.deals.read`. Tokens stored in a **stateless signed cookie-session** (no server store; survives restarts). Cache key derived from token tail. `HubSpotService.getPortalId()` / token-info gives portal id + user email + hub domain (useful for identifying the user with no extra scope — relevant to landing-page lead capture, §12).

### HubSpot rate limits — IMPORTANT
Limit is **100 requests / 10 seconds** (`ten_secondly_rolling` → HTTP 429). This has bitten the project repeatedly. Rules:
- **Never call `getContacts()` / `getDeals()` / `getDealAssociations()` directly in a route.** Always use **`hs.getCachedData()`** — fetches once per session, caches 5 min, batches association lookups (`POST /crm/v3/associations/.../batch/read`, 100 ids/call), coalesces concurrent cold-cache callers into one loader promise, and retries 429s with `Retry-After`/backoff.
- New route needing HubSpot data → pass `req.session.id` into `new HubSpotService(token, sessionId)` and call `getCachedData()`.

---

## 10. Integrations

- **HubSpot** — core, OAuth above.
- **GA4** (`routes/ga4.js` + `services/ga4.js`) — Google OAuth, scope `analytics.readonly`; fills **Traffic** (sessions/users + channels) on the Marketing funnel. Needs `GA4_CLIENT_ID/SECRET/REDIRECT_URI` + Data API & Admin API enabled + consent screen. Until configured, `/ga4/connect` returns 503 and the UI shows a connect upsell.
- **Search Console** (`routes/gsc.js` + `services/gsc.js`) — Google OAuth, scope `webmasters.readonly`, **reuses the GA4 Google app** unless `GSC_CLIENT_ID/SECRET` set; needs `GSC_REDIRECT_URI` + Search Console API enabled. Fills the **Impressions** stage (impressions/clicks/CTR + top queries). Together GA4 + GSC complete Impressions→Traffic→Lead→MQL→SQL.
- **Planned (ROI "wheelbarrow of money"):** Google Ads API (feasible first), then Meta Ads (harder), then financial validation via Stripe/QuickBooks/Xero. Framed as "connect these to unlock ROI" upsells.

---

## 11. Hosting & deployment

- **Frontend → Vercel.** **Backend → Railway.** Domain **pipechamp.app** (app served at root; `ConnectPage` shows for unauthenticated users).
- **Deploy = `git push origin main`.** Both auto-deploy from `main`. No manual build/deploy commands. Allow ~5 min; verify via a visible change (sidebar plan badge).
- Repo: `github.com/DT-TSOE/hubspot-leak-finder`. **GitHub auth is SSH** (`git@github.com:DT-TSOE/hubspot-leak-finder.git`, key `~/.ssh/id_ed25519`, no passphrase). The old plaintext PAT was rotated out.
- **Monthly snapshots (optional DB):** `backend/services/db.js` is Postgres-backed and **no-ops when `DATABASE_URL` is unset**, so the app runs fine without a DB. Provision **Railway Postgres**, set `DATABASE_URL` (+ `DATABASE_SSL=true` for external URLs). Table `scorecard_snapshots` auto-creates; stores **only aggregate scores/metrics** keyed by HubSpot portal id, one row per portal per month, captured lazily on scorecard view. Enables the grade-delta trend badge. (This is why the connect screen says "we never store your contacts," not "no data stored.")

---

## 12. The marketing landing page

Built as a **static site** at `landing/index.html` (NOT a React page — an earlier `LandingPage.jsx` plan was dropped). Deployed separately via `landing/vercel.json` (cleanUrls). Sibling pages: `privacy.html`, `terms.html`, `support.html`. Assets in `landing/assets/` (logo, real Scorecard screenshot, favicons, OG card).

- **Structure:** nav → hero (headline "HubSpot shows you what's in your pipeline. We tell you where it's leaking." + real Scorecard screenshot in a tilted browser-frame mock) → trust strip → Pains ("Sound familiar?") → Gains (3×2) → How it works (3 steps) → Funnel feature → Pricing → CTA → footer.
- **Pricing (decided 2026-07-28):** NO free tier. Single plan **PipeChamp Pro, $99/mo, 14-day free trial**, no card to start.
- **Open question:** the trial CTA points to `pipechamp.app/connect`; the app lives at `pipechamp.app` root, so the landing-vs-app URL topology is unresolved. Resolve before deploy.
- **Lead-capture direction (decided):** capture the user off the HubSpot OAuth login (token-info returns email + portal id + hub domain, no extra scope) rather than gating the trial behind a form. Persisting email/portal is a TODO for Stripe + email nurture.
- Editable copy lives in `landing/COPY.md` and `landing/PipeChamp-Copy.docx`.

---

## 13. Known TODOs / gotchas

- **Billing not built.** Add Stripe, then flip `BETA_ALL_ACCESS = false` to re-enable tiering (and add backend enforcement — currently none).
- **Deal-first fallback** when lifecycle stages are unmaintained (§7) is still open.
- **Demo-blocker bugs** historically surfaced: report download blank/broken, lead-sources hover "runs away," At Risk opening a 2nd tab. Verify these are fixed before demos.
- **Benchmarks** are still default/aggregate; the credible per-industry data set is a long-term build (own data over time, acquisition, or a privacy-gated opt-in partner benchmark network).
- Local `vercel` CLI token is expired (doesn't affect git-push deploys).

---

## 14. Working-style notes (how the user likes to work)

- **When the user shares an image and says "use this," Read the actual file on disk first** — don't theorize from summaries. If it's not where expected, ask once; don't loop on a wrong assumption. (There was a painful logo saga from ignoring this.)
- **No em dashes, no emojis** in any copy or UI.
- Prefer plain, benefit-led language; the user dislikes agency-speak, clichés, run-ons, and centered narrow copy.
- Confirm before anything outward-facing (deploys, public changes).

---

_This briefing consolidates the PipeChamp project memory, the app's own `CLAUDE.md`, and `backend/services/SCORING.md`. For live detail always defer to those files in the repo._
