require('dotenv').config({ path: __dirname + '/../backend/.env' });
const axios = require('axios');
const TOKEN = process.env.HUBSPOT_PRIVATE_TOKEN;
if (!TOKEN) { console.error('❌ Missing HUBSPOT_PRIVATE_TOKEN in .env'); process.exit(1); }
const hs = axios.create({ baseURL:'https://api.hubapi.com', headers:{ Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json' } });
const FIRST=['James','Sarah','Marcus','Priya','Tom','Elena','David','Jessica','Carlos','Amy','Ryan','Lisa','Kevin','Rachel','Michael','Zoe','Daniel','Natalie','Chris','Maya'];
const LAST=['Chen','Webb','Nair','Park','Johnson','Williams','Brown','Davis','Garcia','Martinez','Wilson','Anderson','Taylor','Thomas','Moore'];
const COMPANIES=['Acme Corp','BlueSky Tech','Velocity Labs','Meridian Group','Apex Solutions','CloudBase Inc','Neon Digital','Frontier AI','Summit Analytics','Orbit Systems'];
const SOURCES=['ORGANIC_SEARCH','PAID_SEARCH','SOCIAL_MEDIA','EMAIL_MARKETING','REFERRALS','DIRECT_TRAFFIC','PAID_SOCIAL'];
const STAGES=['lead','marketingqualifiedlead','salesqualifiedlead','opportunity','customer'];
const rand=a=>a[Math.floor(Math.random()*a.length)];
const between=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function seed() {
  const COUNT=120; let ok=0,dealsOk=0,errs=0; const created=[];
  console.log(`\n🤼 PipeChamp Seeder — ${COUNT} contacts\n`);
  for (let i=0;i<COUNT;i++) {
    const stageIdx=Math.random()<0.3?0:Math.random()<0.5?1:Math.random()<0.5?2:Math.random()<0.6?3:4;
    try {
      const r=await hs.post('/crm/v3/objects/contacts',{ properties:{ firstname:rand(FIRST), lastname:rand(LAST), email:`pc${i}${Date.now()}@${rand(COMPANIES).toLowerCase().replace(/\s+/g,'')}.io`, company:rand(COMPANIES), lifecyclestage:STAGES[stageIdx], hs_analytics_source:rand(SOURCES) }});
      created.push({id:r.data.id,stageIdx,stageName:STAGES[stageIdx],company:rand(COMPANIES),source:rand(SOURCES)});
      ok++; if(ok%20===0) console.log(`  ✓ ${ok}/${COUNT}...`);
    } catch(e){ errs++; if(errs<=2) console.error(' ✗',e.response?.data?.message||e.message); }
    await sleep(150);
  }
  console.log(`\n✅ ${ok} contacts (${errs} errors)\nCreating deals...\n`);
  for (let i=0;i<created.length;i++) {
    const {id,stageIdx,stageName,company}=created[i];
    if(stageIdx<3) continue;
    const isWon=stageName==='customer';
    const createDays=between(5,90);
    try {
      const dr=await hs.post('/crm/v3/objects/deals',{ properties:{ dealname:`${company} Deal ${i}`, dealstage:isWon?'closedwon':'presentationscheduled', amount:String(between(5000,45000)), createdate:daysAgo(createDays), ...(isWon?{closedate:daysAgo(between(0,createDays-2))}:{}) }});
      await sleep(100);
      await hs.put(`/crm/v3/objects/deals/${dr.data.id}/associations/contacts/${id}/deal_to_contact`);
      dealsOk++;
    } catch(e){ if(dealsOk===0) console.error(' ✗ deal:',e.response?.data?.message||e.message); }
    await sleep(150);
  }
  console.log(`✅ ${dealsOk} deals\n📊 Done! Refresh PipeChamp.\n`);
}
seed().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});
