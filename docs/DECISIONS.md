# SAVOR - Keputusan & Deviasi

Dokumentasikan di sini setiap keputusan yang menyimpang dari pilihan terkunci di PRD
serta alasan teknisnya. Format: tanggal - keputusan - alasan.

## 2026-10-30
1. **SQLite untuk dev/localhost** (PRD: PostgreSQL). Mesin dev tidak memiliki Docker;
   SQLAlchemy + SQLAlchemy ORM sehingga sama kode jalan di kedua dialect via
   `DATABASE_URL`. docker-compose menyediakan Postgres untuk verifikasi paralel.
2. **CI tahap 1 hanya backend**; job frontend (npm ci + lint + build) ditambahkan saat T8
   agar CI hijau tercapai bertahap sesuai bukti selesai per tugas.
3. **Storage aset = local disk** (`./storage`, disajikan statis oleh FastAPI) untuk demo;
   konfigurasi S3-compatible (Cloudflare R2) sudah disiapkan di env, aktifkan saat T12.
4. **Aset 3D = upload manual GLB** (sesuai PRD bagian 5). Alur produksi: perusahaan/
   kreator scanning pakai iPhone LiDAR (Polycam/KIRI) lalu upload GLB via dashboard —
   "replay mode". Auto-rekonstruksi dari foto = F13, tetap roadmap P2.
5. **Path endpoint POS**: PRD menulis `/integrations/pos/menu-sync` & `/integrations/pos/items/{external_id}/availability`;
   implementasi memakai `/pos/menu-sync` & `/pos/items/{external_id}/availability`
   (fungsional setara, prefix lebih pendek). Semua tetap di-auth API key.
6. **URL aset relatif** (`/assets/...`) + rewrite proxy di Next instead of absolute
   base: pengunjung HP di balik tunnel/proxy menjangkau aset via origin frontend
   yang sama; tak tergantung IP host. Storage S3 tetap opsi aktif di config.
7. **Webhook keluar HMAC (F8/T15, P1) = roadmap**: CRUD endpoint
   `/integrations/webhooks` ada & terlindungi JWT, namun pengiriman event keluar
   bertanda tangan HMAC belum diimplement (tidak diklaim selesai).
8. **Halaman cetak QR terpisah** tidak dibuat; QR tersedia di dashboard per tabel
   (cukup untuk demo). Roadmap bila diminta juri.
