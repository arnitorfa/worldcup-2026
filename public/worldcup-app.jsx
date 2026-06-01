// HM 2026 — WorldCup app v3
// Layout matches main SportZone event card style (screenshot reference).

const { SportIcon, readLS, writeLS, LS } = window.IF_COMPS;

// ── Match data (UTC; EDT = UTC−4, Reykjavik = UTC year-round) ─────────────────
const mk = (id,iso,home,away,group,venue,round) =>
  ({id,iso,home,away,group:group||null,venue,round:round||'group'});

const MATCHES = [
  mk(1, '2026-06-11T19:00:00Z','Mexico','South Africa','A','Mexico City'),
  mk(2, '2026-06-12T02:00:00Z','South Korea','Czech Republic','A','Guadalajara'),
  mk(25,'2026-06-18T16:00:00Z','South Africa','Czech Republic','A','Atlanta'),
  mk(28,'2026-06-19T01:00:00Z','Mexico','South Korea','A','Guadalajara'),
  mk(53,'2026-06-25T01:00:00Z','Mexico','Czech Republic','A','Mexico City'),
  mk(54,'2026-06-25T01:00:00Z','South Korea','South Africa','A','Monterrey'),
  mk(3, '2026-06-12T19:00:00Z','Canada','Bosnia-Herzegovina','B','Toronto'),
  mk(5, '2026-06-13T19:00:00Z','Qatar','Switzerland','B','San Francisco'),
  mk(26,'2026-06-18T19:00:00Z','Switzerland','Bosnia-Herzegovina','B','Los Angeles'),
  mk(27,'2026-06-18T22:00:00Z','Canada','Qatar','B','Vancouver'),
  mk(49,'2026-06-24T19:00:00Z','Canada','Switzerland','B','Vancouver'),
  mk(50,'2026-06-24T19:00:00Z','Qatar','Bosnia-Herzegovina','B','Seattle'),
  mk(6, '2026-06-13T22:00:00Z','Brazil','Morocco','C','New York/NJ'),
  mk(7, '2026-06-14T01:00:00Z','Haiti','Scotland','C','Boston'),
  mk(30,'2026-06-19T19:00:00Z','Scotland','Morocco','C','Boston'),
  mk(31,'2026-06-20T01:00:00Z','Brazil','Haiti','C','Philadelphia'),
  mk(51,'2026-06-24T22:00:00Z','Scotland','Brazil','C','Miami'),
  mk(52,'2026-06-24T22:00:00Z','Morocco','Haiti','C','Atlanta'),
  mk(4, '2026-06-13T01:00:00Z','USA','Paraguay','D','Los Angeles'),
  mk(8, '2026-06-14T04:00:00Z','Australia','Turkey','D','Vancouver'),
  mk(29,'2026-06-19T19:00:00Z','USA','Australia','D','Seattle'),
  mk(32,'2026-06-20T04:00:00Z','Paraguay','Turkey','D','San Francisco'),
  mk(59,'2026-06-26T02:00:00Z','USA','Turkey','D','Los Angeles'),
  mk(60,'2026-06-26T02:00:00Z','Paraguay','Australia','D','San Francisco'),
  mk(9, '2026-06-14T17:00:00Z','Germany','Curaçao','E','Houston'),
  mk(11,'2026-06-14T23:00:00Z','Ivory Coast','Ecuador','E','Philadelphia'),
  mk(34,'2026-06-20T20:00:00Z','Germany','Ivory Coast','E','Toronto'),
  mk(35,'2026-06-21T00:00:00Z','Ecuador','Curaçao','E','Kansas City'),
  mk(55,'2026-06-25T20:00:00Z','Ecuador','Germany','E','New York/NJ'),
  mk(56,'2026-06-25T20:00:00Z','Curaçao','Ivory Coast','E','Philadelphia'),
  mk(10,'2026-06-14T20:00:00Z','Netherlands','Japan','F','Dallas'),
  mk(12,'2026-06-15T02:00:00Z','Tunisia','Sweden','F','Monterrey'),
  mk(33,'2026-06-20T17:00:00Z','Netherlands','Sweden','F','Houston'),
  mk(36,'2026-06-21T04:00:00Z','Tunisia','Japan','F','Monterrey'),
  mk(57,'2026-06-25T23:00:00Z','Tunisia','Netherlands','F','Kansas City'),
  mk(58,'2026-06-25T23:00:00Z','Japan','Sweden','F','Dallas'),
  mk(14,'2026-06-15T19:00:00Z','Belgium','Egypt','G','Seattle'),
  mk(16,'2026-06-16T01:00:00Z','Iran','New Zealand','G','Los Angeles'),
  mk(38,'2026-06-21T19:00:00Z','Belgium','Iran','G','Los Angeles'),
  mk(40,'2026-06-22T01:00:00Z','New Zealand','Egypt','G','Vancouver'),
  mk(65,'2026-06-27T03:00:00Z','New Zealand','Belgium','G','Vancouver'),
  mk(66,'2026-06-27T03:00:00Z','Egypt','Iran','G','Seattle'),
  mk(13,'2026-06-15T16:00:00Z','Spain','Cape Verde','H','Atlanta'),
  mk(15,'2026-06-15T22:00:00Z','Saudi Arabia','Uruguay','H','Miami'),
  mk(37,'2026-06-21T16:00:00Z','Spain','Saudi Arabia','H','Atlanta'),
  mk(39,'2026-06-21T22:00:00Z','Uruguay','Cape Verde','H','Miami'),
  mk(63,'2026-06-27T00:00:00Z','Uruguay','Spain','H','Guadalajara'),
  mk(64,'2026-06-27T00:00:00Z','Cape Verde','Saudi Arabia','H','Houston'),
  mk(17,'2026-06-16T19:00:00Z','France','Senegal','I','New York/NJ'),
  mk(18,'2026-06-16T22:00:00Z','Norway','Iraq','I','Boston'),
  mk(42,'2026-06-22T21:00:00Z','France','Iraq','I','Philadelphia'),
  mk(43,'2026-06-23T00:00:00Z','Norway','Senegal','I','New York/NJ'),
  mk(61,'2026-06-26T19:00:00Z','Norway','France','I','Boston'),
  mk(62,'2026-06-26T19:00:00Z','Senegal','Iraq','I','Toronto'),
  mk(19,'2026-06-17T01:00:00Z','Argentina','Algeria','J','Kansas City'),
  mk(20,'2026-06-17T04:00:00Z','Austria','Jordan','J','San Francisco'),
  mk(41,'2026-06-22T17:00:00Z','Argentina','Austria','J','Dallas'),
  mk(44,'2026-06-23T03:00:00Z','Jordan','Algeria','J','San Francisco'),
  mk(71,'2026-06-28T02:00:00Z','Jordan','Argentina','J','Dallas'),
  mk(72,'2026-06-28T02:00:00Z','Algeria','Austria','J','Kansas City'),
  mk(21,'2026-06-17T17:00:00Z','Portugal','DR Congo','K','Houston'),
  mk(24,'2026-06-18T02:00:00Z','Uzbekistan','Colombia','K','Mexico City'),
  mk(45,'2026-06-23T17:00:00Z','Portugal','Uzbekistan','K','Houston'),
  mk(48,'2026-06-24T02:00:00Z','Colombia','DR Congo','K','Guadalajara'),
  mk(69,'2026-06-27T23:30:00Z','Colombia','Portugal','K','Miami'),
  mk(70,'2026-06-27T23:30:00Z','Uzbekistan','DR Congo','K','Atlanta'),
  mk(22,'2026-06-17T20:00:00Z','England','Croatia','L','Dallas'),
  mk(23,'2026-06-17T23:00:00Z','Ghana','Panama','L','Toronto'),
  mk(46,'2026-06-23T20:00:00Z','England','Ghana','L','Boston'),
  mk(47,'2026-06-23T23:00:00Z','Panama','Croatia','L','Toronto'),
  mk(67,'2026-06-27T21:00:00Z','Panama','England','L','New York/NJ'),
  mk(68,'2026-06-27T21:00:00Z','Croatia','Ghana','L','Philadelphia'),
  // ROUND OF 32
  mk(73,'2026-06-28T19:00:00Z','2nd A','2nd B',null,'Los Angeles','r32'),
  mk(74,'2026-06-29T20:30:00Z','1st E','Best 3rd (A/B/C/D/F)',null,'Boston','r32'),
  mk(75,'2026-06-29T21:00:00Z','1st F','2nd C',null,'Monterrey','r32'),
  mk(76,'2026-06-29T17:00:00Z','1st C','2nd F',null,'Houston','r32'),
  mk(77,'2026-06-30T21:00:00Z','1st I','Best 3rd (C/D/F/G/H)',null,'New York/NJ','r32'),
  mk(78,'2026-06-30T17:00:00Z','2nd E','2nd I',null,'Dallas','r32'),
  mk(79,'2026-06-30T21:00:00Z','1st A','Best 3rd (C/E/F/H/I)',null,'Mexico City','r32'),
  mk(80,'2026-07-01T16:00:00Z','1st L','Best 3rd (E/H/I/J/K)',null,'Atlanta','r32'),
  mk(81,'2026-07-02T00:00:00Z','1st D','Best 3rd (B/E/F/I/J)',null,'San Francisco','r32'),
  mk(82,'2026-07-01T20:00:00Z','1st G','Best 3rd (A/E/H/I/J)',null,'Seattle','r32'),
  mk(83,'2026-07-02T23:00:00Z','2nd K','2nd L',null,'Toronto','r32'),
  mk(84,'2026-07-02T19:00:00Z','1st H','2nd J',null,'Los Angeles','r32'),
  mk(85,'2026-07-04T03:00:00Z','1st B','Best 3rd (E/F/G/I/J)',null,'Vancouver','r32'),
  mk(86,'2026-07-03T22:00:00Z','1st J','2nd H',null,'Miami','r32'),
  mk(87,'2026-07-04T01:30:00Z','1st K','Best 3rd (D/E/I/J/L)',null,'Kansas City','r32'),
  mk(88,'2026-07-03T18:00:00Z','2nd D','2nd G',null,'Dallas','r32'),
  // ROUND OF 16
  mk(89,'2026-07-04T21:00:00Z','W74','W77',null,'Philadelphia','r16'),
  mk(90,'2026-07-04T17:00:00Z','W73','W75',null,'Houston','r16'),
  mk(91,'2026-07-05T20:00:00Z','W76','W78',null,'New York/NJ','r16'),
  mk(92,'2026-07-06T00:00:00Z','W79','W80',null,'Mexico City','r16'),
  mk(93,'2026-07-06T19:00:00Z','W83','W84',null,'Dallas','r16'),
  mk(94,'2026-07-07T00:00:00Z','W81','W82',null,'Seattle','r16'),
  mk(95,'2026-07-07T16:00:00Z','W86','W88',null,'Atlanta','r16'),
  mk(96,'2026-07-07T20:00:00Z','W85','W87',null,'Vancouver','r16'),
  // QUARTER-FINALS
  mk(97, '2026-07-09T20:00:00Z','W89','W90',null,'Boston','qf'),
  mk(98, '2026-07-10T19:00:00Z','W93','W94',null,'Los Angeles','qf'),
  mk(99, '2026-07-11T21:00:00Z','W91','W92',null,'Miami','qf'),
  mk(100,'2026-07-12T01:00:00Z','W95','W96',null,'Kansas City','qf'),
  // SEMI-FINALS
  mk(101,'2026-07-14T19:00:00Z','W97','W98',null,'Dallas','sf'),
  mk(102,'2026-07-15T19:00:00Z','W99','W100',null,'Atlanta','sf'),
  // 3RD PLACE
  mk(103,'2026-07-18T21:00:00Z','L101','L102',null,'Miami','tp'),
  // FINAL
  mk(104,'2026-07-19T19:00:00Z','W101','W102',null,'New York/NJ','final'),
];

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const KO_LABELS = {r32:'ROUND OF 32',r16:'ROUND OF 16',qf:'QUARTER-FINAL',sf:'SEMI-FINAL',tp:'THIRD PLACE',final:'FINAL'};

