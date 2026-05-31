# Íþróttir framundan — Uppsetning

## Hvað er þetta?

Vefur sem sýnir hvað er framundan á íslenskum sjónvarpsstöðvum í íþróttum.
Sækir dagskrá sjálfkrafa frá **RÚV**, **Sýn Sport**, **Lívey** og **Viaplay** — engin innskráning þörf.

---

## Skráaskipan

```
sport-torfason/
├── api/
│   └── events.js          Vercel serverless API
├── fetchers/              Gagnasækjar (RÚV, Sýn, Síminn, Viaplay, Lívey)
├── public/                Framendi (React + Babel, CDN, engin smíð)
│   ├── index.html
│   ├── app.jsx
│   ├── components.jsx
│   ├── data.js
│   └── assets/logos/
├── docker/                Synology NAS uppsetning
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── server.js
├── package.json
├── vercel.json
└── .gitignore
```

---

## 1. Vercel + GitHub + Cloudflare (sport.torfason.is)

### Skref 1 — Búa til GitHub repo

1. Farðu á [github.com/new](https://github.com/new)
2. Nafn: `ithrottir-framundan` (eða að vali)
3. Láttu repo vera **Private** ef þú vilt
4. Smelltu **Create repository**

### Skref 2 — Hlaða upp kóðanum

Hladdu inn öllum skráum úr þessum möppu. Auðveldast á vefnum:
- Smelltu **uploading an existing file** á GitHub
- Dragðu allar skrárnar og möppurnar í gluggann
- Commit: `Initial commit`

**Eða með Git (í terminal):**
```bash
cd sport-torfason
git init
git remote add origin https://github.com/ÞITT_NOTANDANAFN/ithrottir-framundan.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Skref 3 — Tengja við Vercel

1. Farðu á [vercel.com](https://vercel.com) og skráðu þig inn
2. Smelltu **Add New → Project**
3. Veldu GitHub repo (`ithrottir-framundan`)
4. **Framework Preset**: veldu `Other`
5. **Root Directory**: láttu vera `/` (repo root)
6. Smelltu **Deploy**

Vercel þekkir sjálfkrafa:
- `api/events.js` → serverless function á `/api/events`
- `public/` → static files (index.html, assets)
- `vercel.json` → stillingar

Eftir nokkrar mínútur er vefurinn lifandi á `.vercel.app` slóð.

### Skref 4 — Bæta við `sport.torfason.is` léni

1. Á Vercel: **Settings → Domains → Add**
2. Sláðu inn `sport.torfason.is`
3. Vercel sýnir þér þessa færslu til að bæta við í Cloudflare:

```
Tegund:  CNAME
Nafn:    sport
Gildi:   cname.vercel-dns.com
```

### Skref 5 — Cloudflare DNS stillingar

1. Farðu á [dash.cloudflare.com](https://dash.cloudflare.com)
2. Veldu `torfason.is`
3. DNS → **Add record**:
   - **Type**: `CNAME`
   - **Name**: `sport`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: `DNS only` (**grár ský** — ekki appelsínugulur)
     *(Vercel þarf beint samband til að staðfesta SSL)*
4. Smelltu **Save**

Eftir 1–5 mínútur er `sport.torfason.is` kominn í loftið með SSL.

> **Athugaðu:** Þegar Vercel staðfestir lénið getur þú kveikt á Cloudflare proxy (appelsínugulur ský) ef þú vilt, en það er ekki nauðsynlegt.

---

## 2. Stöðvarnar og gagnaveitan

Allar stöðvar sækja dagskrá sjálfkrafa — engin innskráning þarf:

| Stöð | Gagnaveita |
|------|-----------|
| RÚV | `spilari.nyr.ruv.is` (GraphQL, opinber) |
| Sýn Sport | `syn.is/api/epg/` (opinber) |
| Lívey | AWS API Gateway (opinber) |
| Viaplay | `content.viaplay.is` (opinber) |

> **Síminn Sport** notar sömu rás og Sýn Sport — sama efni sýnt á báðum, svo tvítekningar eru forðaðar.

---

## 3. Uppfæra merkið og nafnið

Breyttu þessum línum í `public/app.jsx`:

```jsx
<div style={ifS.logoMark}>ÍF</div>
<div style={ifS.logoName}>Íþróttir framundan</div>
<div style={ifS.logoTag}>Lifandi · 5 stöðvar · Ísland</div>
```

Gerðu svo **Redeploy** á Vercel (eða ýttu á commit til GitHub — Vercel uppfærist sjálfkrafa).

---

## 4. Synology NAS (Docker) — valfrjálst

Ef þú vilt keyra á NAS í staðinn fyrir Vercel:

```bash
# Frá repo root
docker compose -f docker/docker-compose.yml up -d --build
```

Opnaðu svo: `http://[NAS-IP]:3000`

---

## API

```
GET /api/events?date=YYYY-MM-DD    Sækir alla íþróttaviðburði þann dag
GET /api/events                    Viðburðir í dag (Íslandstími)
```

Svörin eru geymd 5 mínútur í Vercel CDN skyndiminni (edge cache).
