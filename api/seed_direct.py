"""Seed inti SAVOR — mode HTTP (CLI) & mode langsung-DB (serverless).

- seed_base_url(api): via HTTP ke backend hidup (CLI seed_demo).
- seed_direct()     : tulis langsung ke DB + storage (dipakai Vercel cold
                      start, tempat spawn HTTP/thread dibatasi).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

DEMO_EMAIL = "demo@savor.id"
DEMO_PASSWORD = "SAVOR-2026!"
DEMO_SLUG = "meja-aresto"
DEMO_NAME = "SAVOR Aresto (Demo)"

DEFAULT_ASSETS = Path(__file__).resolve().parent / "seed_assets"

MENU: list[tuple[str, int, str, str, int | None, str | None, str | None]] = [
    ("Nasi Goreng Goyang", 28000, "Makanan", "Nasi goreng telur, kecap, bakso kecil.", 650,
     "nasi-goreng.webp", None),
    ("Soto Ayam Daging", 22000, "Makanan", "Soto bening, suwiran ayam, sambal.", 420,
     "soto.webp", None),
    ("Bakso Urat Jumbo", 25000, "Makanan", "6 bakso urat, mi kuning, bawang goreng.", 510,
     "bakso.webp", None),
    ("Es Teh Leci", 8000, "Minuman", "Teh manis dingin, leci impor.", 120,
     "es-teh.webp", None),
    ("Burger Beef Klasik", 42000, "Makanan", "Burger beef + keju, lihat ukuran di AR.", 780,
     None, "burger.glb"),
    ("Sushi Set 8 Pcs", 55000, "Makanan", "Set 8 pcs: salmon, tuna, california.", 390,
     None, "sushi.glb"),
    ("Croissant Butter", 24000, "Camilan", "Croissant mentega baru dipanggang.", 310,
     None, "croissant.glb"),
]


def _magic_ok(data: bytes, kind: str) -> bool:
    if kind == "image":
        return data[:3] == b"\xff\xd8\xff" or data[:4] == b"RIFF" or data[:8] == b"\x89PNG\r\n\x1a\n"
    return data[:4] == b"glTF"


def seed_direct() -> None:
    """ Tulis tenant/user/meja/menu/aset langsung ke DB + storage lokal."""
    # Import di dalam fungsi: path sys sudah disiapkan pemanggil.
    from argon2 import PasswordHasher

    from app import models
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        tenant = models.Tenant(slug=DEMO_SLUG, name=DEMO_NAME,
                               created_at=datetime.now(timezone.utc))
        db.add(tenant)
        db.flush()

        ph = PasswordHasher()
        db.add(models.User(tenant_id=tenant.id, email=DEMO_EMAIL,
                           password_hash=ph.hash(DEMO_PASSWORD), role="tenant_owner"))

        for code in ("T-01", "T-02"):
            db.add(models.TableCode(tenant_id=tenant.id, code=code))

        storage_root = Path(os.environ.get("STORAGE_LOCAL_DIR", "/tmp/storage"))
        asset_dir = DEFAULT_ASSETS

        made: list[models.MenuItem] = []
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
                if not _magic_ok(data, kind):
                    continue
                sub = storage_root / f"t{tenant.id}" / str(item.id)
                sub.mkdir(parents=True, exist_ok=True)
                dst_name = f"{prefix}_{fname}"
                (sub / dst_name).write_bytes(data)
                key = f"t{tenant.id}/{item.id}/{dst_name}"
                if kind == "image":
                    item.image_key = key
                else:
                    item.glb_key = key

        if len(made) > 3:
            made[3].is_available = False  # Es Teh Leci: demo badge "habis"

        db.commit()
        print(f"[seed] langsung OK: tenant={tenant.id}, item={len(made)}", flush=True)
    finally:
        db.close()
