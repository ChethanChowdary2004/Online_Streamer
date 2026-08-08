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


@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1), page: int = Query(1, ge=1)
) -> dict:
    """Multi-type search (movies + TV)."""
    return await tmdb.tmdb("/search/multi", {"query": q, "page": page})


@app.get("/api/genres")
async def genres() -> dict:
    """Movie and TV genre lists for filters/labels."""
    movies = await tmdb.tmdb("/genre/movie/list")
    tv = await tmdb.tmdb("/genre/tv/list")
    return {"movie": movies.get("genres", []), "tv": tv.get("genres", [])}


@app.get("/api/stream")
async def get_stream(
    tmdb_id: int, title: str = "", year: str = ""
) -> dict:
    """Resolve a lawful, freely-streamable video source (HLS or MP4)."""
    result = await streams.resolve(tmdb_id, title or None, year or None)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result