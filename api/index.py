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
        import subprocess

        subprocess.run(
            [sys.executable, os.path.join(BACKEND, "seed_demo.py"),
             "--api", "http://127.0.0.1:3000"],
            check=False, timeout=120,
        )
    except Exception as e:  # pragma: no cover - jangan pernah gagalkan cold start
        print(f"[seed] skipped: {e}", flush=True)


@app.on_event("startup")
def _warm() -> None:
    _seed_if_empty()


# Vercel Python runtime membaca variabel `app`
handler = app
