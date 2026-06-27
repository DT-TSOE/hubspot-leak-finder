const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');

const BASE = 'https://api.hubapi.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Blake', 'Drew', 'Sam', 'Reese', 'Parker', 'Logan', 'Skyler', 'Hayden', 'Peyton', 'Dakota', 'Cameron'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Lee', 'Harris', 'Martin', 'Thompson', 'White', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall'];
const COMPANIES = ['Acme Corp', 'Tech Solutions', 'Growth Co', 'Scale Labs', 'Venture Inc', 'Digital Works', 'Cloud Systems', 'Data Insights', 'Smart Commerce', 'Platform Co', 'Nexus Group', 'Alpha Dynamics', 'Bright Labs', 'CoreTech', 'Elevate Inc'];
const SOURCES = ['ORGANIC_SEARCH', 'PAID_SOCIAL', 'DIRECT_TRAFFIC', 'EMAIL_MARKETING', 'REFERRALS'];
const DEAL_STAGES = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(d) { return new Date(Date.now() - d * 86400000).toISOString(); }
function isoDate(msAgo) { return new Date(Date.now() - msAgo).toISOString(); }

let emailIdx = 1;
function makeEmail(first, last) { return `${first.toLowerCase()}.${last.toLowerCase()}${emailIdx++}@pipechamp-seed.dev`; }

// Build a contact at a specific lifecycle stage with realistic dates
function buildContact(stage, createDaysAgo, source, touches, advancedFar) {
  const first = rand(FIRST_NAMES);
  const last = rand(LAST_NAMES);
  const createMs = createDaysAgo * 86400000;
  const props = {
    firstname: first,
    lastname: last,
    email: makeEmail(first, last),
    company: rand(COMPANIES),
    hs_analytics_source: source,
    createdate: isoDate(createMs),
    num_contacted_notes: String(touches),
  };

  // Set stage date properties based on how far they progressed
  const stageOrder = ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer'];
  const stageIdx = stageOrder.indexOf(stage);
  const stageFields = [
    'hs_lifecyclestage_lead_date',
    'hs_lifecyclestage_marketingqualifiedlead_date',
    'hs_lifecyclestage_salesqualifiedlead_date',
    'hs_lifecyclestage_opportunity_date',
    'hs_lifecyclestage_customer_date',
  ];

  // Set each stage date in order (each transition takes some days)
  let dayOffset = createDaysAgo;
  for (let i = 0; i <= stageIdx; i++) {
    dayOffset -= randInt(2, 12); // each stage takes 2-12 days
    if (dayOffset < 0) dayOffset = 1;
    props[stageFields[i]] = isoDate(dayOffset * 86400000);
  }

  props.lifecyclestage = stage;

  // Set last contacted date (if they have touches)
  if (touches > 0) {
    const lastTouchDaysAgo = Math.max(1, createDaysAgo - randInt(1, 10));
    props.notes_last_contacted = isoDate(lastTouchDaysAgo * 86400000);
  }

  return props;
}

