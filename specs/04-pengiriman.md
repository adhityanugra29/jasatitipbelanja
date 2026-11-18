# 04 — Pengiriman dan label

Berkas: `admin.html` (menu Pengiriman)

## Tujuan
Admin melihat apa yang harus dikirim dan mana yang terlambat, menentukan kurir, mencatat resi, dan mencetak label paket yang menjaga privasi pelanggan.

## Di luar cakupan
Pelacakan resi otomatis ke ekspedisi. Pelanggan memilih kurir. Resi dan data pengirim di label (belum diminta).

## Kriteria

**Daftar**
- **KIR-1** Pengiriman hanya berisi invoice yang **sudah dibayar**. — ✅ dijaga server (API-4c); tampilan dicek di 390
- **KIR-2** Kartu ringkasan: Hari ini, Terlambat, Terjadwal, Belum dijadwalkan (dihitung dari invoice belum dikirim). Status baris: "Terlambat N hari", "Hari ini", "Terjadwal <tgl>", "Belum Dijadwalkan". Urutan di tab Perlu Dikirim: **pesanan yang sudah siap cetak label (kurir, jadwal, resi terisi) paling atas**, lalu terlambat → hari ini → terjadwal → belum dijadwalkan. — ✅ tampilan dicek di 390; siap cetak label paling atas lalu menurut keterlambatan: diuji di Chrome (CDP, 390) dengan server demo
- **KIR-3** Tab Perlu Dikirim / Sudah Dikirim dengan jumlahnya; pencarian (pelanggan, invoice, kota, resi); filter bulan dan kurir; halaman bernomor, 10 per halaman (PAG-1). Di HP tabel menjadi kartu. — ✅ tab/filter terlihat di 390; pencarian dan gulir ⬜
- **KIR-4** Tombol utama kartu di tab Perlu Dikirim: **Atur kurir & jadwal** (pink) selama **kurir, jadwal kirim, dan nomor resi** belum lengkap; **begitu ketiganya terisi, tombol utama langsung berganti menjadi Cetak Label**, berwarna **tosca** supaya beda dari Atur kurir & jadwal, dan mengubah kurir/jadwal/resi pindah ke menu ⋮ sebagai **Ubah kurir & jadwal**. Di tab Sudah Dikirim tombol utamanya Cetak Label (tosca). Menu ⋮, tanpa ikon: Ubah kurir & jadwal (hanya bila sudah lengkap) / Batal kirim (hanya di Sudah Dikirim), Lihat/cetak invoice, Lihat bukti bayar. — ✅ diuji di Chrome (CDP, 390) dengan server demo: Cetak Label tosca (rgb 7,138,133) vs Atur kurir & jadwal pink; resi wajib sebelum Cetak Label muncul; Ubah kurir & jadwal di menu ⋮

**Kurir dan kirim**
- **KIR-5** Kurir **ditentukan admin** (pelanggan tidak memilih). Formulir pengiriman berisi kurir, nomor resi, jadwal kirim. **Simpan Jadwal** menyimpan tanpa mengirim (boleh sebagian kosong). **Konfirmasi Kirim** mewajibkan kurir dan resi, lalu menandai terkirim dengan tanggal hari itu. — ✅ aturan server (API-4c); formulir ⬜ (formulir menampilkan foto tiap barang untuk dicek ulang sebelum kirim; foto dicocokkan lewat nama produk, belum diuji)
- **KIR-6** **Batal kirim** mengembalikan pesanan ke tab Perlu Dikirim. — ⬜

**Label pengiriman** (10×15 cm)
- **KIR-7** Label berisi: logo dan nomor invoice; **penerima** (nama penuh, nomor HP tersamar); **alamat** (+ kota); **Dikirim via** (nama kurir); **isi paket**. Tombol Cetak Label baru tampil setelah kurir dan jadwal diisi (KIR-4), jadi kurir selalu ada di label. — ⬜ belum dilihat di browser
- **KIR-8** Nomor HP tersamar: hanya "08" di depan dan 3 angka terakhir, sisanya `*` (contoh `08*******890`). — ✅ fungsi diuji dengan kode asli; tampilan di label ⬜
- **KIR-9** Isi paket: nama barang tersamar (2 huruf pertama tiap kata, sisanya `*`; angka seperti ukuran tetap terlihat), **jumlah (qty) tampil**, ada total pcs, dan **harga tidak ditampilkan sama sekali**. — ✅ fungsi diuji; tampilan di label ⬜
- **KIR-10** Cetak hanya mengeluarkan label (tanpa menu atau halaman admin), ukuran kertas 100×150mm. — ⬜
- **KIR-11** Penyamaran hanya di label; data asli tetap utuh di admin. — ⬜ (hanya dibaca di kode, belum diuji)
- **KIR-12** **Mencetak label menandai pesanan terkirim, setelah dialog cetak browser ditutup.** Cetak Label di kartu membuka pratinjau label (belum mengubah status). Menekan tombol **cetak** di pratinjau membuka dialog cetak browser; pesanan baru ditandai **terkirim pada hari itu** (dan pindah ke tab Sudah Dikirim, pratinjau tertutup, muncul pesan) **setelah dialog cetak ditutup** (peristiwa afterprint), bukan saat tombol cetak diklik — jadi tidak berpindah selagi dialog cetak browser masih terbuka. Kurir dan resi sudah ada (syarat KIR-4), jadi aturan server API-4c terpenuhi. Mencetak ulang dari tab Sudah Dikirim, atau mencetak invoice, tidak mengubah apa pun. Dibatalkan lewat **Batal kirim** (KIR-6). Batasan: browser tidak membedakan "dicetak" dari "dialog dibatalkan", jadi bila admin membatalkan dialog cetak pesanan tetap dianggap terkirim. — ✅ diuji di Chrome (CDP, 390) dengan server demo dan print() diganti stub yang tidak menahan skrip: klik cetak belum memindahkan (print dipanggil, pratinjau terbuka, server belum terkirim); setelah afterprint pesanan terkirim hari ini, pratinjau tertutup, pindah ke Sudah Dikirim; afterprint tanpa klik cetak label tidak mengubah apa pun; cetak ulang tidak mengubah data. Dialog cetak browser asli ⬜ tidak diuji
