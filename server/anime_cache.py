"""
Anime data cache using SQLite.

Stores AniList anime data locally to minimize API calls (AniList blocks on
repeated requests). Data expires after 6 hours and is refreshed on next access.
"""
import sqlite3
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "anime_cache.db"
CACHE_DURATION = 6 * 3600  # 6 hours in seconds


def init_db():
    """Initialize the SQLite database schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Anime data cache (one row per anime)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS anime (
            anilist_id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            data BLOB NOT NULL,
            cached_at REAL NOT NULL,
            expires_at REAL NOT NULL
        )
    """)

    # Search results cache (one row per search query)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_cache (
            query TEXT PRIMARY KEY,
            page INTEGER,
            data BLOB NOT NULL,
            cached_at REAL NOT NULL,
            expires_at REAL NOT NULL
        )
    """)

    # Genre/shelf cache (trending, top-rated, latest, movies)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shelf_cache (
            shelf_name TEXT NOT NULL,
            page INTEGER NOT NULL,
            data BLOB NOT NULL,
            cached_at REAL NOT NULL,
            expires_at REAL NOT NULL,
            PRIMARY KEY (shelf_name, page)
        )
    """)

    conn.commit()
    conn.close()


def _is_expired(expires_at: float) -> bool:
    """Check if a cache entry has expired."""
    return time.time() > expires_at


def get_anime(anilist_id: int) -> dict | None:
    """Get cached anime data by AniList ID. Returns None if not cached or expired."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT data, expires_at FROM anime WHERE anilist_id = ?",
        (anilist_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    data_blob, expires_at = row
    if _is_expired(expires_at):
        delete_anime(anilist_id)
        return None

    return json.loads(data_blob)


def set_anime(anilist_id: int, title: str, data: dict) -> None:
    """Cache anime data with AniList ID."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    now = time.time()
    expires_at = now + CACHE_DURATION

    cursor.execute(
        """
        INSERT OR REPLACE INTO anime (anilist_id, title, data, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (anilist_id, title, json.dumps(data), now, expires_at),
    )
    conn.commit()
    conn.close()


def delete_anime(anilist_id: int) -> None:
    """Remove anime from cache."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM anime WHERE anilist_id = ?", (anilist_id,))
    conn.commit()
    conn.close()


def get_search(query: str, page: int = 1) -> dict | None:
    """Get cached search results. Returns None if not cached or expired."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT data, expires_at FROM search_cache WHERE query = ? AND page = ?",
        (query, page),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    data_blob, expires_at = row
    if _is_expired(expires_at):
        delete_search(query, page)
        return None

    return json.loads(data_blob)


def set_search(query: str, page: int, data: dict) -> None:
    """Cache search results."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    now = time.time()
    expires_at = now + CACHE_DURATION

    cursor.execute(
        """
        INSERT OR REPLACE INTO search_cache (query, page, data, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (query, page, json.dumps(data), now, expires_at),
    )
    conn.commit()
    conn.close()


def delete_search(query: str, page: int = None) -> None:
    """Remove search results from cache."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if page:
        cursor.execute("DELETE FROM search_cache WHERE query = ? AND page = ?", (query, page))
    else:
        cursor.execute("DELETE FROM search_cache WHERE query = ?", (query,))

    conn.commit()
    conn.close()


def get_shelf(shelf_name: str, page: int = 1) -> dict | None:
    """Get cached shelf data (trending, top-rated, etc.). Returns None if not cached or expired."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT data, expires_at FROM shelf_cache WHERE shelf_name = ? AND page = ?",
        (shelf_name, page),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    data_blob, expires_at = row
    if _is_expired(expires_at):
        delete_shelf(shelf_name, page)
        return None

    return json.loads(data_blob)


def set_shelf(shelf_name: str, page: int, data: dict) -> None:
    """Cache shelf data."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    now = time.time()
    expires_at = now + CACHE_DURATION

    cursor.execute(
        """
        INSERT OR REPLACE INTO shelf_cache (shelf_name, page, data, cached_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (shelf_name, page, json.dumps(data), now, expires_at),
    )
    conn.commit()
    conn.close()


def delete_shelf(shelf_name: str, page: int = None) -> None:
    """Remove shelf data from cache."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if page:
        cursor.execute("DELETE FROM shelf_cache WHERE shelf_name = ? AND page = ?", (shelf_name, page))
    else:
        cursor.execute("DELETE FROM shelf_cache WHERE shelf_name = ?", (shelf_name,))

    conn.commit()
    conn.close()


def clear_all() -> None:
    """Clear all cache data."""
    if DB_PATH.exists():
        DB_PATH.unlink()
    init_db()