// ── Countries & TV channels per match ─────────────────────────────────────────
const COUNTRIES = [
  { code:'ar', flag:'🇦🇷', name:'Argentina',       station:'Telefe / TyC Sports',   tz:'America/Argentina/Buenos_Aires' },
  { code:'be', flag:'🇧🇪', name:'Belgium',         station:'Sporza / RTBF',         tz:'Europe/Brussels' },
  { code:'br', flag:'🇧🇷', name:'Brazil',          station:'Globo / CazéTV',        tz:'America/Sao_Paulo' },
  { code:'ca', flag:'🇨🇦', name:'Canada',          station:'CTV / TSN',             tz:'America/Toronto' },
  { code:'hr', flag:'🇭🇷', name:'Croatia',         station:'HRT',                   tz:'Europe/Zagreb' },
  { code:'dk', flag:'🇩🇰', name:'Denmark',         station:'DR / TV 2',             tz:'Europe/Copenhagen' },
  { code:'fi', flag:'🇫🇮', name:'Finland',         station:'Yle / MTV',             tz:'Europe/Helsinki' },
  { code:'fr', flag:'🇫🇷', name:'France',          station:'M6 / beIN Sports',      tz:'Europe/Paris' },
  { code:'de', flag:'🇩🇪', name:'Germany',         station:'ARD / ZDF',             tz:'Europe/Berlin' },
  { code:'hu', flag:'🇭🇺', name:'Hungary',         station:'M4 Sport',              tz:'Europe/Budapest' },
  { code:'is', flag:'🇮🇸', name:'Iceland',         station:'RÚV',                   tz:'Atlantic/Reykjavik' },
  { code:'it', flag:'🇮🇹', name:'Italy',           station:'Rai 1 / DAZN',          tz:'Europe/Rome' },
  { code:'mx', flag:'🇲🇽', name:'Mexico',          station:'Azteca 7 / TUDN',       tz:'America/Mexico_City' },
  { code:'no', flag:'🇳🇴', name:'Norway',          station:'NRK / TV 2',            tz:'Europe/Oslo' },
  { code:'pt', flag:'🇵🇹', name:'Portugal',        station:'Sport TV / LiveModeTV', tz:'Europe/Lisbon' },
  { code:'es', flag:'🇪🇸', name:'Spain',           station:'La 1 / DAZN',           tz:'Europe/Madrid' },
  { code:'se', flag:'🇸🇪', name:'Sweden',          station:'SVT / TV4',             tz:'Europe/Stockholm' },
  { code:'ch', flag:'🇨🇭', name:'Switzerland',     station:'SRF / RTS / RSI',       tz:'Europe/Zurich' },
  { code:'uk', flag:'🇬🇧', name:'United Kingdom',  station:'BBC / ITV',             tz:'Europe/London' },
  { code:'us', flag:'🇺🇸', name:'United States',   station:'FOX / FS1',             tz:'America/New_York' },
];

// Map from browser locale / Intl timezone → country code
const TZ_TO_COUNTRY = {
  'Atlantic/Reykjavik':'is',
  'Europe/London':'uk', 'Europe/Belfast':'uk', 'Europe/Guernsey':'uk', 'Europe/Isle_of_Man':'uk', 'Europe/Jersey':'uk',
  'Europe/Stockholm':'se',
  'Europe/Oslo':'no',
  'Europe/Copenhagen':'dk',
  'Europe/Helsinki':'fi', 'Europe/Mariehamn':'fi',
  'Europe/Berlin':'de', 'Europe/Busingen':'de',
  'Europe/Paris':'fr',
  'Europe/Madrid':'es', 'Africa/Ceuta':'es', 'Atlantic/Canary':'es',
  'Europe/Rome':'it', 'Europe/Vatican':'it', 'Europe/San_Marino':'it',
  'Europe/Lisbon':'pt', 'Atlantic/Azores':'pt', 'Atlantic/Madeira':'pt',
  'Europe/Brussels':'be',
  'Europe/Zagreb':'hr',
  'Europe/Budapest':'hu',
  'Europe/Zurich':'ch',
  'America/Mexico_City':'mx','America/Monterrey':'mx','America/Merida':'mx',
  'America/Mazatlan':'mx','America/Chihuahua':'mx','America/Hermosillo':'mx',
  'America/Argentina/Buenos_Aires':'ar','America/Argentina/Cordoba':'ar',
  'America/Argentina/Mendoza':'ar','America/Argentina/Salta':'ar',
  'America/Sao_Paulo':'br','America/Manaus':'br','America/Belem':'br',
  'America/Fortaleza':'br','America/Recife':'br','America/Maceio':'br',
  'America/Bahia':'br','America/Cuiaba':'br','America/Porto_Velho':'br',
  'America/Toronto':'ca', 'America/Vancouver':'ca', 'America/Winnipeg':'ca',
  'America/Edmonton':'ca', 'America/Halifax':'ca', 'America/St_Johns':'ca',
  'America/Regina':'ca', 'America/Whitehorse':'ca', 'America/Yellowknife':'ca',
  'America/New_York':'us', 'America/Chicago':'us', 'America/Denver':'us',
  'America/Los_Angeles':'us', 'America/Phoenix':'us', 'America/Anchorage':'us',
  'Pacific/Honolulu':'us',
};
function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_TO_COUNTRY[tz] || null;
  } catch(e) { return null; }
}

