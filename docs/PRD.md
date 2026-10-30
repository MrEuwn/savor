# SAVOR - Product Requirements Document

Dokumen spesifikasi produk untuk UINIC 8.0 Web Development Competition (subtema Lingkungan).

1. Ringkasan produk
SAVOR adalah platform SaaS multi-tenant untuk restoran. Pelanggan scan QR di meja,
lalu melihat porsi makanan dalam 3D/AR langsung dari browser HP tanpa instal aplikasi.
Data menu terhubung ke POS restoran lewat API. Tujuannya mengurangi pesanan berlebih
dan sisa makanan (SDG 12.3).
Tema lomba: Engineering Interconnected Web Solutions to Empower Digital
Ecosystems.
Subtema terpilih: Lingkungan (food waste). AI dan Kesehatan hanya fitur pendukung.
Nilai jual engineering: arsitektur modular, API-first, aset 3D ringan via CDN, keamanan
berlapis, dan degradasi yang anggun saat AR atau layanan lain gagal.
2. Kriteria penilaian penyisihan dan cara memenuhinya
3. Tujuan dan non-tujuan
Tujuan:
1. Pelanggan melihat porsi nyata sebelum memesan lewat AR di browser.
2. Restoran mengelola menu dan aset 3D lewat dashboard dan API.
3. Sistem POS pihak ketiga bisa sinkron lewat API key dan webhook.
4. Sistem tetap melayani saat lonjakan traffic (CDN, cache, aset ringan).
Non-tujuan (jangan dikerjakan agen):
Membuat POS lengkap atau pembayaran.
Klaim medis atau diet. Estimasi nutrisi hanya informasi umum.
Aplikasi native.
Rekonstruksi 3D otomatis penuh pada MVP. MVP memakai upload GLB manual.
Kriteria Bobot Cara dipenuhi
Inovasi dan relevansi solusi 30% Menu AR terhubung POS, fokus food waste,
tabel pembanding dengan platform sejenis
Kesesuaian kebutuhan
pengguna
20% Persona, user flow logis, UAT kecil
Kualitas teknis dan
fungsionalitas
20% Validasi input, autentikasi, isolasi tenant, kode
modular, tes otomatis
Kualitas UI/UX 15% Mobile-first, aksesibel, fallback 2D, desain
konsisten
Dokumentasi dan kelengkapan 15% README, ARCHITECTURE, API, TEST_REPORT,
panduan penggunaan
4. Persona
5. Ruang lingkup dan prioritas
Persona Kebutuhan Pain point
Pemilik restoran
(tenant owner)
Menu menarik, data minat
pelanggan, integrasi ke POS
Pesanan tidak sesuai ekspektasi,
makanan terbuang
Pelanggan Tahu ukuran porsi sebelum
pesan
Foto menu tidak mewakili porsi
asli
Staf atau kasir Stok habis tercermin otomatis
di menu
Input ganda di POS dan menu
Admin platform Mengelola tenant dan
memantau kesehatan sistem
Penyalahgunaan dan downtime
ID Fitur Prioritas
F1 Registrasi tenant, login, JWT access dan refresh,
RBAC
P0
F2 CRUD menu, upload foto dan GLB dengan validasi
tipe dan ukuran
P0
F3 Halaman menu publik per tenant lewat QR (slug
dan kode meja), model-viewer AR, fallback gambar
2D
P0
F4 API integrasi POS dengan API key per tenant:
sinkron menu dan ketersediaan, dokumentasi
OpenAPI
P0
F5 Dashboard dasar: daftar menu, jumlah view, jumlah
AR launch
P0
F6 Keamanan baseline, health check, rate limiting, CI P0
F7 Deploy online, seed data demo, simulator POS P0
F8 Webhook keluar bertanda tangan HMAC P1
Aturan jujur: fitur yang belum berjalan dan teruji ditulis sebagai roadmap di proposal,
bukan sebagai fitur.
6. User stories dan acceptance criteria (P0)
US1 Registrasi dan login. Sebagai pemilik, saya mendaftarkan restoran dan login.
Diterima jika: password di-hash, token kedaluwarsa dan bisa di-refresh, akses endpoint
tenant tanpa token ditolak 401, role yang salah ditolak 403.
US2 Kelola menu. Sebagai pemilik, saya menambah menu dengan foto dan GLB.
Diterima jika: hanya JPG/PNG/WebP dan GLB yang diterima, ukuran dibatasi, nama file
disanitasi, dan tenant A tidak bisa melihat atau mengubah data tenant B.
US3 Lihat menu di meja. Sebagai pelanggan, saya scan QR dan melihat menu. Diterima
jika: halaman publik memuat tanpa login, tombol AR muncul bila perangkat mendukung,
dan gambar 2D tampil otomatis bila AR atau WebGL tidak tersedia.
US4 Sinkron POS. Sebagai sistem POS, saya mengirim pembaruan stok. Diterima jika:
request dengan API key valid mengubah ketersediaan, key tidak valid ditolak, dan
perubahan terlihat di menu publik dalam waktu singkat (cache di-invalidasi).
US5 Dashboard. Sebagai pemilik, saya melihat jumlah view dan AR launch per menu.
Diterima jika: event publik dibatasi laju dan tidak memuat data pribadi.
US6 Ketahanan. Sebagai operator, saya memantau layanan. Diterima jika: /healthz
dan /readyz  tersedia, dan frontend tetap menampilkan menu 2D bila API aset gagal.
7. Arsitektur dan keputusan teknis (terkunci)
Agen tidak boleh mengganti pilihan ini tanpa mencatat alasannya di docs/DECISIONS.md .
ID Fitur Prioritas
F9 Pipeline asinkron: foto lalu hapus background dan
crop lalu aset siap, dengan status job
P1
F10 Antrean Redis dan worker terpisah P1
F11 Kompresi GLB (Draco) di pipeline P1
F12 Estimasi nutrisi on-device (ONNX Runtime Web,
YOLO nano) untuk menu terdaftar
P2
F13 Rekonstruksi 3D otomatis dari foto P2
Catatan lisensi: YOLOv8 dari Ultralytics berlisensi AGPL-3.0. Tulis ini di batasan produk
dan siapkan alternatif berlisensi permisif.
Diagram high-level (tempatkan di docs/ARCHITECTURE.md ):
Lapisan Pilihan Alasan
Frontend Next.js (App Router), TypeScript,
Tailwind, @google/model-viewer
AR via browser tanpa instal;
SSR/ISR untuk halaman menu
Backend FastAPI (Python 3.11), Pydantic,
SQLAlchemy, Alembic
Satu stack backend; mudah
menampung worker AI
berbahasa sama
Database PostgreSQL Relasional, sesuai penekanan
tema
Cache dan
antrean
Redis (P1), cache in-memory di P0 Mengurangi beban baca
Penyimpanan
aset
Object storage S3-compatible (misal
Cloudflare R2) dengan signed URL;
disk lokal untuk dev
Aset 3D lewat CDN, bukan
server aplikasi
Auth JWT access dan refresh, RBAC; API
key ter-hash untuk integrasi
Pemisahan akses manusia dan
mesin
Rate limiting slowapi atau setara Melindungi endpoint publik
CI GitHub Actions: lint dan test Bukti kualitas di riwayat commit
Deploy Frontend Vercel; backend container
di Render/Railway/Fly; Postgres
Neon/Supabase
Verifikasi dulu bahwa free tier
masih tersedia
AI (P1/P2) rembg atau YOLO segmentasi di
worker; ONNX Runtime Web untuk
on-device
Beban berat tidak di request
pengguna
flowchart LR
  C[Pelanggan HP] -->|scan QR| FE[Next.js]
  O[Pemilik restoran] --> FE
  FE -->|aset 3D| CDN[(Object storage + CDN)]
  FE -->|REST| API[FastAPI Core API]
  POS[POS atau simulator] -->|API key| API
  API --> DB[(PostgreSQL)]
  API --> R[(Redis)]
  API -->|job| W[AI Worker]
  W --> CDN
  API -->|webhook HMAC| POS
