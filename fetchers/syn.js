// Fetches sports schedule from Sýn's public EPG API.
// Endpoint: https://www.syn.is/api/epg/{channel}/{date}
// No authentication required.
// Only returns live broadcasts (beint === 1).
// Note: Sýn Sport and Síminn Sport show the same channels — this fetcher covers both.

const EPG_BASE = 'https://www.syn.is/api/epg';

const SPORT_CHANNELS = [
  'synsport', 'synsport2', 'synsport3', 'synsport4',
  'synsportisland', 'synsportisland2', 'synsportisland3',
  'synsportisland4', 'synsportisland5',
  'synsportviaplay',
];

const KKI_CHANNELS = ['kkitv1', 'kkitv2', 'kkitv3', 'kkitv4', 'kkitv5', 'kkitv6'];

// Readable channel display names
const CHANNEL_DISPLAY = {
  synsport:         'Sýn Sport',
  synsport2:        'Sýn Sport 2',
  synsport3:        'Sýn Sport 3',
  synsport4:        'Sýn Sport 4',
  synsportisland:   'Sýn Sport Ísland',
  synsportisland2:  'Sýn Sport Ísland 2',
  synsportisland3:  'Sýn Sport Ísland 3',
  synsportisland4:  'Sýn Sport Ísland 4',
  synsportisland5:  'Sýn Sport Ísland 5',
  synsportviaplay:  'Sýn Sport Viaplay',
  kkitv1: 'KKÍ TV 1', kkitv2: 'KKÍ TV 2', kkitv3: 'KKÍ TV 3',
  kkitv4: 'KKÍ TV 4', kkitv5: 'KKÍ TV 5', kkitv6: 'KKÍ TV 6',
};

function detectSport(flokkur, title) {
  const text = ((flokkur || '') + ' ' + (title || '')).toLowerCase();

  if (text.includes('football') || text.includes('fótbolti') ||
      text.includes('knattspyrna') || text.includes('premier league') ||
      text.includes('bundesliga') || text.includes('la liga') ||
      text.includes('serie a') || text.includes('ligue 1') ||
      text.includes('champions league') || text.includes('europa') ||
      text.includes('conference league') || text.includes('urvalsdeild') ||
      text.includes('besta deild') || text.includes('meistaradeild') ||
      text.includes('sambandsdeildin') || text.includes('lengjudeild') ||
      text.includes('allsvenskan') || text.includes('eliteserien'))
    return 'fb';

  if (text.includes('golf')) return 'golf';

  if (text.includes('tennis') || text.includes('wimbledon') ||
      text.includes('roland garros') || text.includes('atp') ||
      text.includes('wta'))
    return 'tennis';

  if (text.includes('basketball') || text.includes('körfubolti') ||
      text.includes('nba') || text.includes('euroleague'))
    return 'kb';

  if (text.includes('handball') || text.includes('handbolti')) return 'hb';

  if (text.includes('hockey') || text.includes('íshokkí') || text.includes('nhl') ||
      text.includes('khl'))
    return 'hockey';

  if (text.includes('formula') || text.includes(' f1') ||
      text.includes('grand prix') || text.includes('motogp') ||
      text.includes('indycar') || text.includes('mótorsport') ||
      text.includes('motorsport') || text.includes('nascar') ||
      text.includes('rally') || text.includes('wrc') || text.includes('superbike'))
    return 'f1';

  if (text.includes('mma') || text.includes('ufc') ||
      text.includes('boxing') || text.includes('boksíþróttir'))
    return 'mma';

  if (text.includes('ski') || text.includes('slalom') ||
      text.includes('biathlon') || text.includes('langrenn') ||
      text.includes('skíð'))
    return 'ski';

  if (text.includes('snooker') || text.includes('snóker')) return 'snooker';

  if (text.includes('baseball') || text.includes('hafnabolti') || text.includes('mlb')) return 'baseball';

  if (text.includes('darts') || text.includes('pílukast')) return 'darts';

  if (text.includes('biljard') || text.includes('billiards') || /\bpool\b/.test(text)) return 'pool';

  if (text.includes('fimleikar') || text.includes('gymnastics') ||
      text.includes('þyngdarlyft') || text.includes('weightlifting')) return 'gym';

  if (text.includes('hjólreiðar') || text.includes('cycling') ||
      text.includes('tour de france') || text.includes('giro') ||
      text.includes('vuelta')) return 'cycling';

  if (text.includes('frjálsar íþróttir') || text.includes('athletics') ||
      text.includes('maraþon') || text.includes('marathon')) return 'athletics';

  if (text.includes('rugby') || text.includes('nfl') ||
      text.includes('american football') || text.includes('six nations')) return 'rugby';

  return 'fb'; // default
}

function buildSubjects(ev, sport) {
  const subjects = [];
  const matchTitle = ev.isltitill || ev.undirtitill || '';
  const vsMatch = matchTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (vsMatch) {
    for (const name of [vsMatch[1].trim(), vsMatch[2].trim()]) {
      const slug = name.toLowerCase().replace(/[^a-záðéíóúýþæö0-9]+/g, '-').replace(/^-|-$/g, '');
      subjects.push({ key: `t:${slug}`, label: name, type: 'team' });
    }
  }
  if (ev.titill && ev.titill !== matchTitle) {
    const slug = ev.titill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    subjects.push({ key: `c:syn-${slug}`, label: ev.titill, type: 'comp' });
  }
  return subjects;
}

function normalizeEvent(ev, channel, isKki = false) {
  if (!ev.upphaf) return null;

  // ── Live-only filter ──────────────────────────────────────────────────────
  // beint === 1 means this is a live broadcast; skip recordings/reruns.
  if (ev.beint !== 1) return null;

  const start = new Date(ev.upphaf);
  const now = new Date();
  const end = ev.slott
    ? new Date(start.getTime() + ev.slott * 60 * 1000)
    : new Date(start.getTime() + 90 * 60 * 1000);

  let status = 'upcoming';
  if (start <= now && now < end) status = 'live';
  else if (end < now) status = 'done';

  const timeStr = start.toLocaleTimeString('is-IS', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik',
  });
  const endTimeStr = end.toLocaleTimeString('is-IS', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik',
  });

  const sport = isKki ? 'kb' : detectSport(ev.flokkur, ev.titill);

  const matchTitle = ev.isltitill || ev.undirtitill || ev.titill || '';
  const compTitle = (ev.isltitill && ev.titill && ev.isltitill !== ev.titill)
    ? ev.titill : '';

  const channelName = CHANNEL_DISPLAY[channel] || ev.midill_heiti || channel;

  return {
    id: `syn-${channel}-${ev.seria || ''}-${ev.thattur || ''}-${start.getTime()}`,
    time: timeStr,
    endTime: endTimeStr,
    startIso: ev.upphaf,
    endIso: end.toISOString(),
    sport,
    station: 'syn',
    channelName,
    title: matchTitle,
    sub: compTitle,
    comp: compTitle,
    status,
    live: true,
    subjects: buildSubjects(ev, sport),
    image: null,
    sourceUrl: 'https://www.syn.is/sjonvarp/dagskra',
  };
}

export async function fetchSynSchedule(date, fetch) {
  const dateStr = date.toISOString().slice(0, 10);
  const allEvents = [];

  await Promise.allSettled(
    [...SPORT_CHANNELS, ...KKI_CHANNELS].map(async (channel) => {
      try {
        const resp = await fetch(`${EPG_BASE}/${channel}/${dateStr}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ithrottir-framundan/1.0)' },
        });
        if (!resp.ok) {
          console.warn(`Sýn EPG failed for ${channel}: HTTP ${resp.status}`);
          return;
        }
        const events = await resp.json();
        if (!Array.isArray(events)) return;
        const isKki = channel.startsWith('kkitv');
        // Filter by actual start time in Reykjavík timezone.
        // We do NOT use the `dagsetning` field because Sýn can list the same late-night
        // event under two consecutive dates (e.g. an NHL game starting 00:30 Saturday
        // may have dagsetning entries for both Friday and Saturday).
        const filtered = events.filter(ev => {
          if (!ev.upphaf) return false;
          const startDate = new Date(ev.upphaf)
            .toLocaleDateString('sv-SE', { timeZone: 'Atlantic/Reykjavik' });
          return startDate === dateStr;
        });
        console.log(`Sýn ${channel}: ${filtered.length}/${events.length} events on ${dateStr}`);
        for (const ev of filtered) {
          const normalized = normalizeEvent(ev, channel, isKki);
          if (normalized) allEvents.push(normalized);
        }
      } catch (err) {
        console.error(`Sýn fetch error for ${channel}:`, err.message);
      }
    })
  );

  // Deduplicate: same match can air on multiple channels simultaneously
  const seen = new Set();
  const unique = allEvents.filter(ev => {
    const key = ev.title.toLowerCase().replace(/\s+/g, '') + '|' + ev.startIso;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Sýn live sports events: ${unique.length} (deduped from ${allEvents.length})`);
  return unique;
}
