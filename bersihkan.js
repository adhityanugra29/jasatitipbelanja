// PERF-5: daftar / hapus foto produk yang tidak dipakai barang mana pun (mis. unggahan yang dibatalkan).
//   MONGODB_URI=... npm run bersihkan            -> hanya menampilkan
//   MONGODB_URI=... npm run bersihkan -- --hapus -> menghapus
// Jalankan saat admin tidak sedang menambah barang: foto yang baru diunggah tapi belum disimpan dianggap yatim.
const { MongoClient } = require("mongodb");
(async () => {
  if (!process.env.MONGODB_URI) { console.error("Set MONGODB_URI dulu."); process.exit(1); }
  const c = await new MongoClient(process.env.MONGODB_URI).connect(), db = c.db();
  const used = new Set((await db.collection("products").find({}, { projection: { img: 1, thumb: 1 } }).toArray()).flatMap(p => [p.img, p.thumb]).filter(Boolean));
  const all = (await db.collection("files").find({ _id: { $regex: "^uploads/" } }, { projection: { _id: 1 } }).toArray()).map(f => f._id);
  const orphans = all.filter(id => !used.has("/" + id));
  console.log(`${all.length} foto, ${orphans.length} tidak dipakai.`);
  if (process.argv.includes("--hapus") && orphans.length) { await db.collection("files").deleteMany({ _id: { $in: orphans } }); console.log("Dihapus."); }
  else if (orphans.length) console.log("Tambahkan --hapus untuk menghapusnya.");
  await c.close();
})();
