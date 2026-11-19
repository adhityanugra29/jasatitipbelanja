# 02 — Admin: katalog barang

Berkas: `admin.html` (menu Katalog, alur Tambah Produk)

## Tujuan
Admin mengelola barang yang tampil di toko: menambah banyak foto sekaligus, mengisi data, mengatur stok dan label, tanpa mengubah kode.

## Di luar cakupan
Kategori dan kurir sebagai daftar terkelola (usulan, lihat `keputusan.md`). Banyak akun admin.

## Kriteria

**Akses dan daftar**
- **KAT-1** Halaman admin meminta password sebelum data apa pun dimuat. — ✅ login lewat Chrome headless
- **KAT-2** Katalog admin berbentuk kartu (foto, nama, keterangan, harga, stok, badge aktif) dengan tombol Edit dan Hapus. Daftar berhalaman, 12 per halaman (KAT-15). — ⬜
- **KAT-3** Tidak ada tombol simpan global. Perubahan katalog langsung tersimpan ke server. — ⬜

**Tambah produk** (satu alur untuk 1 sampai 30 foto)
- **KAT-4** Langkah 1 Pilih foto: klik atau seret; maksimal 30 foto; JPG/PNG/WEBP; ≤5MB per foto; 1 foto = 1 produk. Foto langsung diunggah satu per satu dengan status Mengunggah/Siap/Gagal, dan bisa dibuang dengan ✕. — ⬜
- **KAT-5** Langkah 2 Isi data, satu foto per layar: nama (terisi dari nama file), kategori (mengikuti produk sebelumnya), stok (awal 1; kosong = tidak terbatas), harga, keterangan, label. Nama dan harga >0 wajib. Simpan langsung ke server. Ctrl+Enter menyimpan. "Buang foto ini" tersedia. — ⬜
- **KAT-6** Langkah 3 Selesai: ringkasan jumlah produk ditambahkan; "Tambah lagi" atau "Lihat Katalog". — ⬜
- **KAT-7** Setiap foto produk yang diunggah diberi **watermark logo toko** di pojok kanan bawah (lebar ±20%) dan diperkecil ke sisi terpanjang 800px (JPEG 0,85). Foto asli tetap di perangkat admin. — ⬜

**Ubah dan hapus**
- **KAT-8** Edit membuka dialog (foto, nama, keterangan, harga, kategori, stok, label). **Simpan** menulis ke server (nama wajib). **Batal** atau Esc membuang perubahan. — ⬜
- **KAT-9** Hapus meminta konfirmasi lalu langsung tersimpan. — ⬜
- **KAT-10** Label (badge) dipilih admin per barang: Tanpa label, New Stock, Hot Item, Flash Sale. — ⬜ (server ✅ API-2)

**HP**
- **KAT-11** Di layar ≤800px: sidebar keluar dari kiri lewat ☰ dengan latar gelap; mengetuk latar menutupnya. Dialog muncul dari bawah. — ✅ dicek di 390
- **KAT-12** Tampilan HP (≤800px) seragam di semua halaman admin: isian berfont 16px dengan batas tipis pink (fokus pink); kartu ringkasan 2 kolom, kartu ganjil terakhir selebar layar; Katalog 2 kolom; kartu Pengiriman menaruh status (Terlambat/Terjadwal) sebagai pil di bawah nama dan tombol aksi satu baris (Cetak Label, Tandai Sudah Kirim, ⋮); tab bisa digeser. Tanpa geser samping di lebar 390. — ✅ dicek di Chrome (CDP, 390, server demo): Pesanan, Katalog, Invoice, Pengiriman, Pelanggan, Pengaturan, menu ☰, dialog Edit Barang, Buat Invoice, Pengiriman; geser samping 0px; kartu Pengiriman dan Pelanggan juga muat di 320 (grid kartu memakai min(310px,100%)). Halaman Tambah Produk langkah 2–3, dialog Invoice/Bukti bayar ⬜
- **KAT-13** Isian uang di admin (Harga di Edit Barang dan Tambah Produk; Harga, Diskon, Ongkos kirim di form Invoice) ditulis gaya accounting dengan titik ribuan saat mengetik (`450.000`), keyboard angka di HP. Yang tersimpan tetap angka. — ✅ diuji di Chrome (CDP): Edit Barang tampil 450.000, mengetik 1234567 jadi 1.234.567 dan tersimpan 1234567 (number); Invoice ongkir 15.000 + harga 250.000 − diskon 10.000 = total 255.000. Tambah Produk dan simpan invoice sampai ke server ⬜
- **KAT-14** Di atas daftar Katalog admin, bergaya sama dengan toko (kolom cari bulat dengan ikon 🔍, di bawahnya dua filter bulat berpanah): kolom **cari** (nama, keterangan, kategori; tanpa membedakan huruf besar/kecil) dan dua **filter**: **Kategori** (semua kategori yang ada) dan **Stok** (Semua / Tersedia / Stok habis / Stok terbatas = ada angka stoknya). Filter berlaku bersamaan. Mengubah cari/filter kembali ke halaman 1 (PAG-3). Bila tak ada yang cocok: "Tidak ada barang yang cocok." Jumlah di menu Katalog tetap total seluruh barang (PAG-5). Edit/Hapus tetap menunjuk barang yang benar saat daftar terfilter. — ✅ diuji di Chrome (CDP) dengan server tiruan, 25 barang: cari, filter kategori, filter stok (habis, terbatas+kategori), nol hasil, jumlah menu tetap 25, tanpa geser samping di 390
- **KAT-15** Katalog admin memakai **12 kartu per halaman** (menggantikan 10 di KAT-2/PAG-1 khusus Katalog; daftar lain tetap 10). — ✅ diuji di Chrome (CDP) dengan server tiruan, 25 barang: halaman 1 = 12 kartu, "1–12 dari 25", halaman 3 = 1 kartu, Edit di halaman 3 menunjuk barang yang benar
