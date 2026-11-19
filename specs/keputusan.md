# Catatan keputusan

Format: tanggal, keputusan, alasan. Yang masih terbuka ada di bagian bawah.

## Diputuskan

- **2026-11-03 — Tanpa payment gateway.** Pembelian lewat WhatsApp. Situs hanya katalog dan alat admin. *Alasan:* permintaan pemilik toko.
- **2026-11-03 — Kurir ditentukan admin, bukan pelanggan.** *Alasan:* alur toko.
- **2026-11-03 — Invoice dibuat sistem, bukan unggah PDF.** Tampilan mengikuti contoh dari pemilik toko. *Alasan:* satu sumber data, total otomatis, label bisa memakai barang yang sama.
- **2026-11-03 — Pengiriman hanya untuk invoice yang sudah dibayar (dengan bukti).** *Alasan:* mencegah kasus belum bayar tapi sudah dikirim. Dijaga di server.
- **2026-11-03 — Status DP dihapus.** Hanya belum bayar dan lunas. *Alasan:* DP membuka celah pengiriman sebelum lunas; belum ada aturan untuk DP.
- **2026-11-03 — Rekening disimpan di kode, bukan di formulir.** *Alasan:* permintaan pemilik toko. Ditaruh di server (bukan `admin.html`) karena halaman admin bisa dibuka siapa saja.
- **2026-11-03 — Label pengiriman menyamarkan nomor HP dan nama barang, tanpa harga.** *Alasan:* melindungi privasi pelanggan.
- **2026-11-03 — Tambah produk selalu lewat alur unggah foto (1 sampai 30 foto).** *Alasan:* satu proses saja.
- **2026-11-03 — Semua foto produk diberi watermark logo.** *Alasan:* permintaan pemilik toko.
- **2026-11-03 — Pagination diganti gulir ke bawah.** *Alasan:* permintaan pemilik toko.
- **2026-11-03 — Badge (New Stock, Hot Item, Flash Sale) diatur manual oleh admin.** *Alasan:* permintaan; Hot Item tidak otomatis.
- **2026-11-03 — Kartu produk hanya satu tombol keranjang yang berubah jadi `− n +`; di jumlah 1 tombol `−` menjadi 🗑.** *Alasan:* lebih jelas untuk pengguna, pembatalan langsung dari kartu.
- **2026-11-03 — Pilihan 3 kolom disembunyikan di HP.** *Alasan:* terlalu sempit untuk tombol jumlah.
- **2026-11-03 — Penyimpanan dipindah ke MongoDB dan dideploy di Vercel.** Dilakukan pemilik proyek di luar sesi ini. *Dampak:* server lokal butuh `MONGODB_URI`; lihat API-8.
- **2026-11-03 — Batas unggah dokumen diturunkan dari 5MB ke 3MB.** *Alasan:* batas isi permintaan Vercel ±4,5MB; file 5MB menjadi ±6,7MB setelah base64 dan akan gagal di Vercel.
- **2026-11-03 — Cara kerja memakai Spec-Driven Development** (lihat `README.md`).

- **2026-11-17 — Menu Pelanggan di admin diturunkan dari invoice; total belanja hanya dari invoice lunas.** *Alasan:* satu sumber data, tidak ada data pelanggan baru; permintaan pemilik toko.
- **2026-11-17 — Halaman Invoice punya dua tampilan, Daftar dan Gambar, pilihan diingat per browser.** Gambar menampilkan foto 2 barang teratas. *Alasan:* permintaan pemilik toko agar pengguna bisa memilih.
- **2026-11-17 — Pesanan dicatat di sistem saat tombol "Pesan via WhatsApp" ditekan (menu Pesanan Masuk), diberi kode `PSN-XXXXXX`, dan dicocokkan dengan invoice.** Invoice tetap dibuat admin. Pesanan yang tidak diinvoice dibiarkan, dihapus manual. *Alasan:* admin perlu membandingkan isi chat WhatsApp dengan pesanan dan invoice. Spec: [08](08-pesanan-masuk.md).

- **2026-11-18 — Daftar di admin (Katalog, Invoice, Pengiriman, Pelanggan, Pesanan Masuk) memakai halaman bernomor, maksimal 10 baris per halaman.** Toko pelanggan tetap gulir tak terbatas. *Alasan:* permintaan pemilik toko; membalik keputusan 2026-11-03 hanya untuk admin. Spec: [09](09-paginasi-admin.md).
- **2026-11-19 — Performa dan skala: cache foto selamanya, gzip, foto mini 400px, barang dan invoice masing-masing satu dokumen MongoDB, toko memuat barang per halaman dari server, tanpa migrasi data.** Perubahan perilaku: perubahan admin tampil di toko paling lama ±30 detik (cache CDN). *Alasan:* permintaan pemilik toko agar situs tidak melambat saat foto dan data banyak; situs belum dipakai sehingga aman diubah besar. Spec: [10](10-performa.md).

## Terbuka (belum diputuskan)

- Tab **Kategori** dan **Kurir** sebagai daftar terkelola di Pengaturan (ada di contoh desain).
- **Hot Item otomatis** dari penjualan (misalnya 3 barang paling sering masuk invoice).
- **Flash Sale** dengan harga coret dan hitung mundur (sekarang hanya label).
- **Stok berkurang otomatis** saat invoice dibayar (sekarang diatur manual oleh admin).
- **Pesanan WhatsApp menjadi invoice otomatis** (sekarang hanya tercatat sebagai Pesanan Masuk; admin yang membuat invoice).
- **DP/cicilan**: kalau dibutuhkan, perlu aturan kapan boleh dikirim.
- Label: kurir, resi, dan data pengirim.
