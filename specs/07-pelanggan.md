# 07 — Pelanggan (menu admin)

Berkas: `admin.html` (menu baru "Pelanggan"). Server tidak berubah.

> **Disetujui pemilik toko (2026-11-17).** Kode sudah ada. Total belanja = hanya invoice yang sudah dibayar.

## Tujuan
Admin melihat daftar pelanggan dan riwayat belanjanya di satu tempat, untuk mencari kontak, alamat, dan melihat siapa pelanggan setia. Daftar **diturunkan dari invoice** yang sudah ada, jadi tidak ada data baru yang disimpan.

## Di luar cakupan
Akun/login pelanggan. Edit atau hapus pelanggan (ubah datanya lewat invoice). Kirim pesan WhatsApp massal. Halaman yang bisa dibuka pelanggan sendiri. Catatan/label pelanggan.

## Kriteria

- **PLG-1** Menu "Pelanggan" ada di sidebar admin, di antara Pengiriman dan Pengaturan. — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-2** Satu pelanggan = satu nomor HP (sudah dinormalisasi, INV-5). Nama, alamat, dan kota diambil dari invoice **terbaru** nomor itu. — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-3** Tiap baris menampilkan: nama, HP, kota, jumlah invoice, total belanja (hanya invoice yang sudah dibayar), tanggal invoice terakhir. — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-4** Urutan awal: invoice terakhir paling baru di atas. Pencarian memeriksa nama, HP, dan kota. — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-5** Klik pelanggan membuka rincian: kontak, alamat, dan daftar invoicenya (nomor bisa diklik membuka invoice, status LUNAS/BELUM). — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-6** Tombol "WhatsApp" per pelanggan membuka `wa.me/62…` (nomor 08… diubah ke 62…). — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-7** Di HP (lebar 390) tabel menjadi kartu, tanpa geser samping, mengikuti INV-6. — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-8** Teks dari data di-escape. Halaman hanya bisa dibuka setelah login admin (memakai data invoice yang sudah privat). — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **PLG-9** Daftar kosong menampilkan "Belum ada pelanggan". — ✅ diuji di Chrome (lebar 1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
