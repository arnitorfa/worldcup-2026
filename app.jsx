// Main app — Íþróttir framundan v2 (Studio direction, full-bleed)

const { StationLogo, StarPopover, LoginModal, LogoSettings, SportIcon, readLS, writeLS, LS, resolveLogoUrl } = window.IF_COMPS;

// ── Session-type detector for motorsport events ───────────────────────────────
// Returns 'Æfing', 'Tímataka', 'Keppni', or null for non-motorsport sessions.
function getSessionType(title, sub) {
  const t = ((title || '') + ' ' + (sub || '')).toLowerCase();
  // Practice / warm-up / training
  if (/\bfp[1-4]\b/.test(t) || t.includes('free practice') || t.includes('practice session') ||
      t.includes('training') || t.includes('æfing') || t.includes('warm-up') ||
      t.includes('warm up') || t.includes('warmup') ||
      // standalone "practice" not inside other words
      /\bpractice\b/.test(t))
    return 'Æfing';
  // Qualifying / superpole / shootout
  if (t.includes('qualifying') || t.includes('qualification') || t.includes('qualy') ||
      t.includes('superpole') || t.includes('tímataka') || t.includes('shootout') ||
      /\bq[123]\b/.test(t))
    return 'Tímataka';
  // Race / sprint / grand prix
  if (t.includes('grand prix') || t.includes('sprint race') || t.includes('feature race') ||
      t.includes('main race') || /\brace\b/.test(t) || /\bkeppni\b/.test(t) ||
      t.includes('sprint') && !t.includes('qualifying'))
    return 'Keppni';
  return null;
}

// add 'logos' key to LS namespace
LS.logos = 'if_v2_station_logos';

