import posthog from 'posthog-js';

// PostHog product analytics. Off unless REACT_APP_POSTHOG_KEY is set, so local
// dev and any build without the key are silent no-ops.
const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

let started = false;

export function initAnalytics() {
  if (started || !KEY) return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only', // no anonymous profiles — cheaper + cleaner
    capture_pageview: true,
    autocapture: true,
    session_recording: {
      // This app renders customers' HubSpot CRM data (deal names, revenue,
      // contacts). Mask EVERYTHING in replays — all inputs and all page text —
      // so recordings show layout/interaction but never the underlying data.
      maskAllInputs: true,
      maskTextSelector: '*',
    },
  });
}

// Tie events + replays to the HubSpot portal (account), not an anonymous blob.
export function identifyPortal(portalId, props = {}) {
  if (!started || !portalId) return;
  posthog.identify(String(portalId), props);
}

export function track(event, props = {}) {
  if (!started) return;
  posthog.capture(event, props);
}

export function resetAnalytics() {
  if (!started) return;
  posthog.reset();
}
