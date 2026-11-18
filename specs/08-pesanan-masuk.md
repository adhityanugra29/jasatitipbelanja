# 08 — Pesanan masuk

Berkas: `index.html`, `server.js`, `admin.html` (menu Pesanan Masuk, menu Invoice)

## Tujuan
Saat pelanggan menekan "Pesan via WhatsApp", isi keranjangnya tercatat di sistem. Admin bisa **mencocokkan** isi chat WhatsApp dengan pesanan di sistem, lalu dengan invoice yang dibuat, sehingga tidak ada barang yang terlewat atau salah ketik.

## Di luar cakupan
Invoice dibuat otomatis (admin tetap membuatnya). Mengetahui apakah pelanggan benar-benar mengirim chat (sistem hanya tahu tombol ditekan). Membuktikan nomor HP milik pelanggan (nomor diisi sendiri oleh pelanggan, tidak diverifikasi). Stok berkurang otomatis. Notifikasi ke admin.

## Alur
1. Pelanggan mengisi **nama, nomor HP, dan alamat** di keranjang, lalu menekan tombol → situs membuat **kode pesanan** (`PSN-` + 6 karakter acak) → mengirim pesanan ke server → membuka WhatsApp dengan pesan yang memuat kode itu.
2. Admin membuka **Pesanan Masuk**, mencocokkan kode di chat dengan daftar, lalu menekan **Buat Invoice**: formulir invoice terisi barang, nama, dan HP dari pesanan. Bila nomor HP itu sudah punya invoice sebelumnya (pelanggan lama), alamat dan kota ikut terisi dari invoice terakhirnya. Admin melengkapi alamat (bila baru) dan ongkir.
3. Di invoice, admin melihat **perbandingan** pesanan vs invoice; selisih ditandai.

## Kriteria

**Mencatat**
- **PSM-1** Menekan "Pesan via WhatsApp" mengirim `POST /api/inbox` (publik) berisi kode, nama, nomor HP, alamat, dan daftar `{id, qty}`. Pesan WhatsApp memuat baris `Kode pesanan: PSN-XXXXXX`, `Nama:`, `HP:`, dan `Alamat:` (semuanya terisi dari keranjang). WhatsApp tetap terbuka walau pengiriman ke server gagal. — ✅ pesanan dari klik tombol di halaman keranjang tercatat di server (Chrome CDP + server demo); produksi ⬜
- **PSM-2** Server menyimpan nama dan harga barang **dari katalog** saat itu (kiriman klien soal harga/nama diabaikan) beserta waktu. Barang yang tidak ada di katalog diabaikan; tanpa barang valid → 400. Nama wajib (≤100); HP dinormalisasi seperti INV-5 dan harus `^08\d{8,12}$`, kalau tidak → 400. Alamat disimpan (≤300); server **tidak** menolak alamat kosong (halaman toko lama yang masih terbuka tetap tercatat), keranjang yang mewajibkannya (PSM-10). Kode yang sama dikirim lagi tidak membuat pesanan ganda. — ✅ `tests/api.test.js` (PSM)
- **PSM-3** Perlindungan spam: kode harus berformat `^PSN-[A-Z0-9]{6}$`; maks. 50 jenis barang, qty 1–999; isi permintaan ≤20KB; hanya 500 pesanan terbaru yang disimpan (yang lebih lama dibuang). — ✅ format kode, qty, ukuran isi: `tests/api.test.js` (PSM); batas 500 ⬜