// Per-match channel lookup. Keys = match.id.
// IS: RÚV 2 matches listed; all others default to RÚV (+ dynamic /api/events override).
// ES: La 1 for confirmed RTVE free matches; all others default to DAZN.
// US: all matches on FOX/FS1 (handled in getChannel).
// Sources: live-footballontv.com (UK), SVT/TV4 ICS (SE), NRK/TV2 ICS (NO),
//          ruv.is schedule (IS), thelocal.es (ES).
const CH = {
  is: {
    // Matches on RÚV 2 — all unlisted matches default to RÚV
    1:'RÚV 2', 3:'RÚV 2', 5:'RÚV 2', 6:'RÚV 2', 9:'RÚV 2', 10:'RÚV 2',
    14:'RÚV 2',15:'RÚV 2',17:'RÚV 2',18:'RÚV 2',21:'RÚV 2',22:'RÚV 2',
    26:'RÚV 2',27:'RÚV 2',29:'RÚV 2',30:'RÚV 2',33:'RÚV 2',34:'RÚV 2',
    38:'RÚV 2',39:'RÚV 2',41:'RÚV 2',42:'RÚV 2',45:'RÚV 2',46:'RÚV 2',
    50:'RÚV 2',52:'RÚV 2',54:'RÚV 2',56:'RÚV 2',57:'RÚV 2',60:'RÚV 2',
    62:'RÚV 2',64:'RÚV 2',66:'RÚV 2',68:'RÚV 2',70:'RÚV 2',72:'RÚV 2',
    // Knockouts on RÚV 2
    73:'RÚV 2',74:'RÚV 2',76:'RÚV 2',77:'RÚV 2',78:'RÚV 2',
    82:'RÚV 2',84:'RÚV 2',88:'RÚV 2',90:'RÚV 2',93:'RÚV 2',
  },
  mx: {
    // Azteca 7 (free TV, 32 matches) — source: tvazteca.com official schedule
    // Group stage — confirmed Azteca 7
    1:'Azteca 7', 4:'Azteca 7', 6:'Azteca 7', 10:'Azteca 7', 19:'Azteca 7',
    22:'Azteca 7',28:'Azteca 7',31:'Azteca 7',33:'Azteca 7',37:'Azteca 7',
    43:'Azteca 7',48:'Azteca 7',53:'Azteca 7',55:'Azteca 7',63:'Azteca 7',
    67:'Azteca 7',69:'Azteca 7',
    // SF + Final confirmed on Azteca 7
    101:'Azteca 7',102:'Azteca 7',104:'Azteca 7',
    // All other matches → TUDN / ViX
  },
  ar: {
    // Telefe (free TV, 30 matches) — Argentina games + opener + big matches
    // Argentina group matches: 19 (vs Algeria), 41 (vs Austria), 71 (Jordan vs Argentina)
    // Source: lanacion.com.ar / minutouno.com
    1:'Telefe',
    19:'Telefe', 41:'Telefe', 71:'Telefe',
    // SF + Final → TV Pública + Telefe
    101:'TV Pública',102:'TV Pública',103:'TV Pública',104:'TV Pública',
    // All other matches → TyC Sports (default)
  },
  br: {
    // Globo (free TV, 52 matches) — Brazil games + final confirmed
    // Brazil group matches: 6 (vs Morocco), 31 (vs Haiti), 51 (Scotland vs Brazil)
    // Source: mancheteesportiva.com.br / lance.com.br
    6:'Globo', 31:'Globo', 51:'Globo', 104:'Globo',
    // All other matches → CazéTV (YouTube, free, all 104) as default
  },
  ca: {
    // CTV (free over-air) matches — source: tsn.ca official broadcast schedule
    // Group stage
    1:'CTV',  3:'CTV',  4:'CTV',  5:'CTV',  6:'CTV',  7:'CTV',
    8:'CTV',  9:'CTV',  10:'CTV', 21:'CTV', 22:'CTV', 23:'CTV',
    27:'CTV', 33:'CTV', 34:'CTV', 35:'CTV', 37:'CTV', 38:'CTV',
    39:'CTV', 40:'CTV', 47:'CTV', 49:'CTV', 62:'CTV', 65:'CTV',
    67:'CTV', 69:'CTV', 71:'CTV',
    // R32
    73:'CTV', 80:'CTV', 81:'CTV', 82:'CTV', 83:'CTV', 85:'CTV',
    // R16
    89:'CTV', 90:'CTV', 91:'CTV', 96:'CTV',
    // QF + SF + Final
    97:'CTV', 98:'CTV', 99:'CTV', 100:'CTV',
    101:'CTV',102:'CTV',104:'CTV',
    // All other matches → TSN (subscription)
  },
  pt: {
    // Portugal games — free-to-air (RTP / SIC / TVI, exact channel TBD)
    21:'RTP/SIC/TVI', 45:'RTP/SIC/TVI', 69:'RTP/SIC/TVI',
    // LiveModeTV (free YouTube) matches — source: magazine-hd.com
    1:'LiveModeTV', 3:'LiveModeTV', 6:'LiveModeTV', 9:'LiveModeTV',
    13:'LiveModeTV',17:'LiveModeTV',26:'LiveModeTV',31:'LiveModeTV',
    34:'LiveModeTV',37:'LiveModeTV',41:'LiveModeTV',51:'LiveModeTV',
    55:'LiveModeTV',61:'LiveModeTV',
    101:'LiveModeTV',102:'LiveModeTV',104:'LiveModeTV',
    // All other matches → Sport TV (subscription)
  },
  it: {
    // Rai 1 matches — source: affaritaliani.it (35 partite in chiaro, all on Rai 1)
    // Group stage
    1:'Rai 1', 3:'Rai 1', 6:'Rai 1', 10:'Rai 1', 14:'Rai 1', 17:'Rai 1',
    22:'Rai 1',26:'Rai 1',29:'Rai 1',34:'Rai 1',37:'Rai 1',38:'Rai 1',
    41:'Rai 1',46:'Rai 1',49:'Rai 1',55:'Rai 1',61:'Rai 1',67:'Rai 1',68:'Rai 1',
    // R32
    73:'Rai 1',74:'Rai 1',77:'Rai 1',82:'Rai 1',84:'Rai 1',88:'Rai 1',
    // R16
    90:'Rai 1',91:'Rai 1',93:'Rai 1',96:'Rai 1',
    // QF
    97:'Rai 1',98:'Rai 1',99:'Rai 1',100:'Rai 1',
    // SF + Finals
    101:'Rai 1',102:'Rai 1',103:'Rai 1',104:'Rai 1',
    // All other matches → DAZN (default)
  },
  fi: {
    // Yle (TV2/Areena) matches — source: yle.fi/a/74-20218518 (complete official schedule)
    // Group stage
    3:'Yle',  4:'Yle',  9:'Yle',  10:'Yle', 11:'Yle', 12:'Yle',
    17:'Yle', 18:'Yle', 19:'Yle', 20:'Yle', 25:'Yle', 26:'Yle',
    27:'Yle', 28:'Yle', 33:'Yle', 34:'Yle', 35:'Yle', 36:'Yle',
    41:'Yle', 42:'Yle', 43:'Yle', 44:'Yle', 49:'Yle', 50:'Yle',
    51:'Yle', 52:'Yle', 53:'Yle', 54:'Yle', 61:'Yle', 62:'Yle',
    63:'Yle', 64:'Yle', 65:'Yle', 66:'Yle', 71:'Yle', 72:'Yle',
    // Knockouts
    73:'Yle', 75:'Yle', 77:'Yle', 78:'Yle', 79:'Yle', 83:'Yle',
    84:'Yle', 85:'Yle', 91:'Yle', 92:'Yle', 95:'Yle', 96:'Yle',
    97:'Yle', 99:'Yle', 101:'Yle', 104:'Yle',
    // All other matches → MTV (default in getChannel)
  },
  dk: {
    // TV 2 group matches (source: sportportalen.dk / TV2.dk / DR.dk)
    1:'TV 2', 2:'TV 2', 4:'TV 2', 6:'TV 2', 10:'TV 2', 13:'TV 2',
    14:'TV 2',18:'TV 2',19:'TV 2',20:'TV 2',21:'TV 2',22:'TV 2',
    24:'TV 2',28:'TV 2',32:'TV 2',36:'TV 2',37:'TV 2',38:'TV 2',
    53:'TV 2',54:'TV 2',
    // DR group matches
    3:'DR',  5:'DR',  7:'DR',  8:'DR',  9:'DR',  11:'DR',
    12:'DR', 15:'DR', 16:'DR', 17:'DR', 23:'DR', 25:'DR',
    26:'DR', 27:'DR', 29:'DR', 30:'DR', 31:'DR', 33:'DR',
    34:'DR', 35:'DR',
    // Matchday 3 & knockouts: channel TBD → fallback to "DR / TV 2"
  },
  de: {
    // ARD group matches
    3:'ARD',  7:'ARD',  9:'ARD',  13:'ARD', 14:'ARD', 19:'ARD',
    29:'ARD', 31:'ARD', 39:'ARD', 41:'ARD', 42:'ARD', 45:'ARD',
    46:'ARD', 48:'ARD', 55:'ARD', 57:'ARD', 61:'ARD', 64:'ARD',
    // ZDF group matches (incl. opening)
    1:'ZDF',  5:'ZDF',  6:'ZDF',  15:'ZDF', 16:'ZDF', 20:'ZDF',
    21:'ZDF', 22:'ZDF', 25:'ZDF', 27:'ZDF', 33:'ZDF', 34:'ZDF',
    35:'ZDF', 38:'ZDF', 44:'ZDF', 68:'ZDF',
    // ZDF: Round of 32 + QF + Final
    73:'ZDF', 74:'ZDF', 75:'ZDF', 76:'ZDF', 77:'ZDF', 78:'ZDF',
    79:'ZDF', 80:'ZDF', 81:'ZDF', 82:'ZDF', 83:'ZDF', 84:'ZDF',
    85:'ZDF', 86:'ZDF', 87:'ZDF', 88:'ZDF',
    97:'ZDF', 98:'ZDF', 99:'ZDF', 100:'ZDF',
    104:'ZDF',
    // ARD: R16 + SF
    89:'ARD', 90:'ARD', 91:'ARD', 92:'ARD', 93:'ARD', 94:'ARD', 95:'ARD', 96:'ARD',
    101:'ARD',102:'ARD',
    // Match 103 (3rd place) → MagentaTV (default)
  },
  fr: {
    // Group stage — M6
    1:'M6',  3:'M6',  5:'M6',  6:'M6',  9:'M6',  10:'M6', 13:'M6', 14:'M6',
    15:'M6', 17:'M6', 18:'M6', 21:'M6', 22:'M6', 25:'M6', 26:'M6', 29:'M6',
    30:'M6', 33:'M6', 34:'M6', 37:'M6', 38:'M6', 41:'M6', 42:'M6', 45:'M6',
    46:'M6', 49:'M6', 51:'M6', 55:'M6', 57:'M6', 61:'M6', 67:'M6', 69:'M6',
    // Knockouts — M6
    73:'M6', 74:'M6', 76:'M6', 77:'M6', 78:'M6', 80:'M6', 84:'M6', 87:'M6', 88:'M6',
    89:'M6', 90:'M6', 91:'M6', 93:'M6', 95:'M6', 96:'M6',
    97:'M6', 98:'M6', 99:'M6',
    101:'M6',102:'M6',103:'M6',104:'M6',
    // All other matches → beIN Sports (default in getChannel)
  },
  es: {
    // RTVE La 1 — confirmed free-to-air (thelocal.es, May 2026)
    1:'La 1', 3:'La 1', 6:'La 1', 9:'La 1', 13:'La 1', 17:'La 1',
    22:'La 1',26:'La 1',29:'La 1',33:'La 1',37:'La 1',41:'La 1',
    46:'La 1',51:'La 1',55:'La 1',63:'La 1',69:'La 1',
    // Semis, 3rd place, final
    101:'La 1',102:'La 1',103:'La 1',104:'La 1',
    // All other matches → DAZN (default in getChannel)
  },
  uk: {
    1:'ITV',  2:'ITV',  3:'BBC',  4:'BBC',  5:'ITV',  6:'BBC',
    7:'BBC',  8:'ITV',  9:'ITV',  10:'ITV', 11:'BBC', 12:'ITV',
    13:'ITV', 14:'BBC', 15:'ITV', 16:'BBC', 17:'BBC', 18:'BBC',
    19:'ITV', 20:'BBC', 21:'BBC', 22:'ITV', 23:'ITV', 24:'BBC',
    25:'BBC', 26:'ITV', 27:'ITV', 28:'BBC', 29:'BBC', 30:'ITV',
    31:'ITV', 32:'ITV', 33:'BBC', 34:'ITV', 35:'BBC', 36:'BBC',
    37:'BBC', 38:'ITV', 39:'BBC', 40:'ITV', 41:'BBC', 42:'BBC',
    43:'ITV', 44:'ITV', 45:'ITV', 46:'BBC', 47:'BBC', 48:'ITV',
    49:'ITV', 50:'ITV', 51:'BBC', 52:'BBC', 53:'BBC', 54:'BBC',
    55:'BBC', 56:'BBC', 57:'BBC', 58:'BBC', 59:'ITV', 60:'ITV',
    61:'ITV', 62:'ITV', 63:'ITV', 64:'ITV', 65:'BBC', 66:'BBC',
    67:'ITV', 68:'ITV', 69:'BBC', 70:'BBC', 71:'BBC', 72:'BBC',
  },
  se: {
    1:'TV4',  2:'TV4',  3:'SVT1', 4:'TV4',  5:'TV4',  6:'SVT1',
    7:'SVT1', 8:'TV4',  9:'TV4',  10:'TV4', 11:'TV4', 12:'SVT1',
    13:'SVT1',14:'SVT1',15:'TV4', 16:'TV4', 17:'SVT1',18:'TV4',
    19:'TV4', 20:'TV4', 21:'TV4', 22:'TV4', 23:'TV4', 24:'TV4',
    25:'TV4', 26:'TV4', 27:'TV4', 28:'TV4', 29:'SVT2',30:'SVT1',
    31:'TV4', 32:'TV4', 33:'TV4', 34:'TV4', 35:'TV4', 36:'SVT1',
    37:'TV4', 38:'TV4', 39:'TV4', 40:'TV4', 41:'SVT1',42:'SVT1',
    43:'SVT1',44:'TV4', 45:'SVT1',46:'SVT1',47:'TV4', 48:'TV4',
    49:'TV4', 50:'TV4', 51:'TV4', 52:'TV4', 53:'SVT1',54:'SVT2',
    55:'SVT1',56:'SVT1',57:'SVT2',58:'SVT1',59:'TV4', 60:'TV4',
    61:'TV4', 62:'TV4', 63:'TV4', 64:'TV4', 65:'TV4', 66:'TV4',
    67:'SVT1',68:'SVT2',69:'TV4', 70:'TV4', 71:'TV4', 72:'TV4',
    // Knockouts (SVT/TV4 ICS)
    73:'TV4', 74:'SVT', 75:'SVT', 76:'TV4', 77:'TV4', 78:'TV4',
    79:'TV4', 80:'SVT', 81:'TV4', 82:'TV4', 83:'TV4', 84:'SVT',
    85:'TV4', 86:'SVT', 87:'SVT', 88:'TV4',
    89:'SVT', 90:'TV4', 91:'TV4', 92:'SVT', 93:'TV4', 94:'TV4',
    95:'TV4', 96:'SVT',
    97:'TV4', 98:'SVT', 99:'TV4', 100:'SVT',
    101:'SVT',102:'TV4',103:'SVT',104:'TV4',
  },
  no: {
    1:'TV 2', 2:'NRK',  3:'NRK',  4:'TV 2', 5:'NRK',  6:'TV 2',
    7:'TV 2', 8:'TV 2', 9:'NRK',  10:'TV 2',11:'TV 2',12:'TV 2',
    13:'TV 2',14:'NRK', 15:'NRK', 16:'NRK', 17:'TV 2',18:'TV 2',
    19:'NRK', 20:'NRK', 21:'NRK', 22:'TV 2',23:'TV 2',24:'TV 2',
    25:'NRK', 26:'TV 2',27:'TV 2',28:'TV 2',29:'NRK', 30:'NRK',
    31:'NRK', 32:'NRK', 33:'NRK', 34:'TV 2',35:'TV 2',36:'NRK',
    37:'NRK', 38:'TV 2',39:'TV 2',40:'TV 2',41:'TV 2',42:'NRK',
    43:'NRK', 44:'TV 2',45:'TV 2',46:'NRK', 47:'NRK', 48:'TV 2',
    49:'NRK', 50:'NRK', 51:'NRK', 52:'NRK', 53:'TV 2',54:'TV 2',
    55:'TV 2',56:'TV 2',57:'TV 2',58:'TV 2',59:'NRK', 60:'NRK',
    61:'NRK', 62:'NRK', 63:'NRK', 64:'NRK', 65:'TV 2',66:'TV 2',
    67:'TV 2',68:'TV 2',69:'NRK', 70:'NRK', 71:'NRK', 72:'NRK',
    // Knockouts (NRK/TV2 ICS)
    73:'TV 2',74:'NRK', 75:'NRK', 76:'TV 2',77:'TV 2',78:'TV 2',
    79:'TV 2',80:'NRK', 81:'TV 2',82:'TV 2',83:'TV 2',84:'NRK',
    85:'TV 2',86:'NRK', 87:'NRK', 88:'TV 2',
    89:'NRK', 90:'TV 2',91:'TV 2',92:'NRK', 93:'TV 2',94:'TV 2',
    95:'TV 2',96:'NRK',
    97:'TV 2',98:'NRK', 99:'TV 2',100:'NRK',
    101:'TV 2',102:'TV 2',103:'NRK',104:'NRK',
  },
};

