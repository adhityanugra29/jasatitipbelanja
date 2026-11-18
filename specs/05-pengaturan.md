# 05 — Pengaturan

Berkas: `admin.html` (menu Pengaturan), `server.js` (konstanta `BANK`)

## Tujuan
Admin mengatur identitas toko dan pengumuman tanpa menyentuh kode. Data sensitif seperti rekening tetap di kode.

## Di luar cakupan
Rekening bank (tetap di kode, SET-3).

## Kriteria

- **SET-1** Tab **Toko**: nomor WhatsApp (hanya digit) dan pengumuman (≤200) yang tampil di atas katalog toko. — ✅ pembersihan di server (API-2); formulir ⬜
- **SET-2** Tab **Invoice**: nama toko, alamat, telepon, email, NPWP, nama admin (masing-masing ≤200). Data ini **privat** (hanya admin yang login) dan tampil di kepala invoice. — ✅ API-7; formulir ⬜
- **SET-3** **Rekening** (nama bank, nomor, atas nama) disimpan di kode (`BANK` di `server.js`), **tidak ada di formulir** dan tidak bisa diubah lewat API. Tampil di footer invoice. — ✅ `tests/api.test.js` (API-7)
- **SET-4** Satu tombol **Simpan Pengaturan** menyimpan kedua tab sekaligus. — ⬜
- **SET-5** Isi rekening di `server.js` masih **data contoh** (`BCA`, `0000000000`). Wajib diganti sebelum invoice dikirim ke pelanggan. — 🚫 menunggu pemilik toko

## Perluasan (disetujui pemilik)

Keputusan: kolom kurir di Pengiriman tetap boleh diketik bebas; daftar kategori awal diambil dari kategori yang dipakai barang; tidak ada tab "lain-lain" tambahan (bisa ditambah kemudian).

Tab Pengaturan menjadi: **Toko · Kategori · Kurir · Invoice**. Semua disimpan di server (kunci `settings`/`data`), dibersihkan dan dibatasi panjangnya di server seperti SET-1/2.

- **SET-6** Tab **Kategori**: daftar kategori produk. Admin bisa **tambah**, **ubah nama**, **hapus**, dan **atur urutan** (naik/turun). Urutan ini dipakai di chip filter toko dan pilihan kategori di Edit Barang/Tambah Produk (menggantikan daftar yang kini dibentuk otomatis dari barang). Nama unik (tanpa membedakan huruf besar/kecil), ≤40 huruf. — ✅ server (`tests/api.test.js` SET-6/7: urutan, kembar dibuang); UI tab Kategori (tambah, ubah nama, urutan, simpan) diuji di Chrome 390; urutan chip di toko ⬜
- **SET-7** Ubah nama kategori ikut mengubah semua barang yang memakainya. Kategori yang **masih dipakai barang tidak bisa dihapus** (tampil jumlah barangnya; pindahkan barangnya dulu). — ✅ server menolak hapus kategori yang dipakai (tes); ubah nama ikut mengubah barang diuji di Chrome (Contoh → Umum); pesan penolakan di UI ⬜
- **SET-8** Tab **Kurir**: daftar kurir (tambah, ubah nama, hapus, urutan, dan **aktif/nonaktif**). Hanya kurir aktif yang muncul di pilihan Pengiriman. Bawaan awal: Kurir Internal, Diambil Sendiri oleh Pelanggan, JNE, J&T, SiCepat, GoSend. — ✅ server (tes SET-8/10/11); UI tab Kurir (tambah, aktif/nonaktif, simpan) diuji di Chrome 390; pilihan di Pengiriman hanya kurir aktif ⬜
- **SET-9** Pesanan lama yang memakai kurir yang sudah dihapus tetap menampilkan nama kurirnya (tidak diubah). Kolom kurir di Pengiriman tetap boleh diisi bebas (ketik sendiri). — ✅ `PUT /api/orders` tidak diubah (kurir tetap teks bebas ≤40); belum diuji di tampilan ⬜
- **SET-10** Tab **Invoice** ditambah: **kalimat penutup** (bawaan: "Terima kasih telah mempercayakan belanja Anda kepada kami.") dan **catatan kaki** opsional (mis. syarat pembayaran/retur), ≤300 huruf, tampil di bawah invoice dan ikut tercetak. Kosong = memakai bawaan / tidak tampil. — ✅ server membatasi 300 huruf (tes); simpan lewat UI diuji; tampil di invoice dan tercetak ⬜
- **SET-11** Tab **Invoice** ditambah: **awalan nomor invoice** (bawaan `INV`, hanya huruf/angka, ≤6). Hanya memengaruhi nomor invoice **baru**; nomor lama tidak berubah. — ✅ server membersihkan awalan (tes); simpan lewat UI diuji; nomor invoice baru memakai awalan ⬜
- **SET-12** Tombol **Simpan Pengaturan** (SET-4) menyimpan semua tab sekaligus; di HP semua tab bisa digeser dan tanpa geser samping (KAT-12). — ✅ satu tombol menyimpan semua tab (diuji di Chrome 390); geser samping ⬜
