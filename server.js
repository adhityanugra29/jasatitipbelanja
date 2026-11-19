// Lokal: ADMIN_PASSWORD=rahasia MONGODB_URI=mongodb+srv://... node server.js   (setelah npm install)
// Vercel: api/index.js memakai handler yang diekspor di bawah. Data, gambar, dan dokumen disimpan di MongoDB.
// Spec: specs/10-performa.md (cache, gzip, satu dokumen per barang/invoice, foto mini).
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const { MongoClient } = require("mongodb");
const PORT = process.env.PORT || 3000;
const PASS = process.env.ADMIN_PASSWORD;
if (!PASS) { console.error("Set ADMIN_PASSWORD dulu."); process.exit(1); }
const DIR = __dirname;
if (!process.env.MONGODB_URI) { console.error("Set MONGODB_URI dulu."); process.exit(1); }
// rekening tujuan transfer (tampil di footer invoice): ubah di sini, tidak ada di halaman admin
const BANK = { bankName: "BCA", bankNo: "0000000000", bankHolder: "Nama Pemilik Rekening" };
// SET-8/10/11: bawaan bila admin belum mengaturnya
const DEF_COURIERS = ["Kurir Internal", "Diambil Sendiri oleh Pelanggan", "JNE", "J&T", "SiCepat", "GoSend"].map(name => ({ name, on: true }));
// daftar nama unik (tanpa membedakan huruf besar/kecil), dipotong panjangnya
const uniq = (list, n, max) => { const seen = new Set(); return (Array.isArray(list) ? list : []).map(v => String(v ?? "").trim().slice(0, n)).filter(v => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase())).slice(0, max); };
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const DEFAULTS = { data: { wa: "6281234567890", notice: "", cats: [] }, settings: {} };

// ---------- MongoDB: koneksi dipakai ulang antar request (penting di serverless)
// kv: data (wa, pengumuman, daftar kategori) dan settings. products, orders, inbox: satu dokumen per baris (PERF-8/9). files: foto dan dokumen.
let _db;
const db = () => _db ??= new MongoClient(process.env.MONGODB_URI).connect().then(c => {
  const d = c.db(); // PERF-6: indeks dibuat di latar belakang, gagal pun tidak menghentikan server
  Promise.all([d.collection("products").createIndex({ price: 1 }), d.collection("products").createIndex({ t: -1 }), d.collection("orders").createIndex({ t: -1 }),
    d.collection("orders").createIndex({ pesananKode: 1 }), d.collection("inbox").createIndex({ created: -1 })]).catch(() => {});
  return d;
}).catch(e => { _db = null; throw e; });
const col = async n => (await db()).collection(n);
const kv = async k => { const v = (await (await col("kv")).findOne({ _id: k }))?.v; return k === "data" ? { ...DEFAULTS.data, ...v } : v ?? DEFAULTS[k]; };
const setKv = async (k, v) => (await col("kv")).replaceOne({ _id: k }, { v }, { upsert: true });
const fileId = (kind, name) => kind + "/" + path.basename(name);
const putFile = async (kind, name, buf) => (await col("files")).replaceOne({ _id: fileId(kind, name) }, { buf }, { upsert: true });

const sha = s => crypto.createHash("sha256").update(String(s)).digest();
const authed = req => crypto.timingSafeEqual(sha(req.headers["x-admin"] || ""), sha(PASS));
const TYPES = { ".pdf": "application/pdf", ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const typeOf = n => TYPES[path.extname(n)] || "application/octet-stream";

function body(req, max = 3e6) {
  return new Promise((ok, no) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > max) { no(new Error("terlalu besar")); req.destroy(); } });
    req.on("end", () => { try { ok(JSON.parse(s)); } catch (e) { no(e); } });
  });
}
// INV-5: +62…, 62…, 8… -> 08…; dipakai invoice dan pesanan masuk
const normPhone = v => { let d = String(v ?? "").replace(/\D/g, ""); if (d.startsWith("62")) d = "0" + d.slice(2); else if (d.startsWith("8")) d = "0" + d; return d.slice(0, 15); };
const gz = req => /\bgzip\b/.test(req.headers["accept-encoding"] || "");

