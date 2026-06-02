// /api/bracket.js — Vercel serverless function
// Fetches FIFA World Cup 2026 group standings from ESPN API and returns a map
// of bracket slot → team name, e.g. { "1st A": "Mexico", "2nd A": "Czech Republic", ... }
// Also resolves knockout winners once match results are known.
// Returns empty object if data not yet available — app falls back to placeholders.

const ESPN_STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026';
const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260628-20260719';

// Parse group standings → { "1st A": "Mexico", "2nd A": "Czech Republic", "3rd A": "South Korea", ... }
async function fetchStandings(f) {
  const r = await f(ESPN_STANDINGS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`standings ${r.status}`);
  const data = await r.json();

  const map = {};
  const groups = data.children || [];

  for (const child of groups) {
    const raw = child.name || child.abbreviation || '';
    const letter = raw.replace(/^GROUP\s+/i, '').trim().toUpperCase();
    if (!letter || letter.length !== 1) continue;

    const entries = child.standings?.entries || [];
    // Sort by rank stat if present, otherwise use array order
    const sorted = entries.slice().sort((a, b) => {
      const ra = a.stats?.find(s => s.name === 'rank' || s.abbreviation === 'RK')?.value ?? a.stats?.[0]?.value ?? 99;
      const rb = b.stats?.find(s => s.name === 'rank' || s.abbreviation === 'RK')?.value ?? b.stats?.[0]?.value ?? 99;
      return ra - rb;
    });

    sorted.forEach((entry, i) => {
      const name = entry.team?.displayName || entry.team?.shortDisplayName;
      if (!name) return;
      const rank = ['1st', '2nd', '3rd', '4th'][i] || `${i + 1}th`;
      map[`${rank} ${letter}`] = name;
    });
  }

  return map;
}

// Parse knockout scoreboard → { "W73": "Mexico", "L101": "France", ... }
async function fetchKnockoutResults(f) {
  const r = await f(ESPN_SCOREBOARD, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return {};
  const data = await r.json();

  const winnerMap = {}; // espnMatchId → { winner, loser }
  const events = data.events || [];

  // Build ESPN matchId → our match ID mapping by ISO timestamp
  // Our R32+ matches start 2026-06-28T19:00Z (match 73)
  const OUR_KO = [
    { id:73, iso:'2026-06-28T19:00:00Z' }, { id:74, iso:'2026-06-29T20:30:00Z' },
    { id:75, iso:'2026-06-29T21:00:00Z' }, { id:76, iso:'2026-06-29T17:00:00Z' },
    { id:77, iso:'2026-06-30T21:00:00Z' }, { id:78, iso:'2026-06-30T17:00:00Z' },
    { id:79, iso:'2026-06-30T21:00:00Z' }, { id:80, iso:'2026-07-01T16:00:00Z' },
    { id:81, iso:'2026-07-02T00:00:00Z' }, { id:82, iso:'2026-07-01T20:00:00Z' },
    { id:83, iso:'2026-07-02T23:00:00Z' }, { id:84, iso:'2026-07-02T19:00:00Z' },
    { id:85, iso:'2026-07-04T03:00:00Z' }, { id:86, iso:'2026-07-03T22:00:00Z' },
    { id:87, iso:'2026-07-04T01:30:00Z' }, { id:88, iso:'2026-07-03T18:00:00Z' },
    { id:89, iso:'2026-07-04T21:00:00Z' }, { id:90, iso:'2026-07-04T17:00:00Z' },
    { id:91, iso:'2026-07-05T20:00:00Z' }, { id:92, iso:'2026-07-06T00:00:00Z' },
    { id:93, iso:'2026-07-06T19:00:00Z' }, { id:94, iso:'2026-07-07T00:00:00Z' },
    { id:95, iso:'2026-07-07T16:00:00Z' }, { id:96, iso:'2026-07-07T20:00:00Z' },
    { id:97, iso:'2026-07-09T20:00:00Z' }, { id:98, iso:'2026-07-10T19:00:00Z' },
    { id:99, iso:'2026-07-11T21:00:00Z' }, { id:100,iso:'2026-07-12T01:00:00Z' },
    { id:101,iso:'2026-07-14T19:00:00Z' }, { id:102,iso:'2026-07-15T19:00:00Z' },
    { id:103,iso:'2026-07-18T21:00:00Z' }, { id:104,iso:'2026-07-19T19:00:00Z' },
  ];

  const result = {};

  for (const ev of events) {
    if (ev.status?.type?.completed !== true) continue;
    const evTime = ev.date; // ISO string
    // Match to our ID by finding closest timestamp (within 5 min)
    const evMs = new Date(evTime).getTime();
    const match = OUR_KO.find(m => Math.abs(new Date(m.iso).getTime() - evMs) < 300000);
    if (!match) continue;

    const comps = ev.competitions?.[0]?.competitors || [];
    if (comps.length !== 2) continue;
    const [a, b] = comps;
    const scoreA = parseInt(a.score || 0, 10);
    const scoreB = parseInt(b.score || 0, 10);
    const winner = scoreA > scoreB ? a.team?.displayName : scoreA < scoreB ? b.team?.displayName : null;
    const loser = scoreA > scoreB ? b.team?.displayName : scoreA < scoreB ? a.team?.displayName : null;
    if (winner) result[`W${match.id}`] = winner;
    if (loser) result[`L${match.id}`] = loser;
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const now = new Date();

  // Group stage ends June 28 at ~05:00 UTC (last simultaneous matches finish).
  // Only start resolving standings AFTER all group matches are complete.
  const GROUP_STAGE_END = new Date('2026-06-28T05:00:00Z');

  if (now < GROUP_STAGE_END) {
    // Too early — group stage not finished yet, return empty so app shows placeholders
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.status(200).json({});
    return;
  }

  // After group stage: cache 5 min during knockouts (results change frequently)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const f = globalThis.fetch;
  try {
    const [standings, knockout] = await Promise.allSettled([
      fetchStandings(f),
      fetchKnockoutResults(f),
    ]);

    const map = {
      ...(standings.status === 'fulfilled' ? standings.value : {}),
      ...(knockout.status === 'fulfilled' ? knockout.value : {}),
    };

    res.status(200).json(map);
  } catch (err) {
    console.error('bracket error:', err.message);
    res.status(200).json({}); // empty → app shows placeholders
  }
}
