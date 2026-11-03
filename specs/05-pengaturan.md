# 05 — Pengaturan

Berkas: `admin.html` (menu Pengaturan), `server.js` (konstanta `BANK`)

## Tujuan
Admin mengatur identitas toko dan pengumuman tanpa menyentuh kode. Data sensitif seperti rekening tetap di kode.

## Di luar cakupan
Tab Kategori dan Kurir sebagai daftar terkelola (belum diputuskan, lihat `keputusan.md`).

## Kriteria

- **SET-1** Tab **Toko**: nomor WhatsApp (hanya digit) dan pengumuman (≤200) yang tampil di atas katalog toko. — ✅ pembersihan di server (API-2); formulir ⬜
- **SET-2** Tab **Invoice**: nama toko, alamat, telepon, email, NPWP, nama admin (masing-masing ≤200). Data ini **privat** (hanya admin yang login) dan tampil di kepala invoice. — ✅ API-7; formulir ⬜
- **SET-3** **Rekening** (nama bank, nomor, atas nama) disimpan di kode (`BANK` di `server.js`), **tidak ada di formulir** dan tidak bisa diubah lewat API. Tampil di footer invoice. — ✅ `tests/api.test.js` (API-7)
- **SET-4** Satu tombol **Simpan Pengaturan** menyimpan kedua tab sekaligus. — ⬜
- **SET-5** Isi rekening di `server.js` masih **data contoh** (`BCA`, `0000000000`). Wajib diganti sebelum invoice dikirim ke pelanggan. — 🚫 menunggu pemilik toko