function getChannel(matchId, country, channelMap) {
  if (country === 'is') return channelMap[matchId] || CH.is?.[matchId] || 'RÚV';
  if (country === 'us') return 'FOX / FS1';
  if (country === 'ar') return CH.ar?.[matchId] || 'TyC Sports';
  if (country === 'be') return 'Sporza';
  if (country === 'hr') return 'HRT';
  if (country === 'hu') return 'M4 Sport';
  if (country === 'mx') return CH.mx?.[matchId] || 'TUDN / ViX';
  if (country === 'ch') return 'SRF / RTS / RSI';
  if (country === 'br') return CH.br?.[matchId] || 'CazéTV';
  if (country === 'ca') return CH.ca?.[matchId] || 'TSN';
  if (country === 'pt') return CH.pt?.[matchId] || 'Sport TV';
  if (country === 'it') return CH.it?.[matchId] || 'DAZN';
  if (country === 'fi') return CH.fi?.[matchId] || 'MTV';
  if (country === 'dk') return CH.dk?.[matchId] || 'DR / TV 2';
  if (country === 'de') return CH.de?.[matchId] || 'MagentaTV';
  if (country === 'fr') return CH.fr?.[matchId] || 'beIN Sports';
  if (country === 'es') return CH.es?.[matchId] || 'DAZN';
  if (country === 'uk' && (matchId >= 73)) return 'BBC / ITV';
  return CH[country]?.[matchId] || '–';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TZ_IS = 'Atlantic/Reykjavik'; // always used for API fetch / Iceland
// These accept a tz parameter so they can adapt to any country's timezone
const fmt24 = (iso, tz) => new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:tz||TZ_IS});
const fmtDay = (iso, tz) => new Date(iso).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:tz||TZ_IS});
const isoDay = (iso, tz) => new Date(iso).toLocaleDateString('sv-SE',{timeZone:tz||TZ_IS});
const todayStr = (tz) => new Date().toLocaleDateString('sv-SE',{timeZone:tz||TZ_IS});

