import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Medicine, Pharmacy, Inventory, User, Report, AuditLog } from "./models.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET;
const STALE_H = Number(process.env.STALE_HOURS || 24);

if (!SECRET) throw new Error("JWT_SECRET missing in .env");

app.disable("x-powered-by");
app.use(express.json({ limit: "250kb" }), cookieParser());
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer"
  });
  next();
});

const hits = new Map();
app.use("/api", (req, res, next) => {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter(t => now - t < 60000);
  recent.push(now);
  hits.set(req.ip, recent);
  if (recent.length > 120) return res.status(429).json({ error: "Too many requests" });
  next();
});

const status = item => {
  if (!item.lastVerifiedAt) return "unverified";
  if ((Date.now() - new Date(item.lastVerifiedAt).getTime()) / 3600000 > STALE_H) return "stale";
  return item.quantity === 0 ? "out" : item.quantity <= 10 ? "low" : "in";
};

const km = (a, b, c, d) => {
  const rad = x => x * Math.PI / 180;
  const h = Math.sin(rad(c - a) / 2) ** 2 +
    Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[a.length][b.length];
};

const SYN = { acetaminophen: "paracetamol", tylenol: "paracetamol", fever: "paracetamol" };
const words = m => [m.name, m.generic, ...(m.brands || [])]
  .filter(Boolean).join(" ").toLowerCase().split(/\s+/);

const relevance = (query, medicine) => {
  const tokens = query.toLowerCase().replace(/\d+\s*mg/g, "")
    .split(/\s+/).filter(Boolean).map(t => SYN[t] || t);
  if (!tokens.length) return 0;
  const terms = words(medicine);
  return tokens.reduce((sum, token) => sum + Math.max(
    0,
    ...terms.map(term =>
      term === token ? 1 :
      term.startsWith(token) ? 0.85 :
      token.length >= 4 && lev(term, token) <= 2 ? 0.6 : 0
    )
  ), 0) / tokens.length;
};

const findMeds = (query, medicines) => {
  const mg = query.match(/(\d+)\s*mg/i);
  return medicines.map(m => ({ m, r: relevance(query, m) }))
    .filter(x => x.r >= 0.5 && (!mg || x.m.strength === mg[1] + " mg"));
};

const auth = roles => (req, res, next) => {
  try {
    if (!req.cookies?.token) throw new Error("Missing token");
    req.user = jwt.verify(req.cookies.token, SECRET);
    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch {
    res.status(401).json({ error: "Login required" });
  }
};

const issue = (res, user) => res.cookie("token", jwt.sign({
  id: user.id,
  role: user.role,
  pharmacyId: user.pharmacyId,
  name: user.name
}, SECRET, { expiresIn: "2h" }), {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production"
});

const emailOk = email => typeof email === "string" &&
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length < 120;

const log = (user, action, target) => AuditLog.create({
  at: new Date(), actor: user.id, action, target
});

const parseCsv = text => text.trim().split(/\r?\n/).map(line => {
  const out = [];
  let cell = "", quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
});

// Authentication
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 2 ||
        !emailOk(email) || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Valid name, email and 8+ char password required" });
    }
    const normalizedEmail = email.toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const user = {
      id: randomUUID(),
      name: name.trim().slice(0, 60),
      email: normalizedEmail,
      role: "patient",
      pharmacyId: null,
      hash: await bcrypt.hash(password, 10)
    };
    await User.create(user);
    issue(res, user);
    res.status(201).json({ name: user.name, role: user.role });
  } catch (e) { next(e); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = emailOk(email) && typeof password === "string"
      ? await User.findOne({ email: email.toLowerCase() }).lean() : null;
    if (!user || !await bcrypt.compare(password, user.hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    issue(res, user);
    res.json({ name: user.name, role: user.role });
  } catch (e) { next(e); }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
  res.json({ ok: true });
});

app.get("/api/auth/me", auth(), (req, res) => res.json(req.user));

// Medicine suggestions
app.get("/api/medicines/suggestions", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").slice(0, 40);
    if (query.length < 2) return res.json([]);
    const medicines = await Medicine.find().lean();
    res.json(findMeds(query, medicines).sort((a, b) => b.r - a.r)
      .slice(0, 6).map(x => `${x.m.name} ${x.m.strength}`));
  } catch (e) { next(e); }
});

