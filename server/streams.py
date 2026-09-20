"""
Embed server resolver for movies, TV, and anime.

Provides iframable embed sources from multiple providers. Each provider has
different ID requirements and capabilities (some support anime, some don't).
The player lets users pick or auto-fall through them.
"""

# Movie and TV servers (TMDB-based)
VIDFAST_BASE = "https://vidfast.vc"
VIDPHANTOM_BASE = "https://vidphantom.com"
VIDSRC_BASE = "https://vidsrc.tw"
STREAMSRC_BASE = "https://streamsrc.cc"
VIDAPI_BASE = "https://vidapi.qzz.io"
VIDRIFT_BASE = "https://embed.vidrift.in"
VIDUP_BASE = "https://vidup.to"
VIDBOLT_BASE = "https://vidbolt.xyz"
VIDLOVE_BASE = "https://player.vidlove.cc"
VIDEASY_BASE = "https://player.videasy.net"


def _build_movie_servers(tmdb_id: int) -> list[dict]:
    """Build server list for movies (TMDB ID)."""
    return [
        {
            "id": "vidfast",
            "name": "VidFast",
            "embedUrl": f"{VIDFAST_BASE}/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidphantom",
            "name": "VidPhantom",
            "embedUrl": f"{VIDPHANTOM_BASE}/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidsrc",
            "name": "VidSrc",
            "embedUrl": f"{VIDSRC_BASE}/embed/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "streamsrc",
            "name": "StreamSrc",
            "embedUrl": f"{STREAMSRC_BASE}/watch/movie/tmdbid={tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidapi",
            "name": "VidAPI",
            "embedUrl": f"{VIDAPI_BASE}/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidrift",
            "name": "VidRift",
            "embedUrl": f"{VIDRIFT_BASE}/embed/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidup",
            "name": "VidUp",
            "embedUrl": f"{VIDUP_BASE}/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidbolt",
            "name": "VidBolt",
            "embedUrl": f"{VIDBOLT_BASE}/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidlove",
            "name": "VidLove",
            "embedUrl": f"{VIDLOVE_BASE}/embed/movie/{tmdb_id}",
            "supportsAnilist": False,
        },
    ]


def _build_tv_servers(tmdb_id: int, season: int, episode: int) -> list[dict]:
    """Build server list for TV series (TMDB ID + season/episode)."""
    return [
        {
            "id": "vidfast",
            "name": "VidFast",
            "embedUrl": f"{VIDFAST_BASE}/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidphantom",
            "name": "VidPhantom",
            "embedUrl": f"{VIDPHANTOM_BASE}/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidsrc",
            "name": "VidSrc",
            "embedUrl": f"{VIDSRC_BASE}/embed/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "streamsrc",
            "name": "StreamSrc",
            "embedUrl": f"{STREAMSRC_BASE}/watch/series/tmdbid={tmdb_id}",
            "supportsAnilist": False,
        },
        {
            "id": "vidapi",
            "name": "VidAPI",
            "embedUrl": f"{VIDAPI_BASE}/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidrift",
            "name": "VidRift",
            "embedUrl": f"{VIDRIFT_BASE}/embed/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidup",
            "name": "VidUp",
            "embedUrl": f"{VIDUP_BASE}/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidbolt",
            "name": "VidBolt",
            "embedUrl": f"{VIDBOLT_BASE}/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
        {
            "id": "vidlove",
            "name": "VidLove",
            "embedUrl": f"{VIDLOVE_BASE}/embed/tv/{tmdb_id}/{season}/{episode}",
            "supportsAnilist": False,
        },
    ]


def _build_anime_servers_with_tmdb(tmdb_id: int, season: int, episode: int) -> list[dict]:
    """Anime WITH TMDB match: all servers selectable, supports TMDB/AniList toggle."""
    servers = _build_tv_servers(tmdb_id, season, episode)
    # VidRift and VidBolt support both TMDB and AniList for anime
    for server in servers:
        if server["id"] in ("vidrift", "vidbolt"):
            server["supportsAnilist"] = True
    return servers


def _build_anime_servers_without_tmdb(anilist_id: int, episode: int) -> list[dict]:
    """Anime WITHOUT TMDB match: only AniList-supporting servers selectable."""
    return [
        {
            "id": "vidrift",
            "name": "VidRift",
            "embedUrl": f"{VIDRIFT_BASE}/embed/tv/{anilist_id}/{1}/{episode}",
            "supportsAnilist": True,
            "disabled": False,
        },
        {
            "id": "vidbolt",
            "name": "VidBolt",
            "embedUrl": f"{VIDBOLT_BASE}/anime/{anilist_id}/{episode}",
            "supportsAnilist": True,
            "disabled": False,
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
    """Resolve a TMDB title to available embed servers."""
    if not tmdb_id:
        return {"error": "No TMDB ID found for this title."}

    if media_type == "tv" and season and episode:
        servers = _build_tv_servers(tmdb_id, season, episode)
    else:
        servers = _build_movie_servers(tmdb_id)

    return {
        "tmdbId": tmdb_id,
        "title": title,
        "year": year,
        "servers": servers,
        "defaultServer": servers[0]["id"] if servers else None,
    }


async def resolve_anime_with_tmdb(
    tmdb_id: int,
    season: int,
    episode: int,
) -> dict:
    """Resolve anime that has a TMDB match: all servers available."""
    servers = _build_anime_servers_with_tmdb(tmdb_id, season, episode)
    return {
        "servers": servers,
        "defaultServer": servers[0]["id"] if servers else None,
    }


async def resolve_anime_without_tmdb(
    anilist_id: int,
    episode: int,
) -> dict:
    """Resolve anime without TMDB: only AniList-supporting servers."""
    servers = _build_anime_servers_without_tmdb(anilist_id, episode)
    return {
        "servers": servers,
        "defaultServer": servers[0]["id"] if servers else None,
    }
