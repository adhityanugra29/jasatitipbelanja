# 08 — Pesanan masuk

Berkas: `index.html`, `server.js`, `admin.html` (menu Pesanan Masuk, menu Invoice)

## Tujuan
Saat pelanggan menekan "Pesan via WhatsApp", isi keranjangnya tercatat di sistem. Admin bisa **mencocokkan** isi chat WhatsApp dengan pesanan di sistem, lalu dengan invoice yang dibuat, sehingga tidak ada barang yang terlewat atau salah ketik.

## Di luar cakupan
Invoice dibuat otomatis (admin tetap membuatnya). Mengetahui apakah pelanggan benar-benar mengirim chat (sistem hanya tahu tombol ditekan). Alamat pelanggan (tetap diisi di WhatsApp). Membuktikan nomor HP milik pelanggan (nomor diisi sendiri oleh pelanggan, tidak diverifikasi). Stok berkurang otomatis. Notifikasi ke admin.

## Alur
1. Pelanggan mengisi **nama dan nomor HP** di keranjang, lalu menekan tombol → situs membuat **kode pesanan** (`PSN-` + 6 karakter acak) → mengirim pesanan ke server → membuka WhatsApp dengan pesan yang memuat kode itu.
2. Admin membuka **Pesanan Masuk**, mencocokkan kode di chat dengan daftar, lalu menekan **Buat Invoice**: formulir invoice terisi barang, nama, dan HP dari pesanan. Bila nomor HP itu sudah punya invoice sebelumnya (pelanggan lama), alamat dan kota ikut terisi dari invoice terakhirnya. Admin melengkapi alamat (bila baru) dan ongkir.
3. Di invoice, admin melihat **perbandingan** pesanan vs invoice; selisih ditandai.

## Kriteria

**Mencatat**
- **PSM-1** Menekan "Pesan via WhatsApp" mengirim `POST /api/inbox` (publik) berisi kode, nama, nomor HP, dan daftar `{id, qty}`. Pesan WhatsApp memuat baris `Kode pesanan: PSN-XXXXXX`, `Nama:` dan `HP:` (terisi dari keranjang), dan `Alamat:` (diisi pelanggan). WhatsApp tetap terbuka walau pengiriman ke server gagal. — ⬜ kode dan pengiriman ditulis di `index.html`; sintaks diperiksa, belum dicoba di browser
- **PSM-2** Server menyimpan nama dan harga barang **dari katalog** saat itu (kiriman klien soal harga/nama diabaikan) beserta waktu. Barang yang tidak ada di katalog diabaikan; tanpa barang valid → 400. Nama wajib (≤100); HP dinormalisasi seperti INV-5 dan harus `^08d{8,12}$`, kalau tidak → 400. Kode yang sama dikirim lagi tidak membuat pesanan ganda. — ✅ `tests/api.test.js` (PSM)
- **PSM-3** Perlindungan spam: kode harus berformat `^PSN-[A-Z0-9]{6}$`; maks. 50 jenis barang, qty 1–999; isi permintaan ≤20KB; hanya 500 pesanan terbaru yang disimpan (yang lebih lama dibuang). — ✅ format kode, qty, ukuran isi: `tests/api.test.js` (PSM); batas 500 ⬜

**Admin**
- **PSM-4** `GET /api/inbox` dan perubahan lain butuh `x-admin` (401 bila tidak). Hanya `POST /api/inbox` yang publik. — ✅ `tests/api.test.js` (PSM)
- **PSM-5** Menu **Pesanan Masuk**: daftar terbaru dulu (kode, waktu, nama, HP, barang, total sesuai katalog; penanda **Pelanggan lama** bila HP sudah punya invoice), pencarian kode/nama/HP/barang, tab **Baru** / **Sudah Diinvoice**. Pesanan Baru bisa dihapus. — ⬜ ditulis di `admin.html`, belum dilihat di browser (hapus ditolak server bila sudah diinvoice: ✅ PSM)
- **PSM-6** **Buat Invoice** dari pesanan membuka formulir invoice dengan barang (nama, qty, harga), nama penerima, dan HP terisi dari pesanan; alamat dan kota terisi bila pelanggan lama (PSM-11). Invoice menyimpan `pesananKode`; pesanan itu menjadi **Sudah Diinvoice**. Satu pesanan hanya satu invoice; menghapus invoice mengembalikan pesanan ke Baru. — ✅ sisi server (kode tersimpan, satu invoice per pesanan, hapus ditolak): `tests/api.test.js` (PSM); formulir ⬜ belum dilihat di browser. Status "Sudah Diinvoice" diturunkan dari invoice, jadi menghapus invoice otomatis mengembalikan ke Baru
- **PSM-7** Invoice yang berasal dari pesanan menampilkan **perbandingan**: barang di pesanan vs di invoice (nama, qty). Selisih ditandai: barang hilang, barang tambahan, qty beda. Harga yang beda tidak dianggap selisih (admin boleh menyesuaikan). — ⬜ logika `compare()` diuji dengan kode asli (sama, jumlah beda, hilang, tambahan, nama beda huruf/spasi); tampilan ⬜
- **PSM-8** Invoice tanpa pesanan (dibuat manual dari chat) tetap bisa dibuat seperti sekarang. — ⬜ tidak diuji; kode lama tidak diubah

**Keranjang dan pelanggan**
- **PSM-10** Keranjang punya kolom **Nama** dan **Nomor HP**, wajib diisi sebelum "Pesan via WhatsApp" bisa dipakai (kalau kosong atau HP bukan 08…, tombol tidak membuka WhatsApp dan muncul pesan). Isiannya diingat di browser (`localStorage`) untuk pesanan berikutnya. — ⬜ ditulis di `index.html`; sintaks diperiksa, belum dicoba di browser (sisi server, nama/HP wajib dan dinormalisasi: ✅ `tests/api.test.js` PSM)
- **PSM-11** Pelanggan lama dikenali lewat **nomor HP yang sama** (setelah dinormalisasi) dengan invoice yang sudah ada. Menu Pelanggan tidak berubah: tetap diturunkan dari invoice saja (spec 07). — ⬜ pencarian invoice terakhir per HP diperiksa dengan data demo (alamat terisi untuk HP lama, kosong untuk HP baru); tampilan belum dilihat di browser

**Penyimpanan**
- **PSM-9** Koleksi MongoDB tersendiri `inbox` (satu dokumen per kode; `_id` = kode, jadi tulis serentak tidak saling menimpa). `orders`/`data` tidak berubah selain kolom `pesananKode` di invoice. — ✅ `tests/api.test.js` (PSM) (dengan MongoDB tiruan `tests/mongo-mock.js`; MongoDB sungguhan ⬜)

## Diputuskan
- Pesanan Baru yang tidak pernah diinvoice (pelanggan batal) dibiarkan; admin menghapus manual (PSM-5). Batas 500 pesanan (PSM-3) menjaga data tetap kecil.
