# MejaAR - Keputusan & Deviasi

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
