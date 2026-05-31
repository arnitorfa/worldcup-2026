// Fetches sports events from Lívey's public AWS API.
// Endpoints (no authentication required):
//   GET https://fa10kh9q05.execute-api.eu-north-1.amazonaws.com/prod/events/upcoming-events/all
//   GET https://fa10kh9q05.execute-api.eu-north-1.amazonaws.com/prod/events/live-events/all
//
// Lívey (watch.livey.events / livey.is) is an Icelandic sports streaming platform
// that primarily broadcasts Icelandic football (Lengjudeildin, Lengjubikarinn),
// basketball, and international sports.

const API_BASE = 'https://fa10kh9q05.execute-api.eu-north-1.amazonaws.com/prod';

// Map Lívey's subCategory to our sport IDs
const SUB_CATEGORY_MAP = {
  football:           'fb',
  soccer:             'fb',
  basketball:         'kb',
  handball:           'hb',
  tennis:             'tennis',
  golf:               'golf',
  hockey:             'hockey',
  'ice hockey':       'hockey',
  mma:                'mma',
  boxing:             'mma',
  wrestling:          'mma',
  cycling:            'cycling',
  athletics:          'athletics',
  'track and field':  'athletics',
  baseball:           'baseball',
  softball:           'baseball',
  darts:              'darts',
  snooker:            'snooker',
  billiards:          'pool',
  pool:               'pool',
  gymnastics:         'gym',
  weightlifting:      'gym',
  rugby:              'rugby',
  'american football':'rugby',
  motorsport:         'f1',
  rally:              'f1',
  skiing:             'ski',
  biathlon:           'ski',
};

function detectSport(category, subCategory, title) {
  if (subCategory) {
    const mapped = SUB_CATEGORY_MAP[subCategory.toLowerCase()];
    if (mapped) return mapped;
  }
  const text = (title || '').toLowerCase();
  if (text.includes('football') || text.includes('fótbolti') || text.includes('soccer') ||
      text.includes('lengjudeild') || text.includes('urvalsdeild') || text.includes('besta deild') ||
      text.includes('premier league') || text.includes('champions league'))
    return 'fb';
  if (text.includes('körfubolti') || text.includes('basketball') || text.includes('nba'))
    return 'kb';
  if (text.includes('handbolti') || text.includes('handball')) return 'hb';
  if (text.includes('tennis')) return 'tennis';
  if (text.includes('golf')) return 'golf';
  if (text.includes('hockey') || text.includes('íshokkí') || text.includes('nhl')) return 'hockey';
  if (text.includes('mma') || text.includes('ufc') || text.includes('boxing') || text.includes('wrestling')) return 'mma';
  if (text.includes('formula') || text.includes('grand prix') || text.includes('motogp') ||
      text.includes('motorsport') || text.includes('rally') || text.includes('nascar')) return 'f1';
  if (text.includes('snooker')) return 'snooker';
  if (text.includes('darts') || text.includes('pílukast')) return 'darts';
  if (text.includes('baseball') || text.includes('hafnabolti')) return 'baseball';
  if (text.includes('biljard') || text.includes('billiards')) return 'pool';
  if (text.includes('fimleikar') || text.includes('gymnastics') || text.includes('weightlifting')) return 'gym';
  if (text.includes('cycling') || text.includes('hjólreiðar') || text.includes('tour de france')) return 'cycling';
  if (text.includes('athletics') || text.includes('frjálsar íþróttir') || text.includes('marathon')) return 'athletics';
  if (text.includes('rugby') || text.includes('nfl')) return 'rugby';
  return 'fb'; // default
}

function normalizeEvent(ev) {
  if (!ev.startTime || !ev.title) return null;

  const start = new Date(ev.startTime);
  const end = ev.endTime ? new Date(ev.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  let status = 'upcoming';
  if (start <= now && now < end) status = 'live';
  else if (end < now) status = 'done';

  const timeStr = start.toLocaleTimeString('is-IS', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik',
  });
  const endTimeStr = end.toLocaleTimeString('is-IS', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik',
  });

  const sport = detectSport(ev.category, ev.subCategory, ev.title);

  // Build subjects: extract teams from "Team A - Team B" title
  const subjects = [];
  const vsMatch = ev.title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (vsMatch) {
    for (const name of [vsMatch[1].trim(), vsMatch[2].trim()]) {
      const slug = name.toLowerCase().replace(/[^a-záðéíóúýþæö0-9]+/g, '-').replace(/^-|-$/g, '');
      subjects.push({ key: `t:${slug}`, label: name, type: 'team' });
    }
  }
  if (ev.streamerName) {
    const slug = ev.streamerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    subjects.push({ key: `c:livey-${slug}`, label: ev.streamerName, type: 'comp' });
  }

  return {
    id: `livey-${ev.id}`,
    time: timeStr,
    endTime: endTimeStr,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    sport,
    station: 'livey',
    channelName: 'Lívey',
    title: ev.title,
    sub: ev.streamerName || '',
    comp: ev.streamerName || '',
    status,
    subjects,
    image: ev.eventPhotoUrl || ev.smallEventPhotoUrl || null,
    sourceUrl: `https://watch.livey.events`,
  };
}

export async function fetchLiveySchedule(date, fetch) {
  // Lívey returns ALL upcoming / live events; we filter to the requested date.
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

  const allEvents = [];

  await Promise.allSettled([
    // Upcoming events (future broadcasts)
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/events/upcoming-events/all`, {
          headers: { 'Accept': 'application/json' },
        });
        if (!resp.ok) { console.warn(`Lívey upcoming fetch failed: HTTP ${resp.status}`); return; }
        const events = await resp.json();
        if (!Array.isArray(events)) return;
        console.log(`Lívey upcoming: ${events.length} total events`);
        for (const ev of events) {
          // Filter to the requested date (in Reykjavík time)
          const evDate = new Date(ev.startTime)
            .toLocaleDateString('sv-SE', { timeZone: 'Atlantic/Reykjavik' }); // YYYY-MM-DD
          if (evDate === dateStr) {
            const normalized = normalizeEvent(ev);
            if (normalized) allEvents.push(normalized);
          }
        }
      } catch (err) {
        console.error('Lívey upcoming fetch error:', err.message);
      }
    })(),

    // Live events (currently airing — include regardless of date filter)
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/events/live-events/all`, {
          headers: { 'Accept': 'application/json' },
        });
        if (!resp.ok) { console.warn(`Lívey live fetch failed: HTTP ${resp.status}`); return; }
        const events = await resp.json();
        if (!Array.isArray(events)) return;
        console.log(`Lívey live: ${events.length} events`);
        for (const ev of events) {
          const evDate = new Date(ev.startTime)
            .toLocaleDateString('sv-SE', { timeZone: 'Atlantic/Reykjavik' });
          if (evDate === dateStr) {
            const normalized = normalizeEvent(ev);
            if (normalized) allEvents.push(normalized);
          }
        }
      } catch (err) {
        console.error('Lívey live fetch error:', err.message);
      }
    })(),
  ]);

  // Deduplicate (same event can appear in both upcoming and live lists)
  const seen = new Set();
  const unique = allEvents.filter(ev => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });

  console.log(`Lívey events for ${dateStr}: ${unique.length}`);
  return unique;
}
