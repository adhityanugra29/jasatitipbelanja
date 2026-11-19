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
const catalog = async () => (await call("GET", "/api/admin/catalog")).body;
// pulihkan katalog: buang barang yang tidak ada sebelumnya, kembalikan wa/pengumuman/kategori
const restoreCatalog = async before => {
  for (const p of (await catalog()).products) if (!before.products.some(b => b.id === p.id)) await call("DELETE", "/api/products/" + p.id);
  await call("PUT", "/api/data", { wa: before.wa, notice: before.notice, cats: before.cats });
};
const prod = (id, o = {}) => ({ id, name: "P " + id, price: 1, cat: "Uji", badge: "", stock: null, img: "", ...o });

(async () => {
  // ---------- API-1 akses
  await test("API-1", "endpoint privat menolak tanpa/dengan password salah; katalog publik terbuka", async () => {
    assert.strictEqual((await call("GET", "/api/orders", undefined, null)).status, 401);
    assert.strictEqual((await call("GET", "/api/orders", undefined, "salah")).status, 401);
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
    assert.ok(!(await call("GET", "/api/orders")).body.some(o => o.id === "uji-1"), "kasus ditolak tidak boleh menulis");
  });

  // ---------- API-3 + API-4d: total dihitung server, HP dinormalisasi, alur lengkap diterima
  await test("API-3", "total dihitung server (abaikan total kiriman) dan HP dinormalisasi; alur bayar -> kirim diterima", async () => {
    try {
      const o = valid(); o.total = 1; o.phone = "+62 812-3456-7890";
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", o)).status, 200);
      const got = (await call("GET", "/api/orders")).body.find(x => x.id === "uji-1");
      assert.strictEqual(got.total, 2 * 1000 - 100 + 500);
      assert.strictEqual(got.phone, "081234567890");
      const paid = { ...got, paidAt: "2026-11-03", proof: "bukti.jpg" };
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", paid)).status, 200);
      const sent = { ...paid, courier: "JNE", resi: "R1", shipped: "2026-11-04" };
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", sent)).status, 200);
    } finally { await call("DELETE", "/api/orders/uji-1"); }
  });

  // ---------- PERF-8 satu dokumen per invoice
  await test("PERF-8", "menyimpan/menghapus satu invoice tidak menyentuh invoice lain; yang baru di atas; id salah ditolak", async () => {
    try {
      const a = valid(), b = { ...valid(), id: "uji-2", invoice: "UJI-2" };
      await call("PUT", "/api/orders/uji-1", a); await call("PUT", "/api/orders/uji-2", b);
      const list = async () => (await call("GET", "/api/orders")).body;
      const ids = (await list()).map(o => o.id);
      assert.ok(ids.indexOf("uji-2") < ids.indexOf("uji-1"), "invoice terbaru harus di atas");
      const b0 = (await list()).find(o => o.id === "uji-2");
      await call("PUT", "/api/orders/uji-1", { ...a, customer: "Lain" });
      assert.deepStrictEqual((await list()).find(o => o.id === "uji-2"), b0);
      assert.deepStrictEqual((await list()).map(o => o.id), ids); // urutan tidak berubah saat diubah
      assert.strictEqual((await call("PUT", "/api/orders/uji-1", a, null)).status, 401);
      assert.strictEqual((await call("PUT", "/api/orders/a%20b", a)).status, 404);
      await call("DELETE", "/api/orders/uji-1");
      assert.deepStrictEqual((await list()).find(o => o.id === "uji-2"), b0);
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
    const list = async () => (await call("GET", "/api/inbox")).body.filter(x => codes.includes(x.code));
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
      assert.strictEqual((await call("GET", "/api/orders")).body.find(o => o.id === "uji-a").pesananKode, codes[0]);
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

  console.log(failed ?`\n${failed} tes GAGAL` : "\nSemua tes lolos");
  process.exit(failed ? 1 : 0);
})();
