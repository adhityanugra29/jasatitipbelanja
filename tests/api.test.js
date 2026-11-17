// Uji kontrak API (specs/00-api.md) terhadap server yang sedang berjalan.
//   BASE=http://localhost:3000 ADMIN_PASSWORD=... node tests/api.test.js
// Aman untuk data nyata: kasus yang ditolak tidak menulis; kasus yang menulis memulihkan data aslinya di akhir.
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
const putOrders = (...changes) => { const o = valid(); changes.forEach(c => c(o)); return call("PUT", "/api/orders", [o]); };
const rejected = async (fn) => { const r = await fn(); assert.strictEqual(r.status, 400, `harus 400, dapat ${r.status}`); };

(async () => {
  // ---------- API-1 akses
  await test("API-1", "endpoint privat menolak tanpa/dengan password salah; katalog publik terbuka", async () => {
    assert.strictEqual((await call("GET", "/api/orders", undefined, null)).status, 401);
    assert.strictEqual((await call("GET", "/api/orders", undefined, "salah")).status, 401);
    assert.strictEqual((await call("GET", "/api/settings", undefined, null)).status, 401);
    assert.strictEqual((await call("GET", "/api/data", undefined, null)).status, 200);
  });

  // ---------- API-2 katalog disanitasi
  await test("API-2", "PUT /api/data membersihkan badge, stok, gambar, dan nomor WhatsApp", async () => {
    const before = (await call("GET", "/api/data", undefined, null)).body;
    try {
      const put = await call("PUT", "/api/data", { wa: "+62 812-34", notice: "x".repeat(300), products: [
        { id: 1, name: "A", price: -5, cat: "", badge: "promo", stock: "", img: "/etc/passwd" },
        { id: 2, name: "B", price: 10, cat: "Tas", badge: "hot", stock: 3.9, img: "/uploads/abc.jpg" },
      ] });
      assert.strictEqual(put.status, 200);
      const d = (await call("GET", "/api/data", undefined, null)).body;
      assert.strictEqual(d.wa, "6281234");
      assert.strictEqual(d.notice.length, 200);
      const [a, b] = d.products;
      assert.deepStrictEqual([a.id, a.price, a.cat, a.badge, a.stock, a.img], ["1", 0, "Lainnya", "", null, ""]);
      assert.deepStrictEqual([b.badge, b.stock, b.img], ["hot", 3, "/uploads/abc.jpg"]);
    } finally { await call("PUT", "/api/data", before); }
  });

  // ---------- API-4 aturan pesanan (kasus ditolak: tidak menulis)
  await test("API-4a", "invoice tanpa barang / harga 0 / qty 0 / diskon > harga / nama kosong ditolak", async () => {
    await rejected(() => putOrders(o => { o.items = []; }));
    await rejected(() => putOrders(o => { o.items[0].price = 0; }));
    await rejected(() => putOrders(o => { o.items[0].qty = 0; }));
    await rejected(() => putOrders(o => { o.items[0].discount = 2001; }));
    await rejected(() => putOrders(o => { o.items[0].name = "  "; }));
  });
  await test("API-4b", "nomor HP bukan 08 dan alamat kosong ditolak", async () => {
    await rejected(() => putOrders(o => { o.phone = "0211234567"; }));
    await rejected(() => putOrders(o => { o.phone = ""; }));
    await rejected(() => putOrders(o => { o.address = "  "; }));
  });
  await test("API-4c", "dibayar tanpa bukti ditolak; dikirim sebelum dibayar / tanpa kurir / tanpa resi ditolak", async () => {
    await rejected(() => putOrders(o => { o.paidAt = "2026-11-03"; }));
    await rejected(() => putOrders(o => { o.shipped = "2026-11-03"; o.courier = "JNE"; o.resi = "R1"; }));
    await rejected(() => putOrders(o => { o.paidAt = "2026-11-03"; o.proof = "bukti.pdf"; o.shipped = "2026-11-03"; o.resi = "R1"; }));
    await rejected(() => putOrders(o => { o.paidAt = "2026-11-03"; o.proof = "bukti.pdf"; o.shipped = "2026-11-03"; o.courier = "JNE"; }));
  });

  // ---------- API-3 + API-4d: total dihitung server, HP dinormalisasi, alur lengkap diterima (menulis, lalu dipulihkan)
  await test("API-3", "total dihitung server (abaikan total kiriman) dan HP dinormalisasi; alur bayar -> kirim diterima", async () => {
    const before = (await call("GET", "/api/orders")).body;
    try {
      const o = valid(); o.total = 1; o.phone = "+62 812-3456-7890";
      assert.strictEqual((await call("PUT", "/api/orders", [...before, o])).status, 200);
      const got = (await call("GET", "/api/orders")).body.find(x => x.id === "uji-1");
      assert.strictEqual(got.total, 2 * 1000 - 100 + 500);
      assert.strictEqual(got.phone, "081234567890");
      const paid = { ...got, paidAt: "2026-11-03", proof: "bukti.jpg" };
      assert.strictEqual((await call("PUT", "/api/orders", [...before, paid])).status, 200);
      const sent = { ...paid, courier: "JNE", resi: "R1", shipped: "2026-11-04" };
      assert.strictEqual((await call("PUT", "/api/orders", [...before, sent])).status, 200);
    } finally { await call("PUT", "/api/orders", before); }
  });

  // ---------- API-5 unggah gambar produk
  await test("API-5", "gambar produk: hanya JPG/PNG/WEBP; hasilnya publik", async () => {
    assert.strictEqual((await call("POST", "/api/upload", { dataUrl: "data:text/html;base64,PGI+" })).status, 400);
    const up = await call("POST", "/api/upload", { dataUrl: PNG });
    assert.strictEqual(up.status, 200);
    assert.match(up.body.img, /^\/uploads\/[\w-]+\.png$/);
    const r = await fetch(BASE + up.body.img);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("content-type"), "image/png");
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

  // ---------- PSM pesanan masuk (specs/08-pesanan-masuk.md)
  await test("PSM", "pesanan masuk: publik hanya menulis; harga dari katalog; kode ganda ditimpa; terkunci bila sudah diinvoice", async () => {
    const data = (await call("GET", "/api/data", undefined, null)).body, orders = (await call("GET", "/api/orders")).body;
    const pub = (b) => call("POST", "/api/inbox", b, null), codes = ["PSN-UJI001", "PSN-UJI002"];
    const list = async () => (await call("GET", "/api/inbox")).body.filter(x => codes.includes(x.code));
    try {
      await call("PUT", "/api/data", { ...data, products: [{ id: "uji-p", name: "Barang Uji", price: 5000, cat: "Uji" }] });
      // PSM-1/2: tanpa login boleh; nama dan harga kiriman klien diabaikan; barang tak dikenal dibuang; kode sama = satu pesanan
      const body = { code: codes[0], items: [{ id: "uji-p", qty: 2, name: "Palsu", price: 1 }, { id: "tidak-ada", qty: 1 }] };
      assert.strictEqual((await pub(body)).status, 200);
      assert.strictEqual((await pub(body)).status, 200);
      const [r] = await list();
      assert.strictEqual((await list()).length, 1);
      assert.deepStrictEqual(r.items, [{ id: "uji-p", name: "Barang Uji", price: 5000, qty: 2 }]);
      assert.strictEqual((await pub({ code: codes[1], items: [{ id: "tidak-ada", qty: 1 }] })).status, 400); // tanpa barang valid
      // PSM-3: kode salah format, qty dibatasi, isi terlalu besar
      assert.strictEqual((await pub({ code: "psn-abc", items: body.items })).status, 400);
      assert.strictEqual((await pub({ code: codes[1], items: [{ id: "uji-p", qty: 5000 }] })).status, 200);
      assert.strictEqual((await list()).find(x => x.code === codes[1]).items[0].qty, 999);
      assert.notStrictEqual(await pub({ code: codes[1], items: body.items, x: "a".repeat(3e4) }).then(r => r.status, () => "putus"), 200); // server memutus sambungan
      // PSM-4: baca dan hapus butuh login
      assert.strictEqual((await call("GET", "/api/inbox", undefined, null)).status, 401);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0], undefined, null)).status, 401);
      // PSM-6: invoice menyimpan kode; pesanan berinvoice tak bisa dihapus; satu pesanan satu invoice
      const inv = (id) => { const o = valid(); o.id = id; o.invoice = id; o.pesananKode = codes[0]; return o; };
      assert.strictEqual((await call("PUT", "/api/orders", [inv("uji-a")])).status, 200);
      assert.strictEqual((await call("GET", "/api/orders")).body[0].pesananKode, codes[0]);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0])).status, 400);
      await rejected(() => call("PUT", "/api/orders", [inv("uji-a"), inv("uji-b")]));
      await call("PUT", "/api/orders", []);
      assert.strictEqual((await call("DELETE", "/api/inbox/" + codes[0])).status, 200);
      assert.strictEqual((await list()).length, 1);
    } finally {
      await call("PUT", "/api/data", data); await call("PUT", "/api/orders", orders);
      for (const c of codes) await call("DELETE", "/api/inbox/" + c);
    }
  });

  console.log(failed ?`\n${failed} tes GAGAL` : "\nSemua tes lolos");
  process.exit(failed ? 1 : 0);
})();
