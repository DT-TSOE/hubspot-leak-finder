const MIN = 3;

function analyzeLTV(contacts, deals) {
  const wonDeals = deals.filter(d => d.properties.dealstage === 'closedwon');
  if (wonDeals.length < MIN) return { insufficient: true, sampleSize: wonDeals.length };

  const amounts = wonDeals.map(d => parseFloat(d.properties.amount||'0')).filter(a => a > 0);
  const totalRevenue = amounts.reduce((a,b) => a+b, 0);
  const avgDealSize = amounts.length ? totalRevenue / amounts.length : 0;

  const sourceMap = {};
  for (const deal of wonDeals) {
    const cId = deal._contactIds?.[0];
    const contact = contacts.find(c => c.id === cId);
    const source = contact?.properties?.hs_analytics_source || 'Unknown';
    const amount = parseFloat(deal.properties.amount||'0');
    if (!sourceMap[source]) sourceMap[source] = { total:0, count:0 };
    sourceMap[source].total += amount;
    sourceMap[source].count++;
  }

  const ltvBySource = Object.entries(sourceMap)
    .filter(([,s]) => s.count >= MIN)
    .map(([source, s]) => ({ source, avgDealSize: Math.round(s.total/s.count), dealCount: s.count, totalRevenue: Math.round(s.total) }))
    .sort((a,b) => b.avgDealSize - a.avgDealSize);

  const cycleMap = {};
  for (const deal of wonDeals) {
    const cId = deal._contactIds?.[0];
    const contact = contacts.find(c => c.id === cId);
    const source = contact?.properties?.hs_analytics_source || 'Unknown';
    const created = new Date(deal.properties.createdate);
    const closed = new Date(deal.properties.closedate);
    if (isNaN(created)||isNaN(closed)) continue;
    const days = Math.floor((closed-created)/86400000);
    if (days < 0 || days > 730) continue;
    if (!cycleMap[source]) cycleMap[source] = [];
    cycleMap[source].push(days);
  }

  const salesCycleBySource = Object.entries(cycleMap)
    .filter(([,d]) => d.length >= MIN)
    .map(([source, days]) => {
      const s = [...days].sort((a,b)=>a-b);
      return { source, medianDays: s[Math.floor(s.length/2)], sampleSize: days.length };
    }).sort((a,b) => a.medianDays - b.medianDays);

  const repMap = {};
  for (const deal of deals) {
    const isClosed = deal.properties.dealstage === 'closedwon' || deal.properties.dealstage === 'closedlost';
    if (!isClosed) continue;
    const owner = deal.properties.hubspot_owner_id || 'Unassigned';
    if (!repMap[owner]) repMap[owner] = { won:0, lost:0, totalValue:0 };
    if (deal.properties.dealstage === 'closedwon') { repMap[owner].won++; repMap[owner].totalValue += parseFloat(deal.properties.amount||'0'); }
    else repMap[owner].lost++;
  }

  const repPerformance = Object.entries(repMap)
    .filter(([,r]) => r.won+r.lost >= MIN)
    .map(([ownerId, r]) => ({ ownerId, won:r.won, lost:r.lost, total:r.won+r.lost, winRate: Math.round((r.won/(r.won+r.lost))*1000)/10, avgDealSize: r.won > 0 ? Math.round(r.totalValue/r.won) : 0 }))
    .sort((a,b) => b.winRate - a.winRate);

  // Monthly trend (last 12 months) - won AND lost, by close month.
  const monthMap = {};
  for (const deal of deals) {
    const stage = deal.properties.dealstage;
    const isWon = stage === 'closedwon', isLost = stage === 'closedlost';
    if (!isWon && !isLost) continue;
    const closed = new Date(deal.properties.closedate);
    if (isNaN(closed.getTime())) continue;
    const key = `${closed.getFullYear()}-${String(closed.getMonth()+1).padStart(2,'0')}`;
    const label = closed.toLocaleDateString('en-US', { month:'short', year:'2-digit' });
    if (!monthMap[key]) monthMap[key] = { key, label, revenue:0, deals:0, lostRevenue:0, lost:0 };
    const amount = parseFloat(deal.properties.amount||'0') || 0;
    if (isWon) { monthMap[key].revenue += amount; monthMap[key].deals++; }
    else { monthMap[key].lostRevenue += amount; monthMap[key].lost++; }
  }
  const revenueTrend = Object.values(monthMap)
    .sort((a,b) => a.key.localeCompare(b.key))
    .slice(-12)
    .map(m => ({ ...m, revenue: Math.round(m.revenue), lostRevenue: Math.round(m.lostRevenue) }));

  // Customer LTV - clients often have multiple deals/contracts over time, so
  // group won deals by company (falls back to contact when company is blank).
  const contactById = {}; contacts.forEach(c => { contactById[c.id] = c; });
  const byCustomer = {};
  for (const deal of wonDeals) {
    const cId = deal._contactIds?.[0];
    const contact = cId ? contactById[cId] : null;
    const company = (contact?.properties?.company || '').trim();
    const key = company || (cId ? `contact:${cId}` : 'Unknown');
    const label = company || [contact?.properties?.firstname, contact?.properties?.lastname].filter(Boolean).join(' ') || 'Unknown';
    const amount = parseFloat(deal.properties.amount || '0') || 0;
    if (!byCustomer[key]) byCustomer[key] = { label, deals: 0, revenue: 0 };
    byCustomer[key].deals++;
    byCustomer[key].revenue += amount;
  }
  const customerList = Object.values(byCustomer).filter(c => c.revenue > 0);
  const distinctCustomers = customerList.length;
  const avgLtv = distinctCustomers ? Math.round(customerList.reduce((s, c) => s + c.revenue, 0) / distinctCustomers) : 0;
  const repeatCustomers = customerList.filter(c => c.deals > 1).length;
  const customerLtv = {
    avgLtv,
    distinctCustomers,
    repeatRate: distinctCustomers ? Math.round((repeatCustomers / distinctCustomers) * 100) : 0,
    topCustomers: [...customerList].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
      .map(c => ({ label: c.label, deals: c.deals, revenue: Math.round(c.revenue) })),
  };

  return {
    insufficient: false,
    overview: { totalWonDeals: wonDeals.length, totalRevenue: Math.round(totalRevenue), avgDealSize: Math.round(avgDealSize) },
    ltvBySource, salesCycleBySource, repPerformance, revenueTrend, customerLtv
  };
}

module.exports = { analyzeLTV };
