// /api/results.js — Vercel serverless function
// Proxies api-football.com to get FIFA World Cup 2026 match results.
//
// The API key lives ONLY in the Vercel environment variable FOOTBALL_API_KEY.
// It is never sent to the browser or included in any client-side code.
//
// Returns: { "2026-06-11T19:00": { hs: 2, as: 1, status: "FT" }, ... }
// Keys are UTC minute-level ISO strings matching our MATCHES[].iso values.
// status values: NS (not started) | 1H | HT | 2H | ET | BT | P | FT | AET | PEN

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

    if (!r.ok) throw new Error(`api-football error ${r.status}`);
    const data = await r.json();

    // Live statuses — used to decide cache TTL
    const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P']);
    const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);

    let hasLive = false;
    const results = {};

    for (const fix of (data.response || [])) {
      const status = fix.fixture?.status?.short;
      if (!status || status === 'NS' || status === 'TBD') continue;

      const hs = fix.goals?.home;
      const as = fix.goals?.away;

      // Normalize fixture date to UTC minute-level key: "2026-06-11T19:00"
      const key = new Date(fix.fixture.date).toISOString().slice(0, 16);

      results[key] = { hs, as, status };

      if (LIVE_STATUSES.has(status)) hasLive = true;
    }

    // Cache aggressively when nothing is live, short when matches are in progress
    if (hasLive) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=20');
    } else {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    }

    res.status(200).json(results);
  } catch (err) {
    console.error('results error:', err.message);
    // On error return empty — app gracefully shows no scores
    res.setHeader('Cache-Control', 's-maxage=30');
    res.status(200).json({});
  }
}
