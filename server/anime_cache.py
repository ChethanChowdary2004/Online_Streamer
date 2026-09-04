"""
Anime data cache using Supabase Postgres.

Stores AniList anime data in Postgres to minimize API calls (AniList blocks on
repeated requests). Data expires after 6 hours and is refreshed on next access.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from auth import supabase_client

CACHE_DURATION_SECONDS = 2 * 3600


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expiry_iso() -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=CACHE_DURATION_SECONDS)).isoformat()


def _is_expired(expires_at_str: str) -> bool:
    expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
    return datetime.now(timezone.utc) > expires_at


# ===== ANIME =====

async def get_anime(anilist_id: int, ignore_expiry: bool = False) -> tuple[dict | None, str | None]:
    def _query():
        return (
            supabase_client.table("anime_cache")
            .select("data, expires_at, cached_at")
            .eq("anilist_id", anilist_id)
            .maybe_single()
            .execute()
        )
    resp = await asyncio.to_thread(_query)
    row = resp.data if resp else None
    if not row:
        return None, None
    if not ignore_expiry and _is_expired(row["expires_at"]):
        await delete_anime(anilist_id)
        return None, None
    return row["data"], row["cached_at"]


async def set_anime(anilist_id: int, title: str, data: dict) -> None:
    def _upsert():
        return (
            supabase_client.table("anime_cache")
            .upsert(
                {
                    "anilist_id": anilist_id,
                    "title": title,
                    "data": data,
                    "cached_at": _now_iso(),
                    "expires_at": _expiry_iso(),
                },
                on_conflict="anilist_id",
            )
            .execute()
        )
    await asyncio.to_thread(_upsert)


async def delete_anime(anilist_id: int) -> None:
    def _delete():
        return (
            supabase_client.table("anime_cache")
            .delete()
            .eq("anilist_id", anilist_id)
            .execute()
        )
    await asyncio.to_thread(_delete)


# ===== SEARCH =====

async def get_search(query: str, page: int = 1, ignore_expiry: bool = False) -> tuple[dict | None, str | None]:
    def _query_fn():
        return (
            supabase_client.table("search_cache")
            .select("data, expires_at, cached_at")
            .eq("query", query)
            .eq("page", page)
            .maybe_single()
            .execute()
        )
    resp = await asyncio.to_thread(_query_fn)
    row = resp.data if resp else None
    if not row:
        return None, None
    if not ignore_expiry and _is_expired(row["expires_at"]):
        await delete_search(query, page)
        return None, None
    return row["data"], row["cached_at"]


async def set_search(query: str, page: int, data: dict) -> None:
    def _upsert():
        return (
            supabase_client.table("search_cache")
            .upsert(
                {
                    "query": query,
                    "page": page,
                    "data": data,
                    "cached_at": _now_iso(),
                    "expires_at": _expiry_iso(),
                },
                on_conflict="query,page",
            )
            .execute()
        )
    await asyncio.to_thread(_upsert)


async def delete_search(query: str, page: int) -> None:
    def _delete():
        return (
            supabase_client.table("search_cache")
            .delete()
            .eq("query", query)
            .eq("page", page)
            .execute()
        )
    await asyncio.to_thread(_delete)


# ===== SHELF =====

async def get_shelf(shelf_name: str, page: int = 1, ignore_expiry: bool = False) -> tuple[dict | None, str | None]:
    def _query_fn():
        return (
            supabase_client.table("shelf_cache")
            .select("data, expires_at, cached_at")
            .eq("shelf_name", shelf_name)
            .eq("page", page)
            .maybe_single()
            .execute()
        )
    resp = await asyncio.to_thread(_query_fn)
    row = resp.data if resp else None
    if not row:
        return None, None
    if not ignore_expiry and _is_expired(row["expires_at"]):
        await delete_shelf(shelf_name, page)
        return None, None
    return row["data"], row["cached_at"]


async def set_shelf(shelf_name: str, page: int, data: dict) -> None:
    def _upsert():
        return (
            supabase_client.table("shelf_cache")
            .upsert(
                {
                    "shelf_name": shelf_name,
                    "page": page,
                    "data": data,
                    "cached_at": _now_iso(),
                    "expires_at": _expiry_iso(),
                },
                on_conflict="shelf_name,page",
            )
            .execute()
        )
    await asyncio.to_thread(_upsert)


async def delete_shelf(shelf_name: str, page: int) -> None:
    def _delete():
        return (
            supabase_client.table("shelf_cache")
            .delete()
            .eq("shelf_name", shelf_name)
            .eq("page", page)
            .execute()
        )
    await asyncio.to_thread(_delete)
