# MejaAR

Menu restoran dengan AR: pelanggan scan QR di meja, melihat porsi makanan dalam
3D/AR langsung di browser HP, tanpa instal aplikasi. Tujuan: mengurangi
pesanan berlebih dan sisa makanan (SDG 12.3). Proyek UINIC 8.0 WebDev.

Alur aset 3D ("replay mode"): kreator/company scan objek asli dengan iPhone
LiDAR (Polycam/KIRI Engine) lalu **upload GLB** melalui dashboard. Pelanggan
cukup melihat hasilnya di meja via AR.

## Link demo

- Demo online: _(diisi saat deploy T12)_
- Demo lokal: front http://localhost:3000 . API http://localhost:8000/docs

## Akun demo

| Peran | Email | Password |
|---|---|---|
| Pemilik restoran | `demo@mejaar.id` | `MejaAR-2026!` |

(Tombol autofill "Gunakan akun demo" tersedia di halaman login.)
Tenant demo: slug `meja-aresto`, meja `T-01`/`T-02`, 9 item menu (3 di antaranya
bermodel 3D + 4 foto makanan Indonesia berlisensi CC - lihat `docs/ASSETS.md`).

## Menjalankan lokal

**Cara termudah (Windows):** double-click **`start.bat`** di root repo.
Script otomatis: cek & install Node.js + uv (via winget) → install dependencies
→ seed DB demo → nyalakan backend + frontend → tunggu keduanya siap → buka
browser. Tunnel HTTPS untuk AR di HP ikut jalan (window "MejaAR Tunnel" —
bukalah untuk melihat URL `https://xxxx.trycloudflare.com`).

Manual:

```bash
# Backend (dev: SQLite otomatis)
cd backend && uv sync && uv run uvicorn app.main:app --port 8000

# Frontend (terminal kedua)
cd frontend && npm ci && npm run dev   # http://localhost:3000

# Seed data demo (opsional, reset konten)
cd backend && uv run python seed_demo.py --api http://localhost:8000

# Simulator POS (terminal ketiga)
python pos-simulator/pos_sim.py --api http://localhost:8000 --key <API_KEY>
```

Login: `http://localhost:3000/login`. Halaman publik: `/public/meja-aresto?table=T-01`.
AR bekerja via HTTPS atau localhost; di HP pakai URL tunnel dari `start.bat`
atau URL demo online.

## Struktur

- `backend/` - FastAPI (Python 3.11, uv). API + storage aset + 35 pytest.
- `frontend/` - Next.js (App Router, TS, Tailwind, @google/model-viewer).
- `pos-simulator/` - Skrip simulasi POS (menu-sync + toggle ketersediaan).
- `tests/load/` - Skrip k6 (uji beban endpoint publik).
- `tools/` - cloudflared.exe (tunnel HTTPS untuk AR di HP via start.bat).
- `start.bat` / `stop.bat` - Jalankan/hentikan semua layanan sekali double-click.
- `docs/` - PRD.md, ARCHITECTURE.md, API.md, TEST_REPORT.md, USER_GUIDE.md,
  DECISIONS.md, ASSETS.md, BACKLOG.md.
- `docker-compose.yml` - Postgres + Redis (prod/verify).

## Tes

```bash
cd backend && uv run pytest -q          # 35 passed
cd backend && uv run ruff check .       # clean
k6 run tests/load/public_menu.js        # p95 ~100 ms (target < 300 ms)
```

Lighthouse (halaman publik, production build): Performance 96 - Accessibility 100 -
Best Practices 96 - SEO 100. Detail dan cara mengulang: `docs/TEST_REPORT.md`.

## Dokumentasi

- Arsitektur & keputusan: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- API: `docs/API.md` dan Swagger di `/docs`
- Panduan pemakaian: `docs/USER_GUIDE.md`
