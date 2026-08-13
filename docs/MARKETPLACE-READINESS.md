# PipeChamp — HubSpot App Marketplace Readiness

Goal: get PipeChamp **listed** on the HubSpot App Marketplace, then **certified** later.
Two milestones, different bars:

- **Listing** (do now): OAuth + verified domain + listing content + public docs + uninstall handling. No install minimum.
- **Certification** (later, the badge): must be **listed 6+ months** AND have **60 active unique installs** from unaffiliated accounts + a demo video + security review. Not required to launch.

_Requirements below are from HubSpot's official docs (Aug 2026) — see Sources at the bottom. HubSpot changes these; re-check before submitting._

---

## Already in good shape ✅
- OAuth authorization-code flow with refresh tokens (`backend/middleware/requireAuth.js`, `routes/auth.js`)
- No legacy CRM cards (standalone web app, not embedded in HubSpot UI)
- HubSpot rate-limit handling + 5-min session cache (`services/hubspot.js`)
- Listing screenshots use anonymized/placeholder data (HubSpot bans real PII in images)

---

## CODE work (Claude builds)

### 1. Drop the unused write scope  ⬅ quick, do first
- App is **read-only** — no POST/PATCH/PUT to HubSpot anywhere. Remove `crm.objects.contacts.write` from `SCOPES` in `backend/routes/auth.js`.
- New scopes: `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.owners.read`.
- Must be mirrored in the HubSpot app config (see Your To-Dos #3).

### 2. Uninstall handling  ✅ DONE — via token failure (HubSpot has NO uninstall webhook)
- HubSpot does **not** send an app-uninstall webhook. On uninstall it revokes the OAuth tokens; the documented best practice is to detect the uninstall via a **failed token refresh** (401 / invalid_grant).
- `backend/middleware/requireAuth.js` now does this: when a refresh fails, it invalidates that account's cache and deletes its stored data (snapshot rows + connection row in Postgres, keyed by portal id), falling back to another connected account if one exists.
- Nothing to register in HubSpot for this — there is no webhook to subscribe to.

### 3. Stripe billing (the paid product)  ⬅ biggest piece; needs your Stripe account first
- Stripe Checkout for **Pro $99/mo + 14-day trial**; subscription webhooks → set plan.
- Persist plan per HubSpot **portal id** in Postgres (extend `services/db.js`); capture email + portal from the OAuth token at connect.
- Flip `BETA_ALL_ACCESS = false` (`frontend/src/utils/plan.js`) and add **backend** tier enforcement (today gating is frontend-only — bypassable).
- Wire the `// TODO: Replace with Stripe checkout` in `UpgradePrompt.jsx`.

### 4. Public setup/help documentation
- A public URL with: what it does, install steps **with scope-approval screenshots**, configuration, usage, **how to disconnect/uninstall**, and data-impact. HubSpot requires this as the "Setup documentation URL."
- Can live on the marketing site (e.g. `get.pipechamp.app/docs`) — Claude can build the page; you supply/confirm any account-specific steps.

### 5. Bug sweep before submitting
- Verify the old demo-blockers are fixed: report download blank, lead-sources hover "runs away," At Risk opening a 2nd tab.
- Deal-first fallback for portals with no lifecycle stages (data quality).

---

## YOUR To-Dos (HubSpot dashboard / accounts / business — Claude can't do these)

1. **Verify the domain** `pipechamp.app` in your HubSpot developer account (required to list).
2. **Confirm/finish the public app** in the HubSpot developer account: name = PipeChamp, upload the **logo** (assets ready), and set the **production redirect URI** to the deployed backend.
3. **Update the app's required scopes** to match the read-only set above (remove contacts write).
4. ~~Register the uninstall webhook~~ — not needed. HubSpot has no uninstall webhook; the app already detects uninstalls via token-refresh failure and purges data.
5. **Create a Stripe account** (business + bank details) and a **Product/Price** for Pro $99/mo with a 14-day trial. Give Claude the price ID + set the API keys as backend env vars. _(Entering bank/financial credentials is yours to do, not Claude's.)_
6. **Write/approve the listing content**: description, category, pricing (must match the website), support email/URL, screenshots (anonymized ones exist), and the setup-doc URL. Claude can draft the copy.
7. **Record a short demo/walkthrough** video of core flows (for listing visuals now; a disconnect+uninstall demo is required for certification later).
8. **Submit for listing review** in the developer portal. HubSpot responds within ~10 business days.

---

## Recommended sequence
1. Scope cleanup (code) + mirror in HubSpot config (you)
2. Uninstall handling (code) ✅ done — detected via token failure, nothing to register
3. Verify domain + finish app listing content (you) — can start in parallel
4. Stripe billing (code) — after you set up the Stripe account/product
5. Setup docs page (code) + your review
6. Bug sweep, then submit for review

## Certification (revisit in ~6 months)
Needs: 6 months listed, 60 active unique installs, demo video (disconnect + uninstall call + removal from Connected Apps), 95%+ activity success rate, security questionnaire. Two-year renewal cycle.

## Sources
- [HubSpot Marketplace certification requirements](https://developers.hubspot.com/docs/apps/developer-platform/list-apps/apply-for-certification/certification-requirements)
- [App Listing & Certification updates, May 2026](https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026)
- [Active install requirement increase for certification](https://developers.hubspot.com/changelog/active-install-requirement-increase-for-app-certification)
