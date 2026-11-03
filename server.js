// Lokal: ADMIN_PASSWORD=rahasia MONGODB_URI=mongodb+srv://... node server.js   (setelah npm install)
// Vercel: api/index.js memakai handler yang diekspor di bawah. Data, gambar, dan dokumen disimpan di MongoDB.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { MongoClient } = require("mongodb");
const PORT = process.env.PORT || 3000;
const PASS = process.env.ADMIN_PASSWORD;
if (!PASS) { console.error("Set ADMIN_PASSWORD dulu."); process.exit(1); }
const DIR = __dirname;
if (!process.env.MONGODB_URI) { console.error("Set MONGODB_URI dulu."); process.exit(1); }
// rekening tujuan transfer (tampil di footer invoice): ubah di sini, tidak ada di halaman admin
const BANK = { bankName: "BCA", bankNo: "0000000000", bankHolder: "Nama Pemilik Rekening" };
const DEFAULTS = { data: { wa: "6281234567890", products: [] }, orders: [], settings: {} };

let _db; // koneksi dipakai ulang antar request (penting di serverless)
const db = () => _db ??= new MongoClient(process.env.MONGODB_URI).connect().then(c => c.db()).catch(e => { _db = null; throw e; });
const kv = async k => (await (await db()).collection("kv").findOne({ _id: k }))?.v ?? DEFAULTS[k];
const setKv = async (k, v) => (await db()).collection("kv").replaceOne({ _id: k }, { v }, { upsert: true });
// folder "uploads" (gambar produk, publik) dan "docs" (invoice & bukti bayar: privat, hanya lewat /api/doc dengan login)
const putFile = async (kind, name, buf) => (await db()).collection("files").replaceOne({ _id: kind + "/" + name }, { buf }, { upsert: true });
const getFile = async (res, kind, name) => {
  const d = await (await db()).collection("files").findOne({ _id: kind + "/" + name });
  if (!d) { res.writeHead(404); return res.end("Tidak ditemukan"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(name)] || "application/octet-stream" }); res.end(d.buf.buffer);
};

