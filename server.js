import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const STALE_H = +(process.env.STALE_HOURS || 24);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }), cookieParser());
app.use((q, s, n) => { s.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }); n(); });
const hits = new Map();
app.use('/api', (q, s, n) => { const t = Date.now(), a = (hits.get(q.ip) || []).filter(x => t - x < 60000); a.push(t); hits.set(q.ip, a); a.length > 120 ? s.status(429).json({ error: 'Too many requests' }) : n(); });

// ---------- DEMO DATA (synthetic, not real stock) ----------
const ago = h => h == null ? null : new Date(Date.now() - h * 3600e3).toISOString();
const medicines = [
  ['m1', 'Paracetamol', 'Paracetamol', ['Dolo', 'Crocin'], '500 mg', 'tablet', 'OTC'],
  ['m2', 'Paracetamol', 'Paracetamol', ['Dolo 650'], '650 mg', 'tablet', 'OTC'],
  ['m3', 'Amoxicillin', 'Amoxicillin', ['Mox'], '500 mg', 'capsule', 'Rx'],
  ['m4', 'Metformin', 'Metformin', ['Glycomet'], '500 mg', 'tablet', 'Rx'],
  ['m5', 'Cetirizine', 'Cetirizine', ['Okacet'], '10 mg', 'tablet', 'OTC'],
  ['m6', 'Azithromycin', 'Azithromycin', ['Azithral'], '500 mg', 'tablet', 'Rx'],
  ['m7', 'Ibuprofen', 'Ibuprofen', ['Brufen'], '400 mg', 'tablet', 'OTC'],
  ['m8', 'Pantoprazole', 'Pantoprazole', ['Pantop'], '40 mg', 'tablet', 'Rx'],
].map(([id, name, generic, brands, strength, form, rx]) => ({ id, name, generic, brands, strength, form, rx }));
const pharmacies = [
  ['p1', 'Demo Life Pharmacy', 'Perundurai Rd, Erode', 11.341, 77.7172], ['p2', 'Demo Care Medicals', 'Brough Rd, Erode', 11.352, 77.725],
  ['p3', 'Demo City Pharmacy', 'Bus Stand, Erode', 11.33, 77.7], ['p4', 'Demo Health Plus', 'Perundurai', 11.41, 77.76], ['p5', 'Demo Wellness', 'Bhavani Rd', 11.28, 77.68],
].map(([id, name, address, lat, lng], i) => ({ id, name, address, lat, lng, phone: '+91 00000 0000' + i, hours: '9 AM – 9 PM', demo: true }));
const inventory = [[1, 1, 120, 30, 2], [1, 3, 8, 95, 5], [1, 4, 0, 40, 3], [1, 5, 60, 25, 50], [2, 1, 40, 32, 1], [2, 2, 25, 38, 4], [2, 6, 15, 110, 6], [3, 1, 0, 30, 2], [3, 7, 70, 45, 10], [3, 8, 30, 120, null], [4, 2, 90, 36, 3], [4, 3, 20, 90, 30], [5, 4, 55, 42, 8], [5, 5, 12, 22, 7]]
  .map(([p, m, quantity, price, h], i) => ({ id: 'i' + (i + 1), pharmacyId: 'p' + p, medicineId: 'm' + m, quantity, price, lastVerifiedAt: ago(h), source: 'DEMO' }));
const users = new Map([['owner@demo.com', { id: 'u1', name: 'Demo Owner', email: 'owner@demo.com', role: 'pharmacy', pharmacyId: 'p1', hash: bcrypt.hashSync('demo1234', 8) }]]);
const reports = [];

