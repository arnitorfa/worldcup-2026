// Fetches sports schedule from Viaplay Iceland's public content API.
// Endpoint: https://content.viaplay.is/pcdash-is/sport/all
// No authentication required for schedule metadata.
// Note: actual streaming requires a Viaplay subscription.
// Only returns live broadcasts (system.flags includes 'liveStream').

const BASE_URL = 'https://content.viaplay.is/pcdash-is/sport/all';

// Map Viaplay's publicPath prefixes to our sport IDs
const VIAPLAY_SPORT_MAP = {
  'knattspyrna':        'fb',
  'football':           'fb',
  'soccer':             'fb',
  'handbolti':          'hb',
  'handball':           'hb',
  'körfubolti':         'kb',
  'basketball':         'kb',
  'motorsport':         'f1',
  'motogp':             'f1',
  'moto2':              'f1',
  'moto3':              'f1',
  'motoe':              'f1',
  'superbike':          'f1',
  'worldsbk':           'f1',
  'wsbk':               'f1',
  'superstock':         'f1',
  'formula-1':          'f1',
  'formula1':           'f1',
  'formula2':           'f1',
  'formula3':           'f1',
  'indycar':            'f1',
  'nascar':             'f1',
  'dtm':                'f1',
  'rally':              'f1',
  'wrc':                'f1',
  'touring-car':        'f1',
  'tennis':             'tennis',
  'golf':               'golf',
  'mma':                'mma',
  'boxing':             'mma',
  'ishokki':            'hockey',
  'icehockey':          'hockey',
  'hockey':             'hockey',
  'ski':                'ski',
  'skiing':             'ski',
  'biathlon':           'ski',
  'crosscountry':       'ski',
  'snooker':            'snooker',
  'billiards':          'pool',
  'pool':               'pool',
  'baseball':           'baseball',
  'softball':           'baseball',
  'darts':              'darts',
  'gymnastics':         'gym',
  'fimleikar':          'gym',
  'cycling':            'cycling',
  'hjolreidar':         'cycling',
  'athletics':          'athletics',
  'frjalsaridrottir':   'athletics',
  'rugby':              'rugby',
  'american-football':  'rugby',
  'nfl':                'rugby',
  // 'other' intentionally omitted — fall through to text detection instead
  // so that pool/billiards events under /other/ get correctly identified.
};

// seriesTitle is e.g. "MotoGP", "Moto2", "WorldSBK" — often the only reliable
// sport signal when content.title is just "Race" or "Qualifying".
function detectViaplaySport(publicPath, title, seriesTitle) {
  if (publicPath) {
    // Check each path segment, not just the first — Viaplay sometimes nests under
    // a generic "sport" or "motorsport" parent (e.g. "motorsport/moto2/...").
    const segments = publicPath.split('/');
    for (const seg of segments) {
      const key = seg.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (VIAPLAY_SPORT_MAP[key]) return VIAPLAY_SPORT_MAP[key];
    }
  }
  // Combine title + series title for keyword matching.
  // This catches events whose content.title is generic ("Race", "Qualifying")
  // but whose seriesTitle is sport-specific ("MotoGP", "WorldSBK", etc.).
  const t = ((title || '') + ' ' + (seriesTitle || '')).toLowerCase();
  if (t.includes('moto2') || t.includes('moto3') || t.includes('motoe')) return 'f1';
  if (t.includes('superbike') || t.includes('worldsbk') || t.includes('wsbk')) return 'f1';
  if (t.includes('formula') || t.includes('grand prix') || t.includes('motogp') ||
      t.includes('nascar') || t.includes('indycar') || t.includes('rally') ||
      t.includes('motorsport') || t.includes('mótorsport') || t.includes('dtm')) return 'f1';
  if (t.includes('football') || t.includes('fótbolti') || t.includes('premier league') ||
      t.includes('champions league') || t.includes('bundesliga')) return 'fb';
  if (t.includes('tennis')) return 'tennis';
  if (t.includes('golf')) return 'golf';
  if (t.includes('hockey') || t.includes('nhl')) return 'hockey';
  if (t.includes('basketball') || t.includes('nba')) return 'kb';
  if (t.includes('handball') || t.includes('handbolti')) return 'hb';
  if (t.includes('snooker')) return 'snooker';
  if (t.includes('darts')) return 'darts';
  if (t.includes('biljard') || t.includes('billiards') || /\bpool\b/.test(t)) return 'pool';
  if (t.includes('cycling') || t.includes('tour de france')) return 'cycling';
  if (t.includes('rugby') || t.includes('nfl')) return 'rugby';
  if (t.includes('athletics') || t.includes('marathon')) return 'athletics';
  return 'fb';
}

