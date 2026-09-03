# StreamHub

A movies, TV-series and anime streaming web app, built from scratch.

- **Movie & TV metadata** comes from the public [TMDB API](https://www.themoviedb.org) —
  posters, ratings, descriptions, genres, cast, similar titles.
- **Anime metadata** comes from [AniList](https://anilist.co) (no API key required).
- **Playback** goes through a list of embed providers (WFS, VidLink, VIDEASY) resolved
  by the backend — the player lets you pick a server or auto-fall through them.

The TMDB API key lives only on the server; the browser only ever talks to our own
`/api/...` backend.

## Architecture

```
online streamer/
├── server/                  # FastAPI backend (Python 3.13 + venv)
│   ├── main.py              #   API routes (TMDB proxy + AniList + stream resolver)
│   ├── tmdb.py              #   TMDB client — API key lives only here
│   ├── anilist.py           #   AniList GraphQL client (no key needed)
│   ├── streams.py           #   Resolves the embed-server list for a title
│   ├── run.bat              #   Starts the backend (activates .venv)
│   └── .env                 #   Put your TMDB key here (gitignored)
└── client/                  # React frontend (Vite + react-router)
    ├── src/
    │   ├── pages/           #   Home, Movies, Series, Anime, Search, details, player
    │   ├── components/      #   Topbar, Navbar, HeroBanner, rows, cards, VideoPlayer
    │   └── api.js           #   API client (calls /api through the Vite proxy)
    └── run.bat              #   Starts the dev server
```

### Backend routes (`server/main.py`)

- `GET /api/movie/{list}` and `GET /api/tv/{list}` — shelf lists
  (`popular | top_rated | now_playing | upcoming | airing_today | on_the_air`).
- `GET /api/trending` — trending this week (movies/TV/all).
- `GET /api/discover/{movie|tv}` — TMDB discover with genre/keyword/language/sort.
- `GET /api/movie/{id}/detail` and `GET /api/tv/{id}/detail` — info + credits + similar.
- `GET /api/tv/{id}/season/{n}` — episodes for the season/episode pickers.
- `GET /api/search` (multi), `/api/search/movie`, `/api/search/tv` — title search.
- `GET /api/genres` — movie + TV genre lists for the filter dropdowns.
- `GET /api/anime/{trending|top-rated|latest|movies}` plus
  `/api/anime/search`, `/api/anime/genres`, `/api/anime/genre/{genre}`,
  `/api/anime/{id}/detail` — AniList shelves, search, filters and detail.
- `GET /api/stream` — resolves the embed-server list (`servers`) for a title,
  given `tmdb_id` (+ `season`/`episode` for TV/anime).

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

## What's in the app

- **Home** — full-width auto-sliding hero banner + scrollable shelves
  (Popular Movies/Series, Top Rated, Action & Adventure, Comedy, Sci-Fi & Fantasy).
- **Movies** — browse/research the full movie library with a toolbar: title search,
  genre, sort (Popular / Most Rated / Newest) and language filters, infinite "Load More".
- **Series** — same browsing toolbar, applied to TV shows (Genre / Sort / Language).
- **Anime** — hero banner like Home plus shelves (Top Rated, Movies, Trending, Latest);
  the search box + genre filter live in the top bar while you're on the page.
- **Search** — movie + TV search from the navbar (hidden on pages that have their own).
- **Detail pages** — backdrop, meta, genres, cast, similar titles; "Watch" links to the player.
- **Watch (`/watch/:type/:id`)** — the player plus similar/related shelves underneath
  (Similar Movies/Series from TMDB, Related Anime from AniList relations).

### The player

- Multiple **servers** (WFS, VidLink, VIDEASY) as a dropdown — "Auto" starts on the
  first and falls through if an embed fails to load; pick a server to pin it.
- **Season / Episode** dropdowns and **Prev / Next** buttons for TV and anime
  (Next rolls into the following season).
- An anime **TMDB ↔ AniList source toggle** for the VIDEASY server.
- An **info overlay** ("Now Playing" title + description) that opens from the ⓘ Info
  button or ~2s after a pause-like signal, and closes on resume / refocus.

## Project layout

- **Browser → Vite dev proxy (`/api`) → FastAPI → TMDB / AniList / stream resolver.**
- Frontend pages live in `client/src/pages`, shared UI in `client/src/components`
  (reused `MovieRow`/`MovieCard`/`FilterSelect`, anime-specific `AnimeRow`/`AnimeCard`).
- Playback is third-party embed iframes, so no video is hosted or proxied here —
  anime video even plays from the AniList id (VIDEASY) when no TMDB id exists.

## Known limitations

- Public-domain / low-visibility titles sometimes have no working embed on a given
  server — switch servers, or "Retry", to find one that plays.
- Playback depends on the embed providers' availability; the player surfaces a clear
  error + retry when a server fails.