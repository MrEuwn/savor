"""Simulator POS (T11).

Sintaks:
    python pos_sim.py --api http://localhost:8000 --key mk_mat_xxx

Langkah:
    1) sinkronisasi menu (2 item baru)
    2) matikan ketersediaan per external_id (PATCH), jeda 2 dtk
    3) hidupkan lagi
    4) ekstemal_id asing -> harus 404

Gunakan API key dari dashboard (Integrasi) atau hasil seed_demo.py.
"""
from __future__ import annotations

import argparse
import time

import httpx

ITEMS = [
    {"external_id": "POS-SOTO-01", "name": "Soto Ayam (POS)", "price": 22000,
     "category": "Makanan", "is_available": True, "description": "Dari simulator POS."},
    {"external_id": "POS-NASI-01", "name": "Nasi Campur (POS)", "price": 30000,
     "category": "Makanan", "is_available": True, "description": "Dari simulator POS."},
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--key", required=True, help="API key tenant (X-SAVOR-Key)")
    args = ap.parse_args()
    api = args.api.rstrip("/")
    client = httpx.Client(base_url=api)
    kh = {"X-SAVOR-Key": args.key}

    r = client.post(f"{api}/pos/menu-sync", json={"items": ITEMS}, headers=kh)
    print("sync:", r.status_code, r.json())
    assert r.status_code == 200

    for ext in ("POS-SOTO-01", "POS-NASI-01"):
        r = client.patch(f"{api}/pos/items/{ext}/availability",
                         json={"is_available": False}, headers=kh)
        print(f"off {ext}:", r.status_code, r.json())
        time.sleep(2)
        r = client.patch(f"{api}/pos/items/{ext}/availability",
                         json={"is_available": True}, headers=kh)
        print(f"on  {ext}:", r.status_code, r.json())

    r = client.patch(f"{api}/pos/items/POS-TIDAK-ADA/availability",
                     json={"is_available": True}, headers=kh)
    print("id asing (harus 404):", r.status_code)


if __name__ == "__main__":
    main()
