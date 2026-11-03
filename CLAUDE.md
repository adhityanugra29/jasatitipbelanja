# Jasa Titip Belanja

Katalog online + alat admin untuk toko jasa titip belanja. Pesanan lewat WhatsApp, tanpa payment gateway. Pengguna toko: ibu-ibu, kebanyakan lewat HP.

## Cara kerja: Spec-Driven Development

Baca [specs/README.md](specs/README.md) sebelum mengubah apa pun. Ringkasnya:

- Spesifikasi di `specs/` adalah sumber kebenaran. **Ubah spec dulu, baru kode.**
- Fitur baru, aturan bisnis, atau hal ambigu: tulis spec dan **minta persetujuan pengguna sebelum menulis kode**.
- Setiap kriteria punya ID (`INV-3`). Rujuk ID itu saat melapor.
- Selesai berarti **teruji** dan statusnya di spec diperbarui. Jangan menulis ✅ tanpa menjalankan ujinya.
- Kalau kode dan spec berbeda, laporkan dan perbarui spec di langkah yang sama.
- Keputusan penting dicatat di `specs/keputusan.md`.

## Perintah

- Server: `ADMIN_PASSWORD=... MONGODB_URI=mongodb+srv://... node server.js` (setelah `npm install`). Penyimpanan di MongoDB.
- Uji API: `BASE=http://localhost:3000 ADMIN_PASSWORD=... node tests/api.test.js`
- Bukan hanya `server.js`: `index.html` (toko) dan `admin.html` (admin) adalah file tunggal tanpa langkah build.

## Hal yang perlu diingat

- Aturan bisnis dijaga **di server** (`server.js`), bukan hanya di halaman. Total invoice dihitung server.
- Rekening ada di konstanta `BANK` di `server.js`, bukan di formulir. Jangan taruh di `admin.html` (halaman itu publik).
- Dokumen (bukti bayar) privat. Foto produk publik.
- Pemilik proyek bisa mengubah file di luar sesi (contoh: pindah ke MongoDB/Vercel). Baca ulang file sebelum mengedit.
