# ASSETS — Model 3D & Foto Makanan

Seluruh file di `frontend/public/assets/`. Tanggal unduh: 2026-10-30.
Validasi: 4 byte pertama setiap `.glb` = `glTF` (magic bytes lolos); setiap `.webp` = RIFF/WEBP.
Ukuran semua GLB dalam rentang yang diterima backend (0.2–3 MB per file).

## File

| File | Ukuran (bytes) | URL sumber (file) | Lisensi | Atribusi wajib |
|---|---|---|---|---|
| `burger.glb` | 1.407.960 | https://grab3d.com/dl/burger/burger.glb (halaman: <https://grab3d.com/models/food/burger/>) | CC0 1.0 | Tidak wajib |
| `croissant.glb` | 2.097.812 | https://ktszbzpwkjhqunhwjurq.supabase.co/storage/v1/object/public/model-media/polyhaven/croissant/croissant.glb (asal: Poly Haven, <https://polyhaven.com/a/croissant>, Greg Zaal & Dario Barresi) | CC0 1.0 | Tidak wajib |
| `sushi.glb` | 428.156 | https://www.innerscene.com/api/library/sushi-plate-original-tableware-and-food-prop-6313fb1a/download (halaman: <https://www.innerscene.com/tools/library/3d-parts/sushi-plate-original-tableware-and-food-prop-6313fb1a>) | CC0 (Public Domain) | Tidak wajib |
| `fruit-bowl.glb` | 386.644 | https://www.innerscene.com/api/library/fruit-bowl-with-fruit-original-tableware-and-food-prop-6b75ce64/download (halaman: <https://www.innerscene.com/tools/library/3d-parts/fruit-bowl-with-fruit-original-tableware-and-food-prop-6b75ce64>) | CC0 (Public Domain) | Tidak wajib |
| `nasi-goreng.webp` | 25.170 | https://upload.wikimedia.org/wikipedia/commons/9/9b/Nasi_goreng-1.JPG (halaman Commons: <https://commons.wikimedia.org/wiki/File:Nasi_goreng-1.JPG>) | CC BY-SA 3.0, Lord Mountbatten (2014) | Ya — lihat di bawah |
| `soto.webp` | 43.638 | https://upload.wikimedia.org/wikipedia/commons/6/69/Soto_Ayam_home-made.JPG (<https://commons.wikimedia.org/wiki/File:Soto_Ayam_home-made.JPG>) | CC BY-SA 3.0, Gunawan Kartapranata (2011) | Ya — lihat di bawah |
| `bakso.webp` | 30.748 | https://upload.wikimedia.org/wikipedia/commons/6/6e/Bakso_Indonesian_Meatball_Soup_from_Solo.jpg (<https://commons.wikimedia.org/wiki/File:Bakso_Indonesian_Meatball_Soup_from_Solo.jpg>) | CC0, Bajinra (2023) | Tidak wajib |
| `es-teh.webp` | 30.142 | https://upload.wikimedia.org/wikipedia/commons/6/64/Es_teh_manis.jpg (<https://commons.wikimedia.org/wiki/File:Es_teh_manis.jpg>) | CC BY 4.0, Cendy00 (2025) | Ya — lihat di bawah |

Foto: file asli diunduh dari Wikimedia Commons, dikonversi ke WebP lebar 800 px (ffmpeg, Q75).
Dimensi hasil: nasi-goreng 800×534, soto 800×744, bakso 800×450, es-teh 800×1066.

## Atribusi (cc BY-SA / CC-BY)

Lihat di footer/kredits halaman menu:

```
"Nasi goreng-1" oleh Lord Mountbatten, via Wikimedia Commons, lisensi CC BY-SA 3.0.
"Soto Ayam home-made" oleh Gunawan Kartapranata, via Wikimedia Commons, lisensi CC BY-SA 3.0.
"Es teh manis" oleh Cendy00, via Wikimedia Commons, lisensi CC BY 4.0.
```

Foto yang CC BY-SA: turunan (termasuk konversi WebP ini) harus didistribusikan dengan
lisensi yang sama jika disebarluaskan.

## Sumber yang gagal / ditolak (kenapa bukan yang ini)

- **Sketchfab** ( Realistic Burger, Sushi, Croissant, Fruit Bowl) — halaman model CC-BY
  ditemukan, tetapi unduhan GLB membutuhkan login (endpoint `/download` & API download
  mengembalikan 404 tanpa sesi). Tidak dipakai.
- **Poly Pizza / Quaternius "Ultimate Food Pack"** — CC0, GLB terunduh, tetapi semua file
  8–67 KB (< 0.2 MB, di bawah minimum backend).
- **glbmodels.com** — koneksi ditolak (timeout/host tidak reachable).
- **Innerscene "Burger with fries"** (20.1 MB) & **"Sushi set"** (16.2 MB) — CC0 tetapi
  melebihi batas 3 MB backend. dipakai alternatif kecil mereka (sushi plate 0.41 MB,
  fruit bowl 0.37 MB).
- **Poly Haven** — tidak menyediakan varian `.glb` (hanya .gltf terpisah + .bin);
  croissant diambil via mirror modelsxi (file asli Poly Haven, CC0).

Catatan lisensi: target tugas CC-BY/CC0; 2 foto memakai CC BY-SA 3.0 (CC-BY + ShareAlike,
di luar CC-BY murni) — dicantumkan di atas agar keputusan share-alike diketahui.
