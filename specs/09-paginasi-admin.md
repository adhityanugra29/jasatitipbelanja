# 09 — Paginasi di halaman admin

Berkas: `admin.html`

## Tujuan
Daftar di admin dibagi per halaman supaya tetap ringan dan mudah dijangkau di HP, tanpa gulir panjang. Berlaku untuk lima daftar: Katalog, Invoice, Pengiriman, Pelanggan, dan Pesanan Masuk.

## Di luar cakupan
Toko untuk pelanggan (`index.html`) tetap memakai gulir tak terbatas (TOK-7). Lompat ke halaman tertentu dengan mengetik nomor. Jumlah baris per halaman yang bisa diubah.

## Kriteria
- **PAG-1** Katalog, Invoice, Pengiriman, Pelanggan, dan Pesanan Masuk memakai **halaman bernomor, maksimal 10 baris (kartu) per halaman**. Menggulir tidak memuat data tambahan. — ✅ diuji di Chrome (CDP, 390) dengan server demo berisi 25 barang, 27 invoice, 23 pesanan: Katalog, Invoice (Daftar dan Gambar), Pengiriman, Pelanggan, Pesanan Masuk
- **PAG-2** Kontrol di bawah daftar: keterangan "Menampilkan 11–20 dari 47", tombol ‹ dan ›, dan nomor halaman (jendela 5 angka di sekitar halaman aktif; halaman aktif ditandai). ‹ nonaktif di halaman pertama, › nonaktif di halaman terakhir. Kontrol tidak tampil bila datanya ≤10. — ✅ keterangan, ‹ ›, halaman aktif, tab dengan ≤10 data tanpa kontrol; jendela 5 angka untuk 12 halaman diuji dengan kode asli (1-5, 4-8, 8-12)
- **PAG-3** Mencari, berganti tab, atau mengubah filter (bulan, kurir) kembali ke halaman 1. Bila setelah menghapus atau mengubah data halaman aktif menjadi kosong, pindah ke halaman terakhir yang ada. — ✅ mencari dan ganti tab (Invoice, Pesanan Masuk), halaman terakhir Katalog dikosongkan pindah ke halaman sebelumnya; filter bulan/kurir ⬜ belum dicoba, memakai jalur yang sama dengan mencari
- **PAG-4** Pindah halaman menggulir layar ke awal daftar. Tombol Edit/Hapus di Katalog tetap menunjuk barang yang benar di halaman mana pun. Tanpa geser samping di lebar 390. — ✅ Edit di halaman 3 Katalog menunjuk Barang 21; tanpa geser samping di 390; menggulir ke awal daftar ⬜ tidak diukur
- **PAG-5** Tab di tiap daftar tetap menampilkan jumlah **seluruh** data di tab itu (bukan jumlah di halaman). — ✅ tab Invoice dan menu Katalog menampilkan jumlah total
