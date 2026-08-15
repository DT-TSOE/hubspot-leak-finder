/**
 * PipeChamp internal CRM — Google Apps Script backend.
 *
 * Receives signup/connect events POSTed from the PipeChamp backend (auth.js →
 * notifyCrm) and writes them into this Google Sheet. The Sheet IS the CRM.
 *
 * SETUP
 *   1. Create a new Google Sheet (in your own/PipeChamp Google account).
 *   2. Extensions → Apps Script. Paste this file in as Code.gs.
 *   3. Run setupCrm() once (authorize when prompted) to build the tabs.
 *   4. (Optional) Project Settings → Script Properties:
 *        SLACK_WEBHOOK  = a Slack Incoming Webhook URL   (new-signup pings)
 *        NOTIFY_EMAILS  = comma-separated emails          (new-signup emails)
 *   5. Deploy → New deployment → Web app.  Execute as: Me.  Who has access: Anyone.
 *   6. Copy the /exec URL and set it on the PipeChamp backend (Railway) as:
 *        CRM_WEBHOOK_URL = https://script.google.com/macros/s/XXXX/exec
 *
 * NOTE (from the Hale build): editing this code does NOT change the live URL
 * until you cut a new version — Deploy → Manage deployments → edit (pencil) →
 * Version: New version → Deploy.
 */

function cfg_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }

var SIGNUP_HEADERS = ['PortalID', 'Company', 'Email', 'Plan', 'Status', 'Source', 'FirstSeen', 'LastSeen', 'Notes'];
var ACTIVITY_HEADERS = ['Timestamp', 'Type', 'PortalID', 'Summary', 'Payload'];

/*** ENTRY POINT — the PipeChamp backend POSTs here on every HubSpot connect ***/
function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    if ((p.action || '') !== 'lead') return json_({ ok: false, error: 'unknown action' });

    var portalId = String(p.portalId || '').trim();
    if (!portalId) return json_({ ok: false, error: 'missing portalId' });

    var ss = SpreadsheetApp.getActive();
    ensureTabs_(ss);
    var sh = ss.getSheetByName('Signups');
    var rows = sh.getDataRange().getValues(); // header row + data
    var now = new Date();

    var found = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === portalId) { found = i; break; }
    }
    var isNew = found === -1;

    if (isNew) {
      // PortalID, Company, Email, Plan, Status, Source, FirstSeen, LastSeen, Notes
      sh.appendRow([portalId, p.company || '', p.email || '', 'Trial', 'Connected', p.source || '', now, now, '']);
    } else {
      sh.getRange(found + 1, 8).setValue(now);                                    // LastSeen
      if (p.email && !rows[found][2]) sh.getRange(found + 1, 3).setValue(p.email); // backfill email
      if (p.company && !rows[found][1]) sh.getRange(found + 1, 2).setValue(p.company);
    }

    appendActivity_(ss, isNew ? 'Signup' : 'Reconnected', portalId,
      (p.company || '') + (p.email ? (' · ' + p.email) : ''), JSON.stringify(p));

    if (isNew) notify_(p);
    return json_({ ok: true, portalId: portalId, isNew: isNew });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/*** Simple health check so you can open the /exec URL in a browser ***/
function doGet() {
  return json_({ ok: true, service: 'PipeChamp CRM', ts: new Date().toISOString() });
}

function appendActivity_(ss, type, portalId, summary, payload) {
  ss.getSheetByName('Activities').appendRow([new Date(), type, portalId, summary, payload]);
}

function notify_(p) {
  var who = p.company || p.email || p.portalId;
  var to = cfg_('NOTIFY_EMAILS');
  if (to) {
    MailApp.sendEmail({
      to: to, subject: 'New PipeChamp signup: ' + who,
      body: ['Company: ' + (p.company || ''), 'Email: ' + (p.email || ''),
             'Portal: ' + (p.portalId || ''), 'Source: ' + (p.source || '')].join('\n')
    });
  }
  var hook = cfg_('SLACK_WEBHOOK');
  if (hook) {
    var text = '*New PipeChamp signup* — ' + who +
      (p.email ? ('\n• ' + p.email) : '') +
      '\n• Portal: ' + (p.portalId || '') + '\n• Source: ' + (p.source || '');
    UrlFetchApp.fetch(hook, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ text: text }), muteHttpExceptions: true
    });
  }
}

/*** ONE-TIME SETUP — run manually once ***/
function setupCrm() { ensureTabs_(SpreadsheetApp.getActive()); }

function ensureTabs_(ss) {
  [['Signups', SIGNUP_HEADERS], ['Activities', ACTIVITY_HEADERS]].forEach(function (t) {
    var sh = ss.getSheetByName(t[0]) || ss.insertSheet(t[0]);
    if (sh.getLastRow() === 0) sh.appendRow(t[1]);
  });
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
