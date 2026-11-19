# 10 — Performa dan skala

Berkas: `server.js`, `index.html`, `admin.html`, `seed.js`, `bersihkan.js`, `assets/logo-s.png`, `tests/api.test.js`, `tests/mongo-mock.js`

> **Disetujui pemilik toko (2026-11-19)**, Tahap A dan B sekaligus. Karena situs belum dipakai (belum ada data asli), **tidak ada migrasi data**: koleksi baru langsung dipakai.

## Tujuan
Toko tetap cepat saat foto dan data bertambah (target: 5.000 barang, 20.000 invoice, 5.000 foto), dan tidak ada data yang hilang diam-diam karena batas teknis.

## Penyebab melambat (sebelum perubahan)
1. Foto dan halaman dikirim tanpa cache: tiap foto yang dilihat = satu bacaan MongoDB.
2. Semua invoice satu dokumen (batas MongoDB 16MB), tiap ubah status menulis ulang semuanya, dua admin saling menimpa, dan `slice(0, 3000)` memotong invoice ke-3001 dst. tanpa peringatan.
3. Semua barang satu dokumen dan satu JSON tanpa kompresi, termasuk yang stok habis.
4. Kartu katalog memuat foto 800px untuk tampilan ±200px.
5. Foto yang diganti/dihapus tidak dibersihkan (Atlas gratis 512MB).
6. Halaman dibaca dari disk tiap permintaan; pesanan masuk memangkas tanpa indeks.

## Di luar cakupan
Penyimpanan gambar terpisah (S3/Cloudinary), CDN sendiri, mengubah tampilan atau aturan bisnis.

## Kriteria

**Cache dan kompresi**
- **PERF-1** `/uploads/*`: `Cache-Control: public, max-age=31536000, immutable` + `ETag` (nama = UUID yang tidak pernah berubah); permintaan ulang dijawab 304. `/assets/*`: `max-age=86400`. Dokumen (`/api/doc/*`) tidak pernah `public`. — ✅ `tests/api.test.js` (API-5, API-6, PERF-3)
- **PERF-2** `GET /api/data` dan `GET /api/products`: `public, s-maxage=30, stale-while-revalidate=60` (CDN). Perubahan admin tampil di toko paling lama ±30 detik. JSON >1KB dikirim gzip bila browser mendukung. — ✅ header diuji (`tests/api.test.js` PERF-9, PERF-3); gzip JSON ⬜ belum diuji langsung (gzip halaman ✅)
- **PERF-3** `index.html`, `admin.html`, dan `assets/*` dibaca **sekali** saat server mulai; halaman dikirim gzip dengan `ETag` (304 bila sama). Konsekuensi: server harus dimulai ulang setelah berkas halaman diubah (di Vercel: otomatis tiap deploy). — ✅ `tests/api.test.js` (PERF-3)

**Foto**
- **PERF-4** Foto produk diunggah dua ukuran dari browser: utama 800px dan **mini 400px** (`<uuid>-s.<ext>`, disimpan di barang sebagai `thumb`). Kartu toko, keranjang, dan daftar admin memakai mini; barang lama tanpa mini memakai foto utama. — ✅ unggah dua ukuran diuji di Chrome (800×600 → 800×600 dan 400×300) dan di API; tampilan kartu memakai `thumb` ⬜ belum diuji dengan foto asli
- **PERF-5** Saat barang dihapus atau fotonya diganti, file foto lama (utama dan mini) ikut dihapus bila tidak dipakai barang lain. `npm run bersihkan` menampilkan foto yatim (unggahan yang dibatalkan); `-- --hapus` menghapusnya. Jalankan saat admin tidak sedang menambah barang. — ✅ hapus/ganti/dipakai bersama: `tests/api.test.js`; `bersihkan.js` ⬜ belum dijalankan (butuh MongoDB sungguhan)
- **PERF-12** Logo di header toko dan admin memakai `assets/logo-s.png` (220px, ±59KB) bukan `logo.png` (±242KB). `logo.png` tetap untuk watermark, invoice, dan label cetak. — ✅ dimuat di Chrome tanpa galat; ukuran berkas dicek

