// /api/results.js — Vercel serverless function
// Proxies api-football.com to get FIFA World Cup 2026 match results.
//
// The API key lives ONLY in the Vercel environment variable FOOTBALL_API_KEY.
// It is never sent to the browser or included in any client-side code.
//
// Returns: { "2026-06-11T19:00|switzerland": { hs: 2, as: 1, status: "FT" }, ... }
// Keys are "UTC-minute|normalizedHomeTeam" — handles simultaneous kickoffs in same group.
// status values: NS (not started) | 1H | HT | 2H | ET | BT | P | FT | AET | PEN

// Normalize a team name so our key matches on both the API side and the frontend side.
function teamKey(name) {
  const n = (name || '').toLowerCase()
    .replace('türkiye', 'turkey')
    .replace(/côte d.ivoire/i, 'ivory-coast')
    .replace('korea republic', 'south-korea')
    .replace('congo dr', 'dr-congo')
    .replace('bosnia and herzegovina', 'bosnia')
    .replace('bosnia & herzegovina', 'bosnia')
    .replace('bosnia-herzegovina', 'bosnia');
  return n.replace(/[\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

const BASE = 'https://v3.football.api-sports.io';
// FIFA World Cup = league 1 in api-football
const FIXTURES_URL = `${BASE}/fixtures?league=1&season=2026`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.FOOTBALL_API_KEY;
  if (!API_KEY) {
    // Vercel env var not set — return empty so app shows no scores (graceful)
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({});
    return;
  }

  try {
    const r = await fetch(FIXTURES_URL, {
      headers: {
        'x-apisports-key': API_KEY,
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!r.ok) throw new Error(`api-football http ${r.status}`);
    const data = await r.json();

    // api-football returns errors array on auth failure
    if (data.errors && Object.keys(data.errors).length) {
      throw new Error(`api-football errors: ${JSON.stringify(data.errors)}`);
    }

    // Live statuses — used to decide cache TTL
    const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P']);
    const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);

    let hasLive = false;
    const results = {};
    const total = (data.response || []).length;

    for (const fix of (data.response || [])) {
      const status = fix.fixture?.status?.short;
      if (!status || status === 'NS' || status === 'TBD') continue;

      const hs = fix.goals?.home;
      const as = fix.goals?.away;

      // Compound key: "2026-06-11T19:00|switzerland" — unique even for simultaneous kickoffs
      const time = new Date(fix.fixture.date).toISOString().slice(0, 16);
      const key = `${time}|${teamKey(fix.teams.home.name)}`;

      results[key] = { hs, as, status };

      if (LIVE_STATUSES.has(status)) hasLive = true;
    }

    console.log(`results: ${total} fixtures from api, ${Object.keys(results).length} non-NS`);

    // Cache aggressively when nothing is live, short when matches are in progress
    if (hasLive) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=20');
    } else {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('results error:', err.message);
    res.setHeader('Cache-Control', 's-maxage=30');
    res.status(200).json({});
  }
}
