# Jasa Titip Belanja

Katalog online dan alat admin untuk toko jasa titip belanja (tas, sepatu, koper). Pelanggan memilih barang di situs lalu memesan lewat WhatsApp. **Tidak ada payment gateway.** Admin mencatat pesanan sebagai invoice, menerima bukti bayar, lalu mengirim barang.

Tampilan dirancang untuk HP, karena pelanggannya kebanyakan ibu-ibu.

## Fitur

**Toko** (`/`)
- Katalog dengan foto, harga, sisa stok, dan label *New Stock*, *Hot Item*, *Flash Sale*
- Pencarian, filter kategori, daftar yang bertambah sendiri saat digulir
- Keranjang, lalu **Pesan via WhatsApp** dengan pesan yang sudah terisi

**Admin** (`/admin`, pakai password)
- **Katalog**: tambah banyak foto sekaligus (otomatis diberi watermark logo), atur stok dan label
- **Invoice**: buat invoice, tandai sudah bayar dengan bukti bayar, cetak atau simpan sebagai PDF
- **Pengiriman**: hanya invoice yang sudah dibayar yang muncul; pilih kurir, isi resi, cetak **label pengiriman** (nomor HP dan nama barang disamarkan, tanpa harga)
- **Pengaturan**: nomor WhatsApp, pengumuman, dan data toko untuk invoice

## Alur

```
Pelanggan pesan via WhatsApp → Admin buat invoice → Pelanggan bayar → Admin unggah bukti bayar
→ otomatis masuk Pengiriman → Admin pilih kurir + isi resi → Tandai terkirim
```

Pengiriman sebelum pembayaran **tidak mungkin**. Aturan ini dijaga di server, bukan hanya di halaman.

## Struktur

| Berkas | Isi |
|---|---|
| `web/index.html` | Halaman toko |
| `web/admin.html` | Halaman admin |
| `server.js` | Server dan semua aturan bisnis; data di MongoDB |
| `api/index.js`, `vercel.json` | Pintu masuk untuk Vercel |
| `seed.js` | Menyalin data lokal (format lama) ke MongoDB (sekali jalan, opsional) |
| `bersihkan.js` | `npm run bersihkan`: daftar/hapus foto produk yang tidak dipakai |
| `web/assets/` | Logo (`logo-s.png` untuk header, `logo.png` untuk watermark dan cetak) |
| `specs/` | Spesifikasi (sumber kebenaran) |
| `tests/api.test.js` | Tes kontrak API |

Tanpa langkah build. Halaman toko dan admin masing-masing satu berkas.

## Menjalankan di komputer sendiri

Butuh Node.js dan sebuah database MongoDB (misalnya MongoDB Atlas gratis).

```powershell
npm install
$env:ADMIN_PASSWORD = "password-admin-yang-kuat"
$env:MONGODB_URI = "mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/jasatitipbelanja?retryWrites=true&w=majority"
node server.js
```

Toko di http://localhost:3000, admin di http://localhost:3000/admin.

Sertakan nama database di alamat MongoDB (`…mongodb.net/jasatitipbelanja?…`). Kalau tidak, data masuk ke database bernama `test`.

## Deploy ke Vercel

1. **MongoDB Atlas**: buat cluster gratis dan user database. Di *Network Access* izinkan `0.0.0.0/0` (alamat Vercel berubah-ubah). Salin *connection string*.
2. **Vercel**: *Add New → Project*, pilih repo ini.
3. Di **Environment Variables** isi:
   - `ADMIN_PASSWORD`: password admin
   - `MONGODB_URI`: alamat MongoDB tadi
4. Klik **Deploy**. Setiap `git push` ke `main` akan men-deploy ulang otomatis.
5. *(Opsional)* Untuk membawa data contoh dari komputer ini: `$env:MONGODB_URI="…"; node seed.js`. Tanpa ini toko mulai kosong.

**Cek alamat MongoDB** sebelum dipasang di Vercel (hanya menampilkan host, tidak pernah password):

```powershell
$env:MONGODB_URI = "mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/jasatitipbelanja?retryWrites=true&w=majority"
npm run cek-db
```

**Sebelum dipakai pelanggan:**
- Ganti rekening contoh di konstanta `BANK` di `server.js`. Rekening sengaja disimpan di kode, bukan di formulir admin.
- Isi **Pengaturan → Invoice** (nama toko, alamat, telepon) dan nomor WhatsApp di **Pengaturan → Toko**.
- Paket Hobby Vercel diperuntukkan penggunaan pribadi non-komersial. Karena ini toko yang berjualan, periksa ketentuan paketnya.

**Batas unggah:** bukti bayar PDF maksimal 3MB (batas isi permintaan Vercel ±4,5MB). Foto diperkecil otomatis di browser sebelum diunggah.

## Pengujian

Tes aturan server (akses, validasi, total, dokumen privat, rekening):

```powershell
$env:BASE = "https://NAMA-PROYEK.vercel.app"   # atau http://localhost:3000
$env:ADMIN_PASSWORD = "password-admin"
node tests/api.test.js
```

Tes menulis data lalu memulihkannya di akhir. Jalankan sebelum mengisi data asli.

## Cara kerja: Spec-Driven Development

Spesifikasi di [`specs/`](specs/README.md) adalah sumber kebenaran: ubah spec dulu, baru kode, dan tandai ✅ hanya setelah diuji. Keputusan penting dan hal yang belum diputuskan ada di [`specs/keputusan.md`](specs/keputusan.md).

## Keamanan

- Data pelanggan (`orders.json`, `docs/`, `uploads/`, dan sejenisnya) tidak masuk git (lihat `.gitignore`).
- Bukti bayar bersifat privat dan hanya bisa dibuka admin yang login. Foto produk bersifat publik.
- Jangan menaruh password, alamat MongoDB, atau rekening asli di `admin.html` atau `index.html`: kedua halaman itu bisa dibuka siapa saja.
