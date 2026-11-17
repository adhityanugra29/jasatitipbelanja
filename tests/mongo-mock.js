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
if (process.env.DEMO) { // pesanan masuk (2 Baru, 2 sudah diinvoice: 1 cocok, 1 selisih) dan invoicenya
  const now = Date.now(), at = min => new Date(now - min * 6e4).toISOString();
  const it = (id, name, price, qty) => ({ id, name, price, qty });
  const tas = it("p1", "Tas Kulit Cokelat", 150000, 1), dompet = it("p2", "Dompet Mini", 85000, 1), sepatu = it("p3", "Sepatu Sneakers 39", 230000, 1);
  [["PSN-K7Q2XM", at(5), [{ ...tas, qty: 2 }, dompet]], ["PSN-9HT4BD", at(40), [sepatu]],
   ["PSN-A3M8WE", at(300), [tas, { ...dompet, qty: 2 }]], ["PSN-X2C6RN", at(900), [{ ...tas, qty: 2 }, sepatu]]]
    .forEach(([code, created, items]) => col("inbox").replaceOne({ _id: code }, { items, created }));
  const inv = (n, code, name, items) => ({ id: "d" + n, invoice: "INV-2026110" + n, customer: name, city: "Bandung", phone: "08123456789", address: "Jl. Contoh No. " + n,
    items: items.map(i => ({ name: i.name, note: "", qty: i.qty, price: i.price, discount: 0 })), shipping: 15000,
    total: items.reduce((s, i) => s + i.qty * i.price, 0) + 15000, courier: "", resi: "", shipDate: "", created: "2026-11-17", shipped: "", proof: "", paidAt: "", pesananKode: code });
  col("kv").replaceOne({ _id: "orders" }, { v: [
    inv(1, "PSN-A3M8WE", "Ibu Sari", [tas, { ...dompet, qty: 2 }]),           // cocok
    inv(2, "PSN-X2C6RN", "Ibu Rina", [{ ...tas, qty: 1 }, { name: "Topi", price: 50000, qty: 1 }]), // selisih: jumlah, hilang, tambahan
  ] });
}
const mock = { MongoClient: class { connect() { return Promise.resolve({ db: () => ({ collection: col }) }); } } };
const load = Module._load;
Module._load = (r, ...a) => (r === "mongodb" ? mock : load(r, ...a));
