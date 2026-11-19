// Uji kontrak API (specs/00-api.md, specs/10-performa.md) terhadap server yang sedang berjalan.
//   BASE=http://localhost:3000 ADMIN_PASSWORD=... node tests/api.test.js
// Aman untuk data nyata: hanya menyentuh barang/invoice berawalan "uji-" dan memulihkan pengaturan/kategori di akhir.
const assert = require("assert");
const BASE = process.env.BASE || "http://localhost:3000", PASS = process.env.ADMIN_PASSWORD;
if (!PASS) { console.error("Set ADMIN_PASSWORD dulu."); process.exit(1); }

const call = async (method, path, body, pass = PASS) => {
  const r = await fetch(BASE + path, { method, headers: { ...(pass ? { "x-admin": pass } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const type = r.headers.get("content-type") || "";
  return { status: r.status, type, body: type.includes("json") ? await r.json() : null };
};
let failed = 0;
const test = async (id, name, fn) => {
  try { await fn(); console.log("OK    ", id.padEnd(6), name); }
  catch (e) { failed++; console.log("GAGAL ", id.padEnd(6), name, "->", e.message); }
};

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PDF = "data:application/pdf;base64," + Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");
const valid = () => ({
  id: "uji-1", invoice: "UJI-1", customer: "Uji", phone: "081234567890", address: "Jl. Uji No. 1", city: "Jakarta",
  items: [{ name: "Barang", note: "", qty: 2, price: 1000, discount: 100 }], shipping: 500,
  courier: "", resi: "", shipDate: "", created: "2026-11-03", shipped: "", proof: "", paidAt: "",
});
const putOrder = (...changes) => { const o = valid(); changes.forEach(c => c(o)); return call("PUT", "/api/orders/" + o.id, o); };
const rejected = async (fn) => { const r = await fn(); assert.strictEqual(r.status, 400, `harus 400, dapat ${r.status}`); };
// semua barang lewat halaman admin (PGS-10), maks 50 per permintaan; katalog = pengaturan + semua barang
const allProducts = async () => { const out = []; for (let p = 1; ; p++) { const r = (await call("GET", `/api/admin/products?page=${p}&per=50`)).body; out.push(...r.items); if (out.length >= r.total || !r.items.length) return out; } };
const catalog = async () => ({ ...(await call("GET", "/api/admin/catalog")).body, products: await allProducts() });
const getOrder = id => call("GET", "/api/orders/" + id);
const mk = (id, o = {}) => ({ ...valid(), id, invoice: id.toUpperCase(), ...o });
const put = o => call("PUT", "/api/orders/" + o.id, o);
const PAYX = { paidAt: "2026-11-04", proof: "bukti.jpg" };
const drop = ids => Promise.all(ids.map(id => call("DELETE", "/api/orders/" + id)));
const ids = r => r.body.items.map(x => x.id);
// pulihkan katalog: buang barang yang tidak ada sebelumnya, kembalikan wa/pengumuman/kategori
const restoreCatalog = async before => {
  for (const p of (await catalog()).products) if (!before.products.some(b => b.id === p.id)) await call("DELETE", "/api/products/" + p.id);
  await call("PUT", "/api/data", { wa: before.wa, notice: before.notice, cats: before.cats });
};
const prod = (id, o = {}) => ({ id, name: "P " + id, price: 1, cat: "Uji", badge: "", stock: null, img: "", ...o });

(async () => {
  // ---------- API-1 akses
  await test("API-1", "endpoint privat menolak tanpa/dengan password salah; katalog publik terbuka", async () => {
    for (const u of ["/api/invoices", "/api/shipping", "/api/customers", "/api/customers/081200000001/invoices", "/api/inbox", "/api/counts", "/api/orders/x", "/api/next-invoice?prefix=INV-202611", "/api/admin/products"])
      assert.strictEqual((await call("GET", u, undefined, null)).status, 401, u);
    assert.strictEqual((await call("GET", "/api/invoices", undefined, "salah")).status, 401);
    assert.strictEqual((await call("GET", "/api/orders")).status, 404, "daftar semua invoice sudah dihapus (PGS)");
    assert.strictEqual((await call("GET", "/api/settings", undefined, null)).status, 401);
    assert.strictEqual((await call("GET", "/api/admin/catalog", undefined, null)).status, 401);
    assert.strictEqual((await call("PUT", "/api/products", [], null)).status, 401);
    assert.strictEqual((await call("DELETE", "/api/products/x", undefined, null)).status, 401);
    assert.strictEqual((await call("GET", "/api/data", undefined, null)).status, 200);
    assert.strictEqual((await call("GET", "/api/products", undefined, null)).status, 200);
  });

  // ---------- API-2 katalog disanitasi
  await test("API-2", "barang dan data toko dibersihkan: badge, stok, gambar, nomor WhatsApp, pengumuman", async () => {
    const before = await catalog();
    try {
      assert.strictEqual((await call("PUT", "/api/data", { wa: "+62 812-34", notice: "x".repeat(300) })).status, 200);
      assert.strictEqual((await call("PUT", "/api/products", [
        { id: "uji-1", name: "A", price: -5, cat: "", badge: "promo", stock: "", img: "/etc/passwd", thumb: "x" },
        { id: "uji-2", name: "B", price: 10, cat: "Tas", badge: "hot", stock: 3.9, img: "/uploads/abc.jpg", thumb: "/uploads/abc-s.jpg" },
      ])).status, 200);
      const d = await catalog(), [a, b] = ["uji-1", "uji-2"].map(id => d.products.find(p => p.id === id));
      assert.strictEqual(d.wa, "6281234");
      assert.strictEqual(d.notice.length, 200);
      assert.deepStrictEqual([a.price, a.cat, a.badge, a.stock, a.img, a.thumb], [0, "Lainnya", "", null, "", ""]);
      assert.deepStrictEqual([b.badge, b.stock, b.img, b.thumb], ["hot", 3, "/uploads/abc.jpg", "/uploads/abc-s.jpg"]);
      assert.strictEqual((await call("PUT", "/api/products", [{ id: "../x", name: "a" }])).status, 400);
    } finally { await restoreCatalog(before); }
  });

  // ---------- API-4 aturan pesanan (kasus ditolak: tidak menulis)
  await test("API-4a", "invoice tanpa barang / harga 0 / qty 0 / diskon > harga / nama kosong ditolak", async () => {
    await rejected(() => putOrder(o => { o.items = []; }));
    await rejected(() => putOrder(o => { o.items[0].price = 0; }));
    await rejected(() => putOrder(o => { o.items[0].qty = 0; }));
    await rejected(() => putOrder(o => { o.items[0].discount = 2001; }));
    await rejected(() => putOrder(o => { o.items[0].name = "  "; }));
  });
  await test("API-4b", "nomor HP bukan 08 dan alamat kosong ditolak", async () => {
    await rejected(() => putOrder(o => { o.phone = "0211234567"; }));
    await rejected(() => putOrder(o => { o.phone = ""; }));
    await rejected(() => putOrder(o => { o.address = "  "; }));
  });
  await test("API-4c", "dibayar tanpa bukti ditolak; dikirim sebelum dibayar / tanpa kurir / tanpa resi ditolak", async () => {
    await rejected(() => putOrder(o => { o.paidAt = "2026-11-03"; }));
    await rejected(() => putOrder(o => { o.shipped = "2026-11-03"; o.courier = "JNE"; o.resi = "R1"; }));
    await rejected(() => putOrder(o => { o.paidAt = "2026-11-03"; o.proof = "bukti.pdf"; o.shipped = "2026-11-03"; o.resi = "R1"; }));
    await rejected(() => putOrder(o => { o.paidAt = "2026-11-03"; o.proof = "bukti.pdf"; o.shipped = "2026-11-03"; o.courier = "JNE"; }));
    assert.strictEqual((await getOrder("uji-1")).status, 404, "kasus ditolak tidak boleh menulis");
  });

  // ---------- API-3 + API-4d: total dihitung server, HP dinormalisasi, alur lengkap diterima
  await test("API-3", "total dihitung server (abaikan total kiriman) dan HP dinormalisasi; alur bayar -> kirim diterima", async () => {
    try {
      const o = valid(); o.total = 1; o.phone = "+62 812-3456-7890";
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", o)).status, 200);
      const got = (await getOrder("uji-1")).body;
      assert.strictEqual(got.total, 2 * 1000 - 100 + 500);
      assert.strictEqual(got.phone, "081234567890");
      const paid = { ...got, paidAt: "2026-11-03", proof: "bukti.jpg" };
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", paid)).status, 200);
      const sent = { ...paid, courier: "JNE", resi: "R1", shipped: "2026-11-04" };
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", sent)).status, 200);
    } finally { await call("DELETE", "/api/orders/uji-1"); }
  });

  // ---------- PERF-8 satu dokumen per invoice
  await test("PERF-8", "menyimpan/menghapus satu invoice tidak menyentuh invoice lain; id salah ditolak", async () => {
    try {
      const a = valid(), b = { ...valid(), id: "uji-2", invoice: "UJI-2" };
      await call("PUT", "/api/orders/uji-1", a); await call("PUT", "/api/orders/uji-2", b);
      const b0 = (await getOrder("uji-2")).body;
      await call("PUT", "/api/orders/uji-1", { ...a, customer: "Lain" });
      assert.deepStrictEqual((await getOrder("uji-2")).body, b0);
      assert.strictEqual((await getOrder("uji-1")).body.customer, "Lain");
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", a, null)).status, 401);
      assert.strictEqual((await call("PUT", "/api/orders/a%20b", a)).status, 404);
      await call("DELETE", "/api/orders/uji-1");
      assert.strictEqual((await getOrder("uji-1")).status, 404);
      assert.deepStrictEqual((await getOrder("uji-2")).body, b0);
    } finally { await call("DELETE", "/api/orders/uji-1"); await call("DELETE", "/api/orders/uji-2"); }
  });

  // ---------- API-5 unggah gambar produk
  await test("API-5", "gambar produk: hanya JPG/PNG/WEBP, foto mini ikut; hasilnya publik dan boleh di-cache selamanya (PERF-1)", async () => {
    assert.strictEqual((await call("POST", "/api/upload", { dataUrl: "data:text/html;base64,PGI+" })).status, 400);
    assert.strictEqual((await call("POST", "/api/upload", { dataUrl: PNG, thumb: "data:text/html;base64,PGI+" })).status, 400);
    const up = await call("POST", "/api/upload", { dataUrl: PNG, thumb: PNG });
    assert.strictEqual(up.status, 200);
    assert.match(up.body.img, /^\/uploads\/[\w-]+\.png$/);
    assert.match(up.body.thumb, /^\/uploads\/[\w-]+-s\.png$/);
    const r = await fetch(BASE + up.body.img);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("content-type"), "image/png");
    assert.match(r.headers.get("cache-control"), /immutable/);
    assert.strictEqual((await fetch(BASE + up.body.img, { headers: { "if-none-match": r.headers.get("etag") } })).status, 304);
    assert.strictEqual((await call("POST", "/api/upload", { dataUrl: PNG })).body.thumb, ""); // mini opsional (foto lama)
  });

  // ---------- PERF-5 foto yatim
  await test("PERF-5", "foto dihapus saat barang dihapus atau fotonya diganti, kecuali masih dipakai barang lain", async () => {
    const before = await catalog(), gone = async u => (await fetch(BASE + u)).status === 404, up = () => call("POST", "/api/upload", { dataUrl: PNG, thumb: PNG }).then(r => r.body);
    try {
      const a = await up(), b = await up();
      await call("PUT", "/api/products", [prod("uji-f", { img: a.img, thumb: a.thumb }), prod("uji-g", { img: a.img, thumb: a.thumb })]);
      await call("PUT", "/api/products", [prod("uji-f", { img: b.img, thumb: b.thumb })]); // diganti, tapi uji-g masih memakai foto a
      assert.ok(!(await gone(a.img)), "foto yang masih dipakai barang lain tidak boleh dihapus");
      await call("DELETE", "/api/products/uji-g");
      assert.ok(await gone(a.img) && await gone(a.thumb), "foto a harus hilang setelah tak dipakai");
      await call("PUT", "/api/products", [prod("uji-f", { img: "", thumb: "" })]);
      assert.ok(await gone(b.img) && await gone(b.thumb), "foto b harus hilang setelah diganti");
    } finally { await restoreCatalog(before); }
  });

  // ---------- API-6 dokumen privat
  await test("API-6", "dokumen: PDF dicek headernya; hanya bisa dibuka dengan login", async () => {
    assert.strictEqual((await call("POST", "/api/doc", { dataUrl: "data:application/pdf;base64," + Buffer.from("bukan pdf").toString("base64") })).status, 400);
    assert.strictEqual((await call("POST", "/api/doc", { dataUrl: "data:text/plain;base64,aGk=" })).status, 400);
    const up = await call("POST", "/api/doc", { dataUrl: PDF });
    assert.strictEqual(up.status, 200);
    assert.strictEqual((await call("GET", "/api/doc/" + up.body.file, undefined, null)).status, 401);
    const r = await fetch(BASE + "/api/doc/" + up.body.file, { headers: { "x-admin": PASS } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("content-type"), "application/pdf");
    assert.doesNotMatch(r.headers.get("cache-control"), /public/); // PERF-1: dokumen tidak di-cache CDN
    const png = await call("POST", "/api/doc", { dataUrl: PNG });
    assert.strictEqual(png.status, 200);
  });

  await test("API-6b", "dokumen di atas 3MB ditolak (batas Vercel); 3MB ke bawah diterima", async () => {
    const pdf = n => "data:application/pdf;base64," + Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(n)]).toString("base64");
    const big = await call("POST", "/api/doc", { dataUrl: pdf(3.1e6) });
    assert.strictEqual(big.status, 400, `harus 400, dapat ${big.status}`);
    const ok = await call("POST", "/api/doc", { dataUrl: pdf(2.9e6) });
    assert.strictEqual(ok.status, 200, `harus 200, dapat ${ok.status}`);
  });

  // ---------- API-7 pengaturan; rekening hanya dari kode
  await test("API-7", "rekening datang dari kode server dan tidak bisa diubah lewat API", async () => {
    const before = (await call("GET", "/api/settings")).body;
    try {
      const bank = before.bankNo;
      assert.ok(bank, "bankNo harus ada dari konstanta server");
      assert.strictEqual((await call("PUT", "/api/settings", { storeName: "Uji", bankNo: "9999", bankName: "XX" })).status, 200);
      const after = (await call("GET", "/api/settings")).body;
      assert.strictEqual(after.storeName, "Uji");
      assert.strictEqual(after.bankNo, bank);
      assert.notStrictEqual(after.bankName, "XX");
    } finally { await call("PUT", "/api/settings", before); }
  });

  // ---------- SET-6/7 kategori terkelola
  await test("SET-6/7", "kategori: urutan dipertahankan, kembar dibuang, yang masih dipakai tidak bisa dihapus, kategori baru dari barang ditambahkan, toko hanya melihat yang berisi", async () => {
    const before = await catalog(), base = before.cats;
    try {
      assert.strictEqual((await call("PUT", "/api/data", { cats: [...base, "UjiTas", "ujitas", "UjiKoper", " UjiSepatu "] })).status, 200);
      assert.deepStrictEqual((await catalog()).cats, [...base, "UjiTas", "UjiKoper", "UjiSepatu"]);
      await call("PUT", "/api/products", [prod("uji-a", { cat: "ujikoper" }), prod("uji-b", { cat: "UjiTas" })]);
      assert.strictEqual((await catalog()).products.find(p => p.id === "uji-a").cat, "UjiKoper"); // huruf mengikuti daftar
      await rejected(() => call("PUT", "/api/data", { cats: [...base, "UjiTas", "UjiSepatu"] })); // UjiKoper masih dipakai
      await call("DELETE", "/api/products/uji-a");
      assert.strictEqual((await call("PUT", "/api/data", { cats: [...base, "UjiTas", "UjiSepatu"] })).status, 200);
      await call("PUT", "/api/products", [prod("uji-c", { cat: "UjiBaru" })]);
      assert.deepStrictEqual((await catalog()).cats, [...base, "UjiTas", "UjiSepatu", "UjiBaru"]);
      const pubCats = (await call("GET", "/api/data", undefined, null)).body.cats; // UjiSepatu kosong: tidak tampil di toko
      assert.ok(pubCats.includes("UjiTas") && pubCats.includes("UjiBaru") && !pubCats.includes("UjiSepatu"));
    } finally { await restoreCatalog(before); }
  });

  // ---------- PERF-9 daftar barang untuk toko
  await test("PERF-9", "toko memuat barang per halaman: urut harga, stok habis tersembunyi, cari, ids; tahan karakter aneh", async () => {
    const before = await catalog(), get = q => call("GET", "/api/products?" + q, undefined, null);
    try {
      await call("PUT", "/api/products", [prod("uji-s1", { price: 100, cat: "UjiList" }), prod("uji-s2", { price: 300, cat: "UjiList" }), prod("uji-s3", { price: 200, cat: "UjiList" }),
        prod("uji-s0", { name: "Habis Uji", price: 999, cat: "UjiList", stock: 0 })]);
      const ids = r => r.body.items.map(p => p.id);
      let r = await get("cat=UjiList&sort=desc");
      assert.deepStrictEqual([ids(r), r.body.total], [["uji-s2", "uji-s3", "uji-s1"], 3]);
      assert.deepStrictEqual(ids(await get("cat=UjiList&sort=asc")), ["uji-s1", "uji-s3", "uji-s2"]);
      r = await get("cat=UjiList&sort=asc&skip=1&limit=1");
      assert.deepStrictEqual([ids(r), r.body.total], [["uji-s3"], 3]);
      assert.deepStrictEqual(ids(await get("q=habis%20uji")), ["uji-s0"]); // TOK-21: baru muncul saat dicari
      assert.strictEqual((await get("q=" + encodeURIComponent("a(b[*"))).status, 200); // regex tidak bocor
      assert.deepStrictEqual(ids(await get("ids=uji-s0,uji-s1,tidak-ada")).sort(), ["uji-s0", "uji-s1"]); // keranjang: stok habis ikut
      assert.ok((await get("limit=9999")).body.items.length <= 48);
      assert.ok(!("t" in r.body.items[0]) && !("_id" in r.body.items[0]));
      assert.match((await fetch(BASE + "/api/products?cat=UjiList")).headers.get("cache-control"), /s-maxage=30/); // PERF-2
    } finally { await restoreCatalog(before); }
  });

  // ---------- PERF-3 cache dan gzip
  await test("PERF-3", "halaman dikirim gzip dengan ETag (304 bila sama); /api/data boleh di-cache", async () => {
    const r = await fetch(BASE + "/", { headers: { "accept-encoding": "gzip" } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("content-encoding"), "gzip");
    assert.strictEqual((await fetch(BASE + "/", { headers: { "if-none-match": r.headers.get("etag") } })).status, 304);
    assert.strictEqual((await fetch(BASE + "/admin")).status, 200);
    assert.match((await fetch(BASE + "/assets/logo.png")).headers.get("cache-control"), /max-age=\d+/);
    assert.match((await fetch(BASE + "/api/data")).headers.get("cache-control"), /s-maxage=30/);
  });

  // ---------- SET-8/10/11 kurir, kalimat invoice, awalan nomor
  await test("SET-8/10/11", "kurir terkelola, kalimat penutup/catatan kaki dibatasi, awalan nomor dibersihkan", async () => {
    const before = (await call("GET", "/api/settings")).body;
    try {
      assert.ok(before.couriers.length >= 1 && before.couriers.every(c => c.name && typeof c.on === "boolean"), "bawaan kurir harus ada");
      assert.strictEqual(before.invPrefix.length > 0, true);
      assert.strictEqual((await call("PUT", "/api/settings", { couriers: [{ name: "JNE", on: true }, { name: "jne", on: true }, { name: "Gojek", on: false }, { name: " " }], closing: "x".repeat(400), footnote: "Retur 3 hari", invPrefix: "ab-1 2$" })).status, 200);
      const s = (await call("GET", "/api/settings")).body;
      assert.deepStrictEqual(s.couriers, [{ name: "JNE", on: true }, { name: "Gojek", on: false }]);
      assert.strictEqual(s.closing.length, 300);
      assert.strictEqual(s.footnote, "Retur 3 hari");
      assert.strictEqual(s.invPrefix, "AB12");
      assert.strictEqual((await call("PUT", "/api/settings", { invPrefix: "" })).status, 200);
      assert.strictEqual((await call("GET", "/api/settings")).body.invPrefix, "INV");
    } finally { await call("PUT", "/api/settings", before); }
  });

  // ---------- PSM pesanan masuk (specs/08-pesanan-masuk.md)
  await test("PSM", "pesanan masuk: publik hanya menulis; harga dari katalog; kode ganda ditimpa; terkunci bila sudah diinvoice", async () => {
    const before = await catalog();
    const who = { name: "Ibu Uji", phone: "+62 812-3456-7890", address: "  Jl. Uji No. 1, Jakarta  " };
    const pub = (b) => call("POST", "/api/inbox", { ...who, ...b }, null), codes = ["PSN-UJI001", "PSN-UJI002"];
    const list = async () => (await Promise.all(["new", "match", "done"].map(t => call("GET", "/api/inbox?per=50&tab=" + t)))).flatMap(r => r.body.items).filter(x => codes.includes(x.code));
    try {
      await call("PUT", "/api/products", [prod("uji-p", { name: "Barang Uji", price: 5000 })]);
      // PSM-1/2: tanpa login boleh; nama dan harga kiriman klien diabaikan; barang tak dikenal dibuang; kode sama = satu pesanan
      const body = { code: codes[0], items: [{ id: "uji-p", qty: 2, name: "Palsu", price: 1 }, { id: "tidak-ada", qty: 1 }] };
      assert.strictEqual((await pub(body)).status, 200);
      assert.strictEqual((await pub(body)).status, 200);
      const [r] = await list();
      assert.strictEqual((await list()).length, 1);
      assert.deepStrictEqual(r.items, [{ id: "uji-p", name: "Barang Uji", price: 5000, qty: 2 }]);
      assert.deepStrictEqual([r.name, r.phone, r.address], ["Ibu Uji", "081234567890", "Jl. Uji No. 1, Jakarta"]); // HP dinormalisasi seperti INV-5; alamat dirapikan
      assert.strictEqual((await pub({ code: codes[1], items: body.items, address: "x".repeat(400) })).status, 200); // alamat dipotong 300, tidak ditolak
      assert.strictEqual((await list()).find(x => x.code === codes[1]).address.length, 300);
      assert.strictEqual((await pub({ code: codes[1], items: body.items, address: undefined })).status, 200); // tanpa alamat tetap tercatat (halaman lama)
      await call("DELETE", "/api/inbox/" + codes[1]);
      // PSM-2: nama wajib; HP harus nomor Indonesia
      assert.strictEqual((await pub({ code: codes[1], items: body.items, name: " " })).status, 400);
      assert.strictEqual((await pub({ code: codes[1], items: body.items, phone: "12345" })).status, 400);
      assert.strictEqual((await pub({ code: codes[1], items: body.items, phone: undefined })).status, 400);
      assert.strictEqual((await pub({ code: codes[1], items: [{ id: "tidak-ada", qty: 1 }] })).status, 400); // tanpa barang valid
      // PSM-3: kode salah format, qty dibatasi, isi terlalu besar
      assert.strictEqual((await pub({ code: "psn-abc", items: body.items })).status, 400);
      assert.strictEqual((await pub({ code: codes[1], items: [{ id: "uji-p", qty: 5000 }] })).status, 200);
      assert.strictEqual((await list()).find(x => x.code === codes[1]).items[0].qty, 999);
      assert.notStrictEqual(await pub({ code: codes[1], items: body.items, x: "a".repeat(3e4) }).then(r => r.status, () => "putus"), 200); // server memutus sambungan
      // PSM-4: baca dan hapus butuh login
      assert.strictEqual((await call("GET", "/api/inbox", undefined, null)).status, 401);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0], undefined, null)).status, 401);
      // PSM-16/17: pencocokan. Invoice baru dari pesanan ditolak sebelum dicocokkan; koreksi admin disimpan terpisah dari pesanan asli
      const inv = (id) => { const o = valid(); o.id = id; o.invoice = id; o.pesananKode = codes[0]; return o; };
      const putInv = id => call("PUT", "/api/orders/" + id, inv(id));
      const match = (code, b, pass) => call("POST", "/api/inbox/" + code + "/match", b, pass);
      const mine = async () => (await list()).find(x => x.code === codes[0]);
      await rejected(() => putInv("uji-a"));                                                     // belum dicocokkan
      assert.strictEqual((await match(codes[0], { items: body.items }, null)).status, 401);     // butuh login admin
      assert.strictEqual((await match("PSN-TIDAK1", { items: body.items })).status, 404);       // kode tak dikenal
      assert.strictEqual((await match(codes[0], { items: [{ id: "tidak-ada", qty: 1 }] })).status, 400); // tanpa barang valid
      assert.strictEqual((await match(codes[0], { items: [{ id: "uji-p", qty: 5, name: "Palsu", price: 1 }] })).status, 200);
      const m1 = await mine();
      assert.deepStrictEqual(m1.matched.items, [{ id: "uji-p", name: "Barang Uji", price: 5000, qty: 5 }]); // nama/harga dari katalog
      assert.strictEqual(m1.items[0].qty, 2);                                                   // pesanan asli tetap
      assert.strictEqual((await pub(body)).status, 200);                                        // kirim ulang publik tidak menimpa
      assert.ok((await mine()).matched, "pencocokan hilang setelah kirim ulang");
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0] + "/match")).status, 200); // Batal cocok
      assert.strictEqual((await mine()).matched, undefined);
      await rejected(() => putInv("uji-a"));                                                     // kembali belum dicocokkan
      assert.strictEqual((await match(codes[0], { items: body.items })).status, 200);
      // PSM-6: invoice menyimpan kode; pesanan berinvoice tak bisa dihapus/dicocokkan ulang; satu pesanan satu invoice
      assert.strictEqual((await putInv("uji-a")).status, 200);
      assert.strictEqual((await putInv("uji-a")).status, 200);                                   // simpan ulang invoice yang sama tetap diterima
      assert.strictEqual((await match(codes[0], { items: body.items })).status, 400);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0] + "/match")).status, 400);
      assert.strictEqual((await getOrder("uji-a")).body.pesananKode, codes[0]);
      // PGS-5: tahap dihitung server; baris Sudah Diinvoice membawa invoicenya, jumlah invoice nomor HP itu, dan kota/alamat invoice terakhir
      const done = (await call("GET", "/api/inbox?per=50&tab=done&q=" + codes[0])).body;
      assert.deepStrictEqual(done.items.map(x => x.code), [codes[0]]);
      assert.strictEqual(done.items[0].invoice.id, "uji-a");
      assert.ok(done.items[0].invCount >= 1 && done.items[0].last.city === "Jakarta");
      assert.ok(done.counts.done >= 1 && done.total === 1);
      assert.strictEqual((await call("GET", "/api/inbox?tab=new&q=" + codes[0])).body.total, 0);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0])).status, 400);
      await rejected(() => putInv("uji-b"));                                                     // kode yang sama di invoice lain
      await call("DELETE", "/api/orders/uji-a");
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0])).status, 200);
      assert.strictEqual((await list()).length, 1);
    } finally {
      await restoreCatalog(before);
      for (const id of ["uji-a", "uji-b"]) await call("DELETE", "/api/orders/" + id);
      for (const c of codes) await call("DELETE", "/api/inbox/" + c);
    }
  });

  // ---------- PGS (specs/11-paginasi-server.md). Data uji ber-nama "UjiPgs…" dicari lewat q; angka global dibandingkan sebagai selisih.
  await test("PGS-1/6/9", "Invoice: tab, cari, bulan, urutan, halaman, jumlah global, /api/counts, nomor berikutnya", async () => {
    const ID = ["uji-ga", "uji-gb", "uji-gc"], inv = async q => (await call("GET", "/api/invoices?" + q + (/(^|&)q=/.test(q) ? "" : "&q=UjiPgs") + "&per=50")).body; // parameter pertama menang, jadi bawaan di belakang
    const [c0, n0] = [(await call("GET", "/api/invoices")).body, (await call("GET", "/api/counts")).body];
    try {
      await put(mk("uji-ga", { customer: "UjiPgs Ani", city: "Bandung", created: "2026-10-05", invoice: "UJI-2026100001" }));
      await put(mk("uji-gb", { customer: "UjiPgs Budi", created: "2026-11-02", invoice: "UJI-2026110001" }));
      await put(mk("uji-gc", { customer: "UjiPgs Cici", created: "2026-11-03", invoice: "UJI-2026110002", ...PAYX }));
      const c1 = (await call("GET", "/api/invoices")).body, tot = 2 * 1000 - 100 + 500;
      assert.deepStrictEqual([c1.counts.unpaid - c0.counts.unpaid, c1.counts.paid - c0.counts.paid, c1.unpaidSum - c0.unpaidSum], [2, 1, 2 * tot]);
      const n1 = (await call("GET", "/api/counts")).body;
      assert.deepStrictEqual([n1.unpaid - n0.unpaid, n1.todo - n0.todo], [2, 1]); // PGS-6 (invoice lunas belum dikirim = perlu dikirim)
      assert.deepStrictEqual(ids({ body: await inv("tab=unpaid") }), ["uji-ga", "uji-gb"]); // belum dibayar: tanggal buat naik
      assert.deepStrictEqual(ids({ body: await inv("tab=paid") }), ["uji-gc"]);
      assert.deepStrictEqual(ids({ body: await inv("month=2026-11") }), ["uji-gb"]);
      assert.deepStrictEqual(ids({ body: await inv("q=bandung") }), ["uji-ga"]);                 // cari kota, tanpa membedakan huruf
      assert.strictEqual((await inv("q=bandung&month=2026-11")).total, 0);
      const r = await inv("month=2026-11");
      assert.ok(r.months.includes("2026-10") && r.months.includes("2026-11") && r.counts.unpaid >= 2, "bulan dan jumlah tak terpengaruh cari/bulan");
      let p = await inv("per=1&page=2");
      assert.deepStrictEqual([ids({ body: p }), p.total], [["uji-gb"], 2]);
      assert.deepStrictEqual(ids({ body: await inv("page=0") }), ["uji-ga", "uji-gb"]);          // halaman 0 = halaman 1
      p = await inv("page=99"); assert.deepStrictEqual([p.items.length, p.total], [0, 2]);       // di luar jumlah: kosong, total tetap
      assert.ok((await call("GET", "/api/invoices?per=9999")).body.items.length <= 50);
      assert.strictEqual((await call("GET", "/api/invoices?q=" + encodeURIComponent("a(b[*"))).status, 200);
      assert.ok(!("_id" in r.items[0]) && !("t" in r.items[0]));
      // PGS-9
      assert.strictEqual((await call("GET", "/api/next-invoice?prefix=UJI-202611")).body.invoice, "UJI-2026110003");
      assert.strictEqual((await call("GET", "/api/next-invoice?prefix=UJI-202612")).body.invoice, "UJI-2026120001");
      assert.strictEqual((await call("GET", "/api/next-invoice?prefix=..")).status, 400);
    } finally { await drop(ID); }
  });

  await test("PGS-2", "barang di invoice membawa foto mini dari katalog yang namanya cocok (tanpa membedakan huruf besar/kecil)", async () => {
    const before = await catalog();
    try {
      await call("PUT", "/api/products", [prod("uji-gp", { name: "UjiPgs Tas", img: "/uploads/uji-gp.jpg", thumb: "/uploads/uji-gp-s.jpg" })]);
      const it = (name, note = "") => ({ name, note, qty: 1, price: 1000, discount: 0 });
      await put(mk("uji-gd", { customer: "UjiPgs Pic", items: [it("ujipgs TAS"), it("UjiPgs Tas", "merah"), it("Barang Lain")] }));
      const [a, b, c] = (await call("GET", "/api/invoices?q=UjiPgs%20Pic")).body.items[0].items;
      assert.deepStrictEqual([a.pic, b.pic, c.pic], ["/uploads/uji-gp-s.jpg", "/uploads/uji-gp-s.jpg", ""]);
    } finally { await drop(["uji-gd"]); await restoreCatalog(before); }
  });

  await test("PGS-3", "Pengiriman: urutan, status menurut tanggal browser, tab Sudah Dikirim, kurir, bulan, jumlah", async () => {
    const ID = ["uji-s1", "uji-s2", "uji-s3", "uji-s4", "uji-s5"], T = "&today=2026-11-12&per=50&q=UjiShip", ship = q => call("GET", "/api/shipping?" + q).then(r => r.body);
    const s0 = (await ship("today=2026-11-12")).stats, k0 = (await ship("today=2026-11-12")).counts;
    try {
      const base = { customer: "UjiShip", ...PAYX };
      await put(mk("uji-s1", { ...base, shipDate: "2026-11-10" }));                                                  // terlambat 2 hari
      await put(mk("uji-s2", { ...base, shipDate: "2026-11-12", courier: "UjiJNE", resi: "R2" }));                    // hari ini + siap label
      await put(mk("uji-s3", { ...base }));                                                                          // belum dijadwalkan
      await put(mk("uji-s4", { ...base, shipDate: "2026-11-20" }));                                                  // terjadwal
      await put(mk("uji-s5", { ...base, courier: "UjiJNE", resi: "R5", shipped: "2026-11-11" }));                    // sudah dikirim
      const todo = await ship("tab=todo" + T), s1 = todo.stats;
      assert.deepStrictEqual(ids({ body: todo }), ["uji-s2", "uji-s1", "uji-s4", "uji-s3"]);                         // KIR-2: siap label, lalu terlambat, terjadwal, belum
      assert.deepStrictEqual(["today", "late", "sched", "none"].map(k => s1[k] - s0[k]), [1, 1, 1, 1]);
      assert.deepStrictEqual([todo.counts.todo - k0.todo, todo.counts.done - k0.done], [4, 1]);
      assert.deepStrictEqual(ids({ body: await ship("tab=done" + T) }), ["uji-s5"]);
      assert.deepStrictEqual(ids({ body: await ship("tab=todo&courier=UjiJNE" + T) }), ["uji-s2"]);
      assert.ok(todo.couriers.includes("UjiJNE") && todo.months.includes("2026-11"));
      assert.deepStrictEqual(ids({ body: await ship("tab=todo&month=2026-11" + T) }).sort(), ["uji-s1", "uji-s2", "uji-s4", "uji-s3"].sort()); // s3: bulan dari tanggal bayar
      assert.deepStrictEqual(ids({ body: await ship("tab=todo&month=2026-12" + T) }), []);
      const pg2 = await ship("tab=todo&per=2&page=2&today=2026-11-12&q=UjiShip");
      assert.deepStrictEqual([ids({ body: pg2 }), pg2.total], [["uji-s4", "uji-s3"], 4]);
      assert.strictEqual((await ship("tab=done&month=2026-11" + T)).total, 1);
      assert.strictEqual((await ship("tab=todo&today=2026-11-21" + T)).items.find(o => o.id === "uji-s4") && 1, 1); // tanggal lain tidak merusak
    } finally { await drop(ID); }
  });

  await test("PGS-4", "Pelanggan: satu HP = satu pelanggan, data dari invoice terbaru, total hanya yang lunas, rincian, ringkasan", async () => {
    const ID = ["uji-p1", "uji-p2", "uji-p3"], cust = q => call("GET", "/api/customers?" + q).then(r => r.body), c0 = (await cust("q=zzzz-tidak-ada")).stats;
    try {
      await put(mk("uji-p1", { customer: "UjiCust Lama", phone: "081200000111", created: "2026-10-01", ...PAYX }));
      await put(mk("uji-p2", { customer: "UjiCust Baru", phone: "081200000111", created: "2026-11-01", city: "Cimahi" }));
      await put(mk("uji-p3", { customer: "UjiCust Dua", phone: "081200000222", created: "2026-09-01" }));
      const r = await cust("q=UjiCust"), [a, b] = r.items, tot = 2 * 1000 - 100 + 500;
      assert.deepStrictEqual([r.total, a.phone, b.phone], [2, "081200000111", "081200000222"]);                        // urut invoice terakhir turun
      assert.deepStrictEqual([a.name, a.city, a.n, a.paid, a.spent, a.last], ["UjiCust Baru", "Cimahi", 2, 1, tot, "2026-11-01"]);
      assert.deepStrictEqual([b.n, b.paid, b.spent], [1, 0, 0]);
      assert.deepStrictEqual((await cust("q=0812000001")).items.map(x => x.phone), ["081200000111"]);               // cari nomor HP
      const st = (await cust("q=zzzz-tidak-ada")).stats;
      assert.deepStrictEqual([st.customers - c0.customers, st.repeat - c0.repeat, st.spent - c0.spent], [2, 1, tot]);
      const p2 = await cust("q=UjiCust&per=1&page=2"); assert.deepStrictEqual([p2.items.map(x => x.phone), p2.total], [["081200000222"], 2]);
      assert.deepStrictEqual((await call("GET", "/api/customers/081200000111/invoices")).body.items.map(o => o.id), ["uji-p2", "uji-p1"]);
    } finally { await drop(ID); }
  });

  await test("PGS-10", "Katalog admin: cari, kategori, stok, halaman, terbaru dulu; pengaturan tanpa daftar barang; ganti nama kategori memindahkan barangnya", async () => {
    const before = await catalog(), adm = q => call("GET", "/api/admin/products?" + q).then(r => r.body);
    try {
      for (let n = 1; n <= 5; n++) await call("PUT", "/api/products", [prod("uji-k" + n, { name: "KatUji " + n, cat: "UjiKat", stock: n === 1 ? 0 : n === 2 ? 5 : null })]);
      const all = await adm("q=katuji&per=50");
      assert.deepStrictEqual([all.items.map(p => p.id), all.total], [["uji-k5", "uji-k4", "uji-k3", "uji-k2", "uji-k1"], 5]); // terbaru dulu
      assert.ok(all.count >= 5 && !("t" in all.items[0]));
      assert.deepStrictEqual((await adm("q=katuji&per=2&page=3")).items.map(p => p.id), ["uji-k1"]);
      assert.deepStrictEqual((await adm("q=katuji&stock=habis")).items.map(p => p.id), ["uji-k1"]);
      assert.strictEqual((await adm("q=katuji&stock=ada")).total, 4);
      assert.deepStrictEqual((await adm("q=katuji&stock=terbatas&per=50")).items.map(p => p.id).sort(), ["uji-k1", "uji-k2"]);
      assert.strictEqual((await adm("cat=UjiKat")).total, 5);
      assert.strictEqual((await adm("q=ujikat&per=1")).total, 5);                                                       // cari juga di kategori
      assert.strictEqual((await call("GET", "/api/admin/products?q=" + encodeURIComponent("a(b[*"))).status, 200);
      const meta = (await call("GET", "/api/admin/catalog")).body;
      assert.ok(!("products" in meta) && meta.catCounts.UjiKat === 5);
      await call("PUT", "/api/data", { cats: [...meta.cats.filter(c => c !== "UjiKat"), "UjiKat2"], rename: { UjiKat: "UjiKat2" } });
      const m2 = (await call("GET", "/api/admin/catalog")).body;
      assert.deepStrictEqual([m2.catCounts.UjiKat2, m2.catCounts.UjiKat], [5, undefined]);
    } finally { await restoreCatalog(before); }
  });

  console.log(failed ?`\n${failed} tes GAGAL` : "\nSemua tes lolos");
  process.exit(failed ? 1 : 0);
})();
