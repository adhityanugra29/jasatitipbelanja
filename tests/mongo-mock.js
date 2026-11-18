// MongoDB tiruan di memori, untuk menjalankan server tanpa database (uji dan melihat tampilan). Data hilang saat server mati.
//   ADMIN_PASSWORD=x MONGODB_URI=mock node -r ./tests/mongo-mock.js server.js
// DEMO=1 mengisi data contoh dari orders.json (invoice) lengkap dengan katalog dan pesanan masuk yang sesuai. Hanya mendukung perintah yang dipakai server.js.
const Module = require("module"), fs = require("fs"), path = require("path");
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
if (process.env.DEMO) try {
  const orders = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "orders.json"), "utf8"));
  // katalog = barang yang muncul di invoice (harga dari invoice), supaya pesanan dan invoice memakai barang yang sama
  const price = new Map(orders.flatMap(o => o.items.map(i => [i.name, i.price])));
  const products = [...price].map(([name, p], n) => ({ id: "p" + (n + 1), name, price: p, cat: "Contoh", desc: "", badge: "", stock: null, img: "/uploads/demo-tas.jpg" }));
  col("files").replaceOne({ _id: "uploads/demo-tas.jpg" }, { buf: fs.readFileSync(path.join(__dirname, "demo-tas.jpg")) }); // foto contoh yang sama untuk semua barang demo
  const pid = name => products.find(p => p.name === name).id;
  col("kv").replaceOne({ _id: "data" }, { v: { wa: "6281234567890", notice: "", products } });
  // pesanan per invoice: [kode, menit yang lalu, [[barang, qty]]]. Sebagian sengaja berbeda dari invoicenya.
  const PSN = { "INV-2026110001": ["PSN-A3M8WE", 120, [["Tote bag kulit", 1]]],                            // cocok
    "INV-2026110002": ["PSN-D5W2KP", 200, [["Sneakers putih", 1], ["Kaos kaki", 3]]],                      // selisih: jumlah (invoice 2)
    "INV-2026100003": ["PSN-R4N7ZQ", 3000, [["Koper kabin", 1]]],                                          // cocok
    "INV-2026100004": ["PSN-T8K3VC", 3100, [["Sling bag", 2]]],                                            // cocok (invoice: dua baris @1)
    "INV-2026100005": ["PSN-M6Y9HB", 3200, [["Flat shoes", 1], ["Kaos kaki", 1]]],                         // selisih: kaos kaki tidak ada di invoice
    "INV-2026100006": ["PSN-L2J5GX", 3300, [["Tote bag kulit", 1]]] };                                     // cocok
  const at = min => new Date(Date.now() - min * 6e4).toISOString();
  const mk = items => items.map(([name, qty]) => ({ id: pid(name), name, price: price.get(name), qty }));
  const put = (code, min, who, items, matched) => col("inbox").replaceOne({ _id: code }, { ...who, created: at(min), items: mk(items), ...(matched && { matched: { at: at(min - 5), items: mk(matched) } }) });
  for (const [inv, [code, min, items]] of Object.entries(PSN)) { const o = orders.find(x => x.invoice === inv); put(code, min, { name: o.customer, phone: o.phone, address: o.address }, items); }
  const sari = orders.find(x => x.customer === "Ibu Sari");
  put("PSN-K7Q2XM", 5, { name: sari.customer, phone: sari.phone, address: sari.address }, [["Tote bag kulit", 1], ["Flat shoes", 2]]); // Baru, pelanggan lama (HP sama dengan Ibu Sari)
  put("PSN-9HT4BD", 40, { name: "Ibu Wulan", phone: "081298765432", address: "Jl. Anggrek No. 5, Cimahi Tengah, 40525" }, [["Sling bag", 1]], [["Sling bag", 2]]); // Sudah dicocokkan dengan koreksi (qty 1 -> 2, sesuai chat), belum diinvoice
  put("PSN-W4D7QP", 20, { name: "Ibu Citra", phone: "081355556666", address: "Jl. Kenanga No. 3, Bandung" }, [["Flat shoes", 1]]); // Baru, pelanggan baru
  col("kv").replaceOne({ _id: "orders" }, { v: orders.map(o => ({ ...o, pesananKode: PSN[o.invoice]?.[0] || "", items: o.items.map(i => ({ note: "", discount: 0, ...i })) })) });
} catch (e) { console.error("DEMO: orders.json tidak terbaca:", e.message); }
const mock = { MongoClient: class { connect() { return Promise.resolve({ db: () => ({ collection: col }) }); } } };
const load = Module._load;
Module._load = (r, ...a) => (r === "mongodb" ? mock : load(r, ...a));
