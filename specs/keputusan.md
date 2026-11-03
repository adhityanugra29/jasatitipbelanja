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
- **2026-11-03 — Cara kerja memakai Spec-Driven Development** (lihat `README.md`).

## Terbuka (belum diputuskan)

- Tab **Kategori** dan **Kurir** sebagai daftar terkelola di Pengaturan (ada di contoh desain).
- **Hot Item otomatis** dari penjualan (misalnya 3 barang paling sering masuk invoice).
- **Flash Sale** dengan harga coret dan hitung mundur (sekarang hanya label).
- **Stok berkurang otomatis** saat invoice dibayar (sekarang diatur manual oleh admin).
- **Pesanan WhatsApp tercatat otomatis** sebagai invoice (butuh perlindungan spam).
- **DP/cicilan**: kalau dibutuhkan, perlu aturan kapan boleh dikirim.
- Label: kurir, resi, dan data pengirim.
