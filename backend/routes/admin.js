const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');

const BASE = 'https://api.hubapi.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Blake', 'Drew', 'Sam', 'Reese', 'Parker', 'Logan', 'Skyler', 'Hayden', 'Peyton', 'Dakota', 'Cameron'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Lee', 'Harris', 'Martin', 'Thompson', 'White', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall'];
const COMPANIES = ['Acme Corp', 'Tech Solutions', 'Growth Co', 'Scale Labs', 'Venture Inc', 'Digital Works', 'Cloud Systems', 'Data Insights', 'Smart Commerce', 'Platform Co'];
const SOURCES = ['ORGANIC_SEARCH', 'PAID_SOCIAL', 'DIRECT_TRAFFIC', 'EMAIL_MARKETING', 'REFERRALS'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// HubSpot expects datetime properties as ms-since-epoch strings
function msTimestamp(daysAgo) {
  return String(Date.now() - daysAgo * 86400000);
}

let emailIdx = Math.floor(Math.random() * 9000) + 1000;
function makeEmail(first, last) {
  return `${first.toLowerCase()}.${last.toLowerCase()}.${emailIdx++}@pipechamp-seed.dev`;
}

const STAGE_DATE_FIELDS = {
  lead: 'hs_lifecyclestage_lead_date',
  marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
  salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
  opportunity: 'hs_lifecyclestage_opportunity_date',
  customer: 'hs_lifecyclestage_customer_date',
};
const STAGE_ORDER = ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer'];

router.post('/seed', requireAuth, async (req, res) => {
  const token = req.session.tokens.access_token;
  const client = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.write('Starting HubSpot seed...\n');

  const log = msg => { res.write(msg + '\n'); };
  const created = { contacts: 0, deals: 0, errors: [] };

  const post = async (url, data) => {
    try { return (await client.post(url, data)).data; }
    catch (e) { created.errors.push(e.response?.data?.message || e.message); return null; }
  };

  const patch = async (url, data) => {
    try { return (await client.patch(url, data)).data; }
    catch (e) { created.errors.push(e.response?.data?.message || e.message); return null; }
  };

  // Create a contact then PATCH it with lifecycle stage dates
  // (HubSpot ignores stage dates on create — must be set via update)
  const createContact = async (stage, createDaysAgo, source, touches) => {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);

    // Step 1: Create basic contact
    const r = await post('/crm/v3/objects/contacts', {
      properties: {
        firstname: first,
        lastname: last,
        email: makeEmail(first, last),
        company: rand(COMPANIES),
        hs_analytics_source: source,
        lifecyclestage: stage,
        num_contacted_notes: String(touches),
      }
    });
    if (!r?.id) return null;
    await sleep(80);

    // Step 2: PATCH to set all stage dates (HubSpot ignores these on POST)
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const dateProps = {};
    let daysOffset = createDaysAgo;
    for (let i = 0; i <= stageIdx; i++) {
      dateProps[STAGE_DATE_FIELDS[STAGE_ORDER[i]]] = msTimestamp(Math.max(1, daysOffset));
      daysOffset -= randInt(3, 14); // each stage transition takes 3-14 days
    }
    // Set last contacted if touches > 0
    if (touches > 0) {
      dateProps.notes_last_contacted = msTimestamp(Math.max(1, createDaysAgo - randInt(1, 7)));
    }
    await patch(`/crm/v3/objects/contacts/${r.id}`, { properties: dateProps });
    await sleep(80);

    return r.id;
  };

  // --- PERIOD 1: Jan-Mar 2026 (90-180 days ago, lower conversion) ---
  log('Creating Period 1 contacts (Jan-Mar 2026)...');

  const period1 = [
    // Full converters: Lead → Customer (high touches)
    ...Array(8).fill(null).map(() => ({ stage: 'customer', daysAgo: randInt(120, 180), source: rand(['ORGANIC_SEARCH', 'PAID_SOCIAL']), touches: randInt(4, 7) })),
    // Opportunities still open (medium touches)
    ...Array(5).fill(null).map(() => ({ stage: 'opportunity', daysAgo: randInt(90, 130), source: rand(['ORGANIC_SEARCH', 'DIRECT_TRAFFIC']), touches: randInt(3, 5) })),
    // Dropped at SQL (low touches)
    ...Array(6).fill(null).map(() => ({ stage: 'salesqualifiedlead', daysAgo: randInt(100, 150), source: rand(['DIRECT_TRAFFIC', 'EMAIL_MARKETING']), touches: randInt(1, 2) })),
    // Dropped at MQL (very low touches)
    ...Array(8).fill(null).map(() => ({ stage: 'marketingqualifiedlead', daysAgo: randInt(100, 160), source: rand(['PAID_SOCIAL', 'REFERRALS']), touches: randInt(0, 1) })),
    // Stuck leads (no touches)
    ...Array(8).fill(null).map(() => ({ stage: 'lead', daysAgo: randInt(90, 180), source: rand(SOURCES), touches: 0 })),
  ];

  // --- PERIOD 2: Apr-Jun 2026 (10-89 days ago, higher conversion = improving trend) ---
  log('Creating Period 2 contacts (Apr-Jun 2026)...');

  const period2 = [
    // More full converters (better conversion rate)
    ...Array(10).fill(null).map(() => ({ stage: 'customer', daysAgo: randInt(30, 89), source: rand(['ORGANIC_SEARCH', 'PAID_SOCIAL']), touches: randInt(4, 8) })),
    // Opportunities (more than period 1)
    ...Array(8).fill(null).map(() => ({ stage: 'opportunity', daysAgo: randInt(20, 60), source: rand(['ORGANIC_SEARCH', 'EMAIL_MARKETING']), touches: randInt(3, 6) })),
    // SQLs still progressing
    ...Array(7).fill(null).map(() => ({ stage: 'salesqualifiedlead', daysAgo: randInt(15, 50), source: rand(['PAID_SOCIAL', 'DIRECT_TRAFFIC']), touches: randInt(2, 4) })),
    // MQLs (more of them making it through)
    ...Array(6).fill(null).map(() => ({ stage: 'marketingqualifiedlead', daysAgo: randInt(10, 40), source: rand(['ORGANIC_SEARCH', 'REFERRALS']), touches: randInt(1, 3) })),
    // Recent leads (some uncontacted for speed-to-lead data)
    ...Array(5).fill(null).map(() => ({ stage: 'lead', daysAgo: randInt(1, 14), source: rand(SOURCES), touches: 0 })),
    ...Array(4).fill(null).map(() => ({ stage: 'lead', daysAgo: randInt(2, 30), source: rand(SOURCES), touches: randInt(1, 2) })),
  ];

  const allContacts = [...period1, ...period2];
  const contactIds = [];

  for (let i = 0; i < allContacts.length; i++) {
    const c = allContacts[i];
    const id = await createContact(c.stage, c.daysAgo, c.source, c.touches);
    if (id) { contactIds.push(id); created.contacts++; }
    if ((i + 1) % 10 === 0) log(`  ${i + 1} / ${allContacts.length} contacts done`);
  }

  log(`\nContacts created: ${created.contacts}`);

  // --- DEALS ---
  log('\nCreating deals...');

  const dealTemplates = [
    { name: 'Enterprise License Q1',    amount: '28500', stage: 'closedwon',             closeDays: randInt(100, 150) },
    { name: 'Annual Subscription',      amount: '14200', stage: 'closedwon',             closeDays: randInt(110, 160) },
    { name: 'Pro Plan Upgrade',         amount: '8900',  stage: 'closedwon',             closeDays: randInt(120, 170) },
    { name: 'Platform Bundle',          amount: '42000', stage: 'closedwon',             closeDays: randInt(20, 60) },
    { name: 'Growth Package',           amount: '19500', stage: 'closedwon',             closeDays: randInt(15, 45) },
    { name: 'Team License Q2',          amount: '31000', stage: 'closedwon',             closeDays: randInt(25, 55) },
    { name: 'Starter Suite',            amount: '6800',  stage: 'closedwon',             closeDays: randInt(10, 35) },
    { name: 'Enterprise Pilot',         amount: '35000', stage: 'closedlost',            closeDays: randInt(80, 130) },
    { name: 'SMB Package',              amount: '9500',  stage: 'closedlost',            closeDays: randInt(40, 90) },
    { name: 'Agency Deal',              amount: '22000', stage: 'closedlost',            closeDays: randInt(30, 70) },
    { name: 'Q3 Renewal',              amount: '18000',  stage: 'decisionmakerboughtin', createDays: 25 },
    { name: 'Enterprise Expansion',    amount: '55000',  stage: 'presentationscheduled', createDays: 40 },
    { name: 'Mid-Market Bundle',       amount: '24000',  stage: 'qualifiedtobuy',        createDays: 18 },
    { name: 'Agency Suite',            amount: '16500',  stage: 'appointmentscheduled',  createDays: 12 },
    { name: 'Scale License',           amount: '38000',  stage: 'presentationscheduled', createDays: 55 },
    { name: 'Team Upgrade',            amount: '12000',  stage: 'appointmentscheduled',  createDays: 8 },
  ];

  const dealIds = [];
  for (const tmpl of dealTemplates) {
    const props = {
      dealname: tmpl.name,
      dealstage: tmpl.stage,
      amount: tmpl.amount,
    };
    if (tmpl.closeDays) props.closedate = msTimestamp(tmpl.closeDays);
    const r = await post('/crm/v3/objects/deals', { properties: props });
    if (r?.id) { dealIds.push(r.id); created.deals++; }
    await sleep(120);
  }

  log(`Deals created: ${created.deals}`);

  // --- ASSOCIATE DEALS WITH CUSTOMER CONTACTS ---
  log('\nAssociating deals with contacts...');
  const customerIds = contactIds.slice(0, Math.min(dealIds.length, contactIds.length));
  let assocCount = 0;
  for (let i = 0; i < dealIds.length && i < customerIds.length; i++) {
    const r = await post(`/crm/v3/objects/deals/${dealIds[i]}/associations/contacts/${customerIds[i]}/3`, {});
    if (r !== null) assocCount++;
    await sleep(80);
  }
  log(`Associations created: ${assocCount}`);

  // Force cache clear
  HubSpotService.invalidateCache(req.session.id);

  log('\n--- SEED COMPLETE ---');
  log(`Contacts: ${created.contacts} | Deals: ${created.deals} | Errors: ${created.errors.length}`);
  if (created.errors.length) log(`First error: ${created.errors[0]}`);
  log('\nDisconnect and reconnect HubSpot in PipeChamp to see the data.');
  res.end();
});

module.exports = router;