**Admin**
- **PSM-4** `GET /api/inbox` dan perubahan lain butuh `x-admin` (401 bila tidak). Hanya `POST /api/inbox` yang publik. — ✅ `tests/api.test.js` (PSM)
- **PSM-5** Menu **Pesanan Masuk**: daftar terbaru dulu (kode, waktu, nama, HP, barang, total sesuai katalog; penanda **Pelanggan lama** bila HP sudah punya invoice), pencarian kode/nama/HP/barang, tab **Baru** / **Sudah Diinvoice**. Pesanan Baru bisa dihapus. — ⬜ ditulis di `admin.html`, belum dilihat di browser (hapus ditolak server bila sudah diinvoice: ✅ PSM)
- **PSM-6** **Buat Invoice** dari pesanan membuka formulir invoice dengan barang (nama, qty, harga), nama penerima, HP, dan alamat terisi dari pesanan; kota terisi dari invoice terakhir bila pelanggan lama dan alamatnya sama (PSM-11). Pesanan lama tanpa alamat memakai alamat invoice terakhir pelanggan lama. Invoice menyimpan `pesananKode`; pesanan itu menjadi **Sudah Diinvoice**. Satu pesanan hanya satu invoice; menghapus invoice mengembalikan pesanan ke Baru. — ✅ sisi server (kode tersimpan, satu invoice per pesanan, hapus ditolak): `tests/api.test.js` (PSM); formulir ✅ terisi nama, HP, alamat dari pesanan (pelanggan baru: kota kosong; pelanggan lama dengan alamat sama: kota terisi), diuji di Chrome dengan server demo. Status "Sudah Diinvoice" diturunkan dari invoice, jadi menghapus invoice otomatis mengembalikan ke Baru
- **PSM-7** Invoice yang berasal dari pesanan menampilkan **perbandingan**: barang di pesanan vs di invoice (nama, qty). Selisih ditandai: barang hilang, barang tambahan, qty beda. Harga yang beda tidak dianggap selisih (admin boleh menyesuaikan). — ⬜ logika `compare()` diuji dengan kode asli (sama, jumlah beda, hilang, tambahan, nama beda huruf/spasi); tampilan ⬜
- **PSM-8** Invoice tanpa pesanan (dibuat manual dari chat) tetap bisa dibuat seperti sekarang. — ⬜ tidak diuji; kode lama tidak diubah

**Keranjang dan pelanggan**
- **PSM-10** Keranjang punya kolom **Nama**, **Nomor HP**, dan **Alamat lengkap**, wajib diisi sebelum "Pesan via WhatsApp" bisa dipakai. Label ketiganya bertanda merah `*` ("wajib diisi"). Saat tombol ditekan dan ada yang kosong atau HP bukan 08…, WhatsApp tidak dibuka, **semua kolom yang bermasalah ditandai merah sekaligus**, muncul pesan untuk yang pertama, dan kolom itu difokuskan. Isiannya **tersimpan otomatis** di browser (`localStorage`) setiap kali berubah (mengetik, pindah kolom, atau meninggalkan halaman) dan terisi kembali untuk pesanan berikutnya. Di bawah form tampil "✓ Tersimpan di perangkat ini" bila ketiganya terisi dan penyimpanan berhasil, atau "Tidak bisa disimpan di browser ini" bila penyimpanan diblokir (mode privat). — ✅ diuji di Chrome (CDP, lebar 390, server demo): tiga kolom tampil, alamat kosong ditolak dan memfokuskan kolom alamat, pesan WhatsApp memuat alamat, isian diingat setelah muat ulang; nama/HP wajib dan dinormalisasi di server: `tests/api.test.js` (PSM); HP salah format di browser ⬜; ✅ tanda `*`, penandaan semua kolom bermasalah sekaligus, penyimpanan saat berubah (termasuk hanya peristiwa change dari isian otomatis), pulih setelah muat ulang, keterangan "Tersimpan" dan peringatan saat penyimpanan diblokir: diuji di Chrome (CDP, 390) dengan server demo
- **PSM-11** Pelanggan lama dikenali lewat **nomor HP yang sama** (setelah dinormalisasi) dengan invoice yang sudah ada. Menu Pelanggan tidak berubah: tetap diturunkan dari invoice saja (spec 07). — ⬜ pencarian invoice terakhir per HP diperiksa dengan data demo (alamat terisi untuk HP lama, kosong untuk HP baru); tampilan belum dilihat di browser

**Penyimpanan**
- **PSM-9** Koleksi MongoDB tersendiri `inbox` (satu dokumen per kode; `_id` = kode, jadi tulis serentak tidak saling menimpa). `orders`/`data` tidak berubah selain kolom `pesananKode` di invoice. — ✅ `tests/api.test.js` (PSM) (dengan MongoDB tiruan `tests/mongo-mock.js`; MongoDB sungguhan ⬜)

## Diputuskan
- Pesanan Baru yang tidak pernah diinvoice (pelanggan batal) dibiarkan; admin menghapus manual (PSM-5). Batas 500 pesanan (PSM-3) menjaga data tetap kecil.