// Search medicine inventory
app.get("/api/inventory/search", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").slice(0, 60).trim();
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = [1, 3, 5, 10, 25].includes(+req.query.radius) ? +req.query.radius : 10;

    if (!query) return res.status(400).json({ error: "Enter a medicine name" });

    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const [medicines, inventories, pharmacies] = await Promise.all([
      Medicine.find().lean(),
      Inventory.find().lean(),
      Pharmacy.find({ verification: "approved" }).lean()
    ]);

    const matches = findMeds(query, medicines);
    const pharmacyMap = new Map(pharmacies.map(p => [p.id, p]));
    const rows = [];

    for (const { m, r } of matches) {
      for (const inv of inventories.filter(i => i.medicineId === m.id)) {
        const pharmacy = pharmacyMap.get(inv.pharmacyId);
        if (!pharmacy) continue;

        const st = status(inv);
        const distance = hasLocation ? km(lat, lng, pharmacy.lat, pharmacy.lng) : null;
        if (distance != null && distance > radius) continue;
        if (req.query.inStock === "1" && st !== "in" && st !== "low") continue;

        const fresh = st === "in" || st === "low";
        const score = r * 50 + (fresh ? 25 : 0) +
          (distance != null ? Math.max(0, 25 - distance * 2.5) : 10);

        rows.push({
          id: inv.id,
          medicine: m,
          pharmacy,
          quantity: inv.quantity,
          price: inv.price,
          status: st,
          lastVerifiedAt: inv.lastVerifiedAt,
          source: inv.source,
          distanceKm: distance == null ? null : +distance.toFixed(1),
          approximate: r < 0.85,
          score: +score.toFixed(1),
          why: `text match ${Math.round(r * 100)}%, ${fresh ? "fresh verified stock" : "stock not confirmed"}${distance != null ? ", " + distance.toFixed(1) + " km straight-line" : ""}`
        });
      }
    }

    rows.sort(req.query.sort === "distance"
      ? (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)
      : req.query.sort === "price"
        ? (a, b) => a.price - b.price
        : (a, b) => b.score - a.score);

    res.json({
      count: rows.length,
      results: rows.slice(0, 30),
      staleAfterHours: STALE_H,
      notice: "DEMO DATA. Confirm availability and price with the pharmacy before travelling. Ask a pharmacist before substituting any medicine."
    });
  } catch (e) { next(e); }
});

// Nearby pharmacies
app.get("/api/pharmacies/nearby", async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat/lng required" });
    }
    const pharmacies = await Pharmacy.find({ verification: "approved" }).lean();
    res.json(pharmacies.map(p => ({
      ...p, distanceKm: +km(lat, lng, p.lat, p.lng).toFixed(1)
    })).sort((a, b) => a.distanceKm - b.distanceKm));
  } catch (e) { next(e); }
});

// Pharmacy owner inventory
app.get("/api/inventory/mine", auth(["pharmacy"]), async (req, res, next) => {
  try {
    const [inventory, medicines] = await Promise.all([
      Inventory.find({ pharmacyId: req.user.pharmacyId }).lean(),
      Medicine.find().lean()
    ]);
    const medicineMap = new Map(medicines.map(m => [m.id, m]));
    res.json(inventory.map(i => ({
      ...i, status: status(i), medicine: medicineMap.get(i.medicineId)
    })));
  } catch (e) { next(e); }
});

app.patch("/api/inventory/:id", auth(["pharmacy"]), async (req, res, next) => {
  try {
    const { quantity, price } = req.body || {};
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000 ||
        typeof price !== "number" || price < 0 || price >= 100000) {
      return res.status(400).json({ error: "Invalid quantity or price" });
    }
    const item = await Inventory.findOneAndUpdate({
      id: req.params.id, pharmacyId: req.user.pharmacyId
    }, {
      $set: { quantity, price, lastVerifiedAt: new Date(), source: "PHARMACY_UPDATE" }
    }, { new: true, runValidators: true }).lean();

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ ...item, status: status(item) });
  } catch (e) { next(e); }
});

