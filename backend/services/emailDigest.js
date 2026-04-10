/**
 * PipeChamp Email Digest Service
 * Sends daily briefing emails via Resend
 * Set RESEND_API_KEY in Railway environment variables
 */

const axios = require('axios');

function buildEmailHTML(digest, appUrl = 'https://hubspot-leak-finder.vercel.app') {
  const urgentHTML = digest.urgent.length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">
        🔴 Act Today (${digest.urgent.length})
      </div>
      ${digest.urgent.map(a => `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-left:4px solid #EF4444;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px;">${a.title}</div>
          <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:8px;">${a.body}</div>
          ${a.benchmark ? `<div style="font-size:11px;color:#DC2626;font-style:italic;margin-bottom:8px;">📊 ${a.benchmark}</div>` : ''}
          <a href="${a.action.url}" style="font-size:12px;font-weight:600;color:#DC2626;text-decoration:none;">${a.action.label} →</a>
        </div>
      `).join('')}
    </div>
  ` : '';

  const warningsHTML = digest.warnings.length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">
        ⚠️ Watch This Week (${digest.warnings.length})
      </div>
      ${digest.warnings.map(a => `
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:4px;">${a.title}</div>
          <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:8px;">${a.body}</div>
          <a href="${a.action.url}" style="font-size:12px;font-weight:600;color:#D97706;text-decoration:none;">${a.action.label} →</a>
        </div>
      `).join('')}
    </div>
  ` : '';

  const healthyHTML = digest.totalAlerts === 0 ? `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
      <div style="font-size:20px;margin-bottom:6px;">✅</div>
      <div style="font-size:15px;font-weight:600;color:#059669;">Pipeline looks healthy today</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">No urgent issues detected. Keep up the momentum.</div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#111;border-radius:12px 12px 0 0;padding:20px 24px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;border-radius:8px;background:#1a1a1a;border:2px solid #4CAF50;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🤼</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-.3px;">PipeChamp</div>
        <div style="font-size:10px;color:#4CAF50;letter-spacing:3px;text-transform:uppercase;">Daily Brief</div>
      </div>
      <div style="margin-left:auto;font-size:11px;color:#666;">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:24px;border:1px solid #E2E5EA;border-top:none;border-radius:0 0 12px 12px;">

      ${digest.totalAlerts > 0 ? `
        <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;letter-spacing:-.3px;">
          ${digest.urgent.length > 0 ? `${digest.urgent.length} item${digest.urgent.length > 1 ? 's' : ''} need immediate attention` : `${digest.warnings.length} item${digest.warnings.length > 1 ? 's' : ''} to watch today`}
        </div>
        <div style="font-size:13px;color:#888;margin-bottom:20px;">La Jefa has been watching your pipeline overnight.</div>
      ` : `
        <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px;">Good morning 👋</div>
        <div style="font-size:13px;color:#888;margin-bottom:20px;">La Jefa checked your pipeline overnight.</div>
      `}

      ${healthyHTML}
      ${urgentHTML}
      ${warningsHTML}

      <!-- CTA -->
      <div style="text-align:center;padding-top:16px;border-top:1px solid #F3F4F6;">
        <a href="${appUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Open PipeChamp →
        </a>
        <div style="margin-top:10px;font-size:11px;color:#aaa;">
          Ask La Jefa what to do about any of these alerts.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;font-size:11px;color:#aaa;">
      PipeChamp · <a href="${appUrl}/settings" style="color:#aaa;">Manage email preferences</a> · <a href="${appUrl}/unsubscribe" style="color:#aaa;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}

async function sendDigestEmail(toEmail, digest, appUrl) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping email send');
    return { skipped: true };
  }

  const html = buildEmailHTML(digest, appUrl);

  try {
    const res = await axios.post('https://api.resend.com/emails', {
      from: 'PipeChamp <alerts@pipechamp.io>',
      to: toEmail,
      subject: digest.subject,
      html
    }, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
    });
    return { success: true, id: res.data.id };
  } catch (err) {
    console.error('Email send failed:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendDigestEmail, buildEmailHTML };
