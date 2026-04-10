import React from 'react';
import { PLANS, setPlan, getCurrentPlan } from '../utils/plan';

export default function UpgradePrompt({ feature, requiredPlan = 'starter', inline = false, children }) {
  const plan = PLANS[requiredPlan];

  const handleUpgrade = () => {
    // TODO: Replace with Stripe checkout when billing is live
    // For now simulate upgrade
    setPlan(requiredPlan);
    window.location.reload();
  };

  if (inline) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8 }}>
        <span style={{ fontSize:12, color:'#92400E' }}>🔒 {children || `This feature requires ${plan.name}`}</span>
        <button onClick={handleUpgrade} style={{ fontSize:11, fontWeight:700, color:'#fff', background:'#F59E0B', border:'none', borderRadius:5, padding:'3px 10px', cursor:'pointer', flexShrink:0 }}>
          Upgrade — ${plan.price}/mo
        </button>
      </div>
    );
  }

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:12, padding:'2rem', textAlign:'center', maxWidth:400, margin:'0 auto' }}>
      <div style={{ width:48, height:48, borderRadius:12, background:'#FFFBEB', border:'1px solid #FDE68A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 14px' }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#111', marginBottom:6 }}>
        {children || `Unlock with ${plan.name}`}
      </div>
      <div style={{ fontSize:13, color:'#888', marginBottom:20, lineHeight:1.6 }}>
        {getFeatureDescription(feature)}
      </div>
      <button onClick={handleUpgrade} style={{ display:'block', width:'100%', background:'#111', color:'#fff', border:'none', borderRadius:8, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:8 }}>
        Upgrade to {plan.name} — ${plan.price}/mo
      </button>
      <div style={{ fontSize:11, color:'#999' }}>Cancel anytime · No commitment</div>

      {requiredPlan === 'starter' && (
        <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #F3F4F6' }}>
          <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>Or unlock everything with Pro</div>
          <button onClick={() => { setPlan('pro'); window.location.reload(); }} style={{ fontSize:12, fontWeight:600, color:'#111', background:'transparent', border:'1px solid #E2E5EA', borderRadius:7, padding:'7px 16px', cursor:'pointer' }}>
            Get Pro — $49/mo
          </button>
        </div>
      )}
    </div>
  );
}

function getFeatureDescription(feature) {
  const descriptions = {
    insights: 'See exactly what\'s broken in your pipeline with specific, prioritized recommendations — and step-by-step HubSpot fixes for each one.',
    laJefa: 'Ask La Jefa anything about your pipeline. She\'ll give you data-backed answers and tell you exactly what to do in HubSpot.',
    revenue: 'See average deal size by source, sales cycle length, and rep performance leaderboard.',
    leadRisk: 'Score every active lead by risk of going cold. Export a list of who needs attention right now.',
    exports: 'Export your funnel data, lead scores, and insights digest as CSV and TXT files.',
    behavioral: 'See how won vs lost deals differ — by source, touch count, and speed to first contact.',
    insightFilter: 'Filter insights by type, severity, or stage to focus on exactly what matters to you.',
    dateFilter: 'Filter your entire analysis by last 30, 60, or 90 days.',
  };
  return descriptions[feature] || 'Upgrade to unlock this feature and get more out of your pipeline data.';
}
