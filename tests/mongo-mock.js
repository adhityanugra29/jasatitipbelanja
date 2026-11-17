// MongoDB tiruan di memori, untuk menjalankan server tanpa database (uji dan melihat tampilan). Data hilang saat server mati.
//   ADMIN_PASSWORD=x MONGODB_URI=mock node -r ./tests/mongo-mock.js server.js
// DEMO=1 mengisi beberapa barang contoh. Hanya mendukung perintah yang dipakai server.js.
const Module = require("module");
const cols = new Map();
const col = name => {
  if (!cols.has(name)) cols.set(name, new Map());
  const m = cols.get(name), by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir;
  return {
    findOne: async f => m.get(f._id),
    replaceOne: async (f, d) => { m.set(f._id, { _id: f._id, ...d, ...(d.buf && { buf: { buffer: d.buf } }) }); }, // buf: seperti Binary milik driver
    deleteOne: async f => { m.delete(f._id); },
    deleteMany: async f => { f._id.$in.forEach(id => m.delete(id)); },
    find: () => { let rows = [...m.values()]; const c = {
      sort: o => { const [k, d] = Object.entries(o)[0]; rows.sort(by(k, d)); return c; },
      skip: n => { rows = rows.slice(n); return c; }, limit: n => { rows = rows.slice(0, n); return c; },
      toArray: async () => rows }; return c; },
  };
};
if (process.env.DEMO) col("kv").replaceOne({ _id: "data" }, { v: { wa: "6281234567890", notice: "", products: [
  { id: "p1", name: "Tas Kulit Cokelat", price: 150000, cat: "Tas", desc: "", badge: "new", stock: 5, img: "" },
  { id: "p2", name: "Dompet Mini", price: 85000, cat: "Dompet", desc: "", badge: "", stock: null, img: "" },
  { id: "p3", name: "Sepatu Sneakers 39", price: 230000, cat: "Sepatu", desc: "", badge: "hot", stock: 2, img: "" },
] } });
const mock = { MongoClient: class { connect() { return Promise.resolve({ db: () => ({ collection: col }) }); } } };
const load = Module._load;
Module._load = (r, ...a) => (r === "mongodb" ? mock : load(r, ...a));
