/**
 * PipeChamp Plan Management
 * Controls feature access based on user plan
 * Billing not yet implemented — plan stored in localStorage for now
 * Replace with real subscription check when Stripe is added
 */

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: true,
      insights: false,
      insightLimit: 0,
      laJefa: false, pipeCoach: false,
      leadRisk: false,
      revenue: false,
      behavioral: false,
      sourceQuality: false,
      stageAging: false,
      speedToLead: false,
      exports: false,
      dateFilter: false,
      insightFilter: false,
    }
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: true,
      insights: true,
      insightLimit: 5,
      laJefa: false, pipeCoach: false,
      leadRisk: true,
      revenue: false,
      behavioral: true,
      sourceQuality: true,
      stageAging: true,
      speedToLead: true,
      exports: false,
      dateFilter: true,
      insightFilter: false,
    }
  },
  pro: {
    name: 'Pro',
    price: 49,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: true,
      insights: true,
      insightLimit: Infinity,
      laJefa: true, pipeCoach: true,
      leadRisk: true,
      revenue: true,
      behavioral: true,
      sourceQuality: true,
      stageAging: true,
      speedToLead: true,
      exports: true,
      dateFilter: true,
      insightFilter: true,
    }
  }
};

// BETA: give every user full (Pro) access while onboarding beta testers.
// No tiering, no upgrade gates. Set to false to restore plan-based gating
// once billing is live.
export const BETA_ALL_ACCESS = true;

export function getCurrentPlan() {
  if (BETA_ALL_ACCESS) return 'pro';
  const stored = localStorage.getItem('pipechamp_plan');
  return PLANS[stored] ? stored : 'free';
}

export function setPlan(planKey) {
  localStorage.setItem('pipechamp_plan', planKey);
}

export function canAccess(feature) {
  if (BETA_ALL_ACCESS) return true;
  const plan = getCurrentPlan();
  return PLANS[plan]?.features[feature] ?? false;
}

export function getPlanFeatures() {
  if (BETA_ALL_ACCESS) return PLANS.pro.features;
  const plan = getCurrentPlan();
  return PLANS[plan]?.features ?? PLANS.free.features;
}