// ---------- helpers ----------
const status = i => {
  if (!i.lastVerifiedAt) return 'unverified';
  if ((Date.now() - new Date(i.lastVerifiedAt)) / 3600e3 > STALE_H) return 'stale';
  return i.quantity === 0 ? 'out' : i.quantity <= 10 ? 'low' : 'in';
};
const km = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const SYN = { acetaminophen: 'paracetamol', tylenol: 'paracetamol', fever: 'paracetamol' };
const words = m => [m.name, m.generic, ...m.brands].join(' ').toLowerCase().split(/\s+/);
const relevance = (q, m) => {
  const toks = q.toLowerCase().replace(/\d+\s*mg/g, '').split(/\s+/).filter(Boolean).map(t => SYN[t] || t);
  if (!toks.length) return 0;
  const w = words(m);
  return toks.reduce((s, t) => s + Math.max(0, ...w.map(x => x === t ? 1 : x.startsWith(t) ? .85 : t.length >= 4 && lev(x, t) <= 2 ? .6 : 0)), 0) / toks.length;
};
const findMeds = q => {
  const mg = q.match(/(\d+)\s*mg/i);
  return medicines.map(m => ({ m, r: relevance(q, m) })).filter(x => x.r >= .5 && (!mg || x.m.strength === mg[1] + ' mg'));
};
const auth = (roles) => (q, s, n) => {
  try { q.user = jwt.verify(q.cookies.token, SECRET); } catch { return s.status(401).json({ error: 'Login required' }); }
  roles && !roles.includes(q.user.role) ? s.status(403).json({ error: 'Forbidden' }) : n();
};
const issue = (s, u) => s.cookie('token', jwt.sign({ id: u.id, role: u.role, pharmacyId: u.pharmacyId, name: u.name }, SECRET, { expiresIn: '2h' }), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
const emailOk = e => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length < 120;

// ---------- auth ----------
app.post('/api/auth/register', (q, s) => {
  const { name, email, password } = q.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || !emailOk(email) || typeof password !== 'string' || password.length < 8) return s.status(400).json({ error: 'Valid name, email and 8+ char password required' });
  if (users.has(email.toLowerCase())) return s.status(409).json({ error: 'Email already registered' });
  const u = { id: 'u' + (users.size + 1), name: name.trim().slice(0, 60), email: email.toLowerCase(), role: 'patient', hash: bcrypt.hashSync(password, 10) };
  users.set(u.email, u); issue(s, u); s.status(201).json({ name: u.name, role: u.role });
});
app.post('/api/auth/login', (q, s) => {
  const { email, password } = q.body || {};
  const u = emailOk(email) && typeof password === 'string' ? users.get(email.toLowerCase()) : null;
  if (!u || !bcrypt.compareSync(password, u.hash)) return s.status(401).json({ error: 'Invalid credentials' });
  issue(s, u); s.json({ name: u.name, role: u.role });
});
app.post('/api/auth/logout', (q, s) => { s.clearCookie('token'); s.json({ ok: true }); });
app.get('/api/auth/me', auth(), (q, s) => s.json(q.user));

// ---------- search ----------
app.get('/api/medicines/suggestions', (q, s) => {
  const t = String(q.query.q || '').slice(0, 40);
  s.json(t.length < 2 ? [] : findMeds(t).sort((a, b) => b.r - a.r).slice(0, 6).map(x => `${x.m.name} ${x.m.strength}`));
});
app.get('/api/inventory/search', (q, s) => {
  const text = String(q.query.q || '').slice(0, 60).trim();
  const lat = parseFloat(q.query.lat), lng = parseFloat(q.query.lng), radius = [1, 3, 5, 10, 25].includes(+q.query.radius) ? +q.query.radius : 10;
  if (!text) return s.status(400).json({ error: 'Enter a medicine name' });
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);
  const matches = findMeds(text), rows = [];
  for (const { m, r } of matches) for (const inv of inventory.filter(i => i.medicineId === m.id)) {
    const p = pharmacies.find(x => x.id === inv.pharmacyId), st = status(inv);
    if (p.verification !== 'approved') continue;
    const dist = hasLoc ? km(lat, lng, p.lat, p.lng) : null;
    if (dist != null && dist > radius) continue;
    if (q.query.inStock === '1' && st !== 'in' && st !== 'low') continue;
    const fresh = st === 'in' || st === 'low';
    const score = r * 50 + (fresh ? 25 : 0) + (dist != null ? Math.max(0, 25 - dist * 2.5) : 10);
    rows.push({ id: inv.id, medicine: m, pharmacy: p, quantity: inv.quantity, price: inv.price, status: st, lastVerifiedAt: inv.lastVerifiedAt, source: inv.source, distanceKm: dist && +dist.toFixed(1), approximate: r < .85, score: +score.toFixed(1), why: `text match ${Math.round(r * 100)}%, ${fresh ? 'fresh verified stock' : 'stock not confirmed'}${dist != null ? ', ' + dist.toFixed(1) + ' km straight-line' : ''}` });
  }
  const sort = q.query.sort;
  rows.sort(sort === 'distance' ? (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) : sort === 'price' ? (a, b) => a.price - b.price : (a, b) => b.score - a.score);
  s.json({ count: rows.length, results: rows.slice(0, 30), staleAfterHours: STALE_H, notice: 'DEMO DATA. Confirm availability and price with the pharmacy before travelling. Ask a pharmacist before substituting any medicine.' });
});
app.get('/api/pharmacies/nearby', (q, s) => {
  const lat = parseFloat(q.query.lat), lng = parseFloat(q.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return s.status(400).json({ error: 'lat/lng required' });
  s.json(pharmacies.filter(p => p.verification === 'approved').map(p => ({ ...p, distanceKm: +km(lat, lng, p.lat, p.lng).toFixed(1) })).sort((a, b) => a.distanceKm - b.distanceKm));
});

// ---------- pharmacy owner ----------
app.get('/api/inventory/mine', auth(['pharmacy']), (q, s) => s.json(inventory.filter(i => i.pharmacyId === q.user.pharmacyId).map(i => ({ ...i, status: status(i), medicine: medicines.find(m => m.id === i.medicineId) }))));
app.patch('/api/inventory/:id', auth(['pharmacy']), (q, s) => {
  const i = inventory.find(x => x.id === q.params.id);
  if (!i || i.pharmacyId !== q.user.pharmacyId) return s.status(404).json({ error: 'Not found' });
  const { quantity, price } = q.body || {};
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000 || !(typeof price === 'number' && price >= 0 && price < 1e5)) return s.status(400).json({ error: 'Invalid quantity or price' });
  Object.assign(i, { quantity, price, lastVerifiedAt: new Date().toISOString(), source: 'PHARMACY_UPDATE' });
  s.json({ ...i, status: status(i) });
});
app.post('/api/reports/stock', (q, s) => {
  const { inventoryId, note } = q.body || {};
  if (!inventory.some(i => i.id === inventoryId) || typeof note !== 'string' || note.length > 300) return s.status(400).json({ error: 'Invalid report' });
  reports.push({ inventoryId, note, at: new Date().toISOString() }); s.status(201).json({ ok: true });
});


