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
import logging
import time

import httpx

import anime_cache

logger = logging.getLogger(__name__)

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
    media(type: ANIME, isAdult: false, sort: TRENDING_DESC) {
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
    media(type: ANIME, isAdult: false, sort: SCORE_DESC) {
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
    media(type: ANIME, isAdult: false, status: RELEASING, sort: START_DATE_DESC) {
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
    media(type: ANIME, isAdult: false, format: MOVIE, sort: SCORE_DESC) {
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
    media(type: ANIME, isAdult: false, search: $q) {
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
    media(type: ANIME, isAdult: false, genre: $genre, sort: POPULARITY_DESC) {
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
    isAdult
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

    try:
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
    except httpx.ConnectError as e:
        raise RuntimeError(f"AniList is unreachable: {e}") from e
    except httpx.TimeoutException as e:
        raise RuntimeError(f"AniList request timed out: {e}") from e
    except httpx.HTTPError as e:
        raise RuntimeError(f"AniList request failed: {e}") from e


async def trending(page: int = 1) -> dict:
    """Anime ordered by daily trending score. Uses cache to minimize API calls."""
    try:
        result = await _post(TRENDING_QUERY, {"page": page})
        result["_source"] = "live"
        await anime_cache.set_shelf("trending", page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for trending(page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf("trending", page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for trending(page={page}): {str(e)} — returning 503 to client")
        raise


async def top_rated(page: int = 1) -> dict:
    """Anime ordered by average score. Uses cache to minimize API calls."""
    try:
        result = await _post(TOP_RATED_QUERY, {"page": page})
        result["_source"] = "live"
        await anime_cache.set_shelf("top-rated", page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for top_rated(page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf("top-rated", page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for top_rated(page={page}): {str(e)} — returning 503 to client")
        raise


async def latest(page: int = 1) -> dict:
    """Currently releasing anime, newest first. Uses cache to minimize API calls."""
    try:
        result = await _post(LATEST_QUERY, {"page": page})
        result["_source"] = "live"
        await anime_cache.set_shelf("latest", page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for latest(page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf("latest", page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for latest(page={page}): {str(e)} — returning 503 to client")
        raise


async def movies(page: int = 1) -> dict:
    """Anime films (format: MOVIE) ordered by score. Uses cache to minimize API calls."""
    try:
        result = await _post(MOVIES_QUERY, {"page": page})
        result["_source"] = "live"
        await anime_cache.set_shelf("movies", page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for movies(page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf("movies", page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for movies(page={page}): {str(e)} — returning 503 to client")
        raise


async def search(q: str, page: int = 1) -> dict:
    """Fuzzy title search across anime. Uses cache to minimize API calls."""
    try:
        result = await _post(SEARCH_QUERY, {"page": page, "q": q})
        result["_source"] = "live"
        await anime_cache.set_search(q, page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for search(q={q!r}, page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_search(q, page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for search(q={q!r}, page={page}): {str(e)} — returning 503 to client")
        raise


async def by_genre(genre: str, page: int = 1) -> dict:
    """One page of anime under a single genre tag, most popular first. Uses cache."""
    cache_key = f"genre_{genre}"
    try:
        result = await _post(GENRE_QUERY, {"page": page, "genre": genre})
        result["_source"] = "live"
        await anime_cache.set_shelf(cache_key, page, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for by_genre(genre={genre!r}, page={page}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf(cache_key, page, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for by_genre(genre={genre!r}, page={page}): {str(e)} — returning 503 to client")
        raise


async def genres() -> dict:
    """All anime genre tags (for the filter dropdown). Cached separately."""
    try:
        result = await _post(GENRES_QUERY)

        # Explicit filter for adult content tags
        if "GenreCollection" in result and isinstance(result["GenreCollection"], list):
            result["GenreCollection"] = [g for g in result["GenreCollection"] if g and g.lower() != "hentai"]

        result["_source"] = "live"
        await anime_cache.set_shelf("genres", 1, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for genres(): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_shelf("genres", 1, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for genres(): {str(e)} — returning 503 to client")
        raise


async def detail(anilist_id: int) -> dict:
    """Full detail for one title: synopsis, studio, format, relations, episodes.
    Uses cache with AniList ID as key to minimize API calls.
    """
    try:
        result = await _post(DETAIL_QUERY, {"id": anilist_id})

        # Block adult content before caching
        media = result.get("Media", {})
        if media.get("isAdult"):
            raise RuntimeError(f"Adult content not available: {anilist_id}")

        title = media.get("title", {}).get("romaji", f"Anime {anilist_id}")
        result["_source"] = "live"
        await anime_cache.set_anime(anilist_id, title, result)
        return result
    except RuntimeError as e:
        logger.warning(f"AniList live call failed for detail(anilist_id={anilist_id}): {str(e)} — falling back to cache")
        cached, cached_at = await anime_cache.get_anime(anilist_id, ignore_expiry=True)
        if cached is not None:
            cached["_source"] = "cache"
            cached["_cached_at"] = cached_at
            return cached
        logger.error(f"AniList failed AND no cache available for detail(anilist_id={anilist_id}): {str(e)} — returning 503 to client")
        raise