8. Model data
tenants : id, name, slug, created_at.
users : id, tenant_id, email, password_hash, role (platform_admin, tenant_owner,
tenant_staff).
menu_items : id, tenant_id, external_id (nullable, dari POS), name, description, price,
category, calories_kcal (nullable), is_available, image_key, glb_key, status (draft,
processing, ready, failed).
table_codes : id, tenant_id, code.
view_events : id, tenant_id, menu_item_id, ar_launched (bool), created_at. Tanpa data
pribadi.
api_keys : id, tenant_id, key_hash, label, last_used_at, revoked_at.
webhook_endpoints : id, tenant_id, url, secret_hash, events.
audit_logs : id, tenant_id, actor, action, created_at.
Semua query data tenant wajib difilter tenant_id  di lapisan repository, bukan hanya di
router.
9. Endpoint API
Grup Endpoint Akses
Auth POST /auth/register-tenant , POST
/auth/login , POST /auth/refresh
Publik, dibatasi laju
Format error seragam: { "error": { "code": "...", "message": "..." } } . Jangan
bocorkan stack trace.
10. Persyaratan non-fungsional
Angka di bawah adalah target. Agen wajib mengukur dan melaporkan hasil aktual di
docs/TEST_REPORT.md , dan tidak boleh menulis angka yang tidak diukur.
Performa aset: GLB per menu target 3 MB atau kurang setelah kompresi; gambar
poster WebP.
Performa API: endpoint publik menu dengan cache, target p95 di bawah 300 ms pada
uji k6 skala kecil. Laporkan jumlah VU dan durasi uji.
Ketahanan: fallback 2D, health check, retry idempoten pada sinkron POS.
Keamanan (peta OWASP Top 10): validasi input Pydantic, hashing password (argon2
atau bcrypt), akses tenant terisolasi, validasi upload (MIME dan magic bytes, batas
ukuran), CORS ketat, header keamanan, tanpa secret di repo, .env.example  saja.
Privasi: event analitik tanpa PII. Jika F12 dibuat, foto makanan diproses di perangkat
dan tidak dikirim ke server.
Aksesibilitas: kontras cukup, target sentuh minimal 44 px, label ARIA, alt text.
Grup Endpoint Akses
Menu GET/POST /menu-items , GET/PATCH/DELETE
/menu-items/{id} , POST /menu-
items/{id}/assets
JWT, role owner/staff
Publik GET /public/{slug}/menu , GET
/public/{slug}/menu/{id} , POST
/public/events
Publik, cache dan rate
limit
POS POST /integrations/pos/menu-sync , PATCH
/integrations/pos/items/{external_id}/availa
bility
API key
Webhook
(P1)
POST /integrations/webhooks , GET
/integrations/webhooks
JWT owner
Analitik GET /analytics/summary JWT owner
Operasional GET /healthz , GET /readyz , GET /docs Publik
11. Layar UI
1. Landing singkat dan halaman login/registrasi.
2. Dashboard: ringkasan, daftar menu, status aset.
3. Form menu dan upload aset dengan status proses.
4. Halaman menu publik mobile-first: kartu menu, tombol Lihat di Meja (AR), fallback 2D.
5. Halaman pengaturan integrasi: API key dan webhook.
6. Halaman cetak QR per meja.
Gaya: konsisten (satu palet, satu keluarga font, komponen berulang), mobile-first.
12. Pengujian dan bukti
Tes otomatis pytest : auth, RBAC, isolasi tenant, validasi upload, endpoint POS.
Lighthouse pada halaman menu publik (simpan laporan).
Uji beban k6 skala kecil (simpan skrip dan output).
Scan baseline OWASP ZAP bila sempat; jika tidak sempat, jangan klaim.
UAT: 5 sampai 10 responden dengan kuesioner singkat. Tulis jumlah responden apa
adanya.
Semua hasil masuk docs/TEST_REPORT.md  beserta perintah untuk mengulang tes.
13. Struktur repo dan dokumen wajib
/frontend        Next.js
/backend         FastAPI (app/, tests/, alembic/)
/worker          AI worker (P1)
/pos-simulator   skrip simulasi POS
/docs            PRD.md, ARCHITECTURE.md, API.md, TEST_REPORT.md, 
DECISIONS.md, USER_GUIDE.md
/docker-compose.yml  /.env.example  /README.md
README wajib memuat: deskripsi, link demo, cara menjalankan lokal, akun demo, cara
menjalankan tes.
14. Risiko dan mitigasi
15. Definition of Done
Demo online dapat dibuka dan alur US1 sampai US6 berjalan.
Repo publik, README lengkap, .env.example  ada, tidak ada secret di riwayat commit.
Tes P0 hijau di CI; TEST_REPORT.md  berisi hasil aktual.
ARCHITECTURE.md  memuat diagram dan penjelasan keputusan.
Setiap fitur di proposal berlabel selesai atau roadmap sesuai kenyataan kode.
