# MejaAR

Menu restoran dengan AR: pelanggan scan QR di meja, melihat porsi makanan dalam
3D/AR langsung di browser HP, tanpa instal aplikasi. Tujuan: mengurangi
pesanan berlebih dan sisa makanan (SDG 12.3). Proyek UINIC 8.0 WebDev.

Alur aset 3D ("replay mode"): kreator/company scan objek asli dengan iPhone
LiDAR (Polycam/KIRI Engine) lalu **upload GLB** melalui dashboard. Pelanggan
cukup melihat hasilnya di meja via AR.

---

## 🚀 Cara Menjalankan (3 langkah, tanpa install manual)

> Prasyarat: Windows 10/11. Letakkan repo/zip di folder mana pun lalu:

### 1. Download project

```bash
git clone https://github.com/MrEuwn/mejaar.git
cd mejaar
```
(atau tekan tombol hijau **Code → Download ZIP** lalu extract)

### 2. Double-click `start.bat`

Script akan otomatis:
- cek & install **Node.js** dan **uv** (via winget, tanpa sentuhan manual)
- install dependencies backend + frontend (hanya pertama kali, ±3 menit)
- seed database demo (3 model 3D + menu makanan Indonesia + 2 meja)
- nyalakan **backend :8000** dan **frontend :3000**
- nyalakan **tunnel HTTPS** untuk AR di HP (window "MejaAR Tunnel")
- tunggu semua benar-benar siap (health check) → **browser terbuka sendiri**

> Kalau muncul "TUTUP jendela lalu double-click lagi": itu normal (PATH
> baru terbaca setelah install Node/uv pertama kali). Tutup, buka lagi.

### 3. Buka aplikasi

| URL | Isi |
|---|---|
| `http://localhost:3000/login` | Dashboard pemilik — klik tombol **"Gunakan akun demo"** |
| `http://localhost:3000/public/meja-aresto?table=T-01` | Menu publik pelanggan |
| Window **"MejaAR Tunnel"** | URL `https://xxxx.trycloudflare.com` — buka dari HP untuk **AR** |

** akun demo: `demo@mejaar.id` / `MejaAR-2026!`**

### Menghentikan

Double-click `stop.bat` (mematikan backend + frontend + tunnel sekaligus).

---

## 🔗 QR + AR (alur inti)

1. Login dashboard → bagian **Tabel** → QR per meja tampil (bisa di-print).
2. Pelanggan scan QR → menu publik (tanpa login, tanpa instal).
3. Item 3D → tombol **"Lihat di Meja (AR)"** → kamera buka → porsi muncul
   1:1 di meja (Android: Scene Viewer; iOS: AR Quick Look).
4. Tanpa AR? Foto 2D otomatis jadi fallback.

## 🧑‍🍳 Integrasi POS

1. Dashboard → **Integrasi** → buat API key (tampil sekali, salin).
2. POS kirim sinkronisasi dengan header `X-MejaAR-Key`:

```
POST /pos/menu-sync
PATCH /pos/items/{external_id}/availability
```

3. Simulator: `python pos-simulator/pos_sim.py --api http://localhost:8000 --key <KEY>`

Dokumentasi lengkap: Swagger di `/docs` atau `docs/API.md`.

---

## 📂 Struktur

```
backend/         FastAPI (Python 3.11, uv) - API + storage + 35 pytest
frontend/        Next.js (App Router, TS, Tailwind, @google/model-viewer)
pos-simulator/   Simulasi POS (menu-sync + toggle ketersediaan)
tests/load/      Skrip k6 (uji beban)
tools/           cloudflared.exe (tunnel HTTPS untuk AR di HP)
start.bat        Jalankan semua layanan (double-click)
stop.bat         Hentikan semua layanan (double-click)
docs/            PRD, ARCHITECTURE, API, TEST_REPORT, USER_GUIDE,
                 DECISIONS, ASSETS, BACKLOG
docker-compose.yml   Postgres + Redis (prod/verify)
```

## ✅ Hasil pengujian

| Uji | Hasil | Target |
|---|---|---|
| pytest | 35 passed | semua hijau |
| ruff lint | clean | — |
| k6 (20 VU / 30s) | p95 **99.75 ms** | < 300 ms |
| Lighthouse | Perf 96 · A11y 100 · BP 96 · SEO 100 | mobile-first |

Detail + cara mengulang: `docs/TEST_REPORT.md`.

## 📚 Dokumentasi

| Dokumen | Isi |
|---|---|
| `docs/PRD.md` | Product requirements (UINIC 8.0) |
| `docs/ARCHITECTURE.md` | Diagram + keputusan teknis |
| `docs/DECISIONS.md` | Deviasi dari PRD + alasannya |
| `docs/API.md` | Endpoint & contoh request |
| `docs/USER_GUIDE.md` | Panduan pemakaian per peran |
| `docs/ASSETS.md` | Attribution aset 3D & foto (CC) |
| `docs/TEST_REPORT.md` | Bukti pengujian + cara mengulang |

## 📄 Link demo online

_(diisi saat deploy T12)_

## Lisensi aset

Model 3D & foto makanan memakai sumber berlisensi terbuka (CC0/CC BY) —
kredit lengkap di `docs/ASSETS.md`.
