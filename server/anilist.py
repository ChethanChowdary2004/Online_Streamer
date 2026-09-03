"""
AniList API client with SQLite caching.

Thin wrapper around the AniList GraphQL API with local caching to minimize
API calls (AniList rate-limits to ~90 requests/min per IP and blocks on bursts).
Cache expires every 6 hours and is automatically refreshed on next access.

All responses are returned in AniList's raw shape (Page.media.*, Media.*) —
no TMDB normalization. The anime-specific frontend components consume these
fields directly.
"""
import asyncio
import time

import httpx

import anime_cache

ANILIST_API = "https://graphql.anilist.co"

_client: httpx.AsyncClient | None = None

# AniList rate-limits to ~90 requests/min per IP and answers with 429 +
# Retry-After when exceeded. The anime page fires several queries at once
# (shelves, genres, detail), so we serialize calls with a small minimum
# spacing — that keeps bursts comfortably under the limit instead of tripping
# it. On the rare 429 that still slips through we back off and retry once.
_rate_lock = asyncio.Lock()
_last_request_at = 0.0
_MIN_INTERVAL = 0.7  # ~85 req/min ceiling, safely under AniList's 90

# Shared fields every anime card / banner / detail needs. Kept as one fragment
# so shelf, search and detail queries stay consistent.
MEDIA_FIELDS = """
id
coverImage { large extraLarge }
bannerImage
title { romaji english native }
description
averageScore
format
episodes
status
genres
studios { nodes { isAnimationStudio name } }
startDate { year }
"""

