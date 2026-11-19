# Spec-Driven Development — Jasa Titip Belanja

Spesifikasi di folder ini adalah **sumber kebenaran**. Kode mengikuti spesifikasi, bukan sebaliknya.

## Aturan kerja

1. **Spec dulu, kode kemudian.** Perubahan perilaku dimulai dengan mengubah spec yang bersangkutan.
2. **Persetujuan.** Fitur baru, aturan bisnis, atau hal yang ambigu: tulis spec-nya dan **minta persetujuan sebelum menulis kode**. Perubahan kecil (gaya, salah ketik, bug yang jelas melanggar spec): langsung kerjakan, sebut ID kriterianya.
3. **Setiap kriteria punya ID** (contoh `INV-3`). Rujuk ID itu di komentar kode yang tidak jelas dengan sendirinya, dan di laporan pekerjaan.
4. **Selesai = teruji.** Kriteria yang disentuh harus diuji, lalu statusnya diperbarui di spec. Jangan menandai ✅ tanpa menjalankan ujinya.
5. **Spec dan kode tidak boleh berbeda.** Kalau kode berubah (siapa pun yang mengubah), spec diperbarui di langkah yang sama. Kalau menemukan perbedaan, laporkan, jangan diam-diam disesuaikan.
6. **Keputusan penting** dicatat di [keputusan.md](keputusan.md): tanggal, keputusan, alasan.

## Status kriteria

| Tanda | Arti |
|---|---|
| ✅ | Sudah diuji. Cara ujinya disebut di kriteria. |
| ⬜ | Belum diuji. Kode mungkin sudah ada. |
| 🚫 | Ditunda atau belum diputuskan. |

Berkas halaman (`index.html`, `admin.html`, `assets/`) ada di folder `public/`; nama berkas di spec tanpa awalan itu.

## Cara menguji

- **Aturan API** (`00-api.md`): `BASE=http://localhost:3000 ADMIN_PASSWORD=... node tests/api.test.js`. Tes memulihkan data aslinya, tapi tetap sebaiknya dijalankan pada server uji.
- **Tampilan**: periksa di browser, termasuk ukuran HP (lebar 390). Catat di kriteria kalau sudah dicek.

## Format satu spec

```
# Nama fitur
Berkas: yang diubah/dibuat
## Tujuan        — satu-dua kalimat, untuk siapa dan kenapa
## Di luar cakupan — yang sengaja tidak dikerjakan
## Kriteria      — "- **ID** pernyataan yang bisa diuji — status"
```

## Daftar spec

| Berkas | Isi |
|---|---|
| [00-api.md](00-api.md) | Kontrak server: akses, validasi, penyimpanan |
| [01-katalog-toko.md](01-katalog-toko.md) | Halaman toko untuk pelanggan |
| [02-admin-katalog.md](02-admin-katalog.md) | Kelola barang, unggah foto, watermark |
| [03-invoice.md](03-invoice.md) | Invoice, pembayaran, tampilan invoice |
| [04-pengiriman.md](04-pengiriman.md) | Pengiriman dan label |
| [05-pengaturan.md](05-pengaturan.md) | Pengaturan toko dan data invoice |
| [06-deploy.md](06-deploy.md) | Deploy di Vercel + MongoDB Atlas |
| [07-pelanggan.md](07-pelanggan.md) | Menu Pelanggan di admin |
| [08-pesanan-masuk.md](08-pesanan-masuk.md) | Pesanan tercatat saat tombol WhatsApp ditekan, dicocokkan dengan invoice |
| [09-paginasi-admin.md](09-paginasi-admin.md) | Halaman bernomor (10 per halaman) di daftar admin |
| [10-performa.md](10-performa.md) | Cache, gzip, foto mini, satu dokumen per barang/invoice, agar tetap cepat saat besar |
| [keputusan.md](keputusan.md) | Catatan keputusan dan daftar yang masih terbuka |

Tema tampilan (berlaku untuk toko dan admin): palet dari logo: pink `#F44D92` (tombol: `#D32F82`), tosca `#0BBDB6`, teks `#0E3B43`, latar `#FFF8FB`. Font judul Josefin Sans, teks Nunito.