// ---------- jawaban: JSON (gzip bila besar), berkas statis, foto
const send = (res, code, obj, cache = "no-store") => {
  const raw = Buffer.from(JSON.stringify(obj)), h = { "content-type": "application/json", "cache-control": cache };
  if (raw.length > 1024 && gz(res.req)) { res.writeHead(code, { ...h, "content-encoding": "gzip", vary: "accept-encoding" }); return res.end(zlib.gzipSync(raw)); }
  res.writeHead(code, h); res.end(raw);
};
const body304 = (req, res, etag) => req.headers["if-none-match"] === etag && (res.writeHead(304, { etag }), res.end(), true);
// PERF-3: halaman dan logo dibaca sekali saat server mulai; html dikirim gzip
const STATIC = {};
const addStatic = (url, file, cache) => {
  const buf = fs.readFileSync(path.join(DIR, file));
  STATIC[url] = { buf, gz: path.extname(file) === ".html" ? zlib.gzipSync(buf) : null, type: typeOf(file), cache, etag: '"' + crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16) + '"' };
};
addStatic("/", "index.html", "public, max-age=0, must-revalidate"); addStatic("/admin", "admin.html", "public, max-age=0, must-revalidate");
for (const f of fs.readdirSync(path.join(DIR, "assets"))) addStatic("/assets/" + f, "assets/" + f, "public, max-age=86400");
const serveStatic = (req, res, s) => {
  if (body304(req, res, s.etag)) return;
  const zip = s.gz && gz(req), h = { "content-type": s.type, "cache-control": s.cache, etag: s.etag, ...(s.gz && { vary: "accept-encoding" }) };
  res.writeHead(200, zip ? { ...h, "content-encoding": "gzip" } : h); res.end(zip ? s.gz : s.buf);
};
// PERF-1: foto produk = UUID yang tidak pernah berubah, jadi boleh di-cache selamanya (juga oleh CDN Vercel); dokumen privat
const getFile = async (req, res, kind, name) => {
  const open = kind === "uploads", etag = '"' + path.basename(name) + '"';
  if (open && body304(req, res, etag)) return;
  const d = await (await col("files")).findOne({ _id: fileId(kind, name) });
  if (!d) { res.writeHead(404); return res.end("Tidak ditemukan"); }
  res.writeHead(200, { "content-type": typeOf(name), "cache-control": open ? "public, max-age=31536000, immutable" : "private, max-age=600", ...(open && { etag }) });
  res.end(d.buf.buffer);
};

// ---------- barang
const PHOTO = /^\/uploads\/[\w-]+\.(jpg|png|webp)$/;
const cleanProduct = p => ({
  name: String(p.name || "").slice(0, 100), price: Math.max(0, Number(p.price) || 0),
  cat: String(p.cat || "Lainnya").slice(0, 40).trim() || "Lainnya", desc: String(p.desc || "").slice(0, 100),
  badge: ["new", "hot", "flash"].includes(p.badge) ? p.badge : "",
  stock: p.stock === "" || p.stock == null ? null : Math.max(0, Math.floor(Number(p.stock)) || 0),
  img: PHOTO.test(p.img) ? p.img : "", thumb: PHOTO.test(p.thumb) ? p.thumb : "", // thumb = foto mini untuk kartu (PERF-4)
});
const pub = ({ _id, t, ...p }) => ({ id: _id, ...p });
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// PERF-5: hapus file foto yang tak dipakai barang mana pun lagi
const dropPhotos = async paths => {
  const products = await col("products"), files = await col("files");
  for (const p of new Set(paths.filter(Boolean)))
    if (!(await products.countDocuments({ $or: [{ img: p }, { thumb: p }] }))) await files.deleteOne({ _id: fileId("uploads", p) });
};
// PSM-2/PSM-16: barang pesanan selalu dari katalog (nama dan harga dari katalog, bukan dari klien), qty 1-999
const pickItems = async list => {
  list = (Array.isArray(list) ? list : []).slice(0, 50);
  const found = await (await col("products")).find({ _id: { $in: list.map(i => String(i.id)) } }).toArray();
  return list.map(i => { const p = found.find(p => p._id === String(i.id)); return p && { id: p._id, name: p.name, price: p.price, qty: Math.min(999, Math.floor(Number(i.qty)) || 0) }; }).filter(i => i && i.qty >= 1);
};
// kategori yang masih dipakai barang, urut menurut daftar admin
const usedCats = async () => { const used = new Set(await (await col("products")).distinct("cat")); return (await kv("data")).cats.filter(c => used.has(c)); };

