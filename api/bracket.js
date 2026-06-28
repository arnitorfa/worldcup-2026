// /api/bracket.js — Vercel serverless function
// Fetches FIFA World Cup 2026 group standings from ESPN API and returns a map
// of bracket slot → team name, e.g. { "1st A": "Mexico", "2nd A": "Czech Republic", ... }
// Also resolves "Best 3rd (X/Y/Z)" slots and knockout winners once matches are known.
// Returns empty object if data not yet available — app falls back to placeholders.

const ESPN_STANDINGS  = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026';
const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260628-20260719';

// All knockout matches with their bracket slot labels.
// "home" / "away" are the slot names as they appear in our MATCHES array.
// For R16+, only the id/iso matter (we just need W/L resolution).
const OUR_KO = [
  { id:73,  iso:'2026-06-28T19:00:00Z', home:'2nd A',                  away:'2nd B'                     },
  { id:74,  iso:'2026-06-29T20:30:00Z', home:'1st E',                  away:'Best 3rd (A/B/C/D/F)'      },
  { id:75,  iso:'2026-06-30T01:00:00Z', home:'1st F',                  away:'2nd C'                     },
  { id:76,  iso:'2026-06-29T17:00:00Z', home:'1st C',                  away:'2nd F'                     },
  { id:77,  iso:'2026-06-30T21:00:00Z', home:'1st I',                  away:'Best 3rd (C/D/F/G/H)'      },
  { id:78,  iso:'2026-06-30T17:00:00Z', home:'2nd E',                  away:'2nd I'                     },
  { id:79,  iso:'2026-07-01T01:00:00Z', home:'1st A',                  away:'Best 3rd (C/E/F/H/I)'      },
  { id:80,  iso:'2026-07-01T16:00:00Z', home:'1st L',                  away:'Best 3rd (E/H/I/J/K)'      },
  { id:81,  iso:'2026-07-02T00:00:00Z', home:'1st D',                  away:'Best 3rd (B/E/F/I/J)'      },
  { id:82,  iso:'2026-07-01T20:00:00Z', home:'1st G',                  away:'Best 3rd (A/E/H/I/J)'      },
  { id:83,  iso:'2026-07-02T23:00:00Z', home:'2nd K',                  away:'2nd L'                     },
  { id:84,  iso:'2026-07-02T19:00:00Z', home:'1st H',                  away:'2nd J'                     },
  { id:85,  iso:'2026-07-03T03:00:00Z', home:'1st B',                  away:'Best 3rd (E/F/G/I/J)'      },
  { id:86,  iso:'2026-07-03T22:00:00Z', home:'1st J',                  away:'2nd H'                     },
  { id:87,  iso:'2026-07-04T01:30:00Z', home:'1st K',                  away:'Best 3rd (D/E/I/J/L)'      },
  { id:88,  iso:'2026-07-03T18:00:00Z', home:'2nd D',                  away:'2nd G'                     },
  // R16 and beyond — only W/L slots used as bracket references
  { id:89,  iso:'2026-07-04T21:00:00Z' }, { id:90,  iso:'2026-07-04T17:00:00Z' },
  { id:91,  iso:'2026-07-05T20:00:00Z' }, { id:92,  iso:'2026-07-06T00:00:00Z' },
  { id:93,  iso:'2026-07-06T19:00:00Z' }, { id:94,  iso:'2026-07-07T00:00:00Z' },
  { id:95,  iso:'2026-07-07T16:00:00Z' }, { id:96,  iso:'2026-07-07T20:00:00Z' },
  { id:97,  iso:'2026-07-09T20:00:00Z' }, { id:98,  iso:'2026-07-10T19:00:00Z' },
  { id:99,  iso:'2026-07-11T21:00:00Z' }, { id:100, iso:'2026-07-12T01:00:00Z' },
  { id:101, iso:'2026-07-14T19:00:00Z' }, { id:102, iso:'2026-07-15T19:00:00Z' },
  { id:103, iso:'2026-07-18T21:00:00Z' }, { id:104, iso:'2026-07-19T19:00:00Z' },
];

