// MongoDB tiruan di memori, untuk menjalankan server tanpa database (uji dan melihat tampilan). Data hilang saat server mati.
//   ADMIN_PASSWORD=x MONGODB_URI=mock node -r ./tests/mongo-mock.js server.js
// DEMO=1 mengisi data contoh dari orders.json (invoice) lengkap dengan katalog dan pesanan masuk yang sesuai. Hanya mendukung perintah yang dipakai server.js.
const Module = require("module"), fs = require("fs"), path = require("path");
const cols = new Map();
// pencocokan filter yang dipakai server: kesamaan, $in, $ne, $regex(+$options), $or
const cond = (v, c) => c && typeof c === "object" && Object.keys(c).some(k => k[0] === "$")
  ? Object.entries(c).every(([op, a]) => op === "$in" ? a.includes(v) : op === "$ne" ? v !== a : op === "$regex" ? new RegExp(a, c.$options).test(v ?? "") : op === "$options")
  : v === c;
const match = (d, f = {}) => Object.entries(f).every(([k, c]) => k === "$or" ? c.some(x => match(d, x)) : k === "$and" ? c.every(x => match(d, x)) : cond(d[k], c));
// aggregate secukupnya: $match $sort $group($first, $sum) $skip $limit; ekspresi: "$field", $cond, $ne, $gt
const ev = (e, d) => typeof e === "string" && e[0] === "$" ? d[e.slice(1)] : e && typeof e === "object" ? (([op, a]) => op === "$cond" ? (ev(a[0], d) ? ev(a[1], d) : ev(a[2], d)) : op === "$ne" ? ev(a[0], d) !== ev(a[1], d) : ev(a[0], d) > ev(a[1], d))(Object.entries(e)[0]) : e;
const group = (rows, g) => {
  const out = new Map();
  for (const d of rows) {
    const id = ev(g._id, d); let o = out.get(id); if (!o) out.set(id, o = { _id: id });
    for (const [k, a] of Object.entries(g)) { if (k === "_id") continue; const [op, x] = Object.entries(a)[0]; o[k] = op === "$first" ? (k in o ? o[k] : ev(x, d)) : (o[k] || 0) + ev(x, d); }
  }
  return [...out.values()];
};
const col = name => {
  if (!cols.has(name)) cols.set(name, new Map());
  const m = cols.get(name), live = f => [...m.values()].filter(d => match(d, f)), rows = f => live(f).map(d => ({ ...d })); // rows: salinan, seperti driver asli
  const cmp = o => (a, b) => { for (const [k, dir] of Object.entries(o)) { const r = (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir; if (r) return r; } return 0; };
  const updateOne = async (f, u, o) => {
    let d = live(f)[0];
    if (!d) { if (!o?.upsert) return; d = { _id: f._id, ...u.$setOnInsert }; }
    Object.assign(d, u.$set); m.set(d._id, d);
  };
  return {
    findOne: async f => rows(f)[0],
    replaceOne: async (f, d) => { m.set(f._id, { _id: f._id, ...d, ...(d.buf && { buf: { buffer: d.buf } }) }); }, // buf: seperti Binary milik driver
    updateOne, updateMany: async (f, u) => live(f).forEach(d => Object.assign(d, u.$set)),
    bulkWrite: async ops => { for (const { updateOne: x } of ops) await updateOne(x.filter, x.update, { upsert: x.upsert }); },
    deleteOne: async f => { rows(f).slice(0, 1).forEach(d => m.delete(d._id)); },
    deleteMany: async f => { rows(f).forEach(d => m.delete(d._id)); },
    countDocuments: async f => rows(f).length, estimatedDocumentCount: async () => m.size, createIndex: async () => {},
    distinct: async (k, f) => [...new Set(rows(f).map(d => d[k]))],
    aggregate: p => ({ toArray: async () => p.reduce((r, s) => s.$match ? r.filter(d => match(d, s.$match)) : s.$sort ? [...r].sort(cmp(s.$sort)) : s.$group ? group(r, s.$group)
      : s.$skip != null ? r.slice(s.$skip) : s.$limit ? r.slice(0, s.$limit) : r, rows()) }),
    find: (f = {}) => { let r = rows(f); const c = {
      sort: o => { r.sort(cmp(o)); return c; },
      skip: n => { r = r.slice(n); return c; }, limit: n => { r = r.slice(0, n); return c; },
      toArray: async () => r }; return c; },
  };
};
if (process.env.DEMO) try {
  const orders = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "orders.json"), "utf8"));
  // katalog = barang yang muncul di invoice (harga dari invoice), supaya pesanan dan invoice memakai barang yang sama
  const price = new Map(orders.flatMap(o => o.items.map(i => [i.name, i.price])));
  const products = [...price].map(([name, p], n) => ({ id: "p" + (n + 1), name, price: p, cat: "Contoh", desc: "", badge: "", stock: null, img: "/uploads/demo-tas.jpg" }));
  col("files").replaceOne({ _id: "uploads/demo-tas.jpg" }, { buf: fs.readFileSync(path.join(__dirname, "demo-tas.jpg")) }); // foto contoh yang sama untuk semua barang demo
  const pid = name => products.find(p => p.name === name).id;
  products.forEach(({ id, ...p }, n) => col("products").replaceOne({ _id: id }, { ...p, t: n }));
  col("kv").replaceOne({ _id: "data" }, { v: { wa: "6281234567890", notice: "", cats: ["Contoh"] } });
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
  orders.map(o => ({ ...o, pesananKode: PSN[o.invoice]?.[0] || "", items: o.items.map(i => ({ note: "", discount: 0, ...i })) })).forEach((o, n) => col("orders").replaceOne({ _id: o.id }, { ...o, t: n }));
} catch (e) { console.error("DEMO: orders.json tidak terbaca:", e.message); }
const mock = { MongoClient: class { connect() { return Promise.resolve({ db: () => ({ collection: col }) }); } } };
const load = Module._load;
Module._load = (r, ...a) => (r === "mongodb" ? mock : load(r, ...a));
