// Sekali jalan: salin data.json, orders.json, settings.json, uploads/, docs/ ke MongoDB.
// MONGODB_URI=mongodb+srv://... node seed.js
const fs = require("fs"), path = require("path"), { MongoClient } = require("mongodb");
(async () => {
  const c = await new MongoClient(process.env.MONGODB_URI).connect(), db = c.db();
  for (const [k, f] of [["data", "data.json"], ["orders", "orders.json"], ["settings", "settings.json"]])
    await db.collection("kv").replaceOne({ _id: k }, { v: JSON.parse(fs.readFileSync(f)) }, { upsert: true });
  for (const kind of ["uploads", "docs"])
    for (const n of fs.existsSync(kind) ? fs.readdirSync(kind) : [])
      await db.collection("files").replaceOne({ _id: kind + "/" + n }, { buf: fs.readFileSync(path.join(kind, n)) }, { upsert: true });
  console.log("Selesai"); await c.close();
})();
