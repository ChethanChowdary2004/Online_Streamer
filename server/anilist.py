"""
AniList API client.

Thin wrapper around the AniList GraphQL API. Centralizes the GraphQL queries
for anime discovery so the browser never talks to AniList directly. AniList
does not require an API key, so cache-control and timeouts are the only knobs.

All responses are returned in AniList's raw shape (Page.media.*, Media.*) —
no TMDB normalization. The anime-specific frontend components consume these
fields directly.
"""
import httpx

ANILIST_API = "https://graphql.anilist.co"

_client: httpx.AsyncClient | None = None

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

    Raises RuntimeError on API-level errors (AniList has no rate-limit key).
    """
    resp = await get_client().post(
        ANILIST_API,
        json={"query": query, "variables": variables or {}},
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("errors"):
        raise RuntimeError(f"AniList: {data['errors'][0]['message']}")
    return data.get("data") or {}


async def trending(page: int = 1) -> dict:
    """Anime ordered by daily trending score."""
    return await _post(TRENDING_QUERY, {"page": page})


async def top_rated(page: int = 1) -> dict:
    """Anime ordered by average score."""
    return await _post(TOP_RATED_QUERY, {"page": page})


async def latest(page: int = 1) -> dict:
    """Currently releasing anime, newest first."""
    return await _post(LATEST_QUERY, {"page": page})


async def movies(page: int = 1) -> dict:
    """Anime films (format: MOVIE) ordered by score."""
    return await _post(MOVIES_QUERY, {"page": page})


async def search(q: str, page: int = 1) -> dict:
    """Fuzzy title search across anime."""
    return await _post(SEARCH_QUERY, {"page": page, "q": q})


async def by_genre(genre: str, page: int = 1) -> dict:
    """One page of anime under a single genre tag, most popular first."""
    return await _post(GENRE_QUERY, {"page": page, "genre": genre})


async def genres() -> dict:
    """All anime genre tags (for the filter dropdown)."""
    return await _post(GENRES_QUERY)


async def detail(anilist_id: int) -> dict:
    """Full detail for one title: synopsis, studio, format, relations, episodes."""
    return await _post(DETAIL_QUERY, {"id": anilist_id})