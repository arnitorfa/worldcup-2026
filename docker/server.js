// Íþróttir framundan — Docker/NAS backend server
// Runs as a standalone Express app inside the container.
// The Dockerfile copies:
//   fetchers/  → /app/fetchers/
//   public/    → /app/public/
//   docker/server.js → /app/server.js
//
// API:
//   GET /api/events?date=YYYY-MM-DD   — all sports events for a given date
//   GET /api/events                   — events for today
//   GET /health                       — health check

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import fetchers (relative to /app/ inside the container)
import { fetchRuvSchedule }    from './fetchers/ruv.js';
import { fetchViaplaySchedule } from './fetchers/viaplay.js';
import { fetchSynSchedule }    from './fetchers/syn.js';
import { fetchSiminnSchedule } from './fetchers/siminn.js';
import { fetchLiveySchedule }  from './fetchers/livey.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend
const frontendPath = join(__dirname, 'public');
app.use(express.static(frontendPath));

// ── Simple in-memory cache ──────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(dateStr) {
  const entry = cache.get(dateStr);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) { cache.delete(dateStr); return null; }
  return entry.data;
}

function setCached(dateStr, data) {
  cache.set(dateStr, { data, fetchedAt: Date.now() });
}

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
  const f = globalThis.fetch; // Node 18+ native fetch

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

  return sortEvents(deduplicateEvents(allEvents));
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/events', async (req, res) => {
  try {
    let dateStr = req.query.date;
    if (!dateStr) {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const cached = getCached(dateStr);
    if (cached) {
      console.log(`Cache hit for ${dateStr}`);
      return res.json({ date: dateStr, events: cached, cached: true });
    }

    console.log(`Fetching events for ${dateStr}...`);
    const date = new Date(dateStr + 'T00:00:00Z');
    const events = await fetchAllEvents(date);

    setCached(dateStr, events);
    console.log(`Total events for ${dateStr}: ${events.length}`);

    res.json({ date: dateStr, events, cached: false });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch schedule', message: err.message });
  }
});

// ── Prefetch tomorrow in the background ────────────────────────────────────
async function prefetchTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  if (!getCached(dateStr)) {
    console.log(`Background prefetch: ${dateStr}`);
    const events = await fetchAllEvents(tomorrow);
    setCached(dateStr, events);
  }
}

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Íþróttir framundan server running on http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/`);
  console.log(`API:      http://localhost:${PORT}/api/events?date=YYYY-MM-DD`);
  setTimeout(prefetchTomorrow, 10_000);
});
