# HubSpot Lifecycle Leak Finder

A lightweight SaaS tool that connects to HubSpot, identifies where leads drop off in the funnel, explains why using behavioral data, and suggests actions.

---

## Quick Start

### Prerequisites
- Node.js 18+
- A HubSpot developer account with an OAuth app

### 1. Create a HubSpot OAuth App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Under **Auth**, set redirect URI to: `http://localhost:3001/auth/callback`
4. Required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
5. Copy your **Client ID** and **Client Secret**

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET in .env
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and click **Connect HubSpot**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ConnectPage → OAuth flow                                │
│  DashboardPage                                           │
│    ├── Funnel Overview (FunnelChart, StageTimingTable)   │
│    ├── Insights (InsightCard × 3–5)                      │
│    └── Behavioral Data (SourceTable, metrics)            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (proxy)
┌─────────────────────▼───────────────────────────────────┐
│                   Express Backend                        │
│  /auth/*       — OAuth connect, callback, status         │
│  /api/funnel   — Full funnel + behavioral analysis       │
│  /api/insights — Insight generation                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HubSpot API
┌─────────────────────▼───────────────────────────────────┐
│                   HubSpot CRM                            │
│  Contacts (lifecycle stage dates, source)                │
│  Deals (stage, closed-won/lost, associations)            │
└─────────────────────────────────────────────────────────┘
```

## Key Analysis Logic

### Funnel Stages
Lead → MQL → SQL → Opportunity → Customer

For each stage:
- **Conversion rate** = contacts reaching this stage / contacts at previous stage
- **Drop-off volume** = previous stage count − this stage count  
- **Time between stages** = median of (stage_B_date − stage_A_date) across all contacts

### Biggest Leak Detection
The stage with the **lowest conversion rate** (where ≥5 contacts passed through) is flagged as the primary leak.

### Behavioral Analysis
Closed-won vs. closed-lost contacts are compared on:
- **Source** — win rate per lead source
- **Touches** — median `num_contacted_notes`
- **Speed to lead** — time from `createdate` to `notes_last_contacted`

### Insight Generation Rules
| Insight Type | Trigger Condition |
|---|---|
| Funnel Leak | Lowest conversion stage found |
| Speed to Lead | Won leads contacted ≥1.5× faster than lost |
| Source Performance | Best source win rate ≥15% above worst |
| Engagement Gap | Median touch difference ≥2 |
| Stage Delay | Any transition > 14 median days |

## Data Handling
- Requires minimum 5 contacts per data point before surfacing an insight
- Uses **median** (not mean) for time calculations to handle outliers
- Gracefully handles missing stage dates, incomplete lifecycle paths
- Deals capped at 200 for association fetching (rate limit protection)

## Project Structure

```
hubspot-leak-finder/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── routes/
│   │   ├── auth.js          # OAuth flow
│   │   ├── funnel.js        # Funnel + behavioral data endpoint
│   │   └── insights.js      # Insights endpoint
│   └── services/
│       ├── hubspot.js       # HubSpot API client + pagination
│       ├── funnelAnalysis.js  # Core funnel math
│       ├── behavioralAnalysis.js  # Won vs lost comparison
│       └── insightEngine.js  # Rules-based insight generation
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js
        ├── utils/api.js      # Fetch wrapper
        ├── hooks/useData.js  # Data loading hook
        ├── pages/
        │   ├── ConnectPage.jsx
        │   └── DashboardPage.jsx
        └── components/
            ├── FunnelChart.jsx
            ├── InsightCard.jsx
            ├── StageTimingTable.jsx
            └── SourceTable.jsx
```

## Extending the MVP

| Feature | Where to add |
|---|---|
| Page view analysis | `hubspot.js` getPageViews() + new behavioral metric |
| Lead scoring | New `services/leadScoring.js` + `/api/score/:contactId` route |
| Email notifications | Cron job calling insight engine, send via SendGrid |
| Data persistence | Add PostgreSQL for caching + trend history |
| Webhook updates | HubSpot webhook → re-run analysis on stage change |
