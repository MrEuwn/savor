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


# ---- Auto-seed penuh idempoten saat cold start (data hilang di /tmp) ----
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

        # Seed penuh (tenant + meja + 7 item + aset) via ASGI — tanpa subprocess.
        # Aset di-bake ke deployment: copy assets ke backend/seed_assets saat build.
        import anyio

        from httpx import ASGITransport, AsyncClient

        from seed_core import seed_base_url

        async def _do_seed() -> None:
            transport = ASGITransport(app=app, client=("127.0.0.1", 3000))
            async with AsyncClient(transport=transport, base_url="http://local") as c:
                seed_base_url("http://local", client=c)

        # Vercel runtime sudah menjalankan event loop di thread ini —
        # anyio.run() akan gagal "Already running asyncio". Deteksi & pakai
        # loop yang ada; kalau tidak ada (lokal sinkron), buat sendiri.
        import asyncio

        try:
            asyncio.get_running_loop()
        except RuntimeError:
            anyio.run(_do_seed)
        else:
            asyncio.get_event_loop().run_until_complete(_do_seed())
        print("[seed] data demo penuh dibuat (tenant/meja/menu/aset)", flush=True)
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