// ---------- invoice
const CODE = /^PSN-[A-Z0-9]{6}$/;
function cleanOrder(o, id) {
  const t = (v, n) => String(v ?? "").slice(0, n), date = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  const num = (v, max = 1e10) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  // barang: [{name, note, qty, price, discount}]; teks lama "Nama xN" diubah otomatis (harga 0 -> akan ditolak sampai diisi)
  const raw = Array.isArray(o.items) ? o.items : String(o.items ?? "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const m = /^(.*?)\s*[x×]\s*(\d+)$/i.exec(l); return { name: m ? m[1] : l, qty: m ? +m[2] : 1 }; });
  const items = raw.slice(0, 50).map(i => ({ name: t(i.name, 100).trim(), note: t(i.note, 100).trim(), qty: num(i.qty, 9999), price: num(i.price), discount: num(i.discount) }));
  const shipping = num(o.shipping);
  const out = {
    id, invoice: t(o.invoice, 30), customer: t(o.customer, 100), city: t(o.city, 60), phone: normPhone(o.phone), address: t(o.address, 300),
    items, shipping, total: items.reduce((s, i) => s + i.qty * i.price - i.discount, 0) + shipping, // total selalu dihitung server
    courier: t(o.courier, 40), resi: t(o.resi, 40), shipDate: date(o.shipDate), created: date(o.created), shipped: date(o.shipped),
    proof: /^[\w-]+\.(pdf|jpg|png|webp)$/.test(o.proof) ? o.proof : "", paidAt: date(o.paidAt),
    pesananKode: CODE.test(o.pesananKode) ? o.pesananKode : "",
  };
  if (!items.length) throw new Error("Isi barang pada invoice wajib diisi");
  if (items.some(i => !i.name || i.qty < 1 || i.price < 1 || i.discount > i.qty * i.price)) throw new Error("Setiap barang harus punya nama, jumlah, dan harga; diskon tidak boleh melebihi harga");
  if (!/^08\d{8,12}$/.test(out.phone)) throw new Error("Nomor HP penerima harus nomor HP Indonesia (diawali 08)");
  if (!out.address.trim()) throw new Error("Alamat penerima wajib diisi");
  // alur: invoice -> dibayar (butuh bukti bayar) -> baru boleh dikirim (butuh kurir + resi)
  if (out.paidAt && !out.proof) throw new Error("Invoice yang sudah dibayar wajib punya bukti pembayaran");
  if (out.shipped && !(out.paidAt && out.courier && out.resi)) throw new Error("Pesanan hanya bisa dikirim setelah dibayar, dan wajib punya kurir dan nomor resi");
  return out;
}

const handler = async (req, res) => {
  // di Vercel req.url berisi tujuan rewrite; path asli dikirim lewat ?p= (lihat vercel.json), parameter lain ikut di query yang sama
  const sp = new URL(req.url, "http://x").searchParams;
  const url = sp.get("p") || req.url.split("?")[0], GET = req.method === "GET";
  try {
    if (GET && (url === "/index.html" || STATIC[url])) return serveStatic(req, res, STATIC[url === "/index.html" ? "/" : url]);
    if (GET && url.startsWith("/uploads/")) return getFile(req, res, "uploads", url);
    // PERF-2: cache 30 detik (CDN); perubahan admin tampil di toko paling lama ±30 detik
    const SHORT = "public, s-maxage=30, stale-while-revalidate=60";
    if (GET && url === "/api/data") { const d = await kv("data"); return send(res, 200, { wa: d.wa, notice: d.notice, cats: await usedCats() }, SHORT); }
    // PERF-9: toko memuat barang per halaman dari server. Stok habis tersembunyi sampai dicari (TOK-21); ?ids= (keranjang) tidak menyaring.
    if (GET && url === "/api/products") {
      const P = await col("products"), q = (sp.get("q") || "").trim().slice(0, 60), cats = (sp.get("cat") || "").split("|").filter(Boolean).slice(0, 50), ids = sp.get("ids");
      if (ids) return send(res, 200, { items: (await P.find({ _id: { $in: ids.split(",").slice(0, 50) } }).toArray()).map(pub) }, SHORT);
      const f = { ...(!q && { stock: { $ne: 0 } }), ...(cats.length && { cat: { $in: cats } }), ...(q && { $or: [{ name: { $regex: rx(q), $options: "i" } }, { desc: { $regex: rx(q), $options: "i" } }] }) };
      const skip = Math.max(0, parseInt(sp.get("skip")) || 0), limit = Math.min(48, Math.max(1, parseInt(sp.get("limit")) || 12));
      const [items, total] = await Promise.all([P.find(f).sort({ price: sp.get("sort") === "asc" ? 1 : -1, _id: 1 }).skip(skip).limit(limit).toArray(), P.countDocuments(f)]);
      return send(res, 200, { items: items.map(pub), total }, SHORT);
    }

    // PSM-1..3: satu-satunya tulis publik, jadi dibatasi ketat. Nama dan harga selalu dari katalog, bukan dari klien.
    if (req.method === "POST" && url === "/api/inbox") {
      const d = await body(req, 2e4);
      if (!CODE.test(d.code)) return send(res, 400, { error: "Kode pesanan tidak valid" });
      const name = String(d.name ?? "").trim().slice(0, 100), phone = normPhone(d.phone);
      if (!name) return send(res, 400, { error: "Nama wajib diisi" });
      if (!/^08\d{8,12}$/.test(phone)) return send(res, 400, { error: "Nomor HP harus nomor HP Indonesia (diawali 08)" });
      const items = await pickItems(d.items);
      if (!items.length) return send(res, 400, { error: "Tidak ada barang yang valid" });
      const inbox = await col("inbox");
      if ((await inbox.findOne({ _id: d.code }))?.matched) return send(res, 200, { ok: true }); // PSM-16: kirim ulang tidak menimpa pencocokan admin
      await inbox.replaceOne({ _id: d.code }, { name, phone, address: String(d.address ?? "").trim().slice(0, 300), items, created: new Date().toISOString() }, { upsert: true }); // kode sama = timpa, bukan ganda
      if (await inbox.estimatedDocumentCount() > 500) { // PERF-6: pangkas hanya bila perlu
        const old = await inbox.find().sort({ created: -1 }).skip(500).toArray();
        if (old.length) await inbox.deleteMany({ _id: { $in: old.map(x => x._id) } });
      }
      return send(res, 200, { ok: true });
    }

    if (url.startsWith("/api/") && !authed(req)) return send(res, 401, { error: "Password salah" });
    if (GET && url === "/api/check") return send(res, 200, { ok: true });

    if (GET && url.startsWith("/api/doc/")) return getFile(req, res, "docs", url);
    if (req.method === "POST" && url === "/api/doc") {
      const m = /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,(.+)$/.exec((await body(req, 4.4e6)).dataUrl || "");
      if (!m) return send(res, 400, { error: "File harus PDF atau gambar JPG/PNG/WEBP" });
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 3e6) return send(res, 400, { error: "File maksimal 3MB" }); // DEP-3: batas isi permintaan Vercel ±4,5MB
      if (m[1] === "application/pdf" && buf.subarray(0, 5).toString() !== "%PDF-") return send(res, 400, { error: "File PDF tidak valid" });
      const name = `${crypto.randomUUID()}.${m[1] === "application/pdf" ? "pdf" : m[1].slice(6).replace("jpeg", "jpg")}`;
      await putFile("docs", name, buf);
      return send(res, 200, { file: name });
    }

    // ---------- pesanan masuk
    const mm = /^\/api\/inbox\/(PSN-[A-Z0-9]{6})\/match$/.exec(url);
    if (mm && (req.method === "POST" || req.method === "DELETE")) { // PSM-16: admin mencocokkan pesanan website dengan chat WhatsApp
      const inbox = await col("inbox"), doc = await inbox.findOne({ _id: mm[1] });
      if (!doc) return send(res, 404, { error: "Pesanan tidak ditemukan" });
      if (await (await col("orders")).findOne({ pesananKode: mm[1] })) return send(res, 400, { error: "Pesanan ini sudah punya invoice" });
      const { _id, matched, ...rest } = doc;
      if (req.method === "DELETE") { await inbox.replaceOne({ _id }, rest); return send(res, 200, { ok: true }); }
      const items = await pickItems((await body(req, 2e4)).items);
      if (!items.length) return send(res, 400, { error: "Tidak ada barang yang valid" });
      const m = { at: new Date().toISOString(), items };
      await inbox.replaceOne({ _id }, { ...rest, matched: m });
      return send(res, 200, { ok: true, matched: m });
    }
    if (GET && url === "/api/inbox") return send(res, 200, (await (await col("inbox")).find().sort({ created: -1 }).limit(500).toArray()).map(({ _id, ...r }) => ({ code: _id, ...r })));
    if (req.method === "DELETE" && url.startsWith("/api/inbox/")) { // PSM-5: hanya pesanan yang belum punya invoice
      const code = path.basename(url);
      if (await (await col("orders")).findOne({ pesananKode: code })) return send(res, 400, { error: "Pesanan ini sudah punya invoice" });
      await (await col("inbox")).deleteOne({ _id: code });
      return send(res, 200, { ok: true });
    }

    // ---------- invoice: satu dokumen per invoice (PERF-8), menyimpan satu tidak menyentuh yang lain
    // shortcut: GET mengirim semua invoice (gzip) karena Pelanggan dan Pengiriman diturunkan dari semuanya; upgrade ke paginasi server bila >±20.000 invoice
    if (GET && url === "/api/orders") return send(res, 200, (await (await col("orders")).find().sort({ t: -1 }).toArray()).map(({ _id, t, ...o }) => o));
    const om = /^\/api\/orders\/([\w.-]{1,40})$/.exec(url);
    if (om && req.method === "PUT") {
      const orders = await col("orders"), out = cleanOrder(await body(req, 2e5), om[1]), prev = await orders.findOne({ _id: out.id });
      if (out.pesananKode) {
        if (await orders.findOne({ pesananKode: out.pesananKode, _id: { $ne: out.id } })) throw new Error("Satu pesanan hanya boleh punya satu invoice"); // PSM-6
        if (prev?.pesananKode !== out.pesananKode && !(await (await col("inbox")).findOne({ _id: out.pesananKode }))?.matched) throw new Error("Pesanan " + out.pesananKode + " belum dicocokkan"); // PSM-17
      }
      await orders.updateOne({ _id: out.id }, { $set: out, $setOnInsert: { t: Date.now() } }, { upsert: true });
      return send(res, 200, { ok: true, order: out });
    }
    if (om && req.method === "DELETE") { await (await col("orders")).deleteOne({ _id: om[1] }); return send(res, 200, { ok: true }); }

    // ---------- pengaturan
    if (GET && url === "/api/settings") { const st = await kv("settings"); return send(res, 200, { ...st, couriers: Array.isArray(st.couriers) ? st.couriers : DEF_COURIERS, closing: st.closing ?? "", footnote: st.footnote ?? "", invPrefix: st.invPrefix || "INV", ...BANK }); }
    if (req.method === "PUT" && url === "/api/settings") {
      const d = await body(req);
      const out = Object.fromEntries(["storeName", "address", "phone", "email", "npwp", "admin"].map(k => [k, String(d[k] ?? "").trim().slice(0, 200)]));
      // SET-8: kurir terkelola (nama unik, aktif/nonaktif); SET-10/11: kalimat penutup, catatan kaki, awalan nomor invoice
      const cin = Array.isArray(d.couriers) ? d.couriers : DEF_COURIERS;
      out.couriers = uniq(cin.map(c => c?.name), 40, 30).map(name => ({ name, on: cin.find(c => String(c?.name ?? "").trim().toLowerCase() === name.toLowerCase())?.on !== false }));
      out.closing = String(d.closing ?? "").trim().slice(0, 300); out.footnote = String(d.footnote ?? "").trim().slice(0, 300);
      out.invPrefix = String(d.invPrefix ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "INV";
      await setKv("settings", out);
      return send(res, 200, { ok: true });
    }

    // ---------- katalog (admin)
    if (GET && url === "/api/admin/catalog") { // semua barang, terbaru di atas, plus wa/pengumuman/semua kategori
      const d = await kv("data");
      return send(res, 200, { wa: d.wa, notice: d.notice, cats: d.cats, products: (await (await col("products")).find().sort({ t: -1 }).toArray()).map(pub) });
    }
    // API-2 / SET-6/7: wa, pengumuman, daftar kategori terurut. Kategori yang dibuang tapi masih dipakai barang ditolak.
    if (req.method === "PUT" && url === "/api/data") {
      const d = await body(req), prev = await kv("data"), products = await col("products");
      const cats = uniq(d.cats ?? prev.cats, 40, 50);
      for (const c of prev.cats.filter(c => !cats.some(n => same(n, c)))) {
        const n = await products.countDocuments({ cat: c });
        if (n) return send(res, 400, { error: `Kategori "${c}" masih dipakai ${n} barang. Pindahkan barangnya dulu.` });
      }
      for (const v of await products.distinct("cat")) { const hit = cats.find(c => same(c, v)); if (hit && hit !== v) await products.updateMany({ cat: v }, { $set: { cat: hit } }); } // huruf kategori mengikuti daftar
      await setKv("data", { wa: String(d.wa ?? prev.wa).replace(/\D/g, ""), notice: String(d.notice ?? prev.notice).slice(0, 200), cats });
      return send(res, 200, { ok: true, cats });
    }
    // simpan barang (baru atau ubah), maks 100 sekali kirim; kategori baru ditambahkan ke daftar
    if (req.method === "PUT" && url === "/api/products") {
      const d = await body(req), list = (Array.isArray(d) ? d : []).slice(0, 100), products = await col("products");
      if (list.some(p => !/^[\w.-]{1,60}$/.test(String(p?.id)))) throw new Error("ID barang tidak valid");
      const meta = await kv("data"), cats = [...meta.cats], before = await products.find({ _id: { $in: list.map(p => String(p.id)) } }).toArray();
      const out = list.map((p, n) => {
        const c = cleanProduct(p), hit = cats.find(x => same(x, c.cat));
        if (hit) c.cat = hit; else cats.push(c.cat);
        return { id: String(p.id), c, t: Date.now() + n };
      });
      await products.bulkWrite(out.map(({ id, c, t }) => ({ updateOne: { filter: { _id: id }, update: { $set: c, $setOnInsert: { t } }, upsert: true } })));
      if (cats.length !== meta.cats.length) await setKv("data", { ...meta, cats: cats.slice(0, 50) });
      await dropPhotos(before.flatMap(b => { const n = out.find(o => o.id === b._id).c; return [b.img !== n.img && b.img, b.thumb !== n.thumb && b.thumb]; })); // PERF-5: foto yang diganti
      return send(res, 200, { ok: true, cats });
    }
    const pm = /^\/api\/products\/([\w.-]{1,60})$/.exec(url);
    if (pm && req.method === "DELETE") {
      const products = await col("products"), p = await products.findOne({ _id: pm[1] });
      if (p) { await products.deleteOne({ _id: pm[1] }); await dropPhotos([p.img, p.thumb]); }
      return send(res, 200, { ok: true });
    }
    // API-5 / PERF-4: foto utama (800px) dan mini (400px) dari browser; hanya JPG/PNG/WEBP
    if (req.method === "POST" && url === "/api/upload") {
      const d = await body(req), img = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(d.dataUrl || ""), mini = d.thumb ? /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(d.thumb) : null;
      if (!img || (d.thumb && !mini)) return send(res, 400, { error: "Gambar tidak valid" });
      const id = crypto.randomUUID(), save = async (m, suffix) => { const name = `${id}${suffix}.${m[1] === "jpeg" ? "jpg" : m[1]}`; await putFile("uploads", name, Buffer.from(m[2], "base64")); return "/uploads/" + name; };
      return send(res, 200, { img: await save(img, ""), thumb: mini ? await save(mini, "-s") : "" });
    }
    send(res, 404, { error: "Tidak ditemukan" });
  } catch (e) { send(res, 400, { error: e.message }); }
};
module.exports = handler;
if (require.main === module) http.createServer(handler).listen(PORT, () => console.log(`Toko: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin`));
