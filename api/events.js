// Vercel serverless function — aggregates sports schedule from Icelandic broadcasters.
//
// API:
//   GET /api/events?date=YYYY-MM-DD   — all sports events for a given date
//   GET /api/events                   — events for today (Iceland time)
//
// Uses native fetch (Node 18+, no node-fetch needed).
// Edge caching via Cache-Control: s-maxage=300 (Vercel CDN caches for 5 minutes).

import { fetchRuvSchedule }    from '../fetchers/ruv.js';
import { fetchViaplaySchedule } from '../fetchers/viaplay.js';
import { fetchSynSchedule }    from '../fetchers/syn.js';
import { fetchSiminnSchedule } from '../fetchers/siminn.js';
import { fetchLiveySchedule }  from '../fetchers/livey.js';

// ── Event deduplication ─────────────────────────────────────────────────────
function deduplicateEvents(events) {
  const seen = new Set();
  return events.filter(ev => {
    const key = `${ev.title.toLowerCase().replace(/\s+/g, '')}|${ev.startIso}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Sort events by start time ───────────────────────────────────────────────
function sortEvents(events) {
  return events.sort((a, b) => {
    const aTime = new Date(a.startIso || `2000-01-01T${a.time}`);
    const bTime = new Date(b.startIso || `2000-01-01T${b.time}`);
    return aTime - bTime;
  });
}

// ── Fetch all events for a date ─────────────────────────────────────────────
async function fetchAllEvents(date) {
  // Use native fetch (available in Node 18+ on Vercel)
  const f = globalThis.fetch;

  const results = await Promise.allSettled([
    fetchRuvSchedule(date, f),
    fetchViaplaySchedule(date, f),
    fetchSynSchedule(date, f),
    fetchSiminnSchedule(date, f),
    fetchLiveySchedule(date, f),
  ]);

  const allEvents = [];
  const sources = ['RÚV', 'Viaplay', 'Sýn', 'Síminn', 'Lívey'];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      console.log(`${sources[i]}: ${result.value.length} events`);
      allEvents.push(...result.value);
    } else {
      console.error(`${sources[i]} failed:`, result.reason?.message);
    }
  }

  const deduped = deduplicateEvents(allEvents);
  return sortEvents(deduped);
}

// ── Vercel handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Parse date from query param, default to today in Iceland time (UTC+0 year-round)
    let dateStr = req.query.date;
    if (!dateStr) {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    console.log(`Fetching events for ${dateStr}...`);
    const date = new Date(dateStr + 'T00:00:00Z');
    const events = await fetchAllEvents(date);

    console.log(`Total events for ${dateStr}: ${events.length}`);

    // Cache at the Vercel CDN edge for 5 minutes; serve stale while revalidating for 60s
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ date: dateStr, events, cached: false });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch schedule', message: err.message });
  }
}
