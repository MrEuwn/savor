"""Seed data demo MejaAR (T11).

Lakukan terhadap backend yang berjalan (default http://localhost:8000):
    python seed_demo.py --api http://localhost:8000

Membuat:
- tenant demo (slug meja-aresto, email demo@mejaar.id / password MejaAR-2026!)
- meja T-01 dan T-02
- 4 menu foto (idi) + 3 menu GLB (jika ada di frontend/public/assets)
- satu item ditandai habis (demo badge)
- API key demo (ditampilkan sekali)

Halaman publik: http://localhost:3000/public/meja-aresto?table=T-01
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import httpx


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=os.environ.get("MEJAAR_API", "http://localhost:8000"))
    ap.add_argument("--assets", default=None, type=Path)
    args = ap.parse_args()
    api = args.api.rstrip("/")

    client = httpx.Client(base_url=api, timeout=120)

    email, password = "demo@mejaar.id", "MejaAR-2026!"
    r = client.post(f"{api}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        r = client.post(
            f"{api}/auth/register-tenant",
            json={"name": "Meja Aresto (Demo)", "email": email,
                  "password": password, "slug": "meja-aresto"},
        )
        assert r.status_code == 201, f"register gagal: {r.status_code} {r.text}"
    auth = r.json()
    slug = auth["tenant"]["slug"]
    h = {"Authorization": f"Bearer {auth['access_token']}"}
    print(f"tenant siap: {slug}")

    for code in ("T-01", "T-02"):
        client.post(f"{api}/tables", json={"code": code}, headers=h)

    assets = (args.assets
              or Path(__file__).resolve().parent.parent / "frontend" / "public" / "assets")

    def asset(name: str | None) -> Path | None:
        if not name:
            return None
        p = assets / name
        return p if p.is_file() else None

    menu: list[tuple[str, int, str, str, int | None, str | None, str | None]] = [
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

    old = client.get(f"{api}/menu-items", headers=h).json()
    for item in old:
        client.delete(f"{api}/menu-items/{item['id']}", headers=h)
    print(f"{len(old)} item lama dihapus")

    for name, price, cat, desc, kcal, photo, glb in menu:
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
        g = client.get(f"{api}/menu-items/{item['id']}", headers=h).json()
        assert g["status"] == "ready", f"{name} status={g['status']}"
        print(f"  + {name}  (foto={bool(photo_file)}, glb={bool(glb_file)})")

    items = client.get(f"{api}/menu-items", headers=h).json()
    client.patch(f"{api}/menu-items/{items[3]['id']}", json={"is_available": False}, headers=h)
    print("  Es Teh Leci -> tidak tersedia (demo badge)")

    r = client.post(f"{api}/integrations/api-keys", json={"label": "pos-demo"}, headers=h)
    print(f"\nAPI key demo (sekali tampil): {r.json()['key']}")
    print(f"URL publik:  {api}/public/{slug}/menu?table=T-01")
    print(f"Web:         http://localhost:3000/public/{slug}?table=T-01")


if __name__ == "__main__":
    main()
