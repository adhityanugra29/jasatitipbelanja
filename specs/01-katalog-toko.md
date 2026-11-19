# 01 — Katalog toko

Berkas: `index.html`

## Tujuan
Katalog online untuk pelanggan (target: ibu-ibu, banyak memakai HP). Pelanggan memilih barang lalu memesan lewat WhatsApp. Tidak ada pembayaran di situs.

## Di luar cakupan
Payment gateway. Akun pelanggan. Pelanggan memilih kurir (kurir ditentukan admin). Hot Item otomatis dari penjualan. Harga coret dan hitung mundur untuk Flash Sale.

## Kriteria

**Data dan kartu**
- **TOK-1** Pengaturan toko dari `GET /api/data`, barang dari `GET /api/products` (per halaman, [PERF-9](10-performa.md)). Kalau gagal, tampil "Gagal memuat katalog" (halaman berikutnya yang gagal: "Ketuk untuk mencoba lagi"). — ✅ memuat diuji di Chrome (390, server demo); jalur gagal ⬜
- **TOK-21** Barang **stok habis disembunyikan** dari daftar (disaring di server). — ✅ `tests/api.test.js` (PERF-9). Barang itu baru muncul (dengan tombol "Stok habis" nonaktif) bila pengunjung mengetik di kolom pencarian dan namanya/keterangannya cocok. Pilihan kategori saja tidak memunculkannya. — ⬜ belum diuji
- **TOK-2** Kartu menampilkan foto (atau kotak 🛍️ kalau tidak ada), badge, nama, keterangan (atau kategori), harga, dan "Sisa N" / "Stok habis" bila stok diatur. — ✅ dicek di layar 390
- **TOK-3** Badge diatur admin per barang, satu per barang: `new` → "New Stock", `hot` → "🔥 Hot Item", `flash` → "⚡ Flash Sale". Tanpa badge = tidak ada label. — ✅ dicek di layar 390
- **TOK-4** Semua teks dari data di-escape (tidak ada HTML yang lolos). — ⬜

**Cari, filter, daftar**
- **TOK-5** Pencarian memeriksa nama dan keterangan. Logo, pencarian, pilihan kolom, dan filter **menempel di atas layar** (tidak ikut tergulir) — ⬜ belum dicek di browser. Di bawah kolom pencarian ada dua dropdown yang selalu terlihat (tanpa tombol filter): **Urutan** (paling kiri, TOK-14) dan **Kategori**. Kategori bisa **dipilih lebih dari satu** (kotak centang); tulisannya: "Semua kategori" bila kosong, nama kategori bila 1–2, "N kategori" bila lebih. Ada tombol "Hapus pilihan" bila ada yang terpilih. Daftar langsung tersaring saat dicentang; menu menutup saat mengetuk di luarnya. — ⬜ dirombak, belum dicek di browser
- **TOK-6** Pilihan tampilan 1/2/3 kolom, satu baris dengan pencarian dan filter. Bawaan 2 kolom; di layar >900px bawaan 3 kolom. Di layar ≤600px pilihan 3 kolom disembunyikan, dan bila 3 kolom sedang aktif lalu layar menyempit ≤600px (jendela diperkecil atau HP diputar) otomatis jadi 2 kolom. Bila layar melebar >900px lagi dan pengguna belum memilih sendiri, kembali ke 3 kolom; pilihan manual pengguna dihormati. Isi kartu (harga, tombol, nama) tidak keluar dari kartu dan tidak ada geser samping di lebar 320–600. — ✅ diuji di Chrome (CDP): lebar 320, 360, 390, 430, 600 (muat langsung); 1280 lalu menyempit ke 546 dan 390; melebar lagi; pilihan manual; harga Rp12.500.000, nama panjang, stok habis. Bug yang ditemukan: 3 kolom tetap aktif setelah jendela diperkecil sehingga kartu terpotong, sudah diperbaiki
- **TOK-7** Daftar bertambah sendiri ke bawah saat digulir: 12 barang per muat **dari server**, tanpa tombol halaman. Mencari (jeda 250ms) atau mengubah filter/urutan mengembalikan ke awal; jawaban usang diabaikan. — ✅ diuji di Chrome (390): 36 barang termuat 12-12-12 tanpa dobel, penanda hilang di akhir, cari dan cari kosong