function buildSubjects(title, formatTitle, sport) {
  const subjects = [];
  if (formatTitle) {
    const slug = formatTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    subjects.push({ key: `c:vp-${slug}`, label: formatTitle, type: 'comp' });
  }
  const vsMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (vsMatch) {
    for (const teamName of [vsMatch[1].trim(), vsMatch[2].trim()]) {
      const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      subjects.push({ key: `t:${slug}`, label: teamName, type: 'team' });
    }
  }
  return subjects;
}

function normalizeProduct(product) {
  const epg = product.epg || {};
  const content = product.content || {};
  const system = product.system || {};

  if (!epg.start) return null;

  // ── Live-only filter ──────────────────────────────────────────────────────
  // Only include programmes flagged as live streams.
  const flags = system.flags || [];
  const isLiveStream = flags.includes('liveStream') || flags.includes('isLive');
  if (!isLiveStream) return null;

  const start = new Date(epg.start);
  // epg.end is the declared broadcast end; epg.streamEnd is the streaming
  // window which Viaplay sometimes sets many hours after the real end.
  // Cap: if the resolved end is more than 8 h after start we treat start+8h
  // as the effective end so that long-running "stream windows" don't keep
  // events appearing live/upcoming all day.
  const MAX_DURATION_MS = 8 * 60 * 60 * 1000;
  const rawEnd = new Date(epg.end || epg.streamEnd || epg.start);
  const end = (!isNaN(rawEnd) && rawEnd - start <= MAX_DURATION_MS)
    ? rawEnd
    : new Date(start.getTime() + MAX_DURATION_MS);
  const now = new Date();

  let status = 'upcoming';
  if (start <= now && now < end) status = 'live';
  else if (end < now) status = 'done';

  const timeStr = start.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' });
  const endTimeStr = end.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' });

  const publicPath = product.publicPath || '';
  const pathParts = publicPath.split('/');
  let title = content.title || '';
  if (!title && pathParts.length >= 3) {
    title = pathParts[pathParts.length - 2]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  if (!title) title = content.seriesTitle || 'Íþróttaviðburður';

  // Resolve series/format title BEFORE sport detection — it's a key signal
  // when content.title is a generic session label ("Race", "Qualifying").
  const formatTitle = content.format?.title || content.seriesTitle || '';
  const seasonTitle = content.format?.season?.title || '';
  const sport = detectViaplaySport(publicPath, title, formatTitle);
  const sub = formatTitle ? `${formatTitle}${seasonTitle ? ' · ' + seasonTitle : ''}` : '';

  const images = content.images || {};
  const imageUrl = images.landscape?.url || images.boxart?.url || null;

  // Channel name: Viaplay doesn't expose a sub-channel, use the sport category
  const channelName = 'Viaplay';

  return {
    id: `viaplay-${system.guid || publicPath.replace(/\//g, '-')}`,
    time: timeStr,
    endTime: endTimeStr,
    startIso: epg.start,
    endIso: epg.end || epg.streamEnd,
    sport,
    station: 'viaplay',
    channelName,
    title,
    sub,
    comp: formatTitle,
    status,
    subjects: buildSubjects(title, formatTitle, sport),
    image: imageUrl,
    sourceUrl: `https://viaplay.is/${publicPath}`,
  };
}

export async function fetchViaplaySchedule(date, fetch) {
  const dateStr = date.toISOString().slice(0, 10);
  const url = `${BASE_URL}?date=${dateStr}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ithrottir-framundan/1.0)',
      },
    });
    if (!resp.ok) {
      console.warn(`Viaplay fetch failed: HTTP ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const blocks = data?._embedded?.['viaplay:blocks'] || [];
    const allEvents = [];

    for (const block of blocks) {
      const products = block?._embedded?.['viaplay:products'] || [];
      console.log(`Viaplay block "${block.title}": ${products.length} products`);
      for (const product of products) {
        const normalized = normalizeProduct(product);
        if (normalized) allEvents.push(normalized);
      }
    }

    // Filter to events that actually START on the requested date (Reykjavík time).
    // Viaplay's API can return late-night events under the next day's results too,
    // causing the same event to appear on two consecutive days.
    const dateFiltered = allEvents.filter(ev => {
      if (!ev.startIso) return true;
      const evDate = new Date(ev.startIso)
        .toLocaleDateString('sv-SE', { timeZone: 'Atlantic/Reykjavik' });
      return evDate === dateStr;
    });

    console.log(`Viaplay live sports events: ${dateFiltered.length} (filtered from ${allEvents.length})`);
    return dateFiltered;
  } catch (err) {
    console.error('Viaplay fetch error:', err.message);
    return [];
  }
}
