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
BACKEND = os.path.dirname(os.path.abspath(__file__))
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

        # Seed langsung ke DB + storage. Logika inline (satu file) supaya
        # ikut ter-bundle walau Vercel analyzer tidak mengikut sibling module.
        from datetime import datetime, timezone
        from pathlib import Path

        from argon2 import PasswordHasher

        from app.db import Base, engine

        Base.metadata.create_all(bind=engine)

        API_DIR = Path(__file__).resolve().parent
        asset_dir = API_DIR / "seed_assets"

        MENU: list[tuple[str, int, str, str, int | None, str | None, str | None]] = [
            ("Nasi Goreng Goyang", 28000, "Makanan", "Nasi goreng telur, kecap, bakso kecil.", 650, "nasi-goreng.webp", None),
            ("Soto Ayam Daging", 22000, "Makanan", "Soto bening, suwiran ayam, sambal.", 420, "soto.webp", None),
            ("Bakso Urat Jumbo", 25000, "Makanan", "6 bakso urat, mi kuning, bawang goreng.", 510, "bakso.webp", None),
            ("Es Teh Leci", 8000, "Minuman", "Teh manis dingin, leci impor.", 120, "es-teh.webp", None),
            ("Burger Beef Klasik", 42000, "Makanan", "Burger beef + keju, lihat ukuran di AR.", 780, None, "burger.glb"),
            ("Sushi Set 8 Pcs", 55000, "Makanan", "Set 8 pcs: salmon, tuna, california.", 390, None, "sushi.glb"),
            ("Croissant Butter", 24000, "Camilan", "Croissant mentega baru dipanggang.", 310, None, "croissant.glb"),
        ]

        db = SessionLocal()
        try:
            tenant = models.Tenant(slug="meja-aresto", name="SAVOR Aresto (Demo)",
                                   created_at=datetime.now(timezone.utc))
            db.add(tenant)
            db.flush()

            ph = PasswordHasher()
            db.add(models.User(tenant_id=tenant.id, email="demo@savor.id",
                               password_hash=ph.hash("SAVOR-2026!"), role="tenant_owner"))
            for code in ("T-01", "T-02"):
                db.add(models.TableCode(tenant_id=tenant.id, code=code))

            storage_root = Path(os.environ.get("STORAGE_LOCAL_DIR", "/tmp/storage"))
            made = []
            for name, price, cat, desc, kcal, photo, glb in MENU:
                item = models.MenuItem(
                    tenant_id=tenant.id, name=name, description=desc, price=price,
                    category=cat, calories_kcal=kcal, is_available=True, status="ready",
                )
                db.add(item)
                db.flush()
                made.append(item)
                for kind, fname, prefix in (("image", photo, "img"), ("glb", glb, "glb")):
                    if not fname:
                        continue
                    src = asset_dir / fname
                    if not src.is_file():
                        continue
                    data = src.read_bytes()
                    sub = storage_root / f"t{tenant.id}" / str(item.id)
                    sub.mkdir(parents=True, exist_ok=True)
                    dst = f"{prefix}_{fname}"
                    (sub / dst).write_bytes(data)
                    key = f"t{tenant.id}/{item.id}/{dst}"
                    if kind == "image":
                        item.image_key = key
                    else:
                        item.glb_key = key
            if len(made) > 3:
                made[3].is_available = False
            db.commit()
            print(f"[seed] OK tenant={tenant.id} item={len(made)}", flush=True)
        finally:
            db.close()
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
