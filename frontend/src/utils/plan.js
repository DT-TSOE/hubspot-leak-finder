/**
 * PipeChamp Plan Management
 * v8 — added new feature gates
 */

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: false,
      metricTiles: false,
      sourceQuality: false,
      stageAging: false,
      speedToLead: false,
      insights: false,
      insightLimit: 0,
      laJefa: false,
      leadRisk: false,
      revenue: false,
      behavioral: false,
      exports: false,
      dateFilter: false,
      insightFilter: false,
      alerts: false,
    }
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: true,
      metricTiles: true,
      sourceQuality: true,
      stageAging: true,
      speedToLead: true,
      insights: true,
      insightLimit: 10,
      laJefa: false,
      leadRisk: true,
      revenue: false,
      behavioral: true,
      exports: false,
      dateFilter: true,
      insightFilter: false,
      alerts: true,
    }
  },
  pro: {
    name: 'Pro',
    price: 49,
    features: {
      funnel: true,
      basicMetrics: true,
      gmDashboard: true,
      metricTiles: true,
      sourceQuality: true,
      stageAging: true,
      speedToLead: true,
      insights: true,
      insightLimit: Infinity,
      laJefa: true,
      leadRisk: true,
      revenue: true,
      behavioral: true,
      exports: true,
      dateFilter: true,
      insightFilter: true,
      alerts: true,
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