// Report incorrect stock
app.post("/api/reports/stock", async (req, res, next) => {
  try {
    const { inventoryId, note } = req.body || {};
    if (typeof inventoryId !== "string" ||
        !await Inventory.exists({ id: inventoryId }) ||
        typeof note !== "string" || note.length > 300) {
      return res.status(400).json({ error: "Invalid report" });
    }
    await Report.create({ inventoryId, note });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// CSV inventory import
app.post("/api/inventory/import", auth(["pharmacy"]), async (req, res, next) => {
  try {
    const { csv, commit } = req.body || {};
    if (typeof csv !== "string" || !csv.trim() || csv.length > 200000) {
      return res.status(400).json({ error: "CSV text required (max 200 KB)" });
    }

    const rows = parseCsv(csv);
    const headers = (rows.shift() || []).map(h => h.toLowerCase());
    if (["medicine", "strength", "quantity", "price"].some(h => !headers.includes(h))) {
      return res.status(400).json({ error: "Header must be: medicine,strength,quantity,price" });
    }
    if (rows.length > 500) return res.status(400).json({ error: "Max 500 rows per import" });

    const medicines = await Medicine.find().lean();
    const normalize = value => String(value).toLowerCase().replace(/\s/g, "");
    const seen = new Set();

    const parsed = rows.map((row, index) => {
      const obj = Object.fromEntries(headers.map((h, j) => [h, row[j] ?? ""]));
      const errors = [];
      const med = medicines.find(m =>
        normalize(m.name) === normalize(obj.medicine) &&
        normalize(m.strength) === normalize(obj.strength)
      );
      const quantity = Number(obj.quantity);
      const price = Number(obj.price);

      if (!med) errors.push("Unknown medicine or strength");
      if (obj.quantity === "" || !Number.isInteger(quantity) || quantity < 0 || quantity > 100000) errors.push("Invalid quantity");
      if (obj.price === "" || !(price >= 0) || price >= 100000) errors.push("Invalid price");
      if (med) {
        if (seen.has(med.id)) errors.push("Duplicate in file");
        seen.add(med.id);
      }
      return { line: index + 2, medicine: obj.medicine, strength: obj.strength, quantity, price, errors, med };
    });

    const good = parsed.filter(r => !r.errors.length);
    let imported = 0;

    if (commit) {
      for (const row of good) {
        const existing = await Inventory.findOne({
          pharmacyId: req.user.pharmacyId, medicineId: row.med.id
        });

        if (existing) {
          existing.quantity = row.quantity;
          existing.price = row.price;
          existing.lastVerifiedAt = new Date();
          existing.source = "CSV_IMPORT";
          await existing.save();
        } else {
          await Inventory.create({
            id: randomUUID(),
            pharmacyId: req.user.pharmacyId,
            medicineId: row.med.id,
            quantity: row.quantity,
            price: row.price,
            lastVerifiedAt: new Date(),
            source: "CSV_IMPORT"
          });
        }
        imported++;
      }
      await log(req.user, "inventory.import", `${req.user.pharmacyId}: ${imported} rows`);
    }

    res.json({
      valid: good.length,
      invalid: parsed.length - good.length,
      imported,
      rows: parsed.map(({ med, ...row }) => row)
    });
  } catch (e) { next(e); }
});

// Admin routes
app.get("/api/admin/pharmacies", auth(["admin"]), async (req, res, next) => {
  try { res.json(await Pharmacy.find().lean()); }
  catch (e) { next(e); }
});

app.patch("/api/admin/pharmacies/:id/verification", auth(["admin"]), async (req, res, next) => {
  try {
    const { status: newStatus } = req.body || {};
    if (!["approved", "rejected", "suspended"].includes(newStatus)) {
      return res.status(400).json({ error: "Invalid pharmacy or status" });
    }

    const pharmacy = await Pharmacy.findOneAndUpdate(
      { id: req.params.id },
      { $set: { verification: newStatus } },
      { new: true, runValidators: true }
    ).lean();

    if (!pharmacy) return res.status(400).json({ error: "Invalid pharmacy or status" });
    await log(req.user, "pharmacy." + newStatus, pharmacy.id);
    res.json(pharmacy);
  } catch (e) { next(e); }
});

app.get("/api/admin/audit-logs", auth(["admin"]), async (req, res, next) => {
  try { res.json(await AuditLog.find().sort({ at: -1 }).limit(100).lean()); }
  catch (e) { next(e); }
});

app.get("/api/admin/stats", auth(["admin"]), async (req, res, next) => {
  try {
    const [pharmacies, users, inventory, openReports] = await Promise.all([
      Pharmacy.find().lean(),
      User.countDocuments(),
      Inventory.find().lean(),
      Report.countDocuments()
    ]);
    res.json({
      pharmacies: pharmacies.length,
      pending: pharmacies.filter(p => p.verification === "pending").length,
      users,
      listings: inventory.length,
      stale_or_unverified: inventory.filter(i => ["stale", "unverified"].includes(status(i))).length,
      open_reports: openReports
    });
  } catch (e) { next(e); }
});

app.use(express.static(path.join(dir, "public")));

app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Server error. Check backend terminal." });
});

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB:", mongoose.connection.name);
app.listen(PORT, () => console.log(`MediFind MongoDB backend: http://localhost:${PORT}`));
