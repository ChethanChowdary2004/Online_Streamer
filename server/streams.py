"""
Lawful stream source resolver.

Resolves a movie/TV title to a freely, legally streamable source — public-domain
and Creative-Commons films hosted on Archive.org. This module never scrapes or
returns unauthorized sources; TMDB only provides metadata, so the actual video
comes from here.

Resolution order:
  1. Curated map of well-known public-domain films (TMDB id -> archive.org item).
  2. Archive.org search for title (+ year), filtered to mediatype:movies.
  3. Playable-file lookup on the matched item: prefer HLS (.m3u8), fall back to
     a direct MP4.

Candidates are ranked so that the full film wins over trailers/clips/snippets.
"""
import httpx

ARCHIVE_SEARCH = "https://archive.org/advancedsearch.php"
ARCHIVE_METADATA = "https://archive.org/metadata"
ARCHIVE_DOWNLOAD = "https://archive.org/download"

# Well-known public-domain films, keyed by TMDB id -> archive.org item identifier.
# All identifiers verified on archive.org to list playable media.
CURATED = {
    19411: "night-of-the-living-dead-1968_202508",  # Night of the Living Dead (1968)
    886: "charade_202604",                          # Charade (1963)
    653: "Nosferatu1922",                           # Nosferatu (1922)
    25318: "escape-from-sobibor-1987",              # Escape from Sobibor (1987)
}

# Substrings that mark an item as a trailer/clip/music video rather than the
# full film — we never want to surface these as "the movie".
_BAD_TITLES = (
    "snippet", " trailer", "trailer ", "clip", "preview", "teaser",
    "music video", "official music", "soundtrack", "opening", "end credits",
    "featurette", "behind-the-scenes", "behind the scenes", "official practical",
    "production", "brand new day", "teaser trailer",
    "promo", "commercial",
)

# Archive.org collections that hold YouTube-side / social-media mirrors rather
# than a film. Items in these are never offered as "the movie".
_BAD_COLLECTIONS = ("mirrortube", "social-media-video", "gamefootage")

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=25, follow_redirects=True)
    return _client


def _looks_like_full_film(title: str) -> bool:
    """Reject trailers/clips/snippets; keep anything that reads like the film."""
    lower = title.lower()
    return not any(bad in lower for bad in _BAD_TITLES)


def _file_seconds(files: list, name: str) -> int:
    """Duration in seconds of an item's file record (0 when unknown)."""
    for f in files:
        if f.get("name") == name:
            try:
                return int(float(f.get("length") or 0))
            except (TypeError, ValueError):
                return 0
    return 0


async def _playable_file(identifier: str) -> dict | None:
    """Look up an item's metadata and return its best playable, live file."""
    try:
        resp = await get_client().get(f"{ARCHIVE_METADATA}/{identifier}")
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    # Skip promo/YouTube-mirror collections so we never offer a trailer as "the movie".
    collections = data.get("metadata", {}).get("collection") or []
    if isinstance(collections, str):
        collections = [collections]
    if any(col in _BAD_COLLECTIONS for col in collections):
        return None

    # Reject by the item's own title too (covers promos/commercials that search
    # ranking may miss on the direct-identifier path).
    item_title = data.get("metadata", {}).get("title") or ""
    if not _looks_like_full_film(item_title):
        return None

    files = data.get("files", []) or []
    names = [f.get("name", "") for f in files]

    # Prefer an HLS manifest so we get adaptive streaming.
    for name in names:
        if name.endswith(".m3u8") and "_thumb" not in name:
            return {"url": f"{ARCHIVE_DOWNLOAD}/{identifier}/{name}", "type": "hls", "seconds": 0}

    # Fall back to a direct MP4, preferring the longest file.
    mp4s = [
        name
        for name in names
        if name.endswith(".mp4") and "audio" not in name.lower()
    ]
    if mp4s:
        name = max(mp4s, key=lambda n: _file_seconds(files, n))
        return {
            "url": f"{ARCHIVE_DOWNLOAD}/{identifier}/{name}",
            "type": "mp4",
            "seconds": _file_seconds(files, name),
        }
    return None


# Embed providers. Each is an iframable source; we offer several so playback
# never depends on a single host. The player lets the user pick (or auto-fall
# through) them.
WFS_BASE = "https://embed.wfs.lol/embed"
VIDLINK_BASE = "https://vidlink.pro"
VIDEASY_BASE = "https://player.videasy.net"


def _build_servers(
    media_type: str,
    tmdb_id: int,
    season: int | None = None,
    episode: int | None = None,
) -> list[dict]:
    """Return the embed-server list for a title.

    Movies -> /embed/movie/{id} (WFS), /movie/{id} (VidLink), /movie/{id} (VIDEASY).
    TV/anime -> /embed/tv/{id}/{s}/{e} (WFS), /tv/{id}/{s}/{e} (VidLink),
                /tv/{id}/{s}/{e} (VIDEASY).
    """
    if media_type == "tv" and season and episode:
        return [
            {
                "id": "wfs",
                "name": "WFS",
                "embedUrl": f"{WFS_BASE}/tv/{tmdb_id}/{season}/{episode}",
            },
            {
                "id": "vidlink",
                "name": "VidLink",
                "embedUrl": f"{VIDLINK_BASE}/tv/{tmdb_id}/{season}/{episode}",
            },
            {
                "id": "videasy",
                "name": "VIDEASY",
                "embedUrl": f"{VIDEASY_BASE}/tv/{tmdb_id}/{season}/{episode}",
            },
        ]
    return [
        {
            "id": "wfs",
            "name": "WFS",
            "embedUrl": f"{WFS_BASE}/movie/{tmdb_id}",
        },
        {
            "id": "vidlink",
            "name": "VidLink",
            "embedUrl": f"{VIDLINK_BASE}/movie/{tmdb_id}",
        },
        {
            "id": "videasy",
            "name": "VIDEASY",
            "embedUrl": f"{VIDEASY_BASE}/movie/{tmdb_id}",
        },
    ]


async def resolve(
    tmdb_id: int,
    title: str | None = None,
    year: str | None = None,
    media_type: str = "movie",
    season: int | None = None,
    episode: int | None = None,
) -> dict:
    if not tmdb_id:
        return {
            "error": "No TMDB ID found for this title."
        }
    servers = _build_servers(media_type, tmdb_id, season, episode)
    return {
        "tmdbId": tmdb_id,
        "title": title,
        "year": year,
        "servers": servers,
        # First server is the one Auto starts with.
        "defaultServer": servers[0]["id"] if servers else None,
    }