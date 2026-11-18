# 04 — Pengiriman dan label

Berkas: `admin.html` (menu Pengiriman)

## Tujuan
Admin melihat apa yang harus dikirim dan mana yang terlambat, menentukan kurir, mencatat resi, dan mencetak label paket yang menjaga privasi pelanggan.

## Di luar cakupan
Pelacakan resi otomatis ke ekspedisi. Pelanggan memilih kurir. Resi dan data pengirim di label (belum diminta).

## Kriteria

**Daftar**
- **KIR-1** Pengiriman hanya berisi invoice yang **sudah dibayar**. — ✅ dijaga server (API-4c); tampilan dicek di 390
- **KIR-2** Kartu ringkasan: Hari ini, Terlambat, Terjadwal, Belum dijadwalkan (dihitung dari invoice belum dikirim). Status baris: "Terlambat N hari", "Hari ini", "Terjadwal <tgl>", "Belum Dijadwalkan". Urutan: terlambat → hari ini → terjadwal → belum dijadwalkan. — ✅ tampilan dicek di 390; urutan ⬜
- **KIR-3** Tab Perlu Dikirim / Sudah Dikirim dengan jumlahnya; pencarian (pelanggan, invoice, kota, resi); filter bulan dan kurir; halaman bernomor, 10 per halaman (PAG-1). Di HP tabel menjadi kartu. — ✅ tab/filter terlihat di 390; pencarian dan gulir ⬜
- **KIR-4** Tombol utama kartu di tab Perlu Dikirim: **Atur kurir & jadwal** selama kurir dan jadwal kirim belum lengkap; **begitu keduanya terisi, tombol utama langsung berganti menjadi Cetak Label** dan mengubah kurir/jadwal pindah ke menu ⋮ sebagai **Ubah kurir & jadwal**. Di tab Sudah Dikirim tombol utamanya Cetak Label (cukup kurir terisi). Pengiriman dikonfirmasi lewat **Konfirmasi Kirim** di formulir pengiriman (KIR-5), yang dibuka lewat Atur kurir & jadwal atau Ubah kurir & jadwal. Menu ⋮, tanpa ikon: Ubah kurir & jadwal (hanya bila sudah terisi) / Batal kirim (hanya di Sudah Dikirim), Lihat/cetak invoice, Lihat bukti bayar. — ✅ diuji di Chrome (CDP, 390) dengan server demo: tombol utama berganti ke Cetak Label setelah kurir + jadwal tersimpan, kembali ke Atur kurir & jadwal bila jadwal dikosongkan, Ubah kurir & jadwal di menu ⋮ (formulir terisi nilai sekarang), Konfirmasi Kirim lewat formulir itu, Sudah Dikirim hanya Cetak Label dan Batal kirim

**Kurir dan kirim**
- **KIR-5** Kurir **ditentukan admin** (pelanggan tidak memilih). Formulir pengiriman berisi kurir, nomor resi, jadwal kirim. **Simpan Jadwal** menyimpan tanpa mengirim (boleh sebagian kosong). **Konfirmasi Kirim** mewajibkan kurir dan resi, lalu menandai terkirim dengan tanggal hari itu. — ✅ aturan server (API-4c); formulir ⬜ (formulir menampilkan foto tiap barang untuk dicek ulang sebelum kirim; foto dicocokkan lewat nama produk, belum diuji)
- **KIR-6** **Batal kirim** mengembalikan pesanan ke tab Perlu Dikirim. — ⬜

**Label pengiriman** (10×15 cm)
- **KIR-7** Label berisi: logo dan nomor invoice; **penerima** (nama penuh, nomor HP tersamar); **alamat** (+ kota); **Dikirim via** (nama kurir); **isi paket**. Tombol Cetak Label baru tampil setelah kurir dan jadwal diisi (KIR-4), jadi kurir selalu ada di label. — ⬜ belum dilihat di browser
- **KIR-8** Nomor HP tersamar: hanya "08" di depan dan 3 angka terakhir, sisanya `*` (contoh `08*******890`). — ✅ fungsi diuji dengan kode asli; tampilan di label ⬜
- **KIR-9** Isi paket: nama barang tersamar (2 huruf pertama tiap kata, sisanya `*`; angka seperti ukuran tetap terlihat), **jumlah (qty) tampil**, ada total pcs, dan **harga tidak ditampilkan sama sekali**. — ✅ fungsi diuji; tampilan di label ⬜
- **KIR-10** Cetak hanya mengeluarkan label (tanpa menu atau halaman admin), ukuran kertas 100×150mm. — ⬜
- **KIR-11** Penyamaran hanya di label; data asli tetap utuh di admin. — ⬜ (hanya dibaca di kode, belum diuji)
