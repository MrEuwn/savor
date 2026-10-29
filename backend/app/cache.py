from __future__ import annotations

import time


class MenuCache:
    """Cache in-memory per slug (P0; P1: Redis). Invalidation: cache.clear_slug()."""

    def __init__(self, ttl: int = 60):
        self._ttl = ttl
        self._data: dict[str, tuple[float, object]] = {}

    def get(self, slug: str):
        row = self._data.get(slug)
        if row and row[0] > time.monotonic():
            return row[1]
        return None

    def set(self, slug: str, value) -> None:
        self._data[slug] = (time.monotonic() + self._ttl, value)

    def clear_slug(self, slug: str) -> None:
        self._data.pop(slug, None)

    def clear_all(self) -> None:
        self._data.clear()

    def stats(self) -> dict:
        alive = sum(1 for r in self._data.values() if r[0] > time.monotonic())
        return {"entries": len(self._data), "alive_entries": alive}


menu_cache = MenuCache()
