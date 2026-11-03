// Cek koneksi MongoDB tanpa menjalankan server:  $env:MONGODB_URI="mongodb+srv://..."; npm run cek-db
const { MongoClient } = require("mongodb");
const uri = process.env.MONGODB_URI;
if (!uri) { console.error("Set MONGODB_URI dulu."); process.exit(1); }
const host = uri.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, "").split(/[/?]/)[0]; // hanya host yang ditampilkan, tidak pernah password

new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect().then(async c => {
  const db = c.db();
  await db.command({ ping: 1 });
  console.log(`BERHASIL terhubung ke ${host}, database "${db.databaseName}"`);
  if (db.databaseName === "test") console.log('Catatan: nama database belum ada di alamat. Tambahkan /jasatitipbelanja sebelum tanda "?".');
  await c.close();
}).catch(e => {
  console.error(`GAGAL (${host}): ${e.message}`);
  console.error("Cek: (1) password benar? (2) Network Access di Atlas memuat 0.0.0.0/0? (3) password bertanda khusus: @ jadi %40, : jadi %3A.");
  process.exit(1);
});