function App() {
  const D = window.IF_DATA;

  // ── state ──
  const [theme, setTheme] = React.useState(() => readLS(LS.theme, 'dark'));
  const [date, setDate] = React.useState(0);
  const [allDates, setAllDates] = React.useState(false);
  // Multi-select sport filter. Empty set = no sport filter ("Allt" highlighted).
  // 'fav' lives in the same set and combines AND-style with other sport ids.
  const [selectedSports, setSelectedSportsRaw] = React.useState(() => new Set());
  const setSelectedSports = (n) => setSelectedSportsRaw(new Set(n));
  const [stations, setStations] = React.useState(D.stations.map((s) => s.id));
  const [search, setSearch] = React.useState('');
  // Debounced value — actual search only runs 300 ms after typing stops,
  // avoiding stutter while the user is mid-word.
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [follows, setFollowsRaw] = React.useState(() => new Set(readLS(LS.fav, [
  't:vikingur-fb-k', 'c:f1-2026', 't:liverpool-fb-k']
  )));
  const [popover, setPopover] = React.useState(null); // { eventId, anchor }
  const [user, setUser] = React.useState(() => readLS(LS.user, null));
  const [showLogin, setShowLogin] = React.useState(false);
  const [userMenu, setUserMenu] = React.useState(false);
  const [logos, setLogos] = React.useState(() => readLS(LS.logos, {}));
  const [showLogos, setShowLogos] = React.useState(false);
  const [moreSportsOpen, setMoreSportsOpen] = React.useState(false);

  // ── responsive: detect mobile ──
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── live event data from backend API ──
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState(null);
  // today's events — kept separate so the "Í beinni núna" panel always shows
  // what's live right now, regardless of which day is selected in the date strip.
  const [todayEvents, setTodayEvents] = React.useState([]);

  // all events keyed by isoDate — accumulated as prefetches complete.
  // Used for cross-date search (search ignores selected date & sport filter).
  const [eventsByDate, setEventsByDate] = React.useState({});

  // ── event counts for all days in the date strip ──
  const [dayCounts, setDayCounts] = React.useState({});

  React.useEffect(() => {
    const dateObj = D.dates.find((d) => d.offset === date);
    if (!dateObj) return;
    setLoading(true);
    setFetchError(null);
    fetch(`/api/events?date=${dateObj.isoDate}`)
      .then((r) => r.json())
      .then((data) => {
        const evs = data.events || [];
        setEvents(evs);
        // If today is selected, also keep todayEvents current
        if (date === 0) setTodayEvents(evs);
        // Cache for cross-date search
        setEventsByDate((prev) => ({ ...prev, [dateObj.isoDate]: evs }));
        // Update count for the currently-selected day immediately
        setDayCounts((prev) => ({ ...prev, [dateObj.isoDate]: evs.length }));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch events:', err);
        setFetchError('Ekki tókst að sækja dagskrá. Reyndu aftur.');
        setLoading(false);
      });
  }, [date]);

  // Always fetch today's events on mount so the live panel works even when
  // the user navigates to a different day.
  // Also fetches yesterday's events to catch midnight-spanning events that
  // started yesterday but are still live after midnight.
  React.useEffect(() => {
    const todayObj = D.dates.find((d) => d.offset === 0);
    const yesterdayObj = D.dates.find((d) => d.offset === -1);
    if (!todayObj) return;
    const fetchToday = () => {
      const fetches = [fetch(`/api/events?date=${todayObj.isoDate}`).then((r) => r.json())];
      if (yesterdayObj) fetches.push(fetch(`/api/events?date=${yesterdayObj.isoDate}`).then((r) => r.json()).catch(() => ({ events: [] })));
      Promise.all(fetches)
        .then(([todayData, yestData]) => {
          const todayEvs = todayData.events || [];
          // Midnight-spanning events: yesterday's events that are still live right now
          const midnightEvs = yestData ? (yestData.events || []).filter((e) => e.status === 'live') : [];
          // Merge midnight events at the front (they're already live)
          const merged = [...midnightEvs, ...todayEvs];
          setTodayEvents(merged);
          // Keep cache up to date for the selected-date view too
          setEventsByDate((prev) => ({ ...prev, [todayObj.isoDate]: todayEvs }));
          setDayCounts((prev) => ({ ...prev, [todayObj.isoDate]: todayEvs.length }));
        })
        .catch(() => {});
    };
    fetchToday();
    // Auto-refresh today's events every 5 minutes so statuses stay current
    // (events move from live → done as the day progresses).
    const timer = setInterval(fetchToday, 5 * 60 * 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch all dates in the background — stores both counts and full event
  // lists so that cross-date search works without extra round-trips.
  React.useEffect(() => {
    D.dates.forEach((d) => {
      if (dayCounts[d.isoDate] !== undefined) return; // already fetched
      fetch(`/api/events?date=${d.isoDate}`)
        .then((r) => r.json())
        .then((data) => {
          const evs = data.events || [];
          setDayCounts((prev) => ({ ...prev, [d.isoDate]: evs.length }));
          setEventsByDate((prev) => ({ ...prev, [d.isoDate]: evs }));
          if (d.offset === 0) setTodayEvents(evs); // keep today panel fresh
        })
        .catch(() => {});
    });
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Supabase auth ──────────────────────────────────────────────────────────

  // Build a user object from a Supabase session user
  const userFromSession = (u) => ({
    id: u.id,
    name: u.user_metadata?.full_name || u.email,
    email: u.email,
    initial: (u.user_metadata?.full_name || u.email || '?')[0].toUpperCase(),
  });

  // Load favorites from Supabase for the given user id
  const loadSupabaseFavs = async (userId) => {
    const sb = window.IF_SUPABASE;
    if (!sb) return;
    const { data } = await sb
      .from('favorites')
      .select('subject_keys')
      .eq('user_id', userId)
      .maybeSingle();
    if (data?.subject_keys?.length) {
      setFollows(new Set(data.subject_keys));
    }
  };

  // Listen for Supabase auth state changes (handles magic-link callback)
  React.useEffect(() => {
    const sb = window.IF_SUPABASE;
    if (!sb) return;

    // Restore existing session on page load
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(userFromSession(session.user));
        loadSupabaseFavs(session.user.id);
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(userFromSession(session.user));
        setShowLogin(false);
        loadSupabaseFavs(session.user.id);
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        // Clear local user state — session expired or was invalidated on another device.
        // Favorites remain in localStorage so they're not lost.
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always persist favorites to localStorage so they survive page reloads
  // even when the user is not signed in.
  React.useEffect(() => writeLS(LS.fav, [...follows]), [follows]);

  // Save favorites to Supabase whenever they change (debounced 1.5 s)
  const _saveFavTimer = React.useRef(null);
  React.useEffect(() => {
    const sb = window.IF_SUPABASE;
    if (!sb || !user?.id) return;
    clearTimeout(_saveFavTimer.current);
    _saveFavTimer.current = setTimeout(async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const { error } = await sb.from('favorites').upsert(
        { user_id: session.user.id, subject_keys: [...follows], updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) console.warn('Supabase favorites save error:', error.message);
    }, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows]);

  // persist theme / logos locally (not sensitive, no need for cloud)
  React.useEffect(() => writeLS(LS.theme, theme), [theme]);
  React.useEffect(() => writeLS(LS.logos, logos), [logos]);

  // Keep <body> background in sync with the theme so the side gutters around
  // the fixed-width 1400px canvas blend in (otherwise the dark default body
  // would show as black bars on either side of the page in light mode).
  React.useEffect(() => {
    const bg = theme === 'dark' ? '#222222' : '#F4F3F0';
    document.body.style.background = bg;
  }, [theme]);

  const setFollows = (next) => setFollowsRaw(new Set(next));
  const toggleFollow = (key) => {
    const n = new Set(follows);
    n.has(key) ? n.delete(key) : n.add(key);
    setFollows(n);
  };

  // key → { label, type } — built from all loaded events so user menu can show names
  const followLabels = React.useMemo(() => {
    const map = new Map();
    Object.values(eventsByDate).flat().forEach(ev => {
      (ev.subjects || []).forEach(sub => {
        if (!map.has(sub.key)) map.set(sub.key, { label: sub.label, type: sub.type });
      });
    });
    return map;
  }, [eventsByDate]);
  const toggleStation = (id) => {
    setStations((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSport = (id) => {
    if (id === 'all') { setSelectedSports(new Set()); return; }
    const next = new Set(selectedSports);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedSports(next);
  };

  // helpers
  const sportObj = (id) => D.sports.find((s) => s.id === id);
  const stationObj = (id) => D.stations.find((s) => s.id === id);
  const isStarred = (ev) => ev.subjects.some((s) => follows.has(s.key));
  const logoFor = (st) => resolveLogoUrl(st, logos[st.id], theme);

  // ── filtering ──
  // Sport filter: empty = no filter; 'fav' AND-combines with sport ids.
  const favActive = selectedSports.has('fav');
  const sportIds = [...selectedSports].filter((s) => s !== 'fav');

  // When a debounced search query is active we bypass date selection and sport/fav
  // filters entirely — results come from ALL cached dates.
  const isSearching = debouncedSearch.trim().length > 0;

  const filtered = events.
  filter((e) => stations.includes(e.station)).
  filter((e) => !favActive || isStarred(e)).
  filter((e) => sportIds.length === 0 || sportIds.includes(e.sport));
  // (search filtering handled separately below for cross-date results)

  // ── cross-date search ──
  // Group results by date so we can render date headers in the timeline.
  const searchGroups = React.useMemo(() => {
    if (!isSearching) return null;
    const q = debouncedSearch.toLowerCase();
    const matches = Object.entries(eventsByDate)
      .flatMap(([isoDate, evs]) =>
        evs.filter((e) => {
          const hay = [e.title, e.sub, e.comp, ...(e.subjects || []).map((s) => s.label)]
            .join(' ').toLowerCase();
          return hay.includes(q);
        }).map((e) => ({ ...e, _isoDate: isoDate }))
      )
      .sort((a, b) => (a.startIso || '').localeCompare(b.startIso || ''));

    // Group by date
    const groups = [];
    let lastDate = null;
    for (const ev of matches) {
      if (ev._isoDate !== lastDate) {
        lastDate = ev._isoDate;
        const label = D.formatDateIs(ev._isoDate);
        groups.push({ date: ev._isoDate, label, events: [] });
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [isSearching, debouncedSearch, eventsByDate]);

  // ── all-dates view ──
  // When allDates is active we show events from every cached date,
  // applying the same station/sport filters as normal mode.
  const allDatesGroups = React.useMemo(() => {
    if (!allDates) return null;
    const allEvs = Object.entries(eventsByDate)
      .flatMap(([isoDate, evs]) =>
        evs
          .filter((e) => stations.includes(e.station))
          .filter((e) => !favActive || isStarred(e))
          .filter((e) => sportIds.length === 0 || sportIds.includes(e.sport))
          .map((e) => ({ ...e, _isoDate: isoDate }))
      )
      .sort((a, b) => (a.startIso || '').localeCompare(b.startIso || ''));

    const groups = [];
    let lastDate = null;
    for (const ev of allEvs) {
      if (ev._isoDate !== lastDate) {
        lastDate = ev._isoDate;
        groups.push({ date: ev._isoDate, label: D.formatDateIs(ev._isoDate), events: [] });
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [allDates, eventsByDate, stations, favActive, follows, sportIds]);

  // Live panel always reflects what's happening RIGHT NOW (today's events),
  // regardless of which day is selected in the date strip.
  const live = todayEvents
    .filter((e) => stations.includes(e.station))
    .filter((e) => !favActive || isStarred(e))
    .filter((e) => sportIds.length === 0 || sportIds.includes(e.sport))
    .filter((e) => e.status === 'live');

  // Timeline includes live events so they remain visible in the main list
  // (with their LIVE badge). They also appear in the sidebar live panel.
  const others = filtered;

  // Active events (live + upcoming) shown at top, done events in a separate
  // "Liðnir atburðir" section below — both sorted chronologically.
  const upcoming = [...others.filter((e) => e.status !== 'done')]
    .sort((a, b) => a.time.localeCompare(b.time));
  const doneEvents = [...others.filter((e) => e.status === 'done')]
    .sort((a, b) => a.time.localeCompare(b.time));

  // True once the user has at least one custom logo (any theme variant) for
  // EVERY station. When true we hide the standalone logo-settings button —
  // it's still reachable through the user menu.
  const allLogosCustom = D.stations.every((st) => {
    const v = logos[st.id];
    if (!v) return false;
    if (typeof v === 'string') return true;
    return v.forDark || v.forLight;
  });

  // ── theme palette (also exposed as CSS vars) ──
  const isDark = theme === 'dark';
  const pal = isDark ? {
    bg: '#222222', fg: '#F4F4F5', card: '#2A2A2A', card2: '#2E2E2E',
    hair: '#333333', hair2: '#3C3C3C', muted: '#7B7B82',
    accent: '#C8FF3D', accentFg: '#0A0A0B', accentSoft: 'rgba(200,255,61,0.13)',
    panelBg: '#171717'
  } : {
    bg: '#F4F3F0', fg: '#0A0A0B', card: '#ECEAE6', card2: '#F4F3F0',
    hair: '#D8D6D2', hair2: '#CBC9C4', muted: '#76736C',
    accent: '#F26419', accentFg: '#FFFFFF', accentSoft: 'rgba(242,100,25,0.12)',
    panelBg: '#E5E3DF'
  };

  const cssVars = {
    '--if-bg': pal.bg, '--if-fg': pal.fg, '--if-card': pal.card, '--if-card2': pal.card2,
    '--if-hair': pal.hair, '--if-hair2': pal.hair2, '--if-muted': pal.muted,
    '--if-accent': pal.accent, '--if-accent-fg': pal.accentFg,
    '--if-accent-soft': pal.accentSoft, '--if-panel': pal.panelBg
  };

  // ── styles (scoped via prefix to avoid collisions) ──
  const ifS = {
    root: {
      ...cssVars,
      minHeight: '100vh', width: '100%', background: pal.bg, color: pal.fg,
      fontFamily: '"Inter", system-ui, sans-serif', letterSpacing: '-0.005em',
      display: 'flex', flexDirection: 'column'
    },
    topBar: {
      display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 24,
      padding: isMobile ? '12px 16px' : '20px 36px',
      borderBottom: `1px solid ${pal.hair}`
    },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
    logoMark: {
      width: 38, height: 38, borderRadius: 10, background: pal.accent,
      color: pal.accentFg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 800, fontSize: 16,
      letterSpacing: '-0.04em', fontFamily: '"JetBrains Mono", monospace'
    },
    logoName: { fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 },
    logoTag: {
      fontSize: 9.5, color: pal.muted, textTransform: 'uppercase',
      letterSpacing: '0.18em', marginTop: 3, fontWeight: 600
    },

    searchWrap: {
      flex: 1, maxWidth: 460, display: (isMobile && !isSearching) ? 'none' : 'flex', alignItems: 'center',
      gap: 10, background: pal.card, border: `1px solid ${pal.hair}`,
      borderRadius: 10, padding: '9px 14px', marginLeft: 'auto'
    },
    searchInput: {
      flex: 1, border: 'none', outline: 'none', background: 'transparent',
      color: pal.fg, fontSize: 13, fontFamily: 'inherit'
    },
    kbd: {
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
      color: pal.muted, padding: '2px 6px', border: `1px solid ${pal.hair2}`,
      borderRadius: 4
    },

    iconBtn: {
      width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
      background: pal.card, border: `1px solid ${pal.hair}`,
      color: pal.fg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0
    },

    loginBtn: {
      display: 'flex', alignItems: 'center', gap: 8,
      height: 38, padding: '0 14px', borderRadius: 10,
      background: pal.card, border: `1px solid ${pal.hair}`,
      color: pal.fg, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
      flexShrink: 0, fontFamily: 'inherit'
    },
    avatar: {
      width: 38, height: 38, borderRadius: 99, cursor: 'pointer',
      background: pal.accent, color: pal.accentFg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14, flexShrink: 0, position: 'relative'
    },

    // date strip
    dateStrip: isMobile ? {
      display: 'flex', overflowX: 'auto', overflowY: 'hidden',
      borderBottom: `1px solid ${pal.hair}`,
      scrollbarWidth: 'none', msOverflowStyle: 'none',
    } : {
      display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)',
      borderBottom: `1px solid ${pal.hair}`
    },
    dateCell: (active) => ({
      padding: isMobile ? '10px 8px 8px' : '10px 6px 9px',
      minWidth: isMobile ? 58 : undefined,
      flexShrink: 0,
      cursor: 'pointer',
      borderRight: `1px solid ${pal.hair}`,
      background: active ? pal.accent : 'transparent',
      color: active ? pal.accentFg : pal.fg,
      transition: 'background .12s'
    }),
    dateCellWk: (active) => ({
      fontSize: isMobile ? 8.5 : 10, textTransform: 'uppercase',
      letterSpacing: '0.14em', opacity: active ? 0.85 : 0.5,
      fontWeight: 700
    }),
    dateCellD: { fontSize: isMobile ? 18 : 19, fontWeight: 700, marginTop: 2,
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: '-0.02em', lineHeight: 1 },
    dateCellLbl: (active) => ({
      fontSize: 9, marginTop: isMobile ? 3 : 5, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.10em',
      opacity: active ? 0.85 : 0.4
    }),
    dateCellCount: (active) => ({
      fontSize: 9, marginTop: 3, opacity: active ? 0.85 : 1,
      color: active ? pal.accentFg : pal.muted,
      fontFamily: '"JetBrains Mono", monospace',
      display: isMobile ? 'none' : undefined,
    }),

    // sport filter — outer wrapper only; inner rows use their own grid/flex
    filterBar: {
      padding: isMobile ? '8px 12px' : '10px 28px',
      borderBottom: `1px solid ${pal.hair}`,
    },
    // Primary row uses enough columns to fit all 9 primary sports + toggle in one line.
    // Secondary row (see filterRowSecondary) stays at 7 so Hjólreiðar falls under Íshokkí.
    filterRow: isMobile ? {
      display: 'flex', overflowX: 'auto', overflowY: 'hidden',
      gap: 4, scrollbarWidth: 'none', msOverflowStyle: 'none',
    } : {
      display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4,
    },
    sportChip: (active, isFav) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', gap: isMobile ? 4 : 8,
      padding: isMobile ? '8px 10px 6px' : '12px 10px 10px',
      minWidth: isMobile ? 56 : undefined, flexShrink: isMobile ? 0 : undefined,
      borderRadius: 10, cursor: 'pointer',
      background: active ? pal.fg : 'transparent',
      color: active ? pal.bg :
      isFav ? pal.accent : pal.fg,
      transition: 'background .12s, color .12s',
      border: 'none', fontFamily: 'inherit',
      position: 'relative'
    }),
    sportChipLabel: (active) => ({
      fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', textAlign: 'center',
      lineHeight: 1.1
    }),

    // station filter
    stationBar: {
      padding: isMobile ? '10px 14px' : '14px 36px',
      display: 'flex', alignItems: 'center',
      gap: 8, borderBottom: `1px solid ${pal.hair}`, fontSize: 12,
      flexWrap: 'wrap'
    },
    stationLbl: {
      fontSize: 9.5, color: pal.muted, textTransform: 'uppercase',
      letterSpacing: '0.18em', fontWeight: 700, marginRight: 6
    },
    stationToggle: (active) => ({
      cursor: 'pointer', opacity: active ? 1 : 0.32,
      transition: 'opacity .12s', display: 'flex', alignItems: 'center',
      padding: 2, borderRadius: 6,
      background: active ? 'transparent' : 'transparent'
    }),

    // body
    body: isMobile
      ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }
      : { flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 0 },

    livePane: {
      borderRight: isMobile ? 'none' : `1px solid ${pal.hair}`,
      borderBottom: isMobile ? `1px solid ${pal.hair}` : 'none',
      padding: isMobile ? '14px 14px' : '24px 22px',
      overflowY: isMobile ? 'visible' : 'auto',
      background: pal.panelBg
    },
    liveHd: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 },
    liveDot: {
      width: 8, height: 8, borderRadius: 99, background: '#FF3B47',
      boxShadow: '0 0 0 4px rgba(255,59,71,0.22)',
      animation: 'ifPulse 1.6s infinite'
    },
    liveLabel: {
      fontSize: 11, fontWeight: 800, letterSpacing: '0.24em',
      textTransform: 'uppercase', color: '#FF3B47'
    },
    liveSub: { color: pal.muted, fontSize: 11, marginLeft: 'auto',
      fontFamily: '"JetBrains Mono", monospace' },
    liveCard: {
      padding: '16px', borderRadius: 12, background: pal.card2,
      border: `1px solid ${pal.hair}`, marginBottom: 10,
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative'
    },
    liveTime: {
      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
      color: pal.muted, letterSpacing: '0.04em'
    },
    liveTitle: { fontSize: 15, fontWeight: 700, lineHeight: 1.2,
      letterSpacing: '-0.01em' },
    liveSub2: { fontSize: 12, color: pal.muted, lineHeight: 1.3 },

    timeline: { overflowY: 'auto', padding: isMobile ? '12px 12px 64px' : '20px 32px 64px', flex: isMobile ? '1 1 auto' : undefined },
    timelineEmpty: { color: pal.muted, padding: 60, textAlign: 'center',
      fontSize: 14, lineHeight: 1.5 },
    sectionHd: {
      fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.22em', color: pal.muted, marginBottom: 8
    },

    // Per-event row — timeline is now flat (no hour grouping).
    // Grid: time (left big) | sport icon | content | countdown + station/star
    evRow: isMobile ? {
      display: 'grid',
      gridTemplateColumns: '72px 40px 1fr auto',
      gap: 10, alignItems: 'center',
      padding: '10px 0', borderTop: `1px solid ${pal.hair}`
    } : {
      display: 'grid',
      gridTemplateColumns: '110px 64px 1fr auto',
      gap: 20, alignItems: 'center',
      padding: '14px 0', borderTop: `1px solid ${pal.hair}`
    },
    timeBlock: { textAlign: 'left' },
    timeBig: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: isMobile ? 20 : 32, fontWeight: 700, lineHeight: 1,
      letterSpacing: '-0.03em', color: pal.fg
    },
    timeEnd: {
      fontSize: isMobile ? 9.5 : 11, color: pal.muted, marginTop: isMobile ? 3 : 6, fontWeight: 600,
      fontFamily: '"JetBrains Mono", monospace', letterSpacing: '-0.005em'
    },
    countdownBig: {
      fontSize: isMobile ? 13 : 22, fontWeight: 700, lineHeight: 1,
      letterSpacing: '-0.02em', color: pal.fg,
      fontFamily: '"Inter", sans-serif'
    },

    hourRow: {
      display: 'grid', gridTemplateColumns: '110px 1fr',
      gap: 28, padding: '16px 0', borderTop: `1px solid ${pal.hair}`
    },
    hourBig: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 48, fontWeight: 700, lineHeight: 1,
      letterSpacing: '-0.04em'
    },
    hourSub: {
      fontSize: 10, color: pal.muted, marginTop: 4, fontWeight: 700,
      letterSpacing: '0.16em', textTransform: 'uppercase'
    },
    hourCount: {
      marginTop: 8, fontSize: 10.5, color: pal.muted,
      fontFamily: '"JetBrains Mono", monospace'
    },

    evList: { display: 'flex', flexDirection: 'column', gap: 10 },
    evCard: {
      display: 'grid', gridTemplateColumns: '64px 1fr auto',
      gap: 18, alignItems: 'center',
      padding: '16px 18px', borderRadius: 14,
      background: pal.card, border: `1px solid ${pal.hair}`,
      transition: 'border-color .12s, transform .12s'
    },
    evIcon: {
      width: isMobile ? 36 : 60, height: isMobile ? 36 : 60,
      borderRadius: isMobile ? 8 : 12,
      background: isDark ? '#2A2A2A' : '#ECEAE6',
      border: `1px solid ${pal.hair2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: pal.fg, flexShrink: 0
    },
    evMid: { minWidth: 0 },
    evMeta: {
      fontSize: 10.5, color: pal.muted, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.14em',
      marginBottom: 4, display: isMobile ? 'none' : 'flex', alignItems: 'center',
      gap: 8, flexWrap: 'wrap'
    },
    evTitle: { fontSize: isMobile ? 13 : 17, fontWeight: 700, lineHeight: 1.2,
      letterSpacing: '-0.01em' },
    evSub: { fontSize: isMobile ? 11 : 14.5, color: isMobile ? pal.muted : pal.fg, marginTop: 3, opacity: isMobile ? 1 : 0.72 },
    followLine: {
      display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
      fontSize: 11, color: pal.muted, fontWeight: 600
    },
    followPill: {
      padding: '2px 7px', borderRadius: 4, background: pal.accentSoft,
      color: pal.fg, fontWeight: 700, fontSize: 10,
      letterSpacing: '0.04em'
    },

    evRight: { display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: 10 },
    evTime: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: isMobile ? 16 : 28, fontWeight: 700, lineHeight: 1,
      letterSpacing: '-0.02em'
    },
    evEnd: {
      fontSize: 11, color: pal.muted, fontWeight: 600,
      marginTop: 4, letterSpacing: '-0.005em',
      display: isMobile ? 'none' : undefined,
    },
    evRow2: { display: 'flex', alignItems: 'center', gap: 8 },
    starBtn: (active) => ({
      width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
      background: active ? pal.accent : 'transparent',
      color: active ? pal.accentFg : pal.muted,
      border: `1px solid ${active ? pal.accent : pal.hair2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .12s', flexShrink: 0, fontFamily: 'inherit'
    })
  };

  const renderEventMeta = (ev) => {
    const sp = sportObj(ev.sport);
    const matchedSubs = ev.subjects.filter((s) => follows.has(s.key));
    const sessionType = ev.sport === 'f1' ? getSessionType(ev.title, ev.sub) : null;
    return (
      <>
        <div style={ifS.evMeta}>
          <span>{sp.name}</span>
          {sessionType && (
            <span style={{
              padding: '2px 7px', borderRadius: 3, fontSize: 9.5,
              fontWeight: 800, letterSpacing: '0.16em',
              background: sessionType === 'Keppni'
                ? 'rgba(200,255,61,0.14)'
                : sessionType === 'Tímataka'
                  ? 'rgba(80,160,255,0.14)'
                  : 'rgba(180,180,180,0.13)',
              color: sessionType === 'Keppni'
                ? (isDark ? '#C8FF3D' : '#5A7A00')
                : sessionType === 'Tímataka'
                  ? (isDark ? '#80C0FF' : '#1A60C0')
                  : pal.muted,
            }}>{sessionType.toUpperCase()}</span>
          )}
          {ev.status === 'live' &&
          <span style={{ padding: '2px 7px', background: 'rgba(255,59,71,0.16)',
            color: '#FF3B47', borderRadius: 3, fontSize: 9.5,
            fontWeight: 800, letterSpacing: '0.16em' }}>LIVE</span>
          }
        </div>
        <div style={ifS.evTitle}>{ev.title}</div>
        <div style={ifS.evSub}>{ev.sub}</div>
        {matchedSubs.length > 0 &&
        <div style={ifS.followLine}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={pal.fg} aria-hidden="true">
              <path d="M12 2 L14.6 9 L21 9.7 L16.3 14 L17.7 20.5 L12 17 L6.3 20.5 L7.7 14 L3 9.7 L9.4 9 Z" />
            </svg>
            <span>Þú fylgir</span>
            {matchedSubs.slice(0, 2).map((s) =>
          <span key={s.key} style={ifS.followPill}>{s.label}</span>
          )}
            {matchedSubs.length > 2 && <span>+{matchedSubs.length - 2}</span>}
          </div>
        }
      </>);

  };

  const renderSportChip = (sp, extraStyle) => {
    const active = sp.id === 'all'
      ? selectedSports.size === 0
      : selectedSports.has(sp.id);
    const isFav = sp.id === 'fav';
    const showCount = isFav && follows.size > 0;
    return (
      <button key={sp.id} style={{ ...ifS.sportChip(active, isFav), ...(extraStyle || {}) }}
              onClick={() => toggleSport(sp.id)}>
        <div style={{ position: 'relative' }}>
          <SportIcon id={sp.id} size={isMobile ? 24 : 34} strokeWidth={1.4} />
          {showCount && !active && (
            <span style={{
              position: 'absolute', top: -6, right: -10,
              minWidth: 18, height: 18, padding: '0 5px',
              borderRadius: 99, background: pal.accent,
              color: pal.accentFg, fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"JetBrains Mono", monospace'
            }}>{follows.size}</span>
          )}
        </div>
        <span style={ifS.sportChipLabel(active)}>{sp.name}</span>
      </button>
    );
  };

  return (
    <div style={ifS.root}>
      <style>{`
        @keyframes ifPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,59,71,0.6); }
          70% { box-shadow: 0 0 0 10px rgba(255,59,71,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,59,71,0); }
        }
        .if-evcard:hover { border-color: ${pal.hair2} !important; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={ifS.topBar}>
        <div style={ifS.logoWrap}>
          <img
            src={`assets/logos/sportzone-${isDark ? 'dark' : 'light'}.svg`}
            alt="SportZone"
            onClick={() => window.location.reload()}
            title="Endurhlaða síðuna"
            style={{ height: 28, width: 'auto', display: 'block', cursor: 'pointer' }}
          />
        </div>

        <div style={ifS.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            style={ifS.searchInput}
            placeholder="Leita að liði, íþrótt, keppni…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setDebouncedSearch(''); e.target.blur(); } }} />
          {search ? (
            <button onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: pal.muted, fontSize: 16, lineHeight: 1, padding: '0 2px',
                      display: 'flex', alignItems: 'center' }}
                    aria-label="Hreinsa leit">×</button>
          ) : (
            <span style={ifS.kbd}>⌘ K</span>
          )}
        </div>

        {/* Theme toggle */}
        <button style={ifS.iconBtn}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label="Skipta um þema">
          {isDark ?
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41" />
            </svg> :

          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          }
        </button>

        {/* Logo settings accessible only from user menu — no top-bar button */}

        {/* Login / user */}
        {!user ?
        <button style={ifS.loginBtn} onClick={() => setShowLogin(true)}>
            <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z" />
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
              <path fill="#FBBC05" d="M24 44a20 20 0 0 0 13.4-5l-6.2-5.2c-1.9 1.3-4.4 2.2-7.2 2.2a12 12 0 0 1-11.3-8l-6.6 5.1A20 20 0 0 0 24 44z" />
              <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41.4 35.8 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z" />
            </svg>
            Skrá inn
          </button> :

        <div style={{ position: 'relative' }}>
            <div style={ifS.avatar} onClick={() => setUserMenu((m) => !m)}>{user.initial}</div>
            {userMenu &&
          <div style={{
            position: 'absolute', top: 46, right: 0, width: 260,
            background: pal.card, border: `1px solid ${pal.hair}`,
            borderRadius: 12, padding: 8, zIndex: 100,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
          }}
          onMouseLeave={() => setUserMenu(false)}>
                {/* User info */}
                <div style={{ padding: '8px 10px 10px', borderBottom: `1px solid ${pal.hair}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: pal.muted, marginTop: 2 }}>{user.email}</div>
                </div>

                {/* Sign out */}
                <button onClick={() => {
                  window.IF_SUPABASE?.auth.signOut();
                  setUser(null); setUserMenu(false);
                }}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: 'none', background: 'transparent', textAlign: 'left',
              color: pal.fg, fontSize: 12.5, cursor: 'pointer',
              fontFamily: 'inherit', marginTop: 2,
            }}>Skrá út</button>
              </div>
          }
          </div>
        }
      </div>

      {/* ── DATE STRIP ── */}
      <div style={ifS.dateStrip}>
        {/* "Allar dagsetningar" toggle — same cell format as date buttons */}
        {(() => {
          const totalAll = Object.values(dayCounts).reduce((s, n) => s + n, 0);
          return (
            <div style={{
              ...ifS.dateCell(allDates),
              minWidth: isMobile ? 66 : undefined,
              borderRight: `1px solid ${pal.hair2}`,
              marginRight: isMobile ? 4 : 0,
              flexShrink: 0,
            }}
            onClick={() => { setAllDates((v) => !v); setSearch(''); setDebouncedSearch(''); }}>
              <div style={ifS.dateCellWk(allDates)}>ALLAR</div>
              <div style={{ ...ifS.dateCellD, fontSize: isMobile ? 16 : 20, lineHeight: 1.1, marginTop: 2 }}>∞</div>
              <div style={ifS.dateCellLbl(allDates)}>DAGSET.</div>
              <div style={ifS.dateCellCount(allDates)}>{totalAll} viðb.</div>
            </div>
          );
        })()}
        {D.dates.map((d) => {
          const active = !allDates && d.offset === date;
          const cnt = dayCounts[d.isoDate] !== undefined ? dayCounts[d.isoDate] : '·';
          return (
            <div key={d.offset} style={ifS.dateCell(active)}
            onClick={() => { setAllDates(false); setDate(d.offset); setSearch(''); setDebouncedSearch(''); }}>
              <div style={ifS.dateCellWk(active)}>{d.weekday}</div>
              <div style={ifS.dateCellD}>{String(d.day).padStart(2, '0')}</div>
              {d.label ?
              <div style={ifS.dateCellLbl(active)}>{d.label}</div> :
              <div style={ifS.dateCellLbl(active)}>&nbsp;</div>}
              <div style={ifS.dateCellCount(active)}>{cnt} viðb.</div>
            </div>);

        })}
      </div>

      {/* ── SPORT FILTER ── */}
      <div style={ifS.filterBar}>
        {/* Primary row: always-visible sports + Fleiri toggle */}
        <div style={ifS.filterRow}>
          {D.sports.filter((s) => !s.secondary).map((sp) => renderSportChip(sp))}
          {D.sports.some((s) => s.secondary) && (
            <button style={ifS.sportChip(false, false)}
                    onClick={() => setMoreSportsOpen((o) => !o)}>
              <div style={{ position: 'relative' }}>
                <svg width={isMobile ? 24 : 34} height={isMobile ? 24 : 34}
                     viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.6"
                     strokeLinecap="round" strokeLinejoin="round">
                  {moreSportsOpen
                    ? <path d="M6 14 L12 8 L18 14"/>
                    : <path d="M6 10 L12 16 L18 10"/>
                  }
                </svg>
              </div>
              <span style={ifS.sportChipLabel(false)}>
                {moreSportsOpen ? 'Loka' : 'Fleiri'}
              </span>
            </button>
          )}
        </div>
        {/* Secondary row: same 10-column grid so Íshokkí falls under Allt etc. */}
        {moreSportsOpen && (
          <div style={isMobile
            ? { ...ifS.filterRow, marginTop: 4 }
            : { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, marginTop: 4 }
          }>
            {D.sports.filter((s) => s.secondary).map((sp) => renderSportChip(sp))}
          </div>
        )}
      </div>

      {/* ── STATION FILTER ── */}
      <div style={ifS.stationBar}>
        <div style={ifS.stationLbl}>Stöðvar</div>
        {D.stations.map((st) => {
          const active = stations.includes(st.id);
          return (
            <div key={st.id} style={ifS.stationToggle(active)}
            onClick={() => toggleStation(st.id)}>
              <StationLogo station={st} size="sm" logoUrl={logoFor(st)} isDark={isDark} />
            </div>);

        })}
        {!isMobile && (
          <div style={{ marginLeft: 'auto', color: pal.muted, fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace' }}>
            {filtered.length} viðburðir sýndir
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div style={ifS.body}>
        {/* Live rail */}
        <div style={ifS.livePane}>
          <div style={ifS.liveHd}>
            <span style={ifS.liveDot} />
            <span style={ifS.liveLabel}>Í beinni núna</span>
            <span style={ifS.liveSub}>{live.length}</span>
          </div>
          {live.length === 0 &&
          <div style={{ color: pal.muted, fontSize: 12, lineHeight: 1.5 }}>
              Enginn í gangi með þessar síur.
            </div>
          }
          {live.map((ev) => {
            const st = stationObj(ev.station);
            const starred = isStarred(ev);
            const liveSessionType = ev.sport === 'f1' ? getSessionType(ev.title, ev.sub) : null;
            return (
              <div key={ev.id} style={ifS.liveCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: isDark ? '#2A2A2A' : '#ECEAE6',
                    border: `1px solid ${pal.hair2}`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: pal.fg
                  }}>
                    <SportIcon id={ev.sport} size={18} strokeWidth={1.6} />
                  </div>
                  <div style={ifS.liveTime}>{ev.time} – {ev.endTime}</div>
                  {liveSessionType && (
                    <span style={{
                      marginLeft: 4, padding: '2px 6px', borderRadius: 3,
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
                      background: liveSessionType === 'Keppni'
                        ? 'rgba(200,255,61,0.14)'
                        : liveSessionType === 'Tímataka'
                          ? 'rgba(80,160,255,0.14)'
                          : 'rgba(180,180,180,0.12)',
                      color: liveSessionType === 'Keppni'
                        ? (isDark ? '#C8FF3D' : '#5A7A00')
                        : liveSessionType === 'Tímataka'
                          ? (isDark ? '#80C0FF' : '#1A60C0')
                          : pal.muted,
                    }}>{liveSessionType.toUpperCase()}</span>
                  )}
                  <div style={{
                    marginLeft: 'auto', padding: '2px 6px',
                    background: 'rgba(255,59,71,0.18)', color: '#FF3B47',
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                    borderRadius: 3
                  }}>LIVE</div>
                </div>
                <div style={ifS.liveTitle}>{ev.title}</div>
                <div style={ifS.liveSub2}>{ev.sub}</div>
                <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StationLogo station={st} size="sm" logoUrl={logoFor(st)} isDark={isDark} />
                    {ev.channelName && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: pal.muted, letterSpacing: '0.04em' }}>
                        {ev.channelName}
                      </span>
                    )}
                  </div>
                  <button style={ifS.starBtn(starred)}
                  onClick={(e) => setPopover({ eventId: ev.id, anchor: e.currentTarget })}>
                    <svg width="14" height="14" viewBox="0 0 24 24"
                    fill={starred ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.1 8.6 22 9.3 17 14 18.4 21 12 17.5 5.6 21 7 14 2 9.3 8.9 8.6 12 2" />
                    </svg>
                  </button>
                </div>
              </div>
            );

          })}
        </div>

        {/* Timeline — flat chronological list, one row per event */}
        <div style={ifS.timeline}>
          {/* Shared event-row renderer used by both normal and search modes */}
          {(() => {
            const renderEvRow = (ev) => {
              const st = stationObj(ev.station);
              const starred = isStarred(ev);
              const isDone = ev.status === 'done';
              return (
                <div key={ev.id} className="if-evcard" style={{ ...ifS.evRow, opacity: isDone ? 0.38 : 1 }}>
                  <div style={ifS.timeBlock}>
                    <div style={ifS.timeBig}>{ev.time}</div>
                    <div style={ifS.timeEnd}>til {ev.endTime}</div>
                  </div>
                  <div style={ifS.evIcon}>
                    <SportIcon id={ev.sport} size={isMobile ? 20 : 32} strokeWidth={1.4} />
                  </div>
                  <div style={ifS.evMid}>{renderEventMeta(ev)}</div>
                  <div style={ifS.evRight}>
                    <div style={ifS.evRow2}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <StationLogo station={st} size="sm" logoUrl={logoFor(st)} isDark={isDark} />
                        {ev.channelName && (
                          <div style={{ fontSize: 9, color: pal.muted, fontWeight: 600,
                            letterSpacing: '0.06em', textAlign: 'right', lineHeight: 1 }}>
                            {ev.channelName}
                          </div>
                        )}
                      </div>
                      <button style={ifS.starBtn(starred)}
                        onClick={(e) => { e.stopPropagation();
                          setPopover({ eventId: ev.id, anchor: e.currentTarget }); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24"
                          fill={starred ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.1 8.6 22 9.3 17 14 18.4 21 12 17.5 5.6 21 7 14 2 9.3 8.9 8.6 12 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            };

            // ── ALL-DATES MODE ─────────────────────────────────────────────
            if (allDates && !isSearching) {
              const totalHits = allDatesGroups ? allDatesGroups.reduce((n, g) => n + g.events.length, 0) : 0;
              return (
                <>
                  <div style={{ ...ifS.sectionHd, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>∞</span>
                    Allar dagsetningar
                    {totalHits > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: pal.muted,
                        fontFamily: '"JetBrains Mono", monospace' }}>
                        {totalHits} viðburðir
                      </span>
                    )}
                  </div>
                  {(!allDatesGroups || totalHits === 0) && (
                    <div style={ifS.timelineEmpty}>Engir viðburðir fundust með þessum síum.</div>
                  )}
                  {allDatesGroups && allDatesGroups.map((group) => (
                    <div key={group.date}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                        letterSpacing: '0.10em', color: pal.muted,
                        padding: '14px 0 4px', borderTop: `1px solid ${pal.hair2}`,
                        marginTop: 8
                      }}>
                        {group.label}
                      </div>
                      {group.events.map(renderEvRow)}
                    </div>
                  ))}
                </>
              );
            }

            // ── SEARCH MODE ────────────────────────────────────────────────
            if (isSearching) {
              const totalSearchHits = searchGroups ? searchGroups.reduce((n, g) => n + g.events.length, 0) : 0;
              return (
                <>
                  <div style={{ ...ifS.sectionHd, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
                    </svg>
                    Leitarniðurstöður
                    {totalSearchHits > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: pal.muted,
                        fontFamily: '"JetBrains Mono", monospace' }}>
                        {totalSearchHits} viðburðir
                      </span>
                    )}
                  </div>
                  {(!searchGroups || totalSearchHits === 0) && (
                    <div style={ifS.timelineEmpty}>Engir viðburðir fundust fyrir „{debouncedSearch}".</div>
                  )}
                  {searchGroups && searchGroups.map((group) => (
                    <div key={group.date}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                        letterSpacing: '0.10em', color: pal.muted,
                        padding: '14px 0 4px', borderTop: `1px solid ${pal.hair2}`,
                        marginTop: 8
                      }}>
                        {group.label}
                      </div>
                      {group.events.map(renderEvRow)}
                    </div>
                  ))}
                </>
              );
            }

            // ── NORMAL MODE ────────────────────────────────────────────────
            return (
              <>
                {loading && (
                  <div style={ifS.timelineEmpty}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      Sæki dagskrá…
                    </div>
                  </div>
                )}
                {fetchError && (
                  <div style={{ ...ifS.timelineEmpty, color: '#FF3B47' }}>{fetchError}</div>
                )}
                {!loading && !fetchError && upcoming.length === 0 && doneEvents.length === 0 && (
                  <div style={ifS.timelineEmpty}>
                    {favActive && filtered.length === 0
                      ? 'Þú átt engin uppáhalds enn. Smelltu á stjörnu hjá viðburði til að bæta við.'
                      : 'Engir íþróttaviðburðir fundust á þessum degi.'}
                  </div>
                )}
                {!loading && upcoming.map(renderEvRow)}
                {!loading && doneEvents.length > 0 && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '20px 0 6px',
                      borderTop: `1px solid ${pal.hair}`,
                      marginTop: upcoming.length > 0 ? 8 : 0,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.22em',
                        textTransform: 'uppercase', color: pal.muted,
                      }}>Liðnir atburðir</span>
                      <span style={{ fontSize: 10.5, color: pal.muted,
                        fontFamily: '"JetBrains Mono", monospace' }}>
                        {doneEvents.length}
                      </span>
                    </div>
                    {doneEvents.map(renderEvRow)}
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Popover */}
      {popover &&
      <StarPopover
        event={
          events.find((e) => e.id === popover.eventId) ||
          Object.values(eventsByDate).flat().find((e) => e.id === popover.eventId)
        }
        follows={follows}
        toggleFollow={toggleFollow}
        anchor={popover.anchor}
        onClose={() => setPopover(null)} />

      }

      {/* Login modal */}
      {showLogin &&
      <LoginModal
        onClose={() => setShowLogin(false)}
        onLogin={(u) => {setUser(u);setShowLogin(false);}} />

      }

      {/* Logo settings modal */}
      {showLogos &&
      <LogoSettings
        stations={D.stations}
        logos={logos}
        setLogos={setLogos}
        onClose={() => setShowLogos(false)} />

      }
    </div>);

}

window.App = App;