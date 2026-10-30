"""
SAVOR API — Vercel Python serverless entry point.

Menuju endpoint: semua ruta diarahkan ke app FastAPI ini via vercel.json.
SQLite di Vercel = ephemeral (/tmp); data demo di-seed ulang otomatis saat cold
start (idempoten: cek tenant 'meja-aresto' dulu).
"""
import os
import sys

# /tmp/base: satu-satunya direktori writable di Vercel
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/savor.db")
os.environ.setdefault("JWT_SECRET", "savor-uinic8-2026-change-me-32-chars")
os.environ.setdefault("ASSETS_PUBLIC_BASE", "/assets")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("STORAGE_LOCAL_DIR", "/tmp/storage")
os.environ.setdefault("CORS_ORIGINS", "*")

# Pastikan folder app/ dapat diimport (rootDir berada di repo root)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)
os.chdir(BACKEND)

from app.main import create_app  # noqa: E402

app = create_app()


# ---- Auto-seed idempoten saat cold start (data hilang di /tmp) ----
def _seed_if_empty() -> None:
    try:
        from sqlalchemy import select

        from app.db import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            exists = db.scalar(
                select(models.Tenant).where(models.Tenant.slug == "meja-aresto")
            )
            if exists:
                return
        finally:
            db.close()

        # Tenant belum ada → jalankan seed (import inline; httpx tersedia)
        # Seed inline via httpx ASGI (async transport; httpx modern)
        import anyio

        from httpx import ASGITransport, AsyncClient

        async def _do_seed() -> None:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://local"
            ) as c:
                await c.post("/auth/register-tenant", json={
                    "name": "SAVOR Aresto (Demo)",
                    "email": "demo@savor.id",
                    "password": "SAVOR-2026!",
                    "slug": "meja-aresto",
                })

        anyio.run(_do_seed)
        print("[seed] tenant demo dibuat", flush=True)
    except Exception as e:  # pragma: no cover - jangan pernah gagalkan cold start
        print(f"[seed] skipped: {e}", flush=True)


_seed_done = False


@app.on_event("startup")
def _warm() -> None:
    global _seed_done
    if _seed_done:
        return
    _seed_done = True
    _seed_if_empty()


# Vercel Python runtime membaca variabel `app`
handler = app
