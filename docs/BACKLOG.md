# SAVOR - Backlog (kerjakan berurutan; centang setelah terverifikasi)

Sumber: docs/PRD.md bagian 3/5. Deviasi keputusan: docs/DECISIONS.md.

## P0
- [ ] T0 Inisialisasi repo, struktur folder, docker-compose, .env.example, README, CI
- [ ] T1 Backend dasar: config, koneksi DB (SQLite dev / Postgres prod via DATABASE_URL), Alembic, /healthz, /readyz, format error
- [ ] T2 Model data + migrasi (PRD bagian 8)
- [ ] T3 Auth: register-tenant, login, refresh, RBAC, hashing argon2, rate limit /auth/login
- [ ] T4 CRUD menu-items dengan isolasi tenant (repository filter tenant_id + tes A/B)
- [ ] T5 Upload aset (foto JPG/PNG/WebP, GLB) validasi MIME + magic bytes + ukuran (GLB <=3MB, gambar <=2MB), gltfpack compact, signed URL (local: direktori statis)
- [ ] T6 Endpoint publik per slug + cache + POST /public/events (rate limit)
- [ ] T7 API key per tenant (dihash sha256) + endpoint POS menu-sync/availability + invalidasi cache
- [ ] T8 Frontend: login/register, dashboard ringkasan, form menu + upload aset + status
- [ ] T9 Frontend: halaman menu publik mobile-first, <model-viewer> AR + fallback 2D, tombol Lihat di Meja
- [ ] T10 Halaman integrasi (API key, webhook endpoint) + cetak QR per table code (QR -> /public/{slug}?table={code})
- [ ] T11 Seed data demo + pos-simulator (skrip klik: toggle availability + sync 1 item)
- [ ] T12 Deploy online (Vercel + Supabase + Render) - butuh kredensial user
- [ ] T13 Dokumentasi: ARCHITECTURE.md (diagram + keputusan), API.md, USER_GUIDE.md, README final
- [ ] T14 Pengujian: pytest hijau, Lighthouse public page, k6 skala kecil (binary lokal), TEST_REPORT.md hasil asli + perintah ulang

## P1 (hanya jika seluruh P0 online + hijau)
- [ ] T15 Webhook keluar HMAC
- [ ] T16 Pipeline asinkron foto: hapus background (rembg) + crop + status job
- [ ] T18 Redis + antrean worker (P1 di PRD)

## P2 (roadmap, tidak dikerjakan)
- [ ] T17 Estimasi nutrisi on-device (ONNX Runtime Web + model lisensi permisif; YOLO AGPL perlu dicatat)
- [ ] F13 Rekonstruksi 3D otomatis dari foto (scan iPhone LiDAR upload manual = alur yang dipakai)
