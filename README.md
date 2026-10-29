# MejaAR

Menu restoran dengan AR: pelanggan scan QR di meja, melihat porsi makanan dalam
3D/AR langsung di browser HP, tanpa instal aplikasi. Tujuan: mengurangi
pesanan berlebih dan sisa makanan (SDG 12.3).

Alur aset 3D ("replay mode"): kreator/company scan objek asli dengan iPhone
LiDAR (Polycam/KIRI Engine) lalu **upload GLB** melalui dashboard. Pelanggan
cukup melihat hasilnya di meja via AR.

## Struktur

- `backend/` — FastAPI (Python 3.11, uv). API + storage aset.
- `frontend/` — Next.js (App Router, TS, Tailwind, @google/model-viewer).
- `pos-simulator/` — Skrip simulasi POS (menu-sync + toggle ketersediaan).
- `docs/` — PRD.md, BACKLOG.md, ARCHITECTURE.md, API.md, TEST_REPORT.md, DECISIONS.md, USER_GUIDE.md.
- `docker-compose.yml` — Postgres + Redis (prod/verify).

## Menjalankan lokal

```bash
# Backend (dev: SQLite otomatis)
cd backend && uv sync && uv run pytest -q && uv run uvicorn app.main:app --port 8000

# Frontend
cd frontend && npm ci && npm run dev   # http://localhost:3000
```

Registrasi tenant: http://localhost:3000/login → daftar → upload menu + GLB.
Halaman publik: `/public/{slug}` (QR per meja menambah `?table={code}`).

## Demo

Deploy online: (diisi saat T12)

## Tes

```bash
cd backend && uv run pytest -q
```

Report hasil penuh: `docs/TEST_REPORT.md`.