// ---------- CSV import, admin, audit ----------
pharmacies.forEach(p => p.verification = p.id === 'p5' ? 'pending' : 'approved');
users.set('admin@demo.com', { id: 'admin1', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin', hash: bcrypt.hashSync('admin1234', 8) });
const audit = [];
const log = (u, action, target) => audit.unshift({ at: new Date().toISOString(), actor: u.id, action, target });
const parseCsv = t => t.trim().split(/\r?\n/).map(l => { const o = []; let c = '', qt = false; for (const ch of l) { if (ch === '"') qt = !qt; else if (ch === ',' && !qt) { o.push(c.trim()); c = ''; } else c += ch; } o.push(c.trim()); return o; });
app.post('/api/inventory/import', auth(['pharmacy']), (q, s) => {
  const { csv, commit } = q.body || {};
  if (typeof csv !== 'string' || !csv.trim() || csv.length > 200000) return s.status(400).json({ error: 'CSV text required (max 200 KB)' });
  const rows = parseCsv(csv), head = (rows.shift() || []).map(h => h.toLowerCase());
  if (['medicine', 'strength', 'quantity', 'price'].some(h => !head.includes(h))) return s.status(400).json({ error: 'Header must be: medicine,strength,quantity,price' });
  if (rows.length > 500) return s.status(400).json({ error: 'Max 500 rows per import' });
  const seen = new Set();
  const out = rows.map((r, i) => {
    const o = Object.fromEntries(head.map((h, j) => [h, r[j] ?? '']));
    const errors = [], norm = x => String(x).toLowerCase().replace(/\s/g, '');
    const med = medicines.find(m => norm(m.name) === norm(o.medicine) && norm(m.strength) === norm(o.strength));
    const qty = Number(o.quantity), price = Number(o.price);
    if (!med) errors.push('Unknown medicine or strength');
    if (o.quantity === '' || !Number.isInteger(qty) || qty < 0 || qty > 100000) errors.push('Invalid quantity');
    if (o.price === '' || !(price >= 0) || price >= 1e5) errors.push('Invalid price');
    if (med) { if (seen.has(med.id)) errors.push('Duplicate in file'); seen.add(med.id); }
    return { line: i + 2, medicine: o.medicine, strength: o.strength, quantity: qty, price, errors, med };
  });
  const good = out.filter(r => !r.errors.length);
  let imported = 0;
  if (commit) {
    for (const r of good) {
      let inv = inventory.find(i => i.pharmacyId === q.user.pharmacyId && i.medicineId === r.med.id);
      if (!inv) { inv = { id: 'i' + (inventory.length + 1), pharmacyId: q.user.pharmacyId, medicineId: r.med.id }; inventory.push(inv); }
      Object.assign(inv, { quantity: r.quantity, price: r.price, lastVerifiedAt: new Date().toISOString(), source: 'CSV_IMPORT' }); imported++;
    }
    log(q.user, 'inventory.import', `${q.user.pharmacyId}: ${imported} rows`);
  }
  s.json({ valid: good.length, invalid: out.length - good.length, imported, rows: out.map(({ med, ...r }) => r) });
});
app.get('/api/admin/pharmacies', auth(['admin']), (q, s) => s.json(pharmacies));
app.patch('/api/admin/pharmacies/:id/verification', auth(['admin']), (q, s) => {
  const p = pharmacies.find(x => x.id === q.params.id), st = q.body?.status;
  if (!p || !['approved', 'rejected', 'suspended'].includes(st)) return s.status(400).json({ error: 'Invalid pharmacy or status' });
  p.verification = st; log(q.user, 'pharmacy.' + st, p.id); s.json(p);
});
app.get('/api/admin/audit-logs', auth(['admin']), (q, s) => s.json(audit.slice(0, 100)));
app.get('/api/admin/stats', auth(['admin']), (q, s) => s.json({ pharmacies: pharmacies.length, pending: pharmacies.filter(p => p.verification === 'pending').length, users: users.size, listings: inventory.length, stale_or_unverified: inventory.filter(i => ['stale', 'unverified'].includes(status(i))).length, open_reports: reports.length }));

app.use(express.static(path.join(dir, 'public')));
app.use((e, q, s, n) => s.status(400).json({ error: 'Bad request' }));
app.listen(process.env.PORT || 3000, () => console.log('MediFind running on http://localhost:' + (process.env.PORT || 3000)));
