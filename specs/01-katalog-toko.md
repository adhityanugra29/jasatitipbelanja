# 01 — Katalog toko

Berkas: `index.html`

## Tujuan
Katalog online untuk pelanggan (target: ibu-ibu, banyak memakai HP). Pelanggan memilih barang lalu memesan lewat WhatsApp. Tidak ada pembayaran di situs.

## Di luar cakupan
Payment gateway. Akun pelanggan. Pelanggan memilih kurir (kurir ditentukan admin). Hot Item otomatis dari penjualan. Harga coret dan hitung mundur untuk Flash Sale.

## Kriteria

**Data dan kartu**
- **TOK-1** Katalog dimuat dari `GET /api/data`. Kalau gagal, tampil "Gagal memuat katalog". — ⬜
- **TOK-2** Kartu menampilkan foto (atau kotak 🛍️ kalau tidak ada), badge, nama, keterangan (atau kategori), harga, dan "Sisa N" / "Stok habis" bila stok diatur. — ✅ dicek di layar 390
- **TOK-3** Badge diatur admin per barang, satu per barang: `new` → "New Stock", `hot` → "🔥 Hot Item", `flash` → "⚡ Flash Sale". Tanpa badge = tidak ada label. — ✅ dicek di layar 390
- **TOK-4** Semua teks dari data di-escape (tidak ada HTML yang lolos). — ⬜

**Cari, filter, daftar**
- **TOK-5** Pencarian memeriksa nama dan keterangan. Filter kategori boleh lebih dari satu, dengan badge jumlah filter aktif. — ⬜
- **TOK-6** Pilihan tampilan 1/2/3 kolom, satu baris dengan pencarian dan filter. Bawaan 2 kolom; di layar >900px bawaan 3 kolom. Di layar ≤600px pilihan 3 kolom disembunyikan. — ⬜ dirombak, belum dicek ulang di browser
- **TOK-7** Daftar bertambah sendiri ke bawah saat digulir: 12 barang per muat, tanpa tombol halaman. Mencari atau mengubah filter mengembalikan ke awal. — ⬜

**Keranjang**
- **TOK-8** Kartu hanya punya satu tombol "Tambah". Setelah ditambah, berubah menjadi `− n +` sesuai isi keranjang. Di jumlah 1, tombol `−` menjadi 🗑 dan menghapus barang (tombol kembali "Tambah"). `+` nonaktif di batas stok. Stok 0 → "Stok habis" nonaktif. — ✅ logika diuji dengan kode asli; tampilan dicek di 390
- **TOK-9** Keranjang disimpan di `localStorage`. Barang yang sudah dihapus admin atau stoknya habis otomatis dibuang; jumlah dibatasi stok. Kartu dan keranjang selalu sinkron. — ⬜
- **TOK-10** Jendela keranjang: daftar barang dengan `− n +` (🗑 di jumlah 1), total (belum termasuk ongkir), tombol "Pesan via WhatsApp". — ✅ tampilan dicek di 390; isi ⬜

**Pesan**
- **TOK-11** "Pesan via WhatsApp" membuka `wa.me/<nomor WA toko>` dengan pesan berisi tiap barang, jumlah, subtotal, total, serta baris "Kode pesanan: PSN-XXXXXX" (lihat PSM-1) dan baris "Nama:" dan "Alamat:" untuk diisi pelanggan. Tombol tersembunyi kalau keranjang kosong. — ⬜

**Tampilan (rombak)**
- **TOK-13** Kepala ringkas (logo kecil di samping "Open Order"). Lebar isi maks 1040px. Tombol keranjang berupa pil di tengah (bukan bilah selebar layar), putih saat kosong, pink saat berisi. Tombol "Tambah" bergaris tepi pink. — ⬜ belum dicek di browser (390 dan desktop)

**Urutan (usulan, menunggu persetujuan)**
- **TOK-14** Pilihan urutan di baris pencarian: "Urutan bawaan" (sesuai data), "Harga tertinggi" (tinggi → rendah), "Harga terendah" (rendah → tinggi). Berlaku bersama pencarian dan filter, dan memuat ulang daftar dari awal (TOK-7). Barang stok habis tetap ikut diurutkan menurut harga. Tidak disimpan antar kunjungan. — 🚫 menunggu persetujuan

**HP**
- **TOK-12** Tidak ada geser samping di lebar 390. Pencarian menempel di atas saat menggulir. Keranjang dan filter muncul dari bawah. Tombol keranjang memperhitungkan safe-area iPhone. — ✅ dicek di 390 (safe-area ⬜)
