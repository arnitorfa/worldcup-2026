// Fetches sports schedule from RÚV's public GraphQL API
// Endpoint: https://spilari.nyr.ruv.is/gql/
// No authentication required.
// Only returns events marked as live broadcasts (is_live === true).

const GQL_ENDPOINT = 'https://spilari.nyr.ruv.is/gql/';

const SCHEDULE_QUERY = `
  query getSchedule($channel: Channels!, $date: String!) {
    Schedule(channel: $channel, date: $date) {
      events {
        id
        title
        subtitle
        start_time
        end_time
        is_live
        is_rerun
        description
        image
        scope
        slug
        programId
        episodeId
      }
    }
  }
`;

// Keywords that identify sports programmes in RÚV's schedule.
const SPORT_KEYWORDS = {
  fb:        ['fótbolti', 'fótbolta', 'fótboltinn', 'fótboltans', 'fótboltaleik',
              'knattspyrna', 'knattspyrnu', 'premier league', 'champions league',
              'besta deild', 'urvalsdeild', 'mls', 'bundesliga', 'la liga',
              'serie a', 'ligue 1', 'allsvenskan', 'eliteserien', 'landsleikur',
              'meistaradeild', 'europa league', 'world cup', 'em í fótbolta',
              'hm í fótbolta', 'hm kvenna', 'em kvenna', 'undankeppni hm',
              'undankeppni em', 'sambandsdeildin', 'lengjudeild', 'nations league'],
  hb:        ['handbolti', 'handknattleik', 'handball', 'em í handbolti', 'hm í handbolti'],
  kb:        ['körfubolti', 'basketball', 'nba', 'euroleague', 'em í körfubolta'],
  f1:        ['formúla 1', 'formula 1', 'grand prix', 'motogp', 'indycar',
              'mótorsport', 'motorsport', 'nascar', 'rally', 'rallycross',
              'superbike', 'wrc', 'dakar'],
  tennis:    ['tennis', 'wimbledon', 'roland garros', 'atp', 'wta'],
  golf:      ['golf', 'pga tour', 'masters golf', 'ryder cup'],
  mma:       [' mma ', 'boksíþróttir', ' ufc ', 'boxing'],
  hockey:    ['íshokkí', 'ice hockey', ' nhl ', 'khl'],
  ski:       ['skíðakeppni', 'slalom', 'alpine skiing', 'biathlon', 'langrenn',
              'ski jumping', 'skíðahlaupamaður'],
  snooker:   ['snóker', 'snooker'],
  baseball:  ['hafnabolti', 'baseball', 'mlb'],
  darts:     ['pílukast', 'darts', ' pdc '],
  pool:      ['biljard', 'billiards', 'pool keppni'],
  gym:       ['fimleikar', 'gymnastics', 'þyngdarlyftingar', 'weightlifting'],
  cycling:   ['hjólreiðar', 'cycling', 'tour de france', 'giro d\'italia', 'vuelta'],
  athletics: ['frjálsar íþróttir', 'athletics', 'maraþon', 'marathon', 'hlaupakeppni'],
  rugby:     ['rugby', 'american football', 'nfl', 'six nations'],
};

const TITLE_SPORT_KEYWORDS = {
  fb:        ['fótbolti', 'knattspyrna', 'leikurinn', 'premier league', 'besta deild', 'urvalsdeild', 'meistaradeild'],
  hb:        ['handbolti'],
  kb:        ['körfubolti', 'nba'],
  f1:        ['formúla 1', 'formula 1', 'grand prix', 'mótorsport', 'motorsport'],
  tennis:    ['tennis', 'wimbledon', 'roland garros'],
  golf:      ['golf'],
  mma:       ['mma', 'boxing', 'ufc'],
  hockey:    ['íshokkí', 'nhl'],
  ski:       ['skíðakeppni', 'slalom'],
  snooker:   ['snóker', 'snooker'],
  baseball:  ['hafnabolti', 'baseball'],
  darts:     ['pílukast', 'darts'],
  pool:      ['biljard'],
  gym:       ['fimleikar', 'gymnastics'],
  cycling:   ['hjólreiðar', 'tour de france'],
  athletics: ['frjálsar íþróttir', 'athletics'],
  rugby:     ['rugby', 'nfl'],
};

const EXACT_SPORT_TITLES = new Set([
  'íþróttir', 'íþróttadagurinn', 'leikurinn í dag', 'beint á netinu',
  'leiðin á hm', 'leiðin á em', 'knattspyrnuþátturinn',
]);

const NON_SPORT_BLACKLIST = [
  'fréttir', 'kastljós', 'veður', 'vikinglottó', 'krakkaruv', 'krakkafréttir',
  'dagskrárlok', 'blaðamannafundur', 'spurningastofan', 'útsvar', 'þáttur',
  'heimaleikfimi', 'svanasöngur', 'heimilisl', 'okkar á milli', 'ray rannsakar',
];

function detectSport(title, subtitle, description) {
  const titleLow = title.toLowerCase();
  const text = `${titleLow} ${(subtitle || '').toLowerCase()} ${(description || '').toLowerCase()}`;

  if (NON_SPORT_BLACKLIST.some(bl => titleLow.includes(bl))) return null;
  if (EXACT_SPORT_TITLES.has(titleLow.trim())) return 'fb';
  for (const [sport, keywords] of Object.entries(TITLE_SPORT_KEYWORDS)) {
    if (keywords.some(kw => titleLow.includes(kw))) return sport;
  }
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return sport;
  }
  return null;
}

function buildSubjects(title, subtitle, description, sport) {
  const subjects = [];
  if (subtitle) {
    const parts = subtitle.split('·').map(s => s.trim());
    if (parts.length > 1) {
      const comp = parts[parts.length - 1];
      const slug = comp.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      subjects.push({ key: `c:${slug}`, label: comp, type: 'comp' });
    }
  }
  const vsMatch = title.match(/^(.+?)\s*[–—-]\s*(.+)$/);
  if (vsMatch) {
    for (const teamName of [vsMatch[1].trim(), vsMatch[2].trim()]) {
      const slug = teamName.toLowerCase().replace(/[^a-záðéíóúýþæö0-9]+/g, '-').replace(/^-|-$/g, '');
      subjects.push({ key: `t:${slug}-${sport || 'fb'}`, label: teamName, type: 'team' });
    }
  }
  return subjects;
}

function normalizeEvent(ev, channel) {
  // ── Live-only filter ──────────────────────────────────────────────────────
  // Skip reruns and pre-recorded shows; only keep live broadcasts.
  if (!ev.is_live) return null;

  const title = ev.title || '';
  const subtitle = ev.subtitle || '';
  const description = ev.description || '';
  const sport = detectSport(title, subtitle, description);
  if (!sport) return null;

  const start = new Date(ev.start_time);
  const end = new Date(ev.end_time);
  const now = new Date();

  let status = 'upcoming';
  if (start <= now && now < end) status = 'live';
  else if (end < now) status = 'done';

  const timeStr = start.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' });
  const endTimeStr = end.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik' });

  // Human-readable channel name for display
  const channelDisplayNames = { ruv: 'RÚV', ruv2: 'RÚV 2' };
  const channelName = channelDisplayNames[channel] || channel.toUpperCase();

  return {
    id: `ruv-${ev.id}`,
    time: timeStr,
    endTime: endTimeStr,
    startIso: ev.start_time,
    endIso: ev.end_time,
    sport,
    station: 'ruv',
    channelName,
    title: ev.title,
    sub: ev.subtitle || '',
    comp: ev.subtitle ? ev.subtitle.split('·').pop().trim() : '',
    status,
    subjects: buildSubjects(title, subtitle, description, sport),
    image: ev.image || null,
    sourceUrl: `https://www.ruv.is/sjonvarp/dagskra/${channel}`,
  };
}

export async function fetchRuvSchedule(date, fetch) {
  const dateStr = date.toISOString().slice(0, 10);
  const channels = ['ruv', 'ruv2'];
  const allEvents = [];

  for (const channel of channels) {
    try {
      const resp = await fetch(GQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.ruv.is',
        },
        body: JSON.stringify({
          query: SCHEDULE_QUERY,
          variables: { channel, date: dateStr },
        }),
      });
      if (!resp.ok) {
        console.warn(`RÚV fetch failed for ${channel}: HTTP ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const events = data?.data?.Schedule?.events || [];
      console.log(`RÚV ${channel}: ${events.length} events total`);
      for (const ev of events) {
        const normalized = normalizeEvent(ev, channel);
        if (!normalized) continue;
        // Only keep events that actually start on the requested date (Reykjavík time).
        // RÚV's GraphQL API can include post-midnight events in the previous day's results.
        const evStartDate = new Date(ev.start_time)
          .toLocaleDateString('sv-SE', { timeZone: 'Atlantic/Reykjavik' });
        if (evStartDate !== dateStr) continue;
        allEvents.push(normalized);
      }
    } catch (err) {
      console.error(`RÚV fetch error for ${channel}:`, err.message);
    }
  }

  console.log(`RÚV live sports events: ${allEvents.length}`);
  return allEvents;
}
