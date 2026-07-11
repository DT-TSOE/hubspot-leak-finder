# PipeChamp / HubSpot Leak Finder

HubSpot CRM analytics dashboard: funnel analysis, pipeline health, lead scoring,
revenue intelligence, speed-to-lead, stage aging. SaaS product, currently in beta.

## Architecture

- **`frontend/`** — React SPA (Create React App). Runs on port 3000.
- **`backend/`** — Express.js API. Runs on port 3001.
- **`backend/server.js`** — entry point; registers all routes and session middleware.
- **`backend/services/hubspot.js`** — HubSpot API client with session-level caching.
- **`backend/services/`** — analysis engines (funnelAnalysis, insightEngine, leadScoring, ltvAnalysis, metricCalculations, etc.).
- **`backend/routes/`** — auth, funnel, insights, leads, revenue, export, alerts, reports, ga4, chat, admin.
- **`frontend/src/utils/plan.js`** — plan tiers (free/starter/pro) controlling feature access.

No persistent database. State lives in HubSpot + a signed session cookie + an
in-memory cache on the backend.

## Running locally

```bash
# Backend (terminal 1)
cd backend && npm install && npm run dev   # nodemon on :3001

# Frontend (terminal 2)
cd frontend && npm install && npm start     # CRA dev server on :3000
```

The frontend proxies API calls to `http://localhost:3001` (see `frontend/package.json` "proxy").
Backend needs a `.env` with: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`,
`HUBSPOT_REDIRECT_URI`, `FRONTEND_URL`, and the session secret.

## Deployment

**Deploy = `git push origin main`.** There are no manual deploy commands.

- **Frontend** auto-deploys to **Vercel** (`hubspot-leak-finder.vercel.app`).
- **Backend** auto-deploys to **Railway**.
- Allow ~5 min after pushing. Confirm the frontend is live by checking that a
  visible change appears (e.g. the sidebar plan badge).

## Auth

HubSpot OAuth (`backend/routes/auth.js`), fully env-driven. Scopes:
`crm.objects.contacts.read/write`, `crm.objects.deals.read`. Tokens are stored in
a stateless signed **cookie-session** (no server-side session store, so it
survives backend restarts). The cache key is derived from the token tail.

## HubSpot rate limits — IMPORTANT

HubSpot's limit is **100 requests / 10 seconds** (`ten_secondly_rolling`, surfaces
as HTTP 429). This has bitten us more than once. Rules:

- **Never call `getContacts()` / `getDeals()` / `getDealAssociations()` directly
  in a route.** Always go through **`hs.getCachedData()`**, which fetches once per
  session, caches for 5 min, batches association lookups, coalesces concurrent
  cold-cache callers into a single fetch, and retries 429s with backoff.
- If you add a route that needs HubSpot data, pass `req.session.id` into
  `new HubSpotService(token, sessionId)` and use `getCachedData()`.

## Scoring (the core IP)

Two-funnel scorecard lives in `backend/services/scoring.js`, with the full
methodology documented in `backend/services/SCORING.md` (read it before touching
scoring). Marketing score + Sales score + one headline overall grade + estimated
revenue impact. Benchmarks are a swappable config in `scoring.js`. The flagship
**deal-stage conversion %** uses "of all deals that ever entered a stage, % that
reach won" — read from `dealstage` property history (`propertiesWithHistory`),
not linear stage-to-stage. Exposed at `GET /api/reports/scorecard`; rendered by
`frontend/src/components/Scorecard.jsx` as the Dashboard hero.

## Adaptive scorecard tuning

Onboarding answers (business type, hubs, revenue, growth challenge, goal) tune
the scorecard. `resolveScoreProfile(profile)` in `scoring.js` applies **banded
preset nudges** (NOT per-portal statistics) to the marketing/sales split and
dimension weights, and returns a `tunedFor` label + `methodology` notes shown in
the UI ("why these weights?"). Answers are stored in the session cookie via
`GET/POST /api/reports/onboarding` (no DB). Sales-only/marketing-only profiles
lock the unused funnel — the UI renders it blurred with an unlock prompt (an
intentional upsell hook). Onboarding modal: `Onboarding.jsx`. The "Dashboard" nav
is now labelled **Scorecard** (internal id stays `dashboard`). The old "Pipeline"
tab is split into **Marketing** (`MarketingPipeline.jsx`) and **Sales**
(`SalesPipeline.jsx`).

## Monthly snapshots (database)

`backend/services/db.js` is a Postgres-backed store for monthly scorecard
snapshots. It **gracefully no-ops when `DATABASE_URL` is unset**, so the app runs
fine without a DB (snapshots just don't record). Provision **Railway Postgres**
and set `DATABASE_URL` on the backend service (private URL needs no SSL; for an
external URL set `DATABASE_SSL=true`). Table `scorecard_snapshots` auto-creates
on first use. Snapshots store **only aggregate scores/metrics** keyed by HubSpot
portal id (`hs.getPortalId()`), captured lazily on scorecard view (one row per
portal per month). The scorecard endpoint returns a `trend` (vs last month);
the UI shows a grade-delta badge. This is why the connect screen says "we never
store your contacts" rather than "no data stored." See [[positioning-hubspot-upsell-tool]].

## GA4 integration

OAuth in `backend/routes/ga4.js` (Google, scope `analytics.readonly`), data in
`backend/services/ga4.js` (token refresh on 401, Admin API property list, Data
API traffic-by-channel). Needs env vars on the backend: `GA4_CLIENT_ID`,
`GA4_CLIENT_SECRET`, `GA4_REDIRECT_URI` (= backend host + `/ga4/callback`), plus
the Google Analytics **Data API** and **Admin API** enabled and an OAuth consent
screen (testing mode allows ~100 test users, no verification). Until configured,
`/ga4/connect` returns 503 and `MarketingPipeline` shows the connect upsell.
GA4 fills **Traffic** (sessions/users + channels) on the Marketing funnel;
**Impressions** stays locked pending Google Ads/Search Console. Tokens + selected
property id live in the session (no DB). See [[positioning-hubspot-upsell-tool]].

## Beta access

`BETA_ALL_ACCESS = true` in `frontend/src/utils/plan.js` gives **every** user full
Pro access (no tiering) during beta onboarding. Set it to `false` to restore
free/starter/pro gating once billing exists. Note: tier gating is **frontend-only**
— there is no backend enforcement.

## Known TODOs

- **Rotate the GitHub token** currently stored in plaintext in the git remote URL,
  and reconnect the remote with the new token.
- Vercel CLI auth token is expired locally (`vercel` commands fail until re-login);
  does not affect git-push deploys.
- Add billing (Stripe) and re-enable tiering by flipping `BETA_ALL_ACCESS`.
