"""
Online Streamer — FastAPI backend.

Proxies the TMDB API (keeping the key on the server) and resolves lawful,
freely-streamable video sources (public-domain Archive.org films).

Run with:
    .venv/Scripts/python -m uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import anilist
import streams
import tmdb

app = FastAPI(title="Online Streamer API", version="0.1.0")


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_request: Request, exc: RuntimeError):
    """Turn unhandled RuntimeErrors (e.g. missing TMDB key) into a clean 503."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})

# The Vite dev server hits the API through its own proxy, but allow direct
# browser calls during development too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOVIE_LISTS = {"now_playing", "popular", "top_rated", "upcoming"}
TV_LISTS = {"popular", "top_rated", "airing_today", "on_the_air"}

# Query params the home page is allowed to forward to the TMDB discover
# endpoint (genre/keyword shelves). Anything else is dropped.
DISCOVER_ALLOWED = {
    "with_genres",
    "with_keywords",
    "sort_by",
    "vote_count.gte",
    "with_original_language",
    "page",
}


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/movie/{list}")
async def movie_list(list: str, page: int = Query(1, ge=1, le=500)) -> dict:
    """Movie shelf: /api/movie/{now_playing|popular|top_rated|upcoming}."""
    if list not in MOVIE_LISTS:
        raise HTTPException(404, f"Unknown movie list: {list}")
    return await tmdb.tmdb(f"/movie/{list}", {"page": page})


@app.get("/api/tv/{list}")
async def tv_list(list: str, page: int = Query(1, ge=1, le=500)) -> dict:
    """TV shelf: /api/tv/{popular|top_rated|airing_today|on_the_air}."""
    if list not in TV_LISTS:
        raise HTTPException(404, f"Unknown TV list: {list}")
    return await tmdb.tmdb(f"/tv/{list}", {"page": page})


@app.get("/api/trending")
async def trending(
    media_type: str = Query("movie", pattern="^(movie|tv|all)$"),
    time_window: str = Query("week", pattern="^(day|week)$"),
    page: int = Query(1, ge=1, le=500),
) -> dict:
    """Trending shelf: /api/trending (movies this week by default)."""
    return await tmdb.tmdb(f"/trending/{media_type}/{time_window}", {"page": page})


@app.get("/api/discover/{media_type}")
async def discover(media_type: str, request: Request) -> dict:
    """TMDB discover for {movie|tv}: forwards a whitelisted param subset.

    Enables genre/keyword shelves like 'Action & Adventure' (28,12), 'Comedy'
    (35) or 'Anime' (keyword 210024) straight from the client.
    """
    if media_type not in {"movie", "tv"}:
        raise HTTPException(404, f"Unknown media type: {media_type}")
    params = {
        key: value
        for key, value in request.query_params.items()
        if key in DISCOVER_ALLOWED
    }
    params.setdefault("sort_by", "popularity.desc")
    return await tmdb.tmdb(f"/discover/{media_type}", params)


@app.get("/api/movie/{movie_id}/detail")
async def movie_detail(movie_id: int) -> dict:
    """Full movie detail: info + credits + similar."""
    detail = await tmdb.tmdb(f"/movie/{movie_id}")
    detail["credits"] = await tmdb.tmdb(f"/movie/{movie_id}/credits")
    detail["similar"] = await tmdb.tmdb(f"/movie/{movie_id}/similar")
    return detail


@app.get("/api/tv/{tv_id}/detail")
async def tv_detail(tv_id: int) -> dict:
    """Full TV detail: info + credits + similar."""
    detail = await tmdb.tmdb(f"/tv/{tv_id}")
    detail["credits"] = await tmdb.tmdb(f"/tv/{tv_id}/credits")
    detail["similar"] = await tmdb.tmdb(f"/tv/{tv_id}/similar")
    return detail


@app.get("/api/tv/{tv_id}/season/{season}")
async def tv_season(tv_id: int, season: int) -> dict:
    """Episodes for one season of a TV show/anime.
    Enables season/episode picking in the player.
    """
    return await tmdb.tmdb(f"/tv/{tv_id}/season/{season}")


@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1), page: int = Query(1, ge=1)
) -> dict:
    """Multi-type search (movies + TV)."""
    return await tmdb.tmdb("/search/multi", {"query": q, "page": page})


@app.get("/api/search/tv")
async def search_tv(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)) -> dict:
    """TV-only search for the Series page."""
    return await tmdb.tmdb("/search/tv", {"query": q, "page": page})


@app.get("/api/genres")
async def genres() -> dict:
    """Movie and TV genre lists for filters/labels."""
    movies = await tmdb.tmdb("/genre/movie/list")
    tv = await tmdb.tmdb("/genre/tv/list")
    return {"movie": movies.get("genres", []), "tv": tv.get("genres", [])}


# --- Anime (AniList) ---
# Responses stay in AniList's raw shape (Page.media.* / Media.*) because the
# anime-specific components consume those fields directly — no TMDB mapping.
#
# Registration order matters here: the static routes (/search, /genres) must
# come before the /api/anime/{list} shelf wildcard so they are not shadowed.

ANIME_SHELVES = {
    "trending": anilist.trending,
    "top-rated": anilist.top_rated,
    "latest": anilist.latest,
    "movies": anilist.movies,
}


@app.get("/api/anime/search")
async def anime_search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)) -> dict:
    """Anime title search (AniList fuzzy match)."""
    return await anilist.search(q, page)


@app.get("/api/anime/genres")
async def anime_genres() -> dict:
    """Anime genre tags for the filter dropdown."""
    return await anilist.genres()


@app.get("/api/anime/genre/{genre}")
async def anime_genre_list(genre: str, page: int = Query(1, ge=1, le=100)) -> dict:
    """Browse shelf: anime under a single genre tag, most popular first."""
    return await anilist.by_genre(genre, page)


@app.get("/api/anime/{anilist_id}/detail")
async def anime_detail(anilist_id: int) -> dict:
    """Full anime detail: synopsis, studio, format, genres, episodes, relations."""
    return await anilist.detail(anilist_id)


@app.get("/api/anime/{list}")
async def anime_list(list: str, page: int = Query(1, ge=1, le=100)) -> dict:
    """Anime shelf: /api/anime/{trending|top-rated|latest|movies}."""
    if list not in ANIME_SHELVES:
        raise HTTPException(404, f"Unknown anime list: {list}")
    return await ANIME_SHELVES[list](page)


@app.get("/api/stream")
async def get_stream(
    tmdb_id: int,
    title: str = "",
    year: str = "",
    media_type: str = Query("movie", pattern="^(movie|tv)$"),
    season: int | None = Query(None, ge=1),
    episode: int | None = Query(None, ge=1),
) -> dict:
    """Resolve embed servers (WFS + VidLink) for a movie or TV title."""
    result = await streams.resolve(
        tmdb_id,
        title or None,
        year or None,
        media_type,
        season,
        episode,
    )
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result