# 06 — Deploy (Vercel + MongoDB Atlas)

Berkas: `vercel.json`, `api/server.js`, `server.js`, `seed.js`, `README.md`

## Tujuan
Situs berjalan online di Vercel dengan data di MongoDB Atlas, bisa dibuka pelanggan dari HP.

## Di luar cakupan
Domain sendiri. Pemantauan dan cadangan otomatis. Lebih dari satu lingkungan (staging).

## Kriteria

- **DEP-1** `ADMIN_PASSWORD` dan `MONGODB_URI` wajib diisi sebagai *Environment Variables* di Vercel. Tanpa keduanya server berhenti dengan pesan jelas di log. — ⬜
- **DEP-2** Hanya `/api/*` dan `/uploads/*` diarahkan ke `api/server.js` (`vercel.json`; rewrite catch-all `/(.*)` membuat `/` ikut ke fungsi dan galat), dan halaman (`public/index.html`, `public/admin.html`, `public/assets/`) dilayani langsung oleh Vercel dari `public/` (`cleanUrls` membuat `/admin` membuka `admin.html`), bukan lewat fungsi: `includeFiles` terbukti tidak membundel berkas (galat ENOENT `/var/task/index.html` pada pola berkurung kurawal dan `web/**`). — ⬜
- **DEP-3** Batas isi permintaan Vercel ±4,5MB. Karena itu unggah dokumen (bukti bayar PDF) dibatasi **3MB** (±4MB setelah dikodekan base64). Foto bukti bayar dan foto produk diperkecil di browser sebelum diunggah, jadi jauh di bawah batas. — ✅ `tests/api.test.js` (API-6b)
- **DEP-4** Data awal bersifat opsional: `MONGODB_URI=… node seed.js` menyalin `data.json`, `orders.json`, `settings.json`, `uploads/`, `docs/` (format lama) ke koleksi `kv`, `products`, `orders`, `files`. Tanpa itu toko mulai kosong. — ⬜
- **DEP-4b** `npm run cek-db` memeriksa apakah `MONGODB_URI` bisa dipakai, tanpa menjalankan server, dan hanya menampilkan host (tidak pernah password). Menjelaskan penyebab yang umum bila gagal. — ✅ jalur gagal diuji (alamat tidak terjangkau); jalur berhasil ⬜ (butuh MongoDB sungguhan)
- **DEP-5** Rekening di `server.js` (`BANK`) diganti dengan rekening asli **sebelum** invoice dikirim ke pelanggan. — 🚫 menunggu pemilik toko
- **DEP-4c** `npm run bersihkan` menampilkan foto yatim; `-- --hapus` menghapusnya ([PERF-5](10-performa.md)). — ⬜ butuh MongoDB sungguhan
- **DEP-6** Berkas data pelanggan (`orders.json`, `docs/`, `uploads/`, `settings.json`, `data.json`) tidak masuk git. — ✅ dicek `git ls-files`
- **DEP-7** Uji setelah deploy: halaman toko terbuka; admin bisa login; tambah barang dengan foto tampil di toko; unggah bukti bayar; `tests/api.test.js` lolos terhadap alamat Vercel. — ⬜ belum pernah di-deploy

## Catatan
- Paket Hobby Vercel diperuntukkan penggunaan pribadi non-komersial. Karena ini toko yang berjualan, periksa ketentuan paketnya.
- Alamat MongoDB sebaiknya memuat nama database (`…mongodb.net/jasatitipbelanja?…`). Kalau tidak, data masuk ke database bernama `test`.
