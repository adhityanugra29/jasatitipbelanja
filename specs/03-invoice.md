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
- **INV-6** Halaman Invoice: kartu ringkasan (jumlah belum dibayar, tagihan belum dibayar, jumlah sudah dibayar), tab Belum/Sudah Dibayar, pencarian, filter bulan; halaman bernomor, 10 per halaman (PAG-1). Ada dua tampilan (INV-11, INV-12), tanpa geser samping di komputer maupun HP. — ✅ diuji di Chrome (1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **INV-7** Menu ⋮ per baris: Edit invoice / Batal bayar, Lihat/cetak invoice, Lihat bukti bayar, Hapus invoice (merah, hanya belum dibayar). Nomor invoice bisa diklik untuk membuka invoice. — ⬜

**Invoice buatan sistem**
- **INV-8** Tampilan invoice: judul "INVOICE"; logo dan data toko (dari Pengaturan); nomor, tanggal, nama admin, status LUNAS/BELUM DIBAYAR; tiga kolom (ditagihkan kepada, alamat pengiriman, tanggal pengiriman · kurir); tabel produk (Qty, Harga, Diskon, Subtotal); ringkasan total; rekening; ucapan terima kasih. Baris data toko yang kosong tidak ditampilkan. — ⬜ belum pernah dilihat di browser
- **INV-9** **Cetak / Simpan PDF** membuka dialog cetak dengan ukuran A4; hanya invoice yang tercetak. — ⬜
- **INV-11** Tampilan **Daftar** (bawaan): satu baris padat per invoice, tanpa foto. Isi: nomor (bisa diklik) dan tanggal, nama, kota, barang dalam teks (maks. 2 baris), total, status, tombol aksi. Garis warna di kiri: pink = belum bayar, tosca = lunas. — ✅ diuji di Chrome (1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli
- **INV-12** Tampilan **Gambar**: grid kartu (3 kolom, 2, lalu 1 di HP). Tiap kartu: kepala (nomor, tanggal, status), nama + kota, lalu **daftar rincian semua barang** — foto kecil, nama, catatan/ukuran, harga satuan dengan lencana `qty×`, lencana diskon bila ada, dan subtotal barang; lalu baris Ongkir (bila ada), total, dan tombol aksi. Foto dicocokkan dari katalog lewat nama (sama seperti KIR-5); tak cocok = kotak 🛍️. — ⏳ desain ulang belum diuji di browser
- **INV-13** Pilihan Daftar/Gambar ada di sebelah pencarian dan diingat per browser (`localStorage`, kunci `invView`). Bila penyimpanan diblokir, tampilan Daftar. Aksi (Tandai Sudah Bayar, menu ⋮, buka invoice) sama di kedua tampilan. — ✅ diuji di Chrome (1280 dan 390) dengan server tiruan dan data contoh; belum dengan data asli

**Dokumen**
- **INV-10** Bukti bayar bersifat privat (hanya admin yang login). — ✅ `tests/api.test.js` (API-6)

**Formulir invoice**
- **INV-14** Isi barang di formulir berupa **kartu per barang** (bukan baris kolom tanpa label): judul "Barang N" di kepala berwarna (pemisah antar barang, ditambah jarak 16px antar kartu) dengan tombol Hapus (disembunyikan bila hanya satu barang), kolom **Produk** dan **Keterangan (opsional)**, lalu satu baris **Qty · Harga (Rp) · Diskon (Rp)** yang semuanya berlabel, dan **Subtotal** barang itu yang ikut berubah saat diketik. Bila diskon melebihi qty×harga, kartu ditandai merah dengan "Diskon melebihi harga". Tombol "+ Tambah barang" selebar form. Di layar >700px Produk dan Keterangan bersebelahan. Tanpa geser samping di 390. — ✅ diuji di Chrome (CDP) lebar 390 dan 1280 dengan server demo (kepala berwarna dan jarak 16px antar kartu terukur): kartu dan label, subtotal hidup, diskon berlebih merah, tambah/hapus barang, Hapus tersembunyi untuk satu barang, tanpa geser samping, simpan invoice dari pesanan
- **INV-15** *(dihapus atas permintaan)* Panel "Cek pesanan" di formulir invoice tidak diperlukan. Perbandingan pesanan vs invoice hanya berupa penanda di daftar Pesanan Masuk (PSM-7).