**Keranjang**
- **TOK-8** Kartu hanya punya satu tombol "Tambah". Setelah ditambah, berubah menjadi `− n +` sesuai isi keranjang. Di jumlah 1, tombol `−` menjadi 🗑 dan menghapus barang (tombol kembali "Tambah"). `+` nonaktif di batas stok. Stok 0 → "Stok habis" nonaktif. — ✅ logika diuji dengan kode asli; tampilan dicek di 390
- **TOK-9** Keranjang disimpan di `localStorage`. Saat halaman dibuka, isinya dicek ke server (`?ids=`): barang yang sudah dihapus admin atau stoknya habis dibuang; jumlah dibatasi stok. Bila pengecekan gagal, keranjang dibiarkan. Kartu dan keranjang selalu sinkron. — ✅ barang yang tidak ada dibuang dan halaman keranjang benar, diuji di Chrome (390); stok habis dan pengecekan gagal ⬜
- **TOK-10** *(digantikan TOK-15..20)* Jendela keranjang: daftar barang dengan `− n +` (🗑 di jumlah 1), total (belum termasuk ongkir), tombol "Pesan via WhatsApp". — ✅ tampilan dicek di 390; isi ⬜

**Pesan**
- **TOK-11** "Pesan via WhatsApp" membuka `wa.me/<nomor WA toko>` dengan pesan berisi tiap barang, jumlah, subtotal, total, serta baris "Kode pesanan: PSN-XXXXXX" (lihat PSM-1) dan baris "Nama:" dan "Alamat:" untuk diisi pelanggan. Tombol tersembunyi kalau keranjang kosong. — ⬜

**Tampilan (rombak)**
- **TOK-13** Kepala ringkas (logo kecil di samping tagline "We make shopping easy"; tanpa judul "Open Order"). Lebar isi maks 1040px. Tombol keranjang berupa pil di tengah (bukan bilah selebar layar), pink dan hanya tampil saat keranjang berisi (kosong = tidak ada tombol). Tombol "Tambah" bergaris tepi pink. — ⬜ belum dicek di browser (390 dan desktop)

**Urutan**
- **TOK-14** Dropdown **Urutan** di paling kiri, tanpa opsi "bawaan": **Harga tertinggi** (tinggi → rendah, **pilihan awal**) dan **Harga terendah** (rendah → tinggi). Berlaku bersama pencarian dan kategori, dan memuat ulang daftar dari awal (TOK-7). Barang stok habis tetap ikut diurutkan menurut harga. Tidak disimpan antar kunjungan (setiap kunjungan mulai dari Harga tertinggi). — ⬜ belum diuji

**Halaman Keranjang** (menggantikan jendela keranjang TOK-10)
- **TOK-15** Keranjang adalah **halaman sendiri** di `/#keranjang` (tetap satu berkas `index.html`, tanpa langkah build). Tombol 🛒 membukanya; tombol Kembali di browser/HP kembali ke katalog. Jendela keranjang lama dihapus. — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo; tombol Kembali bawaan browser ⬜
- **TOK-16** Tiap barang menampilkan foto (atau 🛍️), nama, keterangan, harga satuan, `− n +` (🗑 di jumlah 1, `+` nonaktif di batas stok, "Sisa N" bila stok diatur), dan subtotal barang itu. Perubahan langsung memperbarui total. — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo (barang tanpa foto); foto asli dan "Sisa N" ⬜
- **TOK-17** Ringkasan: jumlah barang (pcs) dan **total (belum termasuk ongkir)**, dengan catatan bahwa ongkir dan kurir ditentukan admin lewat WhatsApp. — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo
- **TOK-18** Nama, nomor HP, dan alamat penerima (PSM-10) dan tombol **Pesan via WhatsApp** (TOK-11) ada di halaman ini. Di HP, total dan tombol menempel di bawah layar (memperhitungkan safe-area iPhone). — ✅ nama kosong ditolak dan bilah bawah menempel: diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo; HP salah ⬜, safe-area iPhone ⬜
- **TOK-19** Keranjang kosong: tampil "Keranjang masih kosong" dan tombol kembali ke katalog. Tautan "← Lanjut belanja" ada di atas halaman. Isi keranjang tetap disimpan (TOK-9). — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo
- **TOK-20** Tanpa geser samping di lebar 390 dan dibuka langsung lewat alamat `/#keranjang` pun berfungsi (katalog dimuat dulu, lalu halaman keranjang). — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo
