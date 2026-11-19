# 11 — Paginasi dari server (admin)

Berkas: `server.js`, `public/admin.html`, `tests/api.test.js`, `tests/mongo-mock.js`

**Status: DISETUJUI pemilik (2026-11-19), termasuk Katalog. DIKERJAKAN dan diuji (API terhadap MongoDB tiruan, tampilan di Chrome lebar 390). Belum diuji di MongoDB sungguhan (lihat Risiko).**

## Tujuan
Admin tetap cepat dan ringan saat invoice dan barang ribuan: saat login dan saat pindah halaman, browser hanya mengunduh baris yang tampil (10 atau 12), bukan seluruh data. Menutup *shortcut* di [PERF-8](10-performa.md) (`GET /api/orders` mengirim semua invoice) dan `GET /api/admin/catalog` (semua barang).

Tampilan dan aturan bisnis **tidak berubah** (PAG-1..5, INV, KIR, PLG, PSM, KAT tetap berlaku). Yang berubah hanya dari mana datanya: server menyaring, mengurutkan, menghitung, dan memotong halaman.

## Di luar cakupan
Mengubah tampilan, jumlah baris per halaman, atau aturan bisnis. Pencarian teks penuh (tetap pencarian substring, tanpa indeks teks). Kursor/infinite scroll di admin (tetap halaman bernomor). Memperbaiki nomor invoice ganda setelah ada invoice yang dihapus (sudah begitu sebelumnya; lihat Risiko).

## Rancangan

Semua endpoint butuh `x-admin`. Parameter umum: `page` (mulai 1), `per` (10; Katalog 12; maks 50), `q` (cari, tanpa membedakan huruf besar/kecil, karakter regex dinetralkan). Respons daftar selalu: `{ items, total, ... }` dengan `total` = jumlah setelah disaring (untuk "Menampilkan 11–20 dari 47", PAG-2).

| Endpoint | Untuk | Respons selain `items`/`total` |
|---|---|---|
| `GET /api/invoices?tab=unpaid\|paid&q&month=YYYY-MM&page` | menu Invoice | `counts{unpaid,paid}`, `unpaidSum`, `months[]` |
| `GET /api/shipping?tab=todo\|done&q&month&courier&today=YYYY-MM-DD&page` | menu Pengiriman | `counts{todo,done}`, `stats{today,late,sched,none}`, `months[]`, `couriers[]`; urutan memakai `today` dari browser; teks status tiap baris dihitung browser dari barisnya sendiri |
| `GET /api/customers?q&page` | menu Pelanggan | `stats{customers,repeat,spent}` |
| `GET /api/customers/:phone/invoices` | rincian satu pelanggan (maks 100, terbaru dulu) | — |
| `GET /api/inbox?tab=new\|match\|done&q&page` | menu Pesanan Masuk | `counts{new,match,done}`; tiap baris membawa `invoice` (bila sudah diinvoice), `invCount` dan `last{city,address}` (invoice terakhir nomor HP itu) |
| `GET /api/counts` | angka di sidebar | `{unpaid, todo, newInbox}` |
| `GET /api/orders/:id` | satu invoice | — |
| `GET /api/next-invoice?prefix=INV-202611` | nomor invoice berikutnya | `{invoice}` |
| `GET /api/admin/products?q&cat&stock=habis\|ada\|terbatas&page&per=12` | menu Katalog | `count` (semua barang, tanpa saringan) |
| `GET /api/admin/catalog` (diperkecil) | pengaturan toko | `{wa, notice, cats, catCounts{kategori: jumlah}}` tanpa daftar barang |

Dihapus: `GET /api/orders` (semua invoice). `PUT/DELETE /api/orders/:id`, `PUT /api/products`, `DELETE /api/products/:id` tidak berubah. `PUT /api/data` menerima tambahan `rename: {"nama lama": "nama baru"}`: server memindahkan semua barang kategori lama ke yang baru (SET-7), supaya browser tidak perlu memegang seluruh katalog. Tukar nama dua kategori sekaligus (A↔B) tidak didukung.

## Kriteria

**Invoice**
- **PGS-1** `/api/invoices` menyaring per tab, pencarian (pelanggan, nomor, kota), dan bulan (`created`), lalu memotong halaman. Urutan sama seperti sekarang: Belum Dibayar = tanggal buat naik; Sudah Dibayar = tanggal bayar turun. `counts`, `unpaidSum`, dan `months` dihitung dari **semua** invoice, tidak terpengaruh pencarian/bulan (sama seperti kartu ringkasan sekarang, INV-6/PAG-5). — ✅ `tests/api.test.js` (PGS-1/6/9); tampilan di Chrome (tab, cari, halaman 2)
- **PGS-2** Tiap barang di baris membawa `pic` (foto mini) bila ada barang katalog yang namanya cocok (nama, "nama catatan", atau "nama (catatan)", tanpa membedakan huruf besar/kecil), dicari di server hanya untuk baris di halaman itu. Browser tidak lagi butuh seluruh katalog untuk menampilkan foto (INV-12). — ✅ `tests/api.test.js` (PGS-2); API dengan data demo (foto tampil di Gambar belum dilihat dengan foto asli)

**Pengiriman**
- **PGS-3** `/api/shipping` hanya berisi invoice sudah dibayar (KIR-1). Tab *Perlu Dikirim* diurutkan seperti KIR-2 (siap cetak label dulu, lalu Terlambat, Hari ini, Terjadwal, Belum dijadwalkan, lalu tanggal), tab *Sudah Dikirim* menurut tanggal kirim turun. `stats` dihitung dari seluruh invoice belum dikirim, memakai tanggal `today` kiriman browser (zona waktu pengguna). `months` = bulan dari `shipDate` atau `paidAt`; `couriers` = kurir yang pernah dipakai. — ✅ `tests/api.test.js` (PGS-3); tampilan di Chrome

**Pelanggan**
- **PGS-4** `/api/customers` mengelompokkan invoice per nomor HP di server (agregasi): nama/kota/alamat dari invoice terbaru (PLG-2), jumlah invoice, total belanja hanya invoice lunas (PLG-3), invoice terakhir; urut invoice terakhir turun; cari nama/HP/kota (PLG-4). `stats` untuk seluruh pelanggan (PLG kartu ringkasan). Rincian invoice satu pelanggan diambil saat barisnya dibuka (PLG-5). — ✅ `tests/api.test.js` (PGS-4, agregasi pada MongoDB tiruan); tampilan di Chrome (rincian, buka invoice, cari). Agregasi belum dicoba di MongoDB sungguhan

**Pesanan Masuk**
- **PGS-5** `/api/inbox` menentukan tahap (Baru / Sudah Dicocokkan / Sudah Diinvoice, PSM-12) di server: *Sudah Diinvoice* = ada invoice dengan `pesananKode` itu. Baris membawa invoice terkait (untuk perbandingan PSM-7), `invCount` ("PELANGGAN LAMA · N invoice") dan `last` (untuk mengisi invoice baru dari pesanan, PSM-9). Batas 500 pesanan terbaru tetap (PSM, PERF-6). — ✅ `tests/api.test.js` (PSM, PGS-5); tampilan di Chrome (cocokkan, buat invoice, tab dan angka menyegarkan)

**Umum admin**
- **PGS-6** Sidebar (jumlah belum bayar, perlu dikirim, pesanan baru) dari `/api/counts`, disegarkan setelah tiap simpan/hapus. Login tidak lagi mengunduh daftar apa pun selain halaman pertama menu yang dibuka. — ✅ `tests/api.test.js` (PGS-1/6/9); Chrome: login mengunduh ±2KB (katalog, pengaturan, halaman 1, angka), angka sidebar berubah setelah simpan
- **PGS-7** Setelah menyimpan/menghapus/membayar/mengirim, daftar yang sedang dibuka dimuat ulang dari server (halaman aktif tetap, atau mundur ke halaman terakhir bila kosong, PAG-3). Jawaban lama yang datang terlambat (mis. karena pencarian berganti) diabaikan. Saat memuat tampil "Memuat…" tanpa menggeser tata letak; gagal memuat tampil pesan dengan tombol coba lagi. — ✅ Chrome: simpan/hapus/cocok/ubah barang lalu daftar menyegarkan; gagal memuat (password salah) tampil pesan + Coba lagi dan pulih. Mundur ke halaman terakhir (`lastPage`) dan pengabaian jawaban lama tidak diuji terpisah
- **PGS-8** Mencari mengetik dengan jeda 250 ms sebelum memanggil server. — ✅ Chrome: empat ketikan beruntun = satu permintaan ke server
- **PGS-9** `/api/next-invoice` menghitung nomor di server: awalan + (jumlah invoice berawalan itu + 1), 4 digit (INV-3). Perilaku sama dengan sekarang. — ✅ `tests/api.test.js` (PGS-1/6/9); Chrome: nomor di formulir dari server

**Katalog (admin)**
- **PGS-10** `/api/admin/products` menyaring pencarian (nama, keterangan, kategori), kategori, dan stok (habis/ada/diatur) dan memotong 12 per halaman (KAT-15); urut terbaru dulu. `/api/admin/catalog` tidak lagi memuat daftar barang; `catCounts` menggantikan hitungan "dipakai N barang" di Pengaturan (SET-7). — ✅ `tests/api.test.js` (PGS-10); Chrome: halaman 2, cari, stok habis, ganti nama kategori, edit, hapus
- **PGS-11** Pilihan "+ Tambah barang dari katalog…" di jendela pencocokan pesanan (PSM-16) berubah dari daftar pilihan berisi seluruh katalog menjadi **kolom ketik dengan saran** (memakai `GET /api/products?q=`). Ini satu-satunya perubahan tampilan. — ✅ Chrome: saran muncul dari server (`limit=8`), memilih menambah barang, Sudah Cocok tersimpan

## Pengujian
- `tests/api.test.js`: tiap endpoint: batas halaman (halaman 0, di luar jumlah, `per` >50), `total` dan `counts` benar setelah menyaring, urutan, pencarian dengan karakter aneh, bulan, `stats` pengiriman pada tanggal tertentu, pengelompokan pelanggan (HP sama = satu pelanggan, lunas vs belum), tahap pesanan masuk, `pic`, `next-invoice`, 401 tanpa login, dan `GET /api/orders` sudah tidak ada.
- `tests/mongo-mock.js` ditambah `aggregate` (`$match`, `$sort`, `$group`, `$skip`, `$limit`) secukupnya untuk Pelanggan dan jumlah tagihan.
- Chrome (lebar 390, server demo + 60 invoice + 40 barang tambahan; hasilnya: semua menu berjalan, tanpa galat konsol, tanpa geser samping). **Lebar 1280 belum dicek.** Skrip uji ada di scratchpad sesi, tidak disimpan di repo.

## Hasil ukur (MongoDB tiruan, jadi hanya ukuran data yang bermakna; 5.000 barang + 20.000 invoice, tanpa gzip)
| Permintaan admin | Ukuran |
|---|---|
| Login (pengaturan, katalog kecil, angka sidebar) | ±0,6KB (+ pengaturan toko ±0,3KB) |
| Katalog halaman 1 (12 barang) | ±2KB |
| Invoice halaman 1 (10) | ±5KB |
| Pengiriman halaman 1 (10) | ±5KB |
| Pelanggan halaman 1 (10) | ±1,6KB |
| Sebelumnya: semua invoice saat login | ±9MB (±1MB gzip) |

Waktu di server tiruan tidak berarti (memindai memori). Waktu nyata di Atlas belum diukur.

## Risiko
- Perubahan besar di `admin.html` (semua menu memuat dari server, bukan dari memori); diuji di Chrome per menu (lihat Pengujian).
- Agregasi pelanggan (`$group` dengan `$cond`), `$regex` dan `distinct` dengan saringan belum pernah dicoba di MongoDB sungguhan (API-8): jalankan `tests/api.test.js` terhadap database Atlas uji sebelum dipakai. Agregasi pelanggan memindai semua invoice tiap kali menu Pelanggan dibuka (3 agregasi paralel); pada puluhan ribu invoice pertimbangkan koleksi ringkasan atau indeks `phone`.
- Pengiriman tab *Perlu Dikirim* memuat semua invoice yang sudah dibayar tapi belum dikirim ke memori server untuk diurutkan (himpunan kecil dalam praktik).
- Pesanan masuk dan angka sidebar membaca maksimal 500 pesanan terbaru tiap permintaan.
- Nomor invoice dihitung dari jumlah, jadi menghapus invoice lalu membuat yang baru bisa menghasilkan nomor kembar (sudah begitu sebelumnya). Tidak diperbaiki di sini; usul: pakai nomor tertinggi + 1.
- Perubahan angka sidebar kini ikut ke server (satu permintaan kecil tambahan per simpan).
