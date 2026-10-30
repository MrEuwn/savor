"""Seed inti SAVOR — dipakai CLI (seed_demo.py) maupun Vercel cold start.

seed_base_url(api) menjalankan seluruh seeding lewat HTTP ke backend yang
sedang hidup; idempoten (aman diulang).
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx

DEMO_EMAIL = "demo@savor.id"
DEMO_PASSWORD = "SAVOR-2026!"
DEMO_SLUG = "meja-aresto"
DEMO_NAME = "SAVOR Aresto (Demo)"

DEFAULT_ASSETS = Path(__file__).resolve().parent.parent / "frontend" / "public" / "assets"

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


def seed_base_url(api: str, assets_dir: Path | None = None, client=None) -> None:
    """Seed seluruh data demo ke backend yang hidup di `api` (base URL)."""
    api = api.rstrip("/")
    if client is None:
        client = httpx.Client(base_url=api, timeout=120)

    email, password = DEMO_EMAIL, DEMO_PASSWORD
    r = client.post(f"{api}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        r = client.post(
            f"{api}/auth/register-tenant",
            json={"name": DEMO_NAME, "email": email,
                  "password": password, "slug": DEMO_SLUG},
        )
        assert r.status_code == 201, f"register gagal: {r.status_code} {r.text}"
    auth = r.json()
    slug = auth["tenant"]["slug"]
    h = {"Authorization": f"Bearer {auth['access_token']}"}

    for code in ("T-01", "T-02"):
        client.post(f"{api}/tables", json={"code": code}, headers=h)

    assets = assets_dir or DEFAULT_ASSETS

    def asset(name: str | None) -> Path | None:
        if not name:
            return None
        p = assets / name
        return p if p.is_file() else None

    old = client.get(f"{api}/menu-items", headers=h).json()
    for item in old:
        client.delete(f"{api}/menu-items/{item['id']}", headers=h)

    for name, price, cat, desc, kcal, photo, glb in MENU:
        r = client.post(
            f"{api}/menu-items",
            json={"name": name, "description": desc, "price": price,
                  "category": cat, "calories_kcal": kcal, "is_available": True},
            headers=h,
        )
        assert r.status_code == 201, f"{name}: {r.status_code} {r.text}"
        item = r.json()
        photo_file, glb_file = asset(photo), asset(glb)
        if photo_file:
            up = client.post(f"{api}/menu-items/{item['id']}/assets", data={"kind": "image"},
                             files={"file": (photo_file.name, photo_file.read_bytes(),
                                             "application/octet-stream")}, headers=h)
            assert up.status_code == 200, f"{name} foto: {up.status_code} {up.text}"
        if glb_file:
            up = client.post(f"{api}/menu-items/{item['id']}/assets", data={"kind": "glb"},
                             files={"file": (glb_file.name, glb_file.read_bytes(),
                                             "model/gltf-binary")}, headers=h)
            assert up.status_code == 200, f"{name} glb: {up.status_code} {up.text}"

    items = client.get(f"{api}/menu-items", headers=h).json()
    if len(items) > 3:
        client.patch(f"{api}/menu-items/{items[3]['id']}", json={"is_available": False}, headers=h)


def main_cli() -> None:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=os.environ.get("SAVOR_API", "http://localhost:8000"))
    ap.add_argument("--assets", default=None, type=Path)
    args = ap.parse_args()
    seed_base_url(args.api, args.assets)
    print(f"Seed selesai. URL publik: {args.api.rstrip('/')}/public/{DEMO_SLUG}/menu?table=T-01")


if __name__ == "__main__":
    main_cli()