TRENDING_QUERY = """
query ($page: Int) {
  Page(page: $page, perPage: 12) {
    media(type: ANIME, sort: TRENDING_DESC) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

TOP_RATED_QUERY = """
query ($page: Int) {
  Page(page: $page, perPage: 20) {
    media(type: ANIME, sort: SCORE_DESC) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

LATEST_QUERY = """
query ($page: Int) {
  Page(page: $page, perPage: 20) {
    media(type: ANIME, status: RELEASING, sort: START_DATE_DESC) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

MOVIES_QUERY = """
query ($page: Int) {
  Page(page: $page, perPage: 20) {
    media(type: ANIME, format: MOVIE, sort: SCORE_DESC) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

SEARCH_QUERY = """
query ($page: Int, $q: String) {
  Page(page: $page, perPage: 20) {
    pageInfo { hasNextPage total }
    media(type: ANIME, search: $q) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

GENRE_QUERY = """
query ($page: Int, $genre: String) {
  Page(page: $page, perPage: 20) {
    pageInfo { hasNextPage total }
    media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
      id
      coverImage { large extraLarge }
      bannerImage
      title { romaji english native }
      description
      averageScore
      format
      episodes
      status
      genres
      studios { nodes { isAnimationStudio name } }
      startDate { year }
    }
  }
}
"""

GENRES_QUERY = """
query {
  GenreCollection
}
"""

DETAIL_QUERY = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    coverImage { large extraLarge }
    bannerImage
    title { romaji english native }
    description
    averageScore
    format
    episodes
    status
    genres
    studios { nodes { isAnimationStudio name } }
    startDate { year month day }
    relations {
      nodes {
        id
        format
        type
        title { romaji english }
        coverImage { large extraLarge }
        averageScore
        startDate { year }
      }
    }
    trailer { id site }
  }
}
"""


def get_client() -> httpx.AsyncClient:
    """Return a lazily-created shared HTTPX client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=20)
    return _client


async def _post(query: str, variables: dict | None = None) -> dict:
    """POST a GraphQL query and return its `data` payload.

    Serializes requests with a minimum spacing (AniList's 90 req/min limit),
    and retries once on a 429 using the Retry-After header. Raises RuntimeError
    on API-level errors (AniList has no rate-limit key).
    """
    global _last_request_at

    # Space out calls so concurrent shelf queries can't burst past the limit.
    async with _rate_lock:
        wait = _MIN_INTERVAL - (time.monotonic() - _last_request_at)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request_at = time.monotonic()

    resp = await get_client().post(
        ANILIST_API,
        json={"query": query, "variables": variables or {}},
    )

    # Transient rate limit: back off by Retry-After (default 1s) and retry once.
    # A 429 that survives the retry becomes a RuntimeError so main.py returns a
    # clean 503 to the client instead of an unhandled 500.
    if resp.status_code == 429:
        retry_after = float(resp.headers.get("Retry-After", "1") or 1)
        await asyncio.sleep(retry_after)
        resp = await get_client().post(
            ANILIST_API,
            json={"query": query, "variables": variables or {}},
        )
        if resp.status_code == 429:
            raise RuntimeError(
                "AniList is rate-limiting requests right now — try again shortly."
            )

    resp.raise_for_status()
    data = resp.json()
    if data.get("errors"):
        raise RuntimeError(f"AniList: {data['errors'][0]['message']}")
    return data.get("data") or {}


async def trending(page: int = 1) -> dict:
    """Anime ordered by daily trending score. Uses cache to minimize API calls."""
    cached = await anime_cache.get_shelf("trending", page)
    if cached:
        return cached

    result = await _post(TRENDING_QUERY, {"page": page})
    await anime_cache.set_shelf("trending", page, result)
    return result


async def top_rated(page: int = 1) -> dict:
    """Anime ordered by average score. Uses cache to minimize API calls."""
    cached = await anime_cache.get_shelf("top-rated", page)
    if cached:
        return cached

    result = await _post(TOP_RATED_QUERY, {"page": page})
    await anime_cache.set_shelf("top-rated", page, result)
    return result


async def latest(page: int = 1) -> dict:
    """Currently releasing anime, newest first. Uses cache to minimize API calls."""
    cached = await anime_cache.get_shelf("latest", page)
    if cached:
        return cached

    result = await _post(LATEST_QUERY, {"page": page})
    await anime_cache.set_shelf("latest", page, result)
    return result


async def movies(page: int = 1) -> dict:
    """Anime films (format: MOVIE) ordered by score. Uses cache to minimize API calls."""
    cached = await anime_cache.get_shelf("movies", page)
    if cached:
        return cached

    result = await _post(MOVIES_QUERY, {"page": page})
    await anime_cache.set_shelf("movies", page, result)
    return result


async def search(q: str, page: int = 1) -> dict:
    """Fuzzy title search across anime. Uses cache to minimize API calls."""
    cached = await anime_cache.get_search(q, page)
    if cached:
        return cached

    result = await _post(SEARCH_QUERY, {"page": page, "q": q})
    await anime_cache.set_search(q, page, result)
    return result


async def by_genre(genre: str, page: int = 1) -> dict:
    """One page of anime under a single genre tag, most popular first. Uses cache."""
    cache_key = f"genre_{genre}"
    cached = await anime_cache.get_shelf(cache_key, page)
    if cached:
        return cached

    result = await _post(GENRE_QUERY, {"page": page, "genre": genre})
    await anime_cache.set_shelf(cache_key, page, result)
    return result


async def genres() -> dict:
    """All anime genre tags (for the filter dropdown). Cached separately."""
    cached = await anime_cache.get_shelf("genres", 1)
    if cached:
        return cached

    result = await _post(GENRES_QUERY)
    await anime_cache.set_shelf("genres", 1, result)
    return result


async def detail(anilist_id: int) -> dict:
    """Full detail for one title: synopsis, studio, format, relations, episodes.
    Uses cache with AniList ID as key to minimize API calls.
    """
    cached = await anime_cache.get_anime(anilist_id)
    if cached:
        return cached

    result = await _post(DETAIL_QUERY, {"id": anilist_id})

    # Extract title for display/logging
    media = result.get("Media", {})
    title = media.get("title", {}).get("romaji", f"Anime {anilist_id}")

    await anime_cache.set_anime(anilist_id, title, result)
    return result