router.post('/seed', requireAuth, async (req, res) => {
  const token = req.session.tokens.access_token;
  const client = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  const created = { contacts: 0, deals: 0, errors: [] };

  const create = async (url, data) => {
    try {
      const r = await client.post(url, data);
      return r.data;
    } catch (e) {
      created.errors.push(e.response?.data?.message || e.message);
      return null;
    }
  };

  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting HubSpot seed...\n');

  // --- BATCH 1: Period 1 contacts (Jan-Mar 2026, 90-180 days ago) ---
  // Lower conversion rate in this period
  res.write('Creating Period 1 contacts (Jan-Mar)...\n');

  const period1Contacts = [
    // Full converters (Lead -> Customer) - source mix
    ...Array(8).fill(null).map(() => buildContact('customer', randInt(120, 180), rand(['ORGANIC_SEARCH', 'PAID_SOCIAL']), randInt(4, 7), true)),
    // Opportunities still open
    ...Array(5).fill(null).map(() => buildContact('opportunity', randInt(90, 130), rand(['ORGANIC_SEARCH', 'DIRECT_TRAFFIC']), randInt(3, 5), true)),
    // Dropped at SQL
    ...Array(6).fill(null).map(() => buildContact('salesqualifiedlead', randInt(90, 150), rand(['DIRECT_TRAFFIC', 'EMAIL_MARKETING']), randInt(1, 2), false)),
    // Dropped at MQL
    ...Array(8).fill(null).map(() => buildContact('marketingqualifiedlead', randInt(100, 160), rand(['PAID_SOCIAL', 'REFERRALS']), randInt(0, 1), false)),
    // Stuck leads (low touches)
    ...Array(10).fill(null).map(() => buildContact('lead', randInt(90, 180), rand(SOURCES), randInt(0, 1), false)),
  ];

  // --- BATCH 2: Period 2 contacts (Apr-Jun 2026, 10-89 days ago) ---
  // Higher conversion rate (improving trend)
  res.write('Creating Period 2 contacts (Apr-Jun)...\n');

  const period2Contacts = [
    // More full converters
    ...Array(10).fill(null).map(() => buildContact('customer', randInt(30, 89), rand(['ORGANIC_SEARCH', 'PAID_SOCIAL']), randInt(4, 8), true)),
    // Opportunities (more than period 1)
    ...Array(8).fill(null).map(() => buildContact('opportunity', randInt(20, 60), rand(['ORGANIC_SEARCH', 'EMAIL_MARKETING']), randInt(3, 6), true)),
    // SQLs progressing
    ...Array(7).fill(null).map(() => buildContact('salesqualifiedlead', randInt(15, 50), rand(['PAID_SOCIAL', 'DIRECT_TRAFFIC']), randInt(2, 4), true)),
    // MQLs
    ...Array(6).fill(null).map(() => buildContact('marketingqualifiedlead', randInt(10, 40), rand(['ORGANIC_SEARCH', 'REFERRALS']), randInt(1, 3), true)),
    // Recent leads (some uncontacted for speed-to-lead)
    ...Array(5).fill(null).map(() => buildContact('lead', randInt(1, 14), rand(SOURCES), 0, false)),
    ...Array(4).fill(null).map(() => buildContact('lead', randInt(2, 30), rand(SOURCES), randInt(1, 2), false)),
  ];

  const allContactData = [...period1Contacts, ...period2Contacts];

  // Create in batches of 10 to avoid rate limits
  const contactIds = [];
  for (let i = 0; i < allContactData.length; i += 10) {
    const batch = allContactData.slice(i, i + 10);
    const results = await Promise.all(batch.map(props => create('/crm/v3/objects/contacts', { properties: props })));
    results.forEach(r => { if (r?.id) { contactIds.push(r.id); created.contacts++; } });
    await sleep(300);
    res.write(`  Created ${Math.min(i + 10, allContactData.length)} / ${allContactData.length} contacts\n`);
  }

  // --- DEALS ---
  res.write('Creating deals...\n');

  const dealTemplates = [
    // Won deals - period 1
    { name: 'Enterprise License - Q1', amount: '28500', stage: 'closedwon', closeDate: daysAgo(randInt(100, 150)), daysAgo: randInt(100, 150) },
    { name: 'Annual Subscription', amount: '14200', stage: 'closedwon', closeDate: daysAgo(randInt(110, 160)), daysAgo: randInt(110, 160) },
    { name: 'Pro Plan Upgrade', amount: '8900', stage: 'closedwon', closeDate: daysAgo(randInt(120, 170)), daysAgo: randInt(120, 170) },
    // Won deals - period 2
    { name: 'Platform Bundle', amount: '42000', stage: 'closedwon', closeDate: daysAgo(randInt(20, 60)), daysAgo: randInt(20, 60) },
    { name: 'Growth Package', amount: '19500', stage: 'closedwon', closeDate: daysAgo(randInt(15, 45)), daysAgo: randInt(15, 45) },
    { name: 'Team License Q2', amount: '31000', stage: 'closedwon', closeDate: daysAgo(randInt(25, 55)), daysAgo: randInt(25, 55) },
    { name: 'Starter Suite', amount: '6800', stage: 'closedwon', closeDate: daysAgo(randInt(10, 35)), daysAgo: randInt(10, 35) },
    // Lost deals
    { name: 'Enterprise Pilot', amount: '35000', stage: 'closedlost', closeDate: daysAgo(randInt(80, 130)), daysAgo: randInt(80, 130) },
    { name: 'SMB Package', amount: '9500', stage: 'closedlost', closeDate: daysAgo(randInt(40, 90)), daysAgo: randInt(40, 90) },
    { name: 'Agency Deal', amount: '22000', stage: 'closedlost', closeDate: daysAgo(randInt(30, 70)), daysAgo: randInt(30, 70) },
    // Open deals
    { name: 'Q3 Renewal', amount: '18000', stage: 'decisionmakerboughtin', createDaysAgo: 25 },
    { name: 'Enterprise Expansion', amount: '55000', stage: 'presentationscheduled', createDaysAgo: 40 },
    { name: 'Mid-Market Bundle', amount: '24000', stage: 'qualifiedtobuy', createDaysAgo: 18 },
    { name: 'Agency Suite', amount: '16500', stage: 'appointmentscheduled', createDaysAgo: 12 },
    { name: 'Startup Package', amount: '5400', stage: 'qualifiedtobuy', createDaysAgo: 30 },
    { name: 'Scale License', amount: '38000', stage: 'presentationscheduled', createDaysAgo: 55 },
    { name: 'Team Upgrade', amount: '12000', stage: 'appointmentscheduled', createDaysAgo: 8 },
  ];

  const dealIds = [];
  for (const tmpl of dealTemplates) {
    const props = {
      dealname: tmpl.name,
      dealstage: tmpl.stage,
      amount: tmpl.amount,
      createdate: isoDate((tmpl.createDaysAgo || tmpl.daysAgo || 30) * 86400000),
    };
    if (tmpl.closeDate) props.closedate = tmpl.closeDate;
    const r = await create('/crm/v3/objects/deals', { properties: props });
    if (r?.id) { dealIds.push(r.id); created.deals++; }
    await sleep(150);
  }

  res.write(`  Created ${created.deals} deals\n`);

  // --- ASSOCIATE DEALS WITH CONTACTS ---
  res.write('Associating deals with contacts...\n');
  const customerContactIds = contactIds.slice(0, 18); // first batch are customers/opportunities
  for (let i = 0; i < dealIds.length && i < customerContactIds.length; i++) {
    await create(`/crm/v3/objects/deals/${dealIds[i]}/associations/contacts/${customerContactIds[i]}/3`, {});
    await sleep(100);
  }

  // --- INVALIDATE CACHE ---
  HubSpotService.invalidateCache(req.session.id);

  res.write('\n--- SEED COMPLETE ---\n');
  res.write(`Contacts created: ${created.contacts}\n`);
  res.write(`Deals created: ${created.deals}\n`);
  if (created.errors.length) res.write(`Errors (${created.errors.length}): ${created.errors.slice(0, 3).join(', ')}\n`);
  res.write('\nRefresh PipeChamp to see your data.\n');
  res.end();
});

module.exports = router;
