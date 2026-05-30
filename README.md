# FIFA World Cup 2026

Schedule of all 104 FIFA World Cup 2026 matches with local kick-off times and TV channel listings for Iceland, UK, Sweden, Norway, and the United States.

Built for [SportZone](https://sportzone.is).

## Features

- All 104 matches — group stage through final
- Local times per country (Iceland, UK, Sweden, Norway, USA)
- TV channel per match per country (RÚV, BBC/ITV, SVT/TV4, NRK/TV 2, FOX/FS1)
- Live match detection with auto-refresh
- Dark / light theme, fully responsive

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. No environment variables needed — deploys as-is

The `api/events.js` serverless function fetches live RÚV channel data (used when Iceland is selected).

## Structure

```
public/
  index.html          # Entry point
  worldcup-app.jsx    # Main app (React, compiled in-browser via Babel)
  components.jsx      # Shared SportZone components (SportIcon etc.)
  data.js             # Shared helpers
  assets/logos/       # SVG logos
api/
  events.js           # Vercel serverless — RÚV live schedule proxy
vercel.json
```
