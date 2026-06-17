// /api/stats.js — Vercel serverless function
// Fetches top scorers and top assists for FIFA World Cup 2026 from api-football.com.
// API key lives only in FOOTBALL_API_KEY env var — never sent to the browser.

const BASE = 'https://v3.football.api-sports.io';
const HEADERS = (key) => ({ 'x-apisports-key': key, 'User-Agent': 'Mozilla/5.0' });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const API_KEY = process.env.FOOTBALL_API_KEY;
  if (!API_KEY) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({});
    return;
  }

  try {
    const [scRes, asRes] = await Promise.all([
      fetch(`${BASE}/players/topscorers?league=1&season=2026`, { headers: HEADERS(API_KEY) }),
      fetch(`${BASE}/players/topassists?league=1&season=2026`, { headers: HEADERS(API_KEY) }),
    ]);

    const [scData, asData] = await Promise.all([scRes.json(), asRes.json()]);

    const mapPlayer = (p) => ({
      name:    p.player?.name,
      photo:   p.player?.photo,
      team:    p.statistics?.[0]?.team?.name,
      goals:   p.statistics?.[0]?.goals?.total   ?? 0,
      assists: p.statistics?.[0]?.goals?.assists  ?? 0,
      yellow:  p.statistics?.[0]?.cards?.yellow   ?? 0,
      red:     p.statistics?.[0]?.cards?.red      ?? 0,
    });

    // Cache 30 min — stats change only after matches finish
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.status(200).json({
      scorers: (scData.response  || []).slice(0, 10).map(mapPlayer),
      assists: (asData.response  || []).slice(0, 10).map(mapPlayer),
    });
  } catch (err) {
    console.error('stats error:', err.message);
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({});
  }
}
