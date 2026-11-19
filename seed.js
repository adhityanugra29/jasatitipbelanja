// Sekali jalan: salin data.json, orders.json, settings.json, uploads/, docs/ (format lama) ke MongoDB.
// MONGODB_URI=mongodb+srv://... node seed.js
const fs = require("fs"), path = require("path"), { MongoClient } = require("mongodb");
const read = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : null;
(async () => {
  const c = await new MongoClient(process.env.MONGODB_URI).connect(), db = c.db(), now = Date.now();
  const data = read("data.json"), orders = read("orders.json"), settings = read("settings.json");
  if (data) {
    const { products = [], ...meta } = data;
    meta.cats ??= [...new Set(products.map(p => p.cat).filter(Boolean))];
    await db.collection("kv").replaceOne({ _id: "data" }, { v: meta }, { upsert: true });
    for (const [n, { id, ...p }] of products.entries()) await db.collection("products").replaceOne({ _id: String(id) }, { ...p, t: now - n }, { upsert: true }); // t: urutan, barang pertama di atas
  }
  for (const [n, o] of (orders || []).entries()) await db.collection("orders").replaceOne({ _id: o.id }, { ...o, t: now - n }, { upsert: true });
  if (settings) await db.collection("kv").replaceOne({ _id: "settings" }, { v: settings }, { upsert: true });
  for (const kind of ["uploads", "docs"])
    for (const n of fs.existsSync(kind) ? fs.readdirSync(kind) : [])
      await db.collection("files").replaceOne({ _id: kind + "/" + n }, { buf: fs.readFileSync(path.join(kind, n)) }, { upsert: true });
  console.log("Selesai"); await c.close();
})();
