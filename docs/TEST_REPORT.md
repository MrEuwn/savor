# TEST REPORT — MejaAR

Semua angka di bawah berasal dari perintah yang benar-benar dijalankan (lihat
kolom "Cara mengulang"). Tanggal pengujian: 30 Oktober 2026, mesin dev Windows 11
(CPU i5-Ultra, tanpa GPU), backend FastAPI + SQLite dev, frontend Next.js production
build (`next start`), kecuali disebut lain.

## 1. Tes otomatis (pytest)

Perintah:

```bash
cd backend && uv run pytest -q
cd backend && uv run ruff check .
```

Hasil terakhir:

- `35 passed, 1 warning in 19.28s`
- Ruff: `All checks passed!`

Cakupan tes: auth (login/register/refresh, 401/403), RBAC role, isolasi tenant A/B,
validasi upload (tipe, ukuran, magic bytes), endpoint POS (API key valid/salah),
cache invalidasi, endpoint publik, rate limit, analitik.

## 2. Uji beban k6 (endpoint publik menu)

Perintah:

```bash
k6 run tests/load/public_menu.js
# skrip: 20 VU, 30 detik, GET /public/{slug}/menu?table=T-01
# threshold PRD: p95 < 300 ms
```

Hasil (arsip: `docs/k6-output.txt`):

| Metrik | Nilai | Target PRD | Status |
|---|---|---|---|
| http_req_duration p(95) | **99.75 ms** | < 300 ms | LULUS |
| http_req_duration med | 87.3 ms | — | — |
| http_req_failed | 0.00% (0 dari 6724) | — | — |
| Iterasi | 6724 (≈223.8/s @ 20 VU) | — | — |

## 3. Lighthouse (halaman menu publik, mobile)

Perintah:

```bash
# frontend production build
npx next build && npx next start -p 3000
npx lighthouse@12 "http://localhost:3000/public/meja-aresto?table=T-01" \
  --output=json --output-path=docs/lighthouse-public.json \
  --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo
```

Hasil production build (arsip: `docs/lighthouse-public.json`):

| Kategori | Skor |
|---|---|
| Performance | **96** |
| Accessibility | **100** |
| Best Practices | **96** |
| SEO | **100** |

Metrik inti: FCP 1.3 s · LCP 2.7 s · TBT **80 ms** · Speed Index 1.4 s · Total byte **293 KiB**.

Catatan optimasi yang dilakukan agar mencapai angka di atas:
`three.js`/model-viewer tidak lagi termuat untuk semua kartu menu sekaligus —
viewer di-import dinamis saat kartu masuk viewport (IntersectionObserver),
poster 2D tampil lebih dulu. Sebelum perubahan (mode dev): perf 47, TBT 5240 ms,
total 6636 KiB.

## 4. Uji fungsional manual (E2E)

Perintah: langkah manual di bawah; semua diperiksa HTTP 200 + isi respons.

| # | Skenario | Hasil |
|---|---|---|
| 1 | Login dashboard (JWT) | 200, access+refresh token |
| 2 | Tambah menu + upload foto (WebP) & GLB | 200, magic bytes divalidasi |
| 3 | Halaman publik tanpa login (`/public/{slug}?table=`) | 200 |
| 4 | QR tampil di dashboard | Terverifikasi Playwright + decode OpenCV → URL benar |
| 5 | Simulator POS: menu-sync + toggle availability | perubahan terlihat di menu publik (cache ter-invalidasi) |
| 6 | API key salah | ditolak (401/403) |
| 7 | GLB tersaji via origin Next (rewrite `/assets`) | 200, magic `glTF` |
| 8 | Menu publik saat item habis | badge "Sementara Habis" tampil |

## 5. Header keamanan (OWASP baseline)

Perintah: `curl -D - http://localhost:8000/healthz`

```
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(self), microphone=(), geolocation=()
```

 Ditambahkan pada pemeriksaan akhir; CORS tetap allow-list origin.

## 6. Yang BELUM diukur (jujur, jangan diklaim)

- OWASP ZAP baseline scan: belum dijalankan.
- UAT 5–10 responden: belum dilakukan (menghadang waktu lomba).
- AR nyata on-device (Quick Look / Scene Viewer) diuji manual di HP, bukan
  dalam pengukuran otomatis; fallback 2D terverifikasi otomatis.

## Cara mengulang seluruh pengujian

```bash
# backend
cd backend && uv run pytest -q && uv run ruff check .

# load test
k6 run tests/load/public_menu.js

# lighthouse (frontend production)
cd frontend && npx next build && npx next start -p 3000 &
npx lighthouse@12 "http://localhost:3000/public/meja-aresto?table=T-01" \
  --output=json --output-path=docs/lighthouse-public.json \
  --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo
```
