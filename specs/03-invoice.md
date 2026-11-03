# 03 — Invoice dan pembayaran

Berkas: `admin.html` (menu Invoice)

## Tujuan
Setelah pelanggan memesan lewat WhatsApp, admin membuat invoice di sistem. Invoice yang dibayar (dengan bukti) otomatis masuk ke Pengiriman, sehingga tidak pernah ada pesanan belum bayar yang terkirim.

## Di luar cakupan
Pesanan masuk otomatis dari WhatsApp. Status DP/cicilan. Stok berkurang otomatis saat dibayar. Unggah PDF invoice (digantikan invoice buatan sistem).

## Kriteria

**Alur**
- **INV-1** Alur: invoice dibuat (belum dibayar) → bukti bayar diunggah → otomatis masuk Pengiriman. Pengiriman sebelum pembayaran **tidak mungkin**, dijaga server. — ✅ `tests/api.test.js` (API-4c)
- **INV-2** Bukti pembayaran (foto, atau PDF ≤3MB) wajib untuk menandai sudah bayar. Tanggal bayar = hari itu. **Batal bayar** hanya bila belum dikirim. Edit dan Hapus hanya untuk invoice belum dibayar. — ⬜ (aturan server ✅ API-4)

**Data**
- **INV-3** Invoice berisi: nomor otomatis `INV-YYYYMMNNNN` (boleh diubah), nama penerima, nomor HP (08…), alamat, kota, barang, ongkos kirim, tanggal buat. Nama, HP, alamat, dan minimal satu barang wajib. — ✅ aturan di server (API-3, API-4); formulir ⬜
- **INV-4** Setiap baris barang: nama, keterangan (opsional), qty ≥1, harga ≥1, diskon dalam rupiah per baris dan tidak melebihi qty×harga. Subtotal = qty×harga − diskon. Total Belanja = Σ qty×harga; Total Diskon = Σ diskon; **Total = Belanja − Diskon + Ongkir**. Server menghitung ulang. — ✅ server (API-3); hitungan di formulir ⬜
- **INV-5** HP dinormalisasi: `+62…`, `62…`, `8…` → `08…`. Hanya nomor HP Indonesia. — ✅ server (API-3)

**Halaman**
- **INV-6** Halaman Invoice: kartu ringkasan (jumlah belum dibayar, tagihan belum dibayar, jumlah sudah dibayar), tab Belum/Sudah Dibayar, pencarian, filter bulan; daftar bertambah ke bawah (15 per muat). Di HP tabel menjadi kartu. — ✅ dicek di 390; pencarian/filter/gulir ⬜
- **INV-7** Menu ⋮ per baris: Edit invoice / Batal bayar, Lihat/cetak invoice, Lihat bukti bayar, Hapus invoice (merah, hanya belum dibayar). Nomor invoice bisa diklik untuk membuka invoice. — ⬜

**Invoice buatan sistem**
- **INV-8** Tampilan invoice: judul "INVOICE"; logo dan data toko (dari Pengaturan); nomor, tanggal, nama admin, status LUNAS/BELUM DIBAYAR; tiga kolom (ditagihkan kepada, alamat pengiriman, tanggal pengiriman · kurir); tabel produk (Qty, Harga, Diskon, Subtotal); ringkasan total; rekening; ucapan terima kasih. Baris data toko yang kosong tidak ditampilkan. — ⬜ belum pernah dilihat di browser
- **INV-9** **Cetak / Simpan PDF** membuka dialog cetak dengan ukuran A4; hanya invoice yang tercetak. — ⬜

**Dokumen**
- **INV-10** Bukti bayar bersifat privat (hanya admin yang login). — ✅ `tests/api.test.js` (API-6)
