---
name: project-pipechamp
description: What PipeChamp / HubSpot Leak Finder is, where it lives, key architecture facts, and pending UX notes
metadata:
  type: project
---

PipeChamp is a HubSpot CRM analytics SaaS (pipeline scorecard, funnel analysis, lead risk, speed-to-lead, stage aging, source quality, GM dashboard). Currently in beta with all users on full Pro access (`BETA_ALL_ACCESS = true`).

**Why:** Positioning as a sales tool for HubSpot upgrades — gap → what's happening → recommended fix/upgrade.

**Where it lives:**
- Repo: github.com/DT-TSOE/hubspot-leak-finder (SSH auth)
- Frontend: Vercel → hubspot-leak-finder.vercel.app (target: app.pipechamp.app)
- Backend: Railway → hubspot-leak-finder-production.up.railway.app
- Domain purchased: pipechamp.app (not yet pointed)

**Deploy = git push origin main.** No manual deploy commands.

**Planned pricing (not yet live):**
- Starter $29/mo — funnel, insights, lead risk, PDF export
- Pro $79/mo — everything + AI coach, stage aging, speed-to-lead, source quality, GM dashboard, alerts
- 14-day free trial, no free tier

**$50k MRR goal** = ~1,350 users (70% Starter / 30% Pro mix). Gross margin ~95%.

**Known TODOs / next up:**
- Domain setup (pipechamp.app) — need to know registrar
- Stripe payments + flip BETA_ALL_ACCESS to false
- Branding & design upgrade
- Marketing website
- HubSpot marketplace submission checklist

**UX note (do later):** Add loading animations/skeletons while data is fetching across dashboard sections — currently just blank or spinner text.

**How to apply:** When picking up any of the above tasks, start here to orient context before reading code.