const sha = s => crypto.createHash("sha256").update(String(s)).digest();
const authed = req => crypto.timingSafeEqual(sha(req.headers["x-admin"] || ""), sha(PASS));
const TYPES = { ".pdf": "application/pdf", ".html": "text/html", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function body(req, max = 3e6) {
  return new Promise((ok, no) => {
    let s = "";
    req.on("data", c => { s += c; if (s.length > max) { no(new Error("terlalu besar")); req.destroy(); } });
    req.on("end", () => { try { ok(JSON.parse(s)); } catch (e) { no(e); } });
  });
}
const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
const file = (res, p) => fs.readFile(p, (e, d) => {
  if (e) { res.writeHead(404); return res.end("Tidak ditemukan"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); res.end(d);
});

const handler = async (req, res) => {
  const url = req.url.split("?")[0];
  try {
    if (req.method === "GET" && (url === "/" || url === "/index.html")) return file(res, path.join(DIR, "index.html"));
    if (req.method === "GET" && url === "/admin") return file(res, path.join(DIR, "admin.html"));
    if (req.method === "GET" && url.startsWith("/assets/")) return file(res, path.join(DIR, "assets", path.basename(url)));
    if (req.method === "GET" && url.startsWith("/uploads/")) return getFile(res, "uploads", path.basename(url));
    if (req.method === "GET" && url === "/api/data") return send(res, 200, await kv("data"));

    if (url.startsWith("/api/") && !authed(req)) return send(res, 401, { error: "Password salah" });
    if (req.method === "GET" && url === "/api/check") return send(res, 200, { ok: true });

    if (req.method === "GET" && url.startsWith("/api/doc/")) return getFile(res, "docs", path.basename(url));
    if (req.method === "POST" && url === "/api/doc") {
      const m = /^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,(.+)$/.exec((await body(req, 8e6)).dataUrl || "");
      if (!m) return send(res, 400, { error: "File harus PDF atau gambar JPG/PNG/WEBP" });
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 5e6) return send(res, 400, { error: "File maksimal 5MB" });
      if (m[1] === "application/pdf" && buf.subarray(0, 5).toString() !== "%PDF-") return send(res, 400, { error: "File PDF tidak valid" });
      const name = `${crypto.randomUUID()}.${m[1] === "application/pdf" ? "pdf" : m[1].slice(6).replace("jpeg", "jpg")}`;
      await putFile("docs", name, buf);
      return send(res, 200, { file: name });
    }
    if (req.method === "GET" && url === "/api/orders") return send(res, 200, await kv("orders"));
    if (req.method === "GET" && url === "/api/settings") return send(res, 200, { ...await kv("settings"), ...BANK });
    if (req.method === "PUT" && url === "/api/settings") {
      const d = await body(req);
      const out = Object.fromEntries(["storeName", "address", "phone", "email", "npwp", "admin"].map(k => [k, String(d[k] ?? "").trim().slice(0, 200)]));
      await setKv("settings", out);
      return send(res, 200, { ok: true });
    }
    if (req.method === "PUT" && url === "/api/orders") {
      const t = (v, n) => String(v ?? "").slice(0, n), date = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
      const num = (v, max = 1e10) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
      const normPhone = v => { let d = String(v ?? "").replace(/\D/g, ""); if (d.startsWith("62")) d = "0" + d.slice(2); else if (d.startsWith("8")) d = "0" + d; return d.slice(0, 15); };
      // barang: [{name, note, qty, price, discount}]; teks lama "Nama xN" diubah otomatis (harga 0 -> akan ditolak sampai diisi)
      const toItems = v => Array.isArray(v) ? v : String(v ?? "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const m = /^(.*?)\s*[x×]\s*(\d+)$/i.exec(l); return { name: m ? m[1] : l, qty: m ? +m[2] : 1 }; });
      const d = await body(req);
      const out = (Array.isArray(d) ? d : []).slice(0, 3000).map(o => {
        const items = toItems(o.items).slice(0, 50).map(i => ({ name: t(i.name, 100).trim(), note: t(i.note, 100).trim(), qty: num(i.qty, 9999), price: num(i.price), discount: num(i.discount) }));
        const shipping = num(o.shipping);
        return {
          id: t(o.id, 40), invoice: t(o.invoice, 30), customer: t(o.customer, 100), city: t(o.city, 60), phone: normPhone(o.phone), address: t(o.address, 300),
          items, shipping, total: items.reduce((s, i) => s + i.qty * i.price - i.discount, 0) + shipping, // total selalu dihitung server
          courier: t(o.courier, 40), resi: t(o.resi, 40), shipDate: date(o.shipDate), created: date(o.created), shipped: date(o.shipped),
          proof: /^[\w-]+\.(pdf|jpg|png|webp)$/.test(o.proof) ? o.proof : "", paidAt: date(o.paidAt),
        };
      });
      if (out.some(o => !o.items.length)) return send(res, 400, { error: "Isi barang pada invoice wajib diisi" });
      if (out.some(o => o.items.some(i => !i.name || i.qty < 1 || i.price < 1 || i.discount > i.qty * i.price))) return send(res, 400, { error: "Setiap barang harus punya nama, jumlah, dan harga; diskon tidak boleh melebihi harga" });
      if (out.some(o => !/^08\d{8,12}$/.test(o.phone))) return send(res, 400, { error: "Nomor HP penerima harus nomor HP Indonesia (diawali 08)" });
      if (out.some(o => !o.address.trim())) return send(res, 400, { error: "Alamat penerima wajib diisi" });
      // alur: invoice -> dibayar (butuh bukti bayar) -> baru boleh dikirim (butuh kurir + resi)
      if (out.some(o => o.paidAt && !o.proof)) return send(res, 400, { error: "Invoice yang sudah dibayar wajib punya bukti pembayaran" });
      if (out.some(o => o.shipped && !(o.paidAt && o.courier && o.resi))) return send(res, 400, { error: "Pesanan hanya bisa dikirim setelah dibayar, dan wajib punya kurir dan nomor resi" });
      await setKv("orders", out);
      return send(res, 200, { ok: true });
    }
    if (req.method === "PUT" && url === "/api/data") {
      const d = await body(req);
      const products = (Array.isArray(d.products) ? d.products : []).map(p => ({
        id: String(p.id), name: String(p.name || "").slice(0, 100), price: Math.max(0, Number(p.price) || 0),
        cat: String(p.cat || "Lainnya").slice(0, 40), desc: String(p.desc || "").slice(0, 100),
        badge: ["new", "hot", "flash"].includes(p.badge) ? p.badge : "",
        stock: p.stock === "" || p.stock == null ? null : Math.max(0, Math.floor(Number(p.stock)) || 0), img: /^\/uploads\/[\w-]+\.(jpg|png|webp)$/.test(p.img) ? p.img : "",
      }));
      await setKv("data", { wa: String(d.wa || "").replace(/\D/g, ""), notice: String(d.notice || "").slice(0, 200), products });
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && url === "/api/upload") {
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec((await body(req)).dataUrl || "");
      if (!m) return send(res, 400, { error: "Gambar tidak valid" });
      const name = `${crypto.randomUUID()}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
      await putFile("uploads", name, Buffer.from(m[2], "base64"));
      return send(res, 200, { img: "/uploads/" + name });
    }
    send(res, 404, { error: "Tidak ditemukan" });
  } catch (e) { send(res, 400, { error: e.message }); }
};
module.exports = handler;
if (require.main === module) http.createServer(handler).listen(PORT, () => console.log(`Toko: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin`));
