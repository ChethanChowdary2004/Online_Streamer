"""
TMDB API client.

Thin wrapper around the public The Movie Database API. Centralizes the API key
so the only code that ever touches it lives here on the server — the browser
never talks to TMDB directly.
"""
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return a lazily-created shared HTTPX client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=20)
    return _client


async def tmdb(path: str, params: dict | None = None) -> dict:
    """GET a TMDB endpoint and return the JSON body. Adds the API key."""
    if not TMDB_API_KEY or TMDB_API_KEY == "your_tmdb_api_key_here":
        raise RuntimeError(
            "TMDB_API_KEY is not set. "
            "Get a free key at https://www.themoviedb.org/settings/api "
            "and put it in server/.env"
        )
    params = dict(params or {})
    params["api_key"] = TMDB_API_KEY
    resp = await get_client().get(f"{TMDB_BASE_URL}{path}", params=params)
    resp.raise_for_status()
    return resp.json()


def image_url(path: str | None, size: str = "w500") -> str:
    """Build an absolute TMDB image URL, or empty string when path is None."""
    if not path:
        return ""
    return f"{TMDB_IMAGE_BASE}/{size}{path}"