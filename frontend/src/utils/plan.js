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
      insights: false,
      insightLimit: 0,
      laJefa: false,
      leadRisk: false,
      revenue: false,
      behavioral: false,
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
      insights: true,
      insightLimit: 5,
      laJefa: false,
      leadRisk: true,
      revenue: false,
      behavioral: true,
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
      insights: true,
      insightLimit: Infinity,
      laJefa: true,
      leadRisk: true,
      revenue: true,
      behavioral: true,
      exports: true,
      dateFilter: true,
      insightFilter: true,
    }
  }
};

export function getCurrentPlan() {
  const stored = localStorage.getItem('pipechamp_plan');
  return PLANS[stored] ? stored : 'free';
}

export function setPlan(planKey) {
  localStorage.setItem('pipechamp_plan', planKey);
}

export function canAccess(feature) {
  const plan = getCurrentPlan();
  return PLANS[plan]?.features[feature] ?? false;
}

export function getPlanFeatures() {
  const plan = getCurrentPlan();
  return PLANS[plan]?.features ?? PLANS.free.features;
}
