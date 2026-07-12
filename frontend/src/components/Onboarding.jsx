import React, { useState } from 'react';
import { api } from '../utils/api';

// 5 quick questions that tune the scorecard weights. Answers are stored in the
// session (no account needed) and drive a credible "tuned for your business"
// methodology - not per-portal statistics.
const QUESTIONS = [
  { key: 'businessType', label: 'What kind of business are you?', options: [
    ['services', 'B2B services'], ['saas', 'B2B SaaS'], ['ecommerce', 'B2C ecommerce'], ['local', 'Local & retail'] ] },
  { key: 'hubs', label: 'Which HubSpot hubs do you use?', options: [
    ['both', 'Marketing + Sales'], ['sales', 'Sales only'], ['marketing', 'Marketing only'] ] },
  { key: 'revenue', label: 'Estimated annual revenue?', options: [
    ['lt500k', 'Under $500k'], ['500kto2m', '$500k–$2M'], ['2to10m', '$2M–$10M'], ['gt10m', '$10M+'] ] },
  { key: 'challenge', label: 'Your biggest growth challenge right now?', options: [
    ['not_enough_leads', 'Not enough leads'], ['leads_dont_convert', "Leads don't convert"],
    ['deals_stall', 'Deals stall'], ['slow_follow_up', 'Slow follow-up'], ['losing_competitors', 'Losing to competitors'] ] },
  { key: 'goal', label: 'Primary goal?', options: [
    ['more_leads', 'More leads'], ['higher_close', 'Higher close rate'], ['faster_cycle', 'Faster sales cycle'], ['bigger_deals', 'Bigger deals'] ] },
];

export default function Onboarding({ initial, onComplete, onClose }) {
  const [answers, setAnswers] = useState(initial || {});
  const [saving, setSaving] = useState(false);
  const allAnswered = QUESTIONS.every(q => answers[q.key]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.saveOnboarding(answers);
      onComplete?.(answers);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Tune your scorecard</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 4 }}>5 quick questions</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>We weight your grade around what matters for <em>your</em> business - so speed-to-lead doesn’t sink a business where it isn’t the point.</div>

        {QUESTIONS.map(q => (
          <div key={q.key} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 8 }}>{q.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map(([val, label]) => {
                const active = answers[q.key] === val;
                return (
                  <button key={val} onClick={() => setAnswers(a => ({ ...a, [q.key]: val }))}
                    style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 9, cursor: 'pointer',
                      background: active ? '#111' : '#fff', color: active ? '#fff' : '#444',
                      border: `1px solid ${active ? '#111' : '#E2E5EA'}`, transition: 'all .12s' }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
          <button disabled={!allAnswered || saving} onClick={submit}
            style={{ flex: 1, background: allAnswered ? '#111' : '#E2E5EA', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: allAnswered && !saving ? 'pointer' : 'default' }}>
            {saving ? 'Saving…' : 'See my tuned grade'}
          </button>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer' }}>Later</button>}
        </div>
      </div>
    </div>
  );
}
