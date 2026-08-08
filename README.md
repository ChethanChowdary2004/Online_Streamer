# StreamHub

A movies & TV-series streaming web app, built from scratch.

- **Data** comes from the public [TMDB API](https://www.themoviedb.org) (metadata
  only: titles, posters, ratings, descriptions, genres).
- **Video** comes from freely-available, lawful sources — public-domain and
  Creative-Commons films hosted on [Archive.org](https://archive.org). Clicking
  **Play** resolves a real HLS/MP4 stream and plays it in a custom player.

> This app does **not** stream copyrighted films from unauthorized sources.
> It plays public-domain / freely-licensed content only.

## Architecture

```
online streamer/
├── server/               # FastAPI backend (Python 3.13 + venv)
│   ├── main.py           #   API routes (TMDB proxy + stream resolver)
│   ├── tmdb.py           #   TMDB client — API key lives only here
│   ├── streams.py        #   Resolves lawful HLS/MP4 sources on Archive.org
│   ├── run.bat           #   Starts the backend (activates .venv)
│   └── .env              #   Put your TMDB key here (gitignored)
└── client/               # React frontend (Vite + react-router + hls.js)
    ├── src/
    │   ├── pages/        #   Home, MovieDetail, TvDetail, Search, PlayerPage
    │   ├── components/   #   Navbar, HeroBanner, MovieRow, MovieCard, HlsPlayer
    │   └── api.js        #   API client (calls /api through the Vite proxy)
    └── run.bat           #   Starts the dev server
```

The browser only ever talks to our own backend (`/api/...`) — the TMDB API key
never reaches the client.

## Setup

### 1. Get a TMDB API key (free)

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (v3 auth — the free tier).
3. Paste it into `server/.env`:

   ```
   TMDB_API_KEY=your_key_here
   ```

### 2. Install & run the backend

```bat
cd server
python -m venv .venv          REM one-time setup
.venv\Scripts\activate.bat    REM or just double-click run.bat
pip install -r requirements.txt
run.bat                       REM → http://localhost:8000
```

### 3. Install & run the frontend

```bat
cd client
npm install                   REM one-time setup
run.bat                       REM → http://localhost:5173
```

Open **http://localhost:5173**.

## What works right now

- **Home** — hero banner + scrollable rows (Now Playing, Popular, Top Rated,
  Popular TV, Top Rated TV).
- **Free** — browse the free public-domain library (Archive.org) by category
  (Feature Films, Silent Classics, Horror, Sci-Fi, Westerns…) with search +
  pagination; tens of thousands of titles.
- **Detail pages** — backdrop, meta, genres, cast, similar titles.
- **Search** — movie + TV search from the navbar.
- **Play** — a full custom player:
  - play/pause, ±10s skip, click-and-drag seek bar with buffered fill
  - volume slider + mute
  - settings menu: playback speed (0.25–2×), **quality** (HLS levels), captions
  - fullscreen, picture-in-picture, keyboard shortcuts (Space, ←/→, ↑/↓, M, F, C)
  - auto-hiding controls

## Known limitations / next steps

- Only a few titles are curated as guaranteed-free (Night of the Living Dead,
  Charade, Nosferatu). Everything else relies on Archive.org search, which is
  fuzzy — some titles resolve to the wrong film or nothing at all.
- Public-domain TV series are rare, so TV playback often has no source.
- Add user accounts, watch history, "my list", and per-title source curation
  next.
