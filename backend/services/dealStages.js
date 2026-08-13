/**
 * Which dealstage IDs count as closed-won / closed-lost, read from the portal's
 * actual pipeline definitions.
 *
 * Custom pipelines use numeric stage IDs — NOT the literal 'closedwon' /
 * 'closedlost' of HubSpot's default pipeline. Matching on the string misses every
 * deal in a custom pipeline (the cause of "no closed deals" / missing sections on
 * accounts that customized their pipeline). Falls back to the default IDs when
 * pipeline metadata isn't available.
 */
function closedStageSets(pipelines) {
  const won = new Set(), lost = new Set();
  for (const p of (pipelines || [])) {
    for (const s of (p.stages || [])) {
      if (s.isClosedWon) won.add(String(s.id));
      else if (s.isClosed) lost.add(String(s.id));
    }
  }
  if (!won.size) won.add('closedwon');
  if (!lost.size) lost.add('closedlost');
  return { won, lost };
}

module.exports = { closedStageSets };