**Data**
- **PERF-6** Indeks dibuat saat server mulai (`products.price`, `products.t`, `orders.t`, `orders.pesananKode`, `inbox.created`). Pemangkasan pesanan masuk hanya bila jumlahnya >500. — ⬜ indeks tidak bisa diuji di MongoDB tiruan
- **PERF-7** *(batal)* Batas 3000 invoice dihapus, bukan diganti: dengan satu dokumen per invoice tidak ada lagi daftar yang dipotong. — ✅ tidak ada `slice(0, 3000)` di `server.js`
- **PERF-8** Invoice = koleksi `orders`, satu dokumen per invoice. `PUT /api/orders/:id` (validasi API-3/API-4 sama; PSM-6/17 diperiksa per invoice), `DELETE /api/orders/:id`, `GET /api/orders` (semua, terbaru di atas; dihapus oleh [spec 11](11-paginasi-server.md): admin kini memuat per halaman). `PUT /api/orders` (seluruh daftar) dihapus. Menyimpan satu invoice tidak menyentuh yang lain. — ✅ `tests/api.test.js` (PERF-8, API-3, API-4, PSM); admin menyimpan per invoice diuji di Chrome. *Shortcut lama ditutup:* daftar semua invoice (±9MB untuk 20.000) diganti paginasi server, lihat [11-paginasi-server.md](11-paginasi-server.md).
- **PERF-9** Barang = koleksi `products`, satu dokumen per barang (`t` = urutan, terbaru di atas). Publik: `GET /api/data` (wa, pengumuman, kategori yang ada barangnya), `GET /api/products?q&cat=A|B&sort=asc|desc&skip&limit` (maks 48; stok habis tersembunyi kecuali dicari, TOK-21) dan `?ids=` (keranjang, tanpa saringan stok). Admin: `GET /api/admin/catalog` (semua), `PUT /api/products` (simpan barang, maks 100 sekali kirim), `DELETE /api/products/:id`, `PUT /api/data` (wa, pengumuman, kategori). — ✅ `tests/api.test.js` (PERF-9, API-2, SET-6/7); toko dan admin diuji di Chrome (lebar 390)
- **PERF-10** *(batal)* Migrasi data dibatalkan: situs belum punya data asli. `seed.js` menyalin berkas lama (`data.json`, `orders.json`, …) ke koleksi baru. — ⬜ `seed.js` belum dijalankan
- **PERF-11** Aturan INV, PSM, SET, PLG tidak berubah; tes API yang ada disesuaikan ke rute baru dan lolos. — ✅ `tests/api.test.js` (17 tes); tampilan Pelanggan/Pesanan Masuk/Pengiriman memakai data yang sama dengan sebelumnya, diuji sebagian di Chrome

## Hasil ukur (MongoDB tiruan di memori, jadi hanya ukuran data yang bermakna)
5.000 barang dan 20.000 invoice:
| | Sebelum | Sesudah |
|---|---|---|
| Data yang diunduh toko saat dibuka | seluruh katalog (±1,3MB, tanpa gzip) | 12 barang (±3KB) |
| Ganti status 1 invoice | tulis ulang semua invoice | tulis 1 dokumen |
| Foto di kartu | 800px (±80KB) | 400px (±40KB), di-cache selamanya |

## Pengujian
- `node tests/api.test.js` terhadap server dengan MongoDB tiruan: semua lolos.
- Chrome (CDP, lebar 390, server demo): toko (muat per halaman, cari, urutan, gulir ke bawah, keranjang dibersihkan dari barang yang tidak ada, tanpa geser samping); admin (login, edit, hapus, ubah nama kategori, simpan/hapus invoice, unggah foto dua ukuran). Tanpa galat konsol.

## Risiko yang tersisa
- Semua tes memakai MongoDB tiruan. Indeks, `bulkWrite`, `$regex` pada MongoDB sungguhan belum pernah dicoba (API-8, DEP-7).
- Pencarian memakai `$regex` tanpa indeks teks: memindai koleksi. Cukup sampai puluhan ribu barang; upgrade ke indeks teks bila lambat.
- Unggah foto di dialog Edit lalu Batal meninggalkan foto yatim (dibersihkan oleh `npm run bersihkan`).
