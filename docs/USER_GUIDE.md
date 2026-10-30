# USER GUIDE — MejaAR

Panduan penggunaan MejaAR untuk demo dan pemakaian nyata.

## Peran

| Peran | Apa yang dilakukan |
|---|---|
| Pemilik restoran (owner) | Kelola menu, upload 3D/foto, lihat statistik, buat QR meja & API key |
| Staf/kasir | Login, ubah ketersediaan menu (via POS atau dashboard) |
| Pelanggan | Scan QR di meja, lihat menu 3D/AR — **tanpa login, tanpa instal** |

## 1. Masuk sebagai pemilik (demo)

1. Buka `/login`.
2. Klik tombol **"Gunakan akun demo"** (mengisi otomatis) atau isi manual:
   - Email: `demo@mejaar.id`
   - Password: `MejaAR-2026!`
3. Klik **Masuk** → dashboard terbuka.

Untuk akun restoran sendiri, pilih tab **Daftar**, isi nama usaha + email + password.

## 2. Mengelola menu

Di dashboard:

1. **Ringkasan** — jumlah view & AR launch per item (event publik, tanpa data pribadi).
2. **Menu** — klik form "Tambah menu": nama, deskripsi, harga (Rp), kategori, kalori (opsional).
3. Untuk tiap item, unggah aset:
   - **Foto** (JPG/PNG/WebP, maks 2 MB) — tampil sebagai poster/fallback 2D.
   - **Model GLB** (maks 3 MB) — tampil sebagai 3D, bisa dibuka di AR.
4. Toggle **ketersediaan** per item — item habis otomatis diberi badge
   "Sementara Habis" di menu pelanggan.

## 3. Meja & QR

1. Buka bagian **Tabel**, tambah kode meja (mis. `T-01`, `T-02`).
2. QR per meja tampil otomatis. QR membuka `/{slug}/public?table={kode}`.
3. Cetak/templ QR di meja (tangkap layar atau klik kanan → save gambar).

## 4. Pengalaman pelanggan

1. Scan QR di meja (atau buka link menu publik).
2. Halaman menampilkan menu: foto, harga, deskripsi, badge ketersediaan.
3. Item dengan model 3D punya tombol **"Lihat di Meja (AR)"**.
4. Ketuk tombolnya → kamera terbuka → arahkan ke permukaan meja → porsi
   makanan muncul 1:1 di meja (Android: Scene Viewer; iOS: AR Quick Look).
5. Bila AR/perangkat tidak didukung → foto 2D otomatis tampil sebagai gantinya.

Catatan: tombol AR hanya aktif lewat **HTTPS** (atau localhost). Di jaringan
HTTP biasa, 3D tetap bisa diputar manual.

## 5. Integrasi POS (untuk developer/kasir sistem)

1. Dashboard bagian **Integrasi** → buat API key (key ditampilkan **satu kali**,
   simpan di POS).
2. POS mengirim sinkronisasi dengan header `X-MejaAR-Key`:

```
POST /pos/menu-sync                        # sinkron daftar menu
PATCH /pos/items/{external_id}/availability  # set habis/tersedia
```

3. Perubahan stok langsung terlihat di menu pelanggan (cache di-invalidasi).
4. Simulator POS contoh: `python pos-simulator/pos_sim.py --api http://localhost:8000 --key <KEY>`.

Dokumentasi endpoint lengkap: `/docs` (OpenAPI/Swagger) dan `docs/API.md`.

## 6. Pemecahan masalah

| Gejala | Sebab & solusi |
|---|---|
| Tombol AR nonaktif, tulisan "AR butuh HTTPS" | Buka via HTTPS (URL demo online / tunnel), atau localhost di laptop |
| 3D gagal dimuat | Pastikan file GLB ≤ 3 MB & valid; foto 2D tetap tampil sebagai fallback |
| QR tidak muncul di dashboard | Refresh halaman; jika masih, cek Console (Ctrl+Shift+I) |
| Login gagal "Failed to fetch" | Backend belum jalan: `uv run uvicorn app.main:app --port 8000` |
| Lupa password akun demo | Jalankan ulang `python seed_demo.py --api http://localhost:8000` |
