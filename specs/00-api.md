# 00 — API server

Berkas: `server.js`, `api/index.js` (Vercel), `seed.js`, `tests/api.test.js`

## Tujuan
Satu server kecil melayani halaman toko, halaman admin, dan data. Semua aturan bisnis yang tidak boleh dilanggar dijaga di sini, bukan hanya di halaman.

## Di luar cakupan
Payment gateway. Akun admin lebih dari satu. Batas percobaan login.

## Kriteria

Rute publik: `GET /`, `/admin`, `/assets/*`, `/uploads/*`, `GET /api/data`. Semua `/api/*` lain butuh header `x-admin`.

- **API-1** Endpoint privat menjawab 401 tanpa header `x-admin` atau dengan password salah. `GET /api/data` terbuka. — ✅ `tests/api.test.js`
- **API-2** `PUT /api/data` membersihkan produk: nama ≤100, harga ≥0, kategori ≤40 (kosong → "Lainnya"), keterangan ≤100, badge hanya `new|hot|flash` atau kosong, stok `null` atau bilangan bulat ≥0, gambar hanya `/uploads/<nama>.(jpg|png|webp)`. Nomor WhatsApp hanya digit, pengumuman ≤200. — ✅ `tests/api.test.js`
- **API-3** `PUT /api/orders` menghitung **total di server**: Σ(qty×harga − diskon) + ongkir. Total kiriman klien diabaikan. Nomor HP dinormalisasi (`+62…`, `62…`, `8…` → `08…`). — ✅ `tests/api.test.js`
- **API-4** Pesanan ditolak (400) kalau: tanpa barang; ada barang tanpa nama, qty <1, harga <1, atau diskon > qty×harga; HP bukan `^08\d{8,12}$`; alamat kosong; sudah dibayar tanpa bukti; sudah dikirim tapi belum dibayar atau tanpa kurir atau tanpa resi. — ✅ `tests/api.test.js` (4a, 4b, 4c)
- **API-5** `POST /api/upload` menerima gambar JPEG/PNG/WEBP (data URL), menyimpannya sebagai `/uploads/<uuid>.<ext>`, dan hasilnya publik. Tipe lain ditolak. — ✅ `tests/api.test.js`
- **API-6** `POST /api/doc` menerima PDF/JPEG/PNG/WEBP ≤5MB; PDF harus berawalan `%PDF-`. Dokumen **privat**: hanya `GET /api/doc/<nama>` dengan `x-admin`. — ✅ `tests/api.test.js` (batas 5MB ⬜)
- **API-7** `GET /api/settings` menggabungkan pengaturan tersimpan dengan konstanta `BANK` di kode. `PUT /api/settings` hanya menyimpan `storeName, address, phone, email, npwp, admin` (≤200). Kunci rekening diabaikan. — ✅ `tests/api.test.js`
- **API-8** Penyimpanan di MongoDB (`MONGODB_URI` wajib): koleksi `kv` (`data`, `orders`, `settings`) dan `files` (`uploads/…`, `docs/…`). Di Vercel lewat `api/index.js`. — ⬜ Tes di atas dijalankan dengan MongoDB tiruan di memori. Belum pernah dijalankan pada MongoDB sungguhan atau Vercel.
- **API-9** Batas ukuran isi permintaan: 3MB, kecuali `/api/doc` 8MB. — ⬜
- **API-10** Perbandingan password memakai SHA-256 dan `timingSafeEqual`. — ⬜ (hanya dibaca di kode)