// End time: group stage 105 min, knockout rounds 120 min (could go to ET)
function endTime(iso, round) {
  const mins = round === 'group' ? 105 : 120;
  return new Date(new Date(iso).getTime() + mins*60000);
}

function matchStatus(iso, round) {
  const now = Date.now(), s = new Date(iso).getTime();
  const e = endTime(iso, round).getTime();
  if (now >= s && now < e) return 'live';
  if (now >= e) return 'done';
  return 'upcoming';
}

// ── Main component ────────────────────────────────────────────────────────────
function WCApp({ mobile, dark, onThemeChange }) {
  const isDark = dark;

  const [tab, setTab]     = React.useState('group');
  const [group, setGroup] = React.useState('ALL');
  const [search, setSearch] = React.useState('');
  const [, tick] = React.useState(0);
  const [channelMap, setChannelMap] = React.useState({}); // matchId → 'RÚV' | 'RÚV 2'
  const [country, setCountry] = React.useState(() => {
    try {
      const saved = localStorage.getItem('wc_country');
      if (saved && COUNTRIES.find(c => c.code === saved)) return saved;
    } catch(e) {}
    return detectCountry() || 'is';
  });
  const handleCountry = c => {
    setCountry(c);
    try { localStorage.setItem('wc_country', c); } catch(e) {}
  };
  const tz = COUNTRIES.find(c => c.code === country)?.tz || TZ_IS;

  React.useEffect(() => {
    const t = setInterval(() => tick(n => n+1), 30000);
    return () => clearInterval(t);
  }, []);

  // Dynamic channel detection from /api/events for near-term dates
  React.useEffect(() => {
    const now = new Date();
    const dates = [...new Set(MATCHES.map(m => isoDay(m.iso, TZ_IS)))];
    dates.forEach(async d => {
      const dayDiff = (new Date(d) - now) / 86400000;
      if (dayDiff > 4 || dayDiff < -2) return;
      try {
        const res = await fetch(`/api/events?date=${d}`);
        const data = await res.json();
        const ruvEvs = (data.events || []).filter(e => e.station === 'ruv');
        const updates = {};
        MATCHES.forEach(match => {
          if (isoDay(match.iso, TZ_IS) !== d) return;
          const w1 = match.home.split(' ')[0].toLowerCase();
          const w2 = match.away.split(' ')[0].toLowerCase();
          const ev = ruvEvs.find(e => {
            const t = e.title.toLowerCase();
            return t.includes(w1) || t.includes(w2);
          });
          if (ev?.channelName) updates[match.id] = ev.channelName;
        });
        if (Object.keys(updates).length) setChannelMap(prev => ({...prev,...updates}));
      } catch(_) {}
    });
  }, []);

  // ── Palette — identical to main app ──────────────────────────────────────────
  const pal = isDark ? {
    bg:'#222222', fg:'#F4F4F5', card:'#2A2A2A', card2:'#2E2E2E',
    hair:'#333333', hair2:'#3C3C3C', muted:'#7B7B82',
    accent:'#C8FF3D', accentFg:'#0A0A0B', accentSoft:'rgba(200,255,61,0.13)',
    panelBg:'#171717',
    // badge colors in dark: green
    badgeColor:'#C8FF3D', badgeBg:'rgba(200,255,61,0.14)',
  } : {
    bg:'#F4F3F0', fg:'#0A0A0B', card:'#ECEAE6', card2:'#F4F3F0',
    hair:'#D8D6D2', hair2:'#CBC9C4', muted:'#76736C',
    accent:'#F26419', accentFg:'#FFFFFF', accentSoft:'rgba(242,100,25,0.12)',
    panelBg:'#E5E3DF',
    // badge colors in light: orange
    badgeColor:'#F26419', badgeBg:'rgba(242,100,25,0.14)',
  };

  React.useEffect(() => { document.body.style.background = isDark ? '#222222' : '#F4F3F0'; }, [isDark]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const today    = todayStr(tz);
  const todayMs  = MATCHES.filter(m => isoDay(m.iso,tz) === today).sort((a,b) => a.iso.localeCompare(b.iso));
  const liveMs   = MATCHES.filter(m => matchStatus(m.iso, m.round) === 'live');
  const searchQ  = search.trim().toLowerCase();
  const searchRes = searchQ ? MATCHES.filter(m =>
    m.home.toLowerCase().includes(searchQ) || m.away.toLowerCase().includes(searchQ) ||
    m.venue.toLowerCase().includes(searchQ) ||
    (m.group && ('group '+m.group.toLowerCase()).includes(searchQ))
  ).sort((a,b) => a.iso.localeCompare(b.iso)) : null;

  // ── Styles ────────────────────────────────────────────────────────────────────
  const S = {
    root:{ minHeight:'100vh', background:pal.bg, color:pal.fg,
      fontFamily:'"Inter",system-ui,sans-serif', letterSpacing:'-0.005em',
      display:'flex', flexDirection:'column' },
    topBar:{ display:'flex', flexDirection: mobile?'column':'row', alignItems: mobile?'stretch':'center',
      gap: mobile?8:20,
      padding:mobile?'10px 16px':'18px 32px',
      borderBottom:`1px solid ${pal.hair}`,
      position:'sticky', top:0, zIndex:50, background:pal.bg },
    topRow:{ display:'flex', alignItems:'center', gap:10 },
    bottomRow:{ display:'flex', alignItems:'center', gap:8 },
    iconBtn:{ width:38, height:38, borderRadius:10, cursor:'pointer',
      background:pal.card, border:`1px solid ${pal.hair}`,
      color:pal.fg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
    backBtn:{ display:'flex', alignItems:'center', gap:6, height:38, padding:'0 14px',
      borderRadius:10, background:pal.card, border:`1px solid ${pal.hair}`,
      color:pal.fg, fontSize:12.5, fontWeight:600, cursor:'pointer',
      flexShrink:0, textDecoration:'none', fontFamily:'inherit' },
    searchWrap:{ flex:1, maxWidth:380, display:'flex', alignItems:'center', gap:10,
      background:pal.card, border:`1px solid ${pal.hair}`,
      borderRadius:10, padding:'9px 14px', marginLeft:'auto' },
    searchInput:{ flex:1, border:'none', outline:'none', background:'transparent',
      color:pal.fg, fontSize:13, fontFamily:'inherit' },

    // Round tab strip
    roundStrip:{ display:'flex', overflowX:'auto', scrollbarWidth:'none',
      borderBottom:`1px solid ${pal.hair}` },
    roundTab:(a) => ({ padding:mobile?'11px 16px 9px':'13px 22px 11px',
      cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
      borderRight:`1px solid ${pal.hair}`,
      background:a?pal.accent:'transparent', color:a?pal.accentFg:pal.fg,
      border:'none', textAlign:'left', fontFamily:'inherit',
      transition:'background .12s', display:'flex', flexDirection:'column', gap:2 }),
    rtWk:(a) => ({ fontSize:mobile?8.5:10, textTransform:'uppercase',
      letterSpacing:'0.14em', fontWeight:700, opacity:a?0.85:0.45 }),
    rtName:{ fontSize:mobile?17:20, fontWeight:700,
      fontFamily:'"JetBrains Mono",monospace', letterSpacing:'-0.02em', lineHeight:1, marginTop:2 },
    rtSub:(a) => ({ fontSize:9, marginTop:4, fontWeight:700, textTransform:'uppercase',
      letterSpacing:'0.10em', opacity:a?0.85:0.35 }),

    // Group bar
    groupBar:{ display:'flex', alignItems:'center',
      padding:mobile?'8px 12px':'10px 24px',
      borderBottom:`1px solid ${pal.hair}`, gap:4,
      flexWrap: mobile?'wrap':'nowrap',
      overflowX: mobile?'visible':'auto', scrollbarWidth:'none' },
    groupLabel:{ fontSize:9.5, fontWeight:800, letterSpacing:'0.14em',
      color:pal.muted, textTransform:'uppercase', flexShrink:0, marginRight:4 },
    groupChip:(a) => ({ minWidth:mobile?36:40, height:mobile?36:40, borderRadius:10,
      cursor:'pointer', flexShrink:0,
      background:a?pal.fg:'transparent', color:a?pal.bg:pal.fg,
      border:'none', fontFamily:'inherit', fontWeight:700, fontSize:mobile?13:14,
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background .12s' }),
    allarChip:(a) => ({ height:mobile?36:40, padding:'0 14px', borderRadius:10,
      cursor:'pointer', flexShrink:0, marginRight:8,
      background:a?pal.accent:'transparent', color:a?pal.accentFg:pal.fg,
      border:`1px solid ${a?pal.accent:pal.hair2}`, fontFamily:'inherit',
      fontWeight:700, fontSize:mobile?11:12, letterSpacing:'0.04em',
      whiteSpace:'nowrap', transition:'background .12s' }),

    // Layout
    body:{ flex:1, display:mobile?'block':'flex' },
    livePane:{ width:280, flexShrink:0, borderRight:`1px solid ${pal.hair}`,
      padding:'24px 20px', background:pal.panelBg,
      position:'sticky', top:0, maxHeight:'calc(100vh - 57px)', overflowY:'auto' },
    timeline:{ flex:1, padding:mobile?'0 0 48px':'0 0 48px', overflowY:'auto', minWidth:0 },

    // Date header
    dateHdr:{ fontSize:mobile?15:17, fontWeight:800, letterSpacing:'-0.01em',
      color:pal.fg, textTransform:'capitalize',
      padding:mobile?'24px 16px 10px':'28px 32px 12px',
      borderBottom:`1px solid ${pal.hair}`,
      marginBottom:0 },

    // ── EVENT CARD — matches main app row style (screenshot) ──────────────────
    // Each card: hairline separator like main timeline
    evRow:{ borderBottom:`1px solid ${pal.hair}`, padding:mobile?'14px 16px':'16px 32px' },

    // grid: mobile = [time] [content] [station], desktop = [time] [icon] [content] [station]
    evGrid:{ display:'grid',
      gridTemplateColumns:mobile?'68px 1fr auto':'80px 52px 1fr auto',
      gap:mobile?'0 10px':'0 14px',
      alignItems:'center' },

    // Time column
    evTimeCol:{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:3 },
    evTime:{ fontSize:mobile?20:22, fontWeight:700,
      fontFamily:'"JetBrains Mono",monospace', letterSpacing:'-0.02em', lineHeight:1 },
    evTimeEnd:{ fontSize:10.5, color:pal.muted, fontWeight:500,
      fontFamily:'"JetBrains Mono",monospace' },

    // Icon box — same as main app sport icon box
    evIcon:{ width:mobile?48:52, height:mobile?48:52, borderRadius:12,
      background:isDark?'#2A2A2A':'#ECEAE6',
      border:`1px solid ${pal.hair2}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:pal.fg, flexShrink:0 },

    // Content column
    evContent:{ minWidth:0 },
    evMeta:{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' },
    evMetaText:{ fontSize:10, fontWeight:700, letterSpacing:'0.12em',
      color:pal.muted, textTransform:'uppercase' },
    evMetaDot:{ fontSize:10, color:pal.muted },

    // RIÐILL badge — accent color (green dark / orange light)
    ridillBadge:{ padding:'2px 7px', borderRadius:3,
      fontSize:9.5, fontWeight:800, letterSpacing:'0.14em',
      color:pal.badgeColor, background:pal.badgeBg },
    liveBadge:{ display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 7px', borderRadius:3,
      background:'rgba(255,59,71,0.16)', color:'#FF3B47',
      fontSize:9.5, fontWeight:800, letterSpacing:'0.14em' },
    liveDotEl:{ width:6, height:6, borderRadius:'50%', background:'#FF3B47',
      animation:'ifPulse 1.4s ease-in-out infinite', flexShrink:0 },

    evTitle:{ fontWeight:700, fontSize:mobile?15:16,
      letterSpacing:'-0.01em', lineHeight:1.25, marginBottom:3,
      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
    evSub:{ fontSize:mobile?11:12, color:pal.muted, display:'flex', alignItems:'center', gap:4 },

    // Station column
    evStation:{ display:'flex', flexDirection:'column', alignItems:'center',
      gap:3, flexShrink:0 },

    // Country selector
    countrySel:{ height:36, padding:'0 10px', borderRadius:10, cursor:'pointer',
      background:pal.card, border:`1px solid ${pal.hair}`, color:pal.fg,
      fontSize:13, fontFamily:'inherit', fontWeight:600, flexShrink:0,
      outline:'none' },

    // Live pane
    liveHd:{ display:'flex', alignItems:'center', gap:8, marginBottom:16 },
    liveDotBig:{ width:8, height:8, borderRadius:'50%', background:'#FF3B47',
      animation:'ifPulse 1.4s ease-in-out infinite', flexShrink:0 },
    liveLabel:{ fontSize:11, fontWeight:800, letterSpacing:'0.12em',
      color:pal.muted, textTransform:'uppercase' },
    liveCount:{ marginLeft:'auto', minWidth:22, height:22, padding:'0 7px',
      background:'#FF3B47', color:'#fff', borderRadius:99, fontSize:11, fontWeight:800,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'"JetBrains Mono",monospace' },
    liveMiniCard:{ background:pal.card, border:`1px solid ${pal.hair}`,
      borderRadius:10, padding:'12px 14px', marginBottom:8 },
    emptyMsg:{ textAlign:'center', color:pal.muted, padding:'48px 16px', fontSize:14 },
    sectionHdr:{ fontSize:11, fontWeight:800, letterSpacing:'0.14em',
      color:pal.muted, textTransform:'uppercase',
      padding:mobile?'22px 16px 6px':'24px 32px 6px' },
    groupTeams:{ display:'flex', flexWrap:'wrap', gap:6,
      padding:mobile?'12px 16px':'12px 32px 14px' },
    groupTeamPill:{ display:'flex', alignItems:'center', gap:6,
      background:pal.card, border:`1px solid ${pal.hair}`,
      borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600 },
  };

  // ── Channel badge — adapts to selected country ────────────────────────────────
  function ChannelBadge({ matchId }) {
    const ch = getChannel(matchId, country, channelMap);
    return (
      <div style={S.evStation}>
        <span style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          padding:'5px 10px', borderRadius:8,
          background:pal.accentSoft, border:`1px solid ${pal.badgeColor}`,
          fontSize:mobile?13:14, fontWeight:800, color:pal.badgeColor,
          letterSpacing:'0.03em', fontFamily:'"JetBrains Mono",monospace',
          textAlign:'center', lineHeight:1.3, whiteSpace:'nowrap',
        }}>
          {ch}
        </span>
      </div>
    );
  }

  // ── Match card — screenshot layout ───────────────────────────────────────────
  function MatchCard({ match }) {
    const status  = matchStatus(match.iso, match.round);
    const start   = fmt24(match.iso, tz);
    const end     = fmt24(endTime(match.iso, match.round).toISOString(), tz);
    const isGroup = match.round === 'group';

    return (
      <div style={S.evRow}>
        <div style={S.evGrid}>
          {/* TIME */}
          <div style={S.evTimeCol}>
            <span style={{
              ...S.evTime,
              color: status === 'live' ? '#FF3B47' : status === 'done' ? pal.muted : pal.fg
            }}>{start}</span>
            <span style={S.evTimeEnd}>to {end}</span>
          </div>

          {/* ICON — desktop only */}
          {!mobile && (
            <div style={S.evIcon}>
              <SportIcon id="fb" size={28} strokeWidth={1.4} />
            </div>
          )}

          {/* CONTENT */}
          <div style={S.evContent}>
            {/* Meta row */}
            <div style={S.evMeta}>
              <span style={S.evMetaText}>Football</span>
              {isGroup && <>
                <span style={S.evMetaDot}>·</span>
                <span style={S.ridillBadge}>GROUP {match.group}</span>
              </>}
              {!isGroup && match.round && (
                <span style={{ ...S.ridillBadge, color:pal.muted, background:'rgba(128,128,128,0.12)' }}>
                  {KO_LABELS[match.round]}
                </span>
              )}
              {status === 'live' && (
                <div style={S.liveBadge}>
                  <span style={S.liveDotEl}/>
                  LIVE
                </div>
              )}
            </div>
            {/* Title */}
            <div style={{
              ...S.evTitle,
              color: status === 'done' ? pal.muted : pal.fg
            }}>
              {match.home} – {match.away}
            </div>
            {/* Subtitle — venue */}
            <div style={S.evSub}>
              <span style={{ color:'#FF3B47', fontSize:11 }}>📍</span>
              <span>{match.venue}</span>
            </div>
          </div>

          {/* STATION */}
          <ChannelBadge matchId={match.id} />
        </div>
      </div>
    );
  }

  // ── Group by date helper ──────────────────────────────────────────────────────
  function ByDate({ matches }) {
    if (!matches.length) return (
      <div style={S.emptyMsg}>
        <div style={{fontWeight:700}}>No matches found.</div>
      </div>
    );
    const byDate = {};
    matches.forEach(m => { const d=isoDay(m.iso,tz); if(!byDate[d])byDate[d]=[]; byDate[d].push(m); });
    return Object.entries(byDate).sort().map(([d,arr]) => {
      arr.sort((a,b) => a.iso.localeCompare(b.iso));
      // Use the earliest match in the group to label the date header (correct local date)
      const firstByLocalTime = arr.reduce((a,b) => new Date(a.iso) < new Date(b.iso) ? a : b);
      return (
        <div key={d}>
          <div style={S.dateHdr}>{fmtDay(firstByLocalTime.iso,tz)}</div>
          {arr.map(m => <MatchCard key={m.id} match={m}/>)}
        </div>
      );
    });
  }

  // ── Views ─────────────────────────────────────────────────────────────────────
  function GroupView() {
    const groupMs = MATCHES.filter(m => m.round === 'group');
    if (group === 'ALL') return <ByDate matches={groupMs}/>;
    const ms = groupMs.filter(m => m.group === group).sort((a,b) => a.iso.localeCompare(b.iso));
    const teams = [...new Set(ms.flatMap(m => [m.home,m.away]))];
    return (
      <>
        <div style={S.groupTeams}>
          {teams.map(t => (
            <div key={t} style={S.groupTeamPill}><span>{t}</span></div>
          ))}
        </div>
        <ByDate matches={ms}/>
      </>
    );
  }

  function KoView() {
    const rounds = ['r32','r16','qf','sf','tp','final'];
    const labels = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',
      sf:'Semi-Finals',tp:'Third Place',final:'Final'};
    return rounds.map(r => {
      const arr = MATCHES.filter(m => m.round === r).sort((a,b) => a.iso.localeCompare(b.iso));
      if (!arr.length) return null;
      return (
        <div key={r}>
          <div style={{ ...S.sectionHdr, color:r==='final'?pal.accent:pal.muted }}>{labels[r]}</div>
          {arr.map(m => <MatchCard key={m.id} match={m}/>)}
        </div>
      );
    });
  }

  function TodayView() {
    if (!todayMs.length) {
      const next = MATCHES.filter(m => new Date(m.iso) > new Date()).sort((a,b) => a.iso.localeCompare(b.iso))[0];
      return (
        <div style={S.emptyMsg}>
          <div style={{fontWeight:700}}>No World Cup match today</div>
          {next && <div style={{marginTop:8,fontSize:12}}>Next: {fmtDay(next.iso,tz)} {fmt24(next.iso,tz)}</div>}
        </div>
      );
    }
    return todayMs.map(m => <MatchCard key={m.id} match={m}/>);
  }

  function SearchView() {
    if (!searchRes.length) return <div style={S.emptyMsg}>No results found.</div>;
    return <ByDate matches={searchRes}/>;
  }

  // ── Live mini card (sidebar) ──────────────────────────────────────────────────
  function LiveMini({ match }) {
    return (
      <div style={S.liveMiniCard}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:'"JetBrains Mono",monospace',color:'#FF3B47'}}>
            {fmt24(match.iso,tz)}
          </span>
          {match.group && <span style={{fontSize:10,color:pal.muted,fontWeight:700}}>GROUP {match.group}</span>}
          <div style={{...S.liveBadge,marginLeft:'auto',padding:'1px 6px'}}>
            <span style={S.liveDotEl}/>LIVE
          </div>
        </div>
        <div style={{fontWeight:700,fontSize:13,marginBottom:3}}>{match.home}</div>
        <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{match.away}</div>
        <div style={{fontSize:10,color:pal.muted}}>📍 {match.venue}</div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const todayCount = todayMs.length;

  return (
    <div style={S.root}>
      <style>{`
        @keyframes ifPulse{0%{box-shadow:0 0 0 0 rgba(255,59,71,.55)}70%{box-shadow:0 0 0 8px rgba(255,59,71,0)}100%{box-shadow:0 0 0 0 rgba(255,59,71,0)}}
        *{-webkit-tap-highlight-color:transparent}
        [data-sh]::-webkit-scrollbar{display:none}
      `}</style>

      {/* TOP BAR */}
      <div style={S.topBar}>
        {mobile ? (<>
          {/* Mobile row 1: logo + country */}
          <div style={S.topRow}>
            <img src={`assets/logos/sportzone-${isDark?'dark':'light'}.svg`} alt="SportZone"
              style={{height:24,width:'auto',display:'block'}}/>
            <div style={{flex:1}}/>
            <select
              style={S.countrySel}
              value={country}
              onChange={e => handleCountry(e.target.value)}
              title="Select country"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          {/* Mobile row 2: search + theme toggle */}
          <div style={S.bottomRow}>
            <div style={{...S.searchWrap, maxWidth:'none', marginLeft:0, flex:1}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
              </svg>
              <input style={S.searchInput} placeholder="Search teams, venues…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              {search && <button onClick={() => setSearch('')}
                style={{background:'none',border:'none',cursor:'pointer',color:pal.muted,fontSize:16,lineHeight:1,padding:'0 2px',display:'flex',alignItems:'center'}}>×</button>}
            </div>
            <button style={S.iconBtn} onClick={() => onThemeChange(!isDark)}>
              {isDark
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
          </div>
        </>) : (<>
          {/* Desktop: single row */}
          <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
            <img src={`assets/logos/sportzone-${isDark?'dark':'light'}.svg`} alt="SportZone"
              style={{height:26,width:'auto',display:'block'}}/>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:18,letterSpacing:'-0.02em',lineHeight:1}}>FIFA World Cup 2026</div>
            <div style={{fontSize:10,color:pal.muted,letterSpacing:'0.10em',marginTop:4}}>11 JUN – 19 JUL · USA / CANADA / MEXICO</div>
          </div>
          <div style={{...S.searchWrap}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input style={S.searchInput} placeholder="Search teams, venues…"
              value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <button onClick={() => setSearch('')}
              style={{background:'none',border:'none',cursor:'pointer',color:pal.muted,fontSize:16,lineHeight:1,padding:'0 2px',display:'flex',alignItems:'center'}}>×</button>}
          </div>
          <button style={S.iconBtn} onClick={() => onThemeChange(!isDark)}>
            {isDark
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <select
            style={S.countrySel}
            value={country}
            onChange={e => handleCountry(e.target.value)}
            title="Select country"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
        </>)}
      </div>

      {/* LIVE BANNER */}
      {liveMs.length > 0 && (
        <div style={{background:'rgba(255,59,71,0.10)',borderBottom:'1px solid rgba(255,59,71,0.25)',
          padding:mobile?'8px 16px':'8px 32px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#FF3B47',
            display:'inline-block',flexShrink:0,animation:'ifPulse 1.4s ease-in-out infinite'}}/>
          <span style={{fontSize:12,fontWeight:700,color:'#FF3B47'}}>
            LIVE: {liveMs.map(m => `${m.home} – ${m.away}`).join('  ·  ')}
          </span>
        </div>
      )}

      {/* ROUND TABS */}
      <div style={S.roundStrip} data-sh>
        {[
          {id:'today', wk:'Today',        name:String(todayCount||'0'), sub:'MATCHES TODAY'},
          {id:'group', wk:'Group Stage',  name:'72',                    sub:'MATCHES'},
          {id:'ko',    wk:'Knockouts',    name:'32',                    sub:'MATCHES'},
        ].map(rt => {
          const a = tab===rt.id && !searchRes;
          return (
            <button key={rt.id} style={S.roundTab(a)} onClick={() => {setTab(rt.id); setSearch('');}}>
              <div style={S.rtWk(a)}>{rt.wk}</div>
              <div style={S.rtName}>{rt.name}</div>
              <div style={S.rtSub(a)}>{rt.sub}</div>
            </button>
          );
        })}
        {!mobile && (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'flex-end',
            padding:'0 32px',color:pal.muted,fontSize:11}}>
            <span style={{fontWeight:700,letterSpacing:'0.08em'}}>
              48 NATIONS · 104 MATCHES · {COUNTRIES.find(c=>c.code===country)?.station||'RÚV'}
            </span>
          </div>
        )}
      </div>

      {/* GROUP BAR */}
      {tab==='group' && !searchRes && (
        <div style={S.groupBar} data-sh>
          <button style={S.allarChip(group==='ALL')} onClick={() => setGroup('ALL')}>ALL GROUPS</button>
          {!mobile && <span style={S.groupLabel}>GROUPS:</span>}
          {GROUPS.map(g => (
            <button key={g} style={S.groupChip(group===g && group!=='ALL')} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      )}

      {/* BODY */}
      <div style={S.body}>
        {/* Desktop live pane */}
        {!mobile && (
          <div style={S.livePane}>
            <div style={S.liveHd}>
              <span style={S.liveDotBig}/>
              <span style={S.liveLabel}>Live now</span>
              {liveMs.length > 0 && <span style={S.liveCount}>{liveMs.length}</span>}
            </div>
            {liveMs.length === 0
              ? <div style={{color:pal.muted,fontSize:12,lineHeight:1.6}}>No match in progress.</div>
              : liveMs.map(m => <LiveMini key={m.id} match={m}/>)}
            {(() => {
              const up = todayMs.filter(m => matchStatus(m.iso,m.round)==='upcoming');
              if (!up.length) return null;
              return <>
                <div style={{...S.liveLabel,display:'block',marginTop:20,marginBottom:10}}>Today</div>
                {up.slice(0,6).map(m => (
                  <div key={m.id} style={{...S.liveMiniCard,marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:'"JetBrains Mono",monospace',marginBottom:4}}>{fmt24(m.iso,tz)}</div>
                    {m.group && <div style={{fontSize:10,color:pal.muted,fontWeight:700,marginBottom:6}}>GROUP {m.group}</div>}
                    <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{m.home}</div>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{m.away}</div>
                    <div style={{fontSize:10,color:pal.muted}}>📍 {m.venue}</div>
                  </div>
                ))}
              </>;
            })()}

          </div>
        )}

        {/* Timeline */}
        <div style={S.timeline}>
          {searchRes   ? <SearchView/> :
           tab==='today' ? <TodayView/> :
           tab==='group' ? <GroupView/> :
           <KoView/>}
          <div style={{textAlign:'center',marginTop:32,color:pal.muted,fontSize:11,padding:mobile?'0 16px 16px':'0 32px 16px'}}>
            {(() => {
              const c = COUNTRIES.find(x=>x.code===country);
              if (country==='is') return 'RÚV and RÚV 2 hold broadcast rights to all 104 matches of the 2026 World Cup';
              if (country==='uk') return 'BBC and ITV share rights to all 104 matches in the United Kingdom';
              if (country==='se') return 'SVT and TV4 share rights to all 104 matches in Sweden';
              if (country==='no') return 'NRK and TV 2 share rights to all 104 matches in Norway';
              if (country==='es') return 'RTVE (La 1) shows ~20 matches free-to-air including all Spain games. DAZN broadcasts all 104 matches.';
              if (country==='us') return 'FOX/FS1 (English) and Telemundo (Spanish) broadcast all 104 matches in the United States';
              return '';
            })()}
          </div>
        </div>
      </div>

    </div>
  );
}