// Parse group standings → { "1st A": "Mexico", "2nd A": "Czech Republic", ... }
async function fetchStandings(f) {
  const r = await f(ESPN_STANDINGS, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`standings ${r.status}`);
  const data = await r.json();

  const map = {};
  for (const child of (data.children || [])) {
    const raw    = child.name || child.abbreviation || '';
    const letter = raw.replace(/^GROUP\s+/i, '').trim().toUpperCase();
    if (!letter || letter.length !== 1) continue;

    const entries = child.standings?.entries || [];
    const sorted  = entries.slice().sort((a, b) => {
      const ra = a.stats?.find(s => s.name === 'rank' || s.abbreviation === 'RK')?.value ?? 99;
      const rb = b.stats?.find(s => s.name === 'rank' || s.abbreviation === 'RK')?.value ?? 99;
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

// Parse knockout scoreboard.
// standingsMap is used to disambiguate simultaneous R32 games (e.g. matches 77 & 79
// both kick off at 21:00 UTC on June 30) by checking which ESPN home team matches the
// already-resolved "1st X" slot.
//
// Resolves:
//   "Best 3rd (X/Y/Z)" → actual team name  (from ESPN even before match kicks off)
//   "1st X" / "2nd X"  → actual team name  (redundant with standings but harmless)
//   "W{id}" / "L{id}"  → actual team name  (from completed KO matches)
async function fetchKnockoutResults(f, standingsMap) {
  const r = await f(ESPN_SCOREBOARD, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return {};
  const data = await r.json();
  const result = {};

  for (const ev of (data.events || [])) {
    const evMs      = new Date(ev.date).getTime();
    const candidates = OUR_KO.filter(m => Math.abs(new Date(m.iso).getTime() - evMs) < 300000);
    if (!candidates.length) continue;

    const comps = ev.competitions?.[0]?.competitors || [];
    if (comps.length !== 2) continue;

    const homeComp = comps.find(c => c.homeAway === 'home');
    const awayComp = comps.find(c => c.homeAway === 'away');
    const homeName = homeComp?.team?.displayName || '';
    const awayName = awayComp?.team?.displayName || '';

    // Pick the right candidate — for simultaneous games match via home team name
    let match = candidates[0];
    if (candidates.length > 1 && homeName) {
      const found = candidates.find(m => {
        if (!m.home) return false;
        // Compare ESPN home team against what our bracket slot resolves to
        const expected = (standingsMap[m.home] || m.home).toLowerCase();
        return expected === homeName.toLowerCase();
      });
      if (found) match = found;
    }

    // Resolve bracket slots → real team names (works for upcoming AND live matches)
    if (homeName && match.home) result[match.home] = homeName;
    if (awayName && match.away) result[match.away] = awayName;

    // For completed matches also add W/L entries for later-round references
    if (ev.status?.type?.completed === true) {
      const scoreH = parseInt(homeComp?.score || 0, 10);
      const scoreA = parseInt(awayComp?.score || 0, 10);
      const winner = scoreH > scoreA ? homeName : scoreH < scoreA ? awayName : null;
      const loser  = scoreH > scoreA ? awayName : scoreH < scoreA ? homeName : null;
      if (winner) result[`W${match.id}`] = winner;
      if (loser)  result[`L${match.id}`] = loser;
    }
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const now = new Date();

  // Group stage ends June 28 at ~05:00 UTC (last simultaneous matches finish).
  const GROUP_STAGE_END = new Date('2026-06-28T05:00:00Z');
  if (now < GROUP_STAGE_END) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.status(200).json({});
    return;
  }

  // Knockouts: cache 5 min (results change, "Best 3rd" slots assigned on Day 1)
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const f = globalThis.fetch;
  let standings = {};
  let knockout  = {};

  try { standings = await fetchStandings(f); }
  catch (e) { console.error('standings error:', e.message); }

  // Pass standings so simultaneous-game disambiguation can compare home team names
  try { knockout = await fetchKnockoutResults(f, standings); }
  catch (e) { console.error('knockout error:', e.message); }

  res.status(200).json({ ...standings, ...knockout });
}
