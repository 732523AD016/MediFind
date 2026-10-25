import { useEffect } from 'react';
import './index.css';
import './app.css';

const MARKUP = `
<div class="blob b1"></div><div class="blob b2"></div>
<header><a class="brand" href="#">＋ MediFind</a><nav><button id="theme" class="ghost" aria-label="Toggle theme">◐</button><span id="who"></span><button id="authBtn" class="btn sm">Login</button></nav></header>
<main>
<section class="hero"><span class="fl" style="left:8%;top:18%">💊</span><span class="fl" style="right:10%;top:30%;animation-delay:-3s">➕</span><span class="fl" style="left:18%;bottom:8%;animation-delay:-5s">🧪</span><span class="fl" style="right:20%;bottom:12%;animation-delay:-2s">🩺</span>
<p class="pill">Medicine finder · Real pharmacy locations (OpenStreetMap) · DEMO stock</p>
<h1>Find any medicine,<br><span class="grad">at pharmacies near you.</span></h1>
<p class="sub">Typo-tolerant search with price, stock state and freshness. Try: <i>dolo near Erode</i></p>
<form id="sf" class="search"><input id="q" list="sg" placeholder="Medicine, e.g. paracetmol 500 mg" autocomplete="off" required aria-label="Medicine name"><datalist id="sg"></datalist>
<input id="place" placeholder="City / PIN / area" aria-label="Location" autocomplete="off"><select id="rad" aria-label="Radius"><option value="1">1 km</option><option value="3">3 km</option><option value="5" selected>5 km</option><option value="10">10 km</option><option value="25">25 km</option></select><button class="btn" type="submit">Search</button></form>
<div class="opts"><button id="geo" type="button" class="ghost">📍 Use my location</button><span id="locl">Type a place, or share location</span></div>
<div class="chips" id="recent"></div>
<div class="chips"><button class="chip" data-s="Dolo|Erode">Dolo · Erode</button><button class="chip" data-s="Amoxicillin|Chennai">Amoxicillin · Chennai</button><button class="chip" data-s="Metformin 500 mg|Coimbatore">Metformin · Coimbatore</button></div>
<div class="stats"><div class="card"><div class="stat" data-count="medicines">0</div><div class="meta">medicines in catalogue</div></div><div class="card"><div class="stat" data-count="pharmacies">0</div><div class="meta">demo pharmacies</div></div><div class="card"><div class="stat" data-count="listings">0</div><div class="meta">demo stock listings</div></div></div></section>
<section id="res" class="res hidden"><aside class="filters card"><h3>Filters</h3>
<label><input type="checkbox" id="stk"> In stock only</label><label><input type="checkbox" id="demo" checked> Show DEMO stock</label><label><input type="checkbox" id="osm" checked> Real pharmacy locations</label>
<label>Dosage form<select id="frm"><option value="">Any</option><option>tablet</option><option>capsule</option><option>syrup</option><option>cream</option><option>powder</option><option>inhaler</option></select></label>
<label>Sort by<select id="srt"><option value="rel">Best match</option><option value="distance">Nearest</option><option value="price">Lowest price</option><option value="fresh">Freshest stock</option></select></label>
<div class="row"><button class="ghost" id="vl" type="button">List</button><button class="ghost" id="vm" type="button">Map</button></div></aside>
<div><div id="diag"></div><div id="meds" class="chips"></div><div id="list" class="grid"></div></div><div id="map"></div></section>
<section id="panel" class="hidden card reveal"><h2>Your pharmacy inventory</h2><div id="mine"></div>
<h3>CSV import</h3><p class="meta">Header: medicine,strength,quantity,price. Preview first, then import valid rows only.</p>
<input type="file" id="csvf" accept=".csv" aria-label="CSV file"><textarea id="csvt" rows="5" placeholder="medicine,strength,quantity,price&#10;Paracetamol,500 mg,100,30"></textarea>
<div class="row"><button class="btn sm" id="pv" type="button">Preview</button><button class="btn sm" id="im" type="button">Import valid rows</button></div><div id="csvr"></div></section>
<section id="admin" class="hidden card reveal on"><h2>Admin dashboard</h2><div id="stats" class="stats"></div><h3>Pharmacies</h3><div id="apharm"></div><h3>Audit log</h3><div id="alog"></div></section>
<section class="steps"><h2 class="reveal">How it works</h2><div class="feats"><div class="card reveal"><h3>1 · Search</h3><p>Type a medicine and a place. Typos are fine.</p></div><div class="card reveal"><h3>2 · Compare</h3><p>See pharmacies, stock state, listed price and freshness.</p></div><div class="card reveal"><h3>3 · Confirm</h3><p>Call or send an enquiry before travelling.</p></div></div></section>
<section class="feats"><div class="card reveal"><h3>🔎 Fuzzy search</h3><p>Typos, brand and generic names, strength matching.</p></div><div class="card reveal"><h3>⏱ Freshness engine</h3><p>Stock older than 24h is never shown as confirmed.</p></div><div class="card reveal"><h3>🗺 Map and distance</h3><p>Straight-line distance, labelled honestly.</p></div><div class="card reveal"><h3>🛡 Safe by design</h3><p>No diagnosis, no dosage advice, no auto-substitution.</p></div></section>
</main>
<footer>MediFind is a discovery tool, not medical advice. In an emergency call your local emergency number (India: 112). Ask a pharmacist before substituting medicines. Rx medicines need a valid prescription.</footer>
<dialog id="dlg"><form id="af"><h3 id="at">Login</h3><input id="an" placeholder="Name" class="hidden" minlength="2"><input id="ae" type="email" placeholder="Email" required><input id="ap" type="password" placeholder="Password (8+ chars)" minlength="8" required>
<p class="hint">Pharmacy: owner@demo.com / demo1234 · Admin: admin@demo.com / admin1234</p><div class="row"><button class="btn" type="submit">Continue</button><button type="button" id="sw" class="ghost">Create account</button><button type="button" id="cl" class="ghost">Close</button></div></form></dialog>
<div id="toast"></div>
`;

// Leaflet (original <script src=".../leaflet.min.js">)
function loadLeaflet() {
  return new Promise(resolve => {
    if (window.L) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.body.append(s);
  });
}

function boot() {
  // ===== Script 1: browser-only mock API =====
  (function(){const STALE_H=24;
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
  const BASE = { m1: 30, m2: 38, m3: 95, m4: 40, m5: 25, m6: 110, m7: 45, m8: 120 };
  [['Aspirin', '75 mg', 'tablet', 'OTC', ['Ecosprin'], 6], ['Atorvastatin', '10 mg', 'tablet', 'Rx', ['Atorva'], 55], ['Amlodipine', '5 mg', 'tablet', 'Rx', ['Amlokind'], 28], ['Losartan', '50 mg', 'tablet', 'Rx', ['Losar'], 45], ['Omeprazole', '20 mg', 'capsule', 'Rx', ['Omez'], 48], ['Levocetirizine', '5 mg', 'tablet', 'OTC', ['Levocet'], 32], ['Montelukast', '10 mg', 'tablet', 'Rx', ['Montair'], 140], ['Diclofenac', '50 mg', 'tablet', 'Rx', ['Voveran'], 30], ['ORS', '21 g', 'powder', 'OTC', ['Electral'], 22], ['Vitamin D3', '60000 IU', 'capsule', 'OTC', ['Uprise D3'], 130], ['Calcium', '500 mg', 'tablet', 'OTC', ['Shelcal'], 110], ['Ciprofloxacin', '500 mg', 'tablet', 'Rx', ['Ciplox'], 65], ['Clotrimazole', '1 %', 'cream', 'OTC', ['Candid'], 85], ['Salbutamol', '100 mcg', 'inhaler', 'Rx', ['Asthalin'], 150], ['Dextromethorphan', '100 ml', 'syrup', 'OTC', ['Benadryl DR'], 95]]
    .forEach(([name, strength, form, rx, brands, pr], i) => { const id = 'm' + (9 + i); BASE[id] = pr; medicines.push({ id, name, generic: name, brands, strength, form, rx }); });
  [['p6', 'Demo Green Cross', 11.3615, 77.7305], ['p7', 'Demo Sri Medicals', 11.3205, 77.7335], ['p8', 'Demo Metro Pharmacy', 11.3555, 77.6985]].forEach(([id, name, lat, lng], i) => pharmacies.push({ id, name, address: 'DEMO ADDRESS (fictional)', lat, lng, phone: '+91 00000 0010' + i, hours: '9 AM – 9 PM', demo: true }));
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const inventory = [];
  for (const p of pharmacies) for (const m of medicines) { const h = hash(p.id + m.id); if (h % 10 < 3) continue; inventory.push({ id: 'i' + (inventory.length + 1), pharmacyId: p.id, medicineId: m.id, quantity: [0, 5, 8, 20, 60, 120][h % 6], price: Math.round(BASE[m.id] * (0.95 + (h % 15) / 100)), lastVerifiedAt: ago(h % 7 === 0 ? null : h % 60), source: 'DEMO' }); }
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
  pharmacies.forEach(p => p.verification = p.id === 'p5' ? 'pending' : 'approved');
  const PLACES = { erode: [11.341, 77.7172], chennai: [13.0827, 80.2707], coimbatore: [11.0168, 76.9558], salem: [11.6643, 78.146], madurai: [9.9252, 78.1198], tiruppur: [11.1085, 77.3411], trichy: [10.7905, 78.7047], tirunelveli: [8.7139, 77.7567], vellore: [12.9165, 79.1325], thanjavur: [10.787, 79.1378], namakkal: [11.2189, 78.1677], karur: [10.9601, 78.0766], dindigul: [10.3673, 77.9803], hosur: [12.7409, 77.8253], pollachi: [10.6609, 77.0048], bhavani: [11.4455, 77.6828], perundurai: [11.275, 77.587], kanyakumari: [8.0883, 77.5385] };
  const realFetch = window.fetch.bind(window);
  const J = (o, st = 200) => Promise.resolve(new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } }));
  const ok = (data, meta) => J({ success: true, data, meta });
  const err = (st, code, message) => J({ success: false, error: { code, message } }, st);
  async function geo(place) {
    const k = place.toLowerCase().trim(); if (PLACES[k]) return { lat: PLACES[k][0], lng: PLACES[k][1], label: place };
    try { const r = await realFetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(place), { signal: AbortSignal.timeout(8000) }); const j = await r.json(); return j[0] ? { lat: +j[0].lat, lng: +j[0].lon, label: j[0].display_name.split(',').slice(0, 3).join(',') } : null; } catch { return null; }
  }
  async function search(q) {
    let text = (q.get('q') || '').trim().slice(0, 80), place = (q.get('place') || '').trim().slice(0, 80);
    const nl = text.match(/^(.*?)\s+(?:near|in|at)\s+(.+)$/i); if (nl) { text = nl[1]; place ||= nl[2]; }
    if (!text) return err(400, 'INVALID_INPUT', 'Enter a medicine name.');
    let lat = parseFloat(q.get('lat')), lng = parseFloat(q.get('lng')), label = 'Selected location';
    if (place) { const g = await geo(place); if (!g) return err(404, 'LOCATION_NOT_FOUND', `Could not find "${place}". Try a city name or PIN code.`); ({ lat, lng, label } = g); }
    else if (!Number.isFinite(lat) || !Number.isFinite(lng)) { lat = 11.341; lng = 77.7172; label = 'Erode (default)'; }
    const radius = [1, 3, 5, 10, 25].includes(+q.get('radius')) ? +q.get('radius') : 5, form = (q.get('form') || '').toLowerCase();
    const matches = findMeds(text).filter(x => !form || x.m.form === form), offers = [];
    if (q.get('demo') !== '0') {
      const dl = lat - 11.341, dg = lng - 77.7172;
      for (const { m, r } of matches) for (const inv of inventory.filter(i => i.medicineId === m.id)) {
        const p0 = pharmacies.find(x => x.id === inv.pharmacyId); if (p0.verification !== 'approved') continue;
        const p = { ...p0, lat: p0.lat + dl, lng: p0.lng + dg }, st = status(inv), dist = km(lat, lng, p.lat, p.lng);
        if (dist > radius || (q.get('inStock') === '1' && st !== 'in' && st !== 'low')) continue;
        const fresh = st === 'in' || st === 'low';
        offers.push({ id: inv.id, medicine: m, pharmacy: p, quantity: inv.quantity, price: inv.price, currency: 'INR', status: st, lastVerifiedAt: inv.lastVerifiedAt, source: inv.source, distanceKm: +dist.toFixed(1), approximate: r < .85, score: r * 50 + (fresh ? 25 : 0) + Math.max(0, 25 - dist * 2.5), why: `text match ${Math.round(r * 100)}%, ${fresh ? 'fresh stock record' : 'stock not confirmed'}, ${dist.toFixed(1)} km straight-line` });
      }
    }
    const by = { distance: (a, b) => a.distanceKm - b.distanceKm, price: (a, b) => a.price - b.price, fresh: (a, b) => new Date(b.lastVerifiedAt || 0) - new Date(a.lastVerifiedAt || 0) }[q.get('sort')] || ((a, b) => b.score - a.score);
    offers.sort(by);
    return ok({ location: { lat, lng, label, radius }, medicines: matches.map(({ m, r }) => ({ ...m, approximate: r < .85 })), offers: offers.slice(0, 40), places: [], providerError: { code: 'BROWSER_ONLY_MODE', message: 'Browser-only mode: real pharmacy locations (OpenStreetMap) need the Node server.' }, notice: 'Stock and prices marked DEMO are synthetic, placed around your chosen location for demonstration. Confirm availability and price with the pharmacy before travelling. Ask a pharmacist before substituting any medicine.' }, { total: offers.length, staleAfterHours: STALE_H });
  }
  window.fetch = (u, o = {}) => {
    if (typeof u !== 'string' || !u.startsWith('/api/')) return realFetch(u, o);
    const url = new URL(u, 'http://x'), p = url.pathname, q = url.searchParams;
    if (p === '/api/health') return ok({ status: 'ok', uptimeSec: Math.round(performance.now() / 1000), database: 'browser-only demo data (no server)', medicines: medicines.length, pharmacies: pharmacies.filter(x => x.verification === 'approved').length, listings: inventory.length });
    if (p === '/api/medicines/suggestions') { const t = (q.get('q') || '').slice(0, 40); return J(t.length < 2 ? [] : findMeds(t).sort((a, b) => b.r - a.r).slice(0, 10).map(x => `${x.m.name} ${x.m.strength}`)); }
    if (p === '/api/medicines') return ok(medicines, { total: medicines.length });
    if (p === '/api/search') return search(q);
    if (p === '/api/auth/me') return J({ error: 'Login required' }, 401);
    if (p.startsWith('/api/auth/') || p === '/api/reports/stock' || p.startsWith('/api/admin') || p.startsWith('/api/inventory')) return J({ error: 'This feature needs the Node server (npm start). Browser-only mode supports search only.' }, 503);
    if (p === '/api/enquiries') return J({ success: true, data: { message: 'Enquiry NOT sent: browser-only mode has no backend. Please call the pharmacy.' } }, 201);
    return err(404, 'NOT_FOUND', 'Unknown API route.');
  };
  })();

  // ===== Script 2: main app =====
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let loc = { lat: 11.341, lng: 77.7172 }, me = null, map, layer, mode = 'login';
  const api = async (u, o = {}) => { const r = await fetch(u, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && JSON.stringify(o.body) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error?.message || (typeof d.error === 'string' ? d.error : '') || 'Request failed (HTTP ' + r.status + ')'); return d; };
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };
  const LBL = { in: 'In stock', low: 'Low stock', out: 'Out of stock', stale: 'Inventory outdated', unverified: 'Availability not verified' };
  const ago = iso => { if (!iso) return 'never verified'; const h = (Date.now() - new Date(iso)) / 36e5; return h < 1 ? Math.round(h * 60) + ' min ago' : h < 48 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' days ago'; };

  // theme
  document.documentElement.dataset.t = localStorage.getItem('t') || 'light';
  $('#theme').onclick = () => { const t = document.documentElement.dataset.t === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.t = t; localStorage.setItem('t', t); };

  // suggestions (debounced)
  let tm; $('#q').oninput = e => { clearTimeout(tm); tm = setTimeout(async () => { try { const s = await api('/api/medicines/suggestions?q=' + encodeURIComponent(e.target.value)); $('#sg').innerHTML = s.map(x => `<option value="${esc(x)}">`).join(''); } catch { } }, 250); };

  // location (only on explicit click)
  $('#geo').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => { loc = { lat: p.coords.latitude, lng: p.coords.longitude }; $('#locl').textContent = 'Using your location (not stored)'; }, () => toast('Permission denied. Using Erode default.')) : toast('Geolocation unavailable');

  // search
  $('#sf').onsubmit = async e => {
    e.preventDefault(); $('#res').classList.remove('hidden');
    $('#list').innerHTML = '<div class="skel"></div>'.repeat(3);
    const p = new URLSearchParams({ q: $('#q').value, lat: loc.lat, lng: loc.lng, radius: $('#rad').value, sort: $('#srt').value, inStock: $('#stk').checked ? 1 : 0 });
    try { const d = await api('/api/inventory/search?' + p); render(d); } catch (err) { $('#list').innerHTML = `<div class="card">⚠ ${esc(err.message)}</div>`; }
  };
  function render(d) {
    const rs = d.results;
    $('#list').innerHTML = (rs.length ? '' : '<div class="card">No results in this radius. Try a larger radius or another spelling.</div>') +
      rs.map((r, i) => `<article class="card" style="animation-delay:${i * 60}ms"><div class="row" style="justify-content:space-between;margin:0"><h3>${esc(r.medicine.name)} ${esc(r.medicine.strength)} <small class="meta">${esc(r.medicine.form)} · ${esc(r.medicine.rx)}</small></h3><span class="badge ${r.status}">${LBL[r.status]}</span></div>
      <div><b>${esc(r.pharmacy.name)}</b> <span class="meta">${esc(r.pharmacy.address)} · ${esc(r.pharmacy.hours)}</span></div>
      <div class="meta">₹${r.price} listed · verified ${ago(r.lastVerifiedAt)} · ${r.distanceKm != null ? '≈' + r.distanceKm + ' km straight-line' : ''} · ${esc(r.source)}</div>
      ${r.approximate ? '<div class="warn">Approximate name match. Check the medicine carefully.</div>' : ''}${r.medicine.rx === 'Rx' ? '<div class="warn">Prescription required.</div>' : ''}
      <div class="why">Ranking: ${esc(r.why)}</div>
      <div class="row"><a class="lk" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${r.pharmacy.lat},${r.pharmacy.lng}">Directions</a><a class="lk" href="tel:${esc(r.pharmacy.phone)}">Call</a><button class="ghost" data-r="${esc(r.id)}">Report wrong stock</button></div></article>`).join('') +
      `<p class="meta">${esc(d.notice)} Stock older than ${d.staleAfterHours} h is never shown as confirmed.</p>`;
    document.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { const note = prompt('What is wrong with this listing?'); if (note) try { await api('/api/reports/stock', { method: 'POST', body: { inventoryId: b.dataset.r, note } }); toast('Report submitted'); } catch (e) { toast(e.message); } });
    if (!window.L) return;
    map ||= L.map('map'); if (layer) layer.remove(); layer = L.layerGroup().addTo(map);
    if (!map._tiles) { L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map); map._tiles = 1; }
    L.circleMarker([loc.lat, loc.lng], { color: '#0fa3a3' }).addTo(layer).bindPopup('Search centre');
    rs.forEach(r => L.marker([r.pharmacy.lat, r.pharmacy.lng]).addTo(layer).bindPopup(`<b>${esc(r.pharmacy.name)}</b><br>${LBL[r.status]}`));
    map.setView([loc.lat, loc.lng], 12); setTimeout(() => map.invalidateSize(), 100);
  }
  // auth
  const setMode = m => { mode = m; $('#at').textContent = m === 'login' ? 'Login' : 'Create account'; $('#an').classList.toggle('hidden', m === 'login'); $('#sw').textContent = m === 'login' ? 'Create account' : 'Have an account?'; };
  $('#authBtn').onclick = async () => { if (me) { await api('/api/auth/logout', { method: 'POST' }); me = null; return paint(); } setMode('login'); $('#dlg').showModal(); };
  $('#cl').onclick = () => $('#dlg').close(); $('#sw').onclick = () => setMode(mode === 'login' ? 'register' : 'login');
  $('#af').onsubmit = async e => { e.preventDefault(); try { await api('/api/auth/' + mode, { method: 'POST', body: { name: $('#an').value, email: $('#ae').value, password: $('#ap').value } }); $('#dlg').close(); await init(); toast('Welcome!'); } catch (err) { toast(err.message); } };
  async function init() { try { me = await api('/api/auth/me'); } catch { me = null; } paint(); }
  async function paint() {
    $('#who').textContent = me ? me.name : ''; $('#authBtn').textContent = me ? 'Logout' : 'Login'; $('#panel').classList.toggle('hidden', me?.role !== 'pharmacy'); $('#admin').classList.toggle('hidden', me?.role !== 'admin'); if (me?.role === 'admin') adminLoad();
    if (me?.role === 'pharmacy') { const rows = await api('/api/inventory/mine'); $('#mine').innerHTML = '<table>' + rows.map(r => `<tr><td>${esc(r.medicine.name)} ${esc(r.medicine.strength)}</td><td><span class="badge ${r.status}">${LBL[r.status]}</span></td><td><input type="number" min="0" value="${r.quantity}" id="q${r.id}" aria-label="Quantity"></td><td><input type="number" min="0" step="0.5" value="${r.price}" id="p${r.id}" aria-label="Price"></td><td><button class="btn sm" data-u="${r.id}">Save</button></td></tr>`).join('') + '</table>';
      document.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => { try { await api('/api/inventory/' + b.dataset.u, { method: 'PATCH', body: { quantity: parseInt($('#q' + b.dataset.u).value, 10), price: parseFloat($('#p' + b.dataset.u).value) } }); toast('Saved. Verified now.'); paint(); } catch (e) { toast(e.message); } }); }
  }
  new IntersectionObserver((es, o) => es.forEach(x => x.isIntersecting && (x.target.classList.add('on'), o.unobserve(x.target))), { threshold: .2 }).observe && document.querySelectorAll('.reveal').forEach(el => { const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) { el.classList.add('on'); io.disconnect(); } }, { threshold: .2 }); io.observe(el); });
  init();

  // CSV import
  $('#csvf').onchange = async e => { const f = e.target.files[0]; if (f) $('#csvt').value = await f.text(); };
  async function imp(commit) {
    try {
      const d = await api('/api/inventory/import', { method: 'POST', body: { csv: $('#csvt').value, commit } });
      $('#csvr').innerHTML = `<p><b>${d.valid}</b> valid, <b>${d.invalid}</b> invalid${commit ? `, <b>${d.imported}</b> imported` : ''}</p><table>` + d.rows.map(r => `<tr><td>Line ${r.line}</td><td>${esc(r.medicine)} ${esc(r.strength)}</td><td>${r.errors.length ? `<span class="badge out">${esc(r.errors.join('; '))}</span>` : '<span class="badge in">OK</span>'}</td></tr>`).join('') + '</table>';
      if (commit) { toast('Import finished'); paint(); }
    } catch (e) { toast(e.message); }
  }
  $('#pv').onclick = () => imp(false); $('#im').onclick = () => imp(true);
  // Admin
  async function adminLoad() {
    try {
      const [st, ph, lg] = await Promise.all([api('/api/admin/stats'), api('/api/admin/pharmacies'), api('/api/admin/audit-logs')]);
      $('#stats').innerHTML = Object.entries(st).map(([k, v]) => `<div class="card"><div class="stat">${esc(v)}</div><div class="meta">${esc(k.replace(/_/g, ' '))}</div></div>`).join('');
      $('#apharm').innerHTML = '<table>' + ph.map(p => `<tr><td>${esc(p.name)}</td><td><span class="badge ${p.verification === 'approved' ? 'in' : p.verification === 'pending' ? 'low' : 'out'}">${esc(p.verification)}</span></td><td>${['approved', 'rejected', 'suspended'].map(s => `<button class="ghost" data-v="${esc(p.id)}:${s}">${s}</button>`).join('')}</td></tr>`).join('') + '</table>';
      document.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => { const [id, status] = b.dataset.v.split(':'); if (!confirm(`Set ${id} to ${status}?`)) return; try { await api(`/api/admin/pharmacies/${id}/verification`, { method: 'PATCH', body: { status } }); toast('Updated'); adminLoad(); } catch (e) { toast(e.message); } });
      $('#alog').innerHTML = lg.length ? '<table>' + lg.slice(0, 15).map(l => `<tr><td>${esc(new Date(l.at).toLocaleString())}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td></tr>`).join('') + '</table>' : '<p class="meta">No admin actions yet.</p>';
    } catch (e) { toast(e.message); }
  }

  // ===== Script 3: search results, errors, recent searches =====
  const ST = { in: ['IN_STOCK', 'In stock'], low: ['LOW_STOCK', 'Low stock'], out: ['OUT_OF_STOCK', 'Out of stock'], stale: ['STALE', 'Stale · not confirmed'], unverified: ['UNKNOWN', 'Unknown'] };
  const COL = { in: '#2fbf71', low: '#e0a100', out: '#d33', stale: '#7a7ab8', unverified: '#888' };
  let last = null, view = 'list', map2, lay;
  async function call(u) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000); let r;
    try { r = await fetch(u, { signal: ctl.signal, credentials: 'same-origin' }); }
    catch (e) { throw e.name === 'AbortError' ? { code: 'TIMEOUT', message: 'The server took too long to respond.' } : { code: 'NETWORK', message: `Cannot reach the server at ${location.origin}. Make sure "npm start" is running and you opened http://localhost:3000.` }; }
    finally { clearTimeout(t); }
    if (!(r.headers.get('content-type') || '').includes('json')) throw { code: 'NOT_JSON', message: `${location.origin} answered with a non-API page (HTTP ${r.status}). This is not the MediFind server. Open http://localhost:3000.` };
    const d = await r.json();
    if (!r.ok || d.success === false) throw { code: d.error?.code || 'HTTP_' + r.status, message: d.error?.message || 'Server error' };
    return d;
  }
  const TT = { NETWORK: 'Cannot reach server', NOT_JSON: 'Wrong server', TIMEOUT: 'Server timeout', INVALID_INPUT: 'Check your input', LOCATION_NOT_FOUND: 'Location not found' };
  function showErr(e) {
    $('#meds').innerHTML = ''; $('#list').innerHTML = `<div class="card err"><h3>⚠ ${esc(TT[e.code] || 'Server problem')}</h3><p>${esc(e.message)}</p><div class="row"><button class="btn sm" id="retry">Retry</button></div><pre id="dg" class="meta">Running diagnostics…</pre></div>`;
    $('#retry').onclick = run;
    call('/api/health').then(h => $('#dg').textContent = `Diagnostics: server OK (uptime ${h.data.uptimeSec}s, store: ${h.data.database}). Error code: ${e.code}`).catch(x => $('#dg').textContent = `Diagnostics: health check failed (${x.code}). Error code: ${e.code}`);
  }
  const R = 'mf_recent', getR = () => { try { return JSON.parse(localStorage.getItem(R)) || []; } catch { return []; } };
  const saveR = t => { try { localStorage.setItem(R, JSON.stringify([t, ...getR().filter(x => x !== t)].slice(0, 5))); } catch { } showR(); };
  const showR = () => $('#recent').innerHTML = getR().map(t => `<button class="chip" data-s="${esc(t)}|">🕘 ${esc(t)}</button>`).join('');
  const prov = o => o.source === 'DEMO' ? 'DEMO DATA — not verified with this pharmacy.' : `Reported by pharmacy — last updated ${new Date(o.lastVerifiedAt).toLocaleString()}.`;
  async function run() {
    const text = $('#q').value.trim(); if (!text) return;
    $('#res').classList.remove('hidden'); $('#diag').innerHTML = ''; $('#meds').innerHTML = ''; $('#list').innerHTML = '<div class="skel"></div>'.repeat(4);
    $('#res').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const p = new URLSearchParams({ q: text, radius: $('#rad').value, sort: $('#srt').value, inStock: $('#stk').checked ? 1 : 0, demo: $('#demo').checked ? 1 : 0, osm: $('#osm').checked ? 1 : 0 });
    const pl = $('#place').value.trim(); if (pl) p.set('place', pl); else { p.set('lat', loc.lat); p.set('lng', loc.lng); }
    if ($('#frm').value) p.set('form', $('#frm').value);
    try { const d = await call('/api/search?' + p); last = d; saveR(text); paint2(d.data); } catch (e) { showErr(e); }
  }
  function paint2(d) {
    const L0 = d.location;
    $('#meds').innerHTML = `<span class="meta">📍 ${esc(L0.label)} · ${L0.radius} km radius · straight-line distances</span>` + d.medicines.map(m => `<span class="chip">${esc(m.name)} ${esc(m.strength)} · ${esc(m.form)} · ${esc(m.rx)}${m.approximate ? ' · approximate match' : ''}</span>`).join('');
    let h = d.providerError ? `<div class="warn">${esc(d.providerError.message)}</div>` : '';
    if (!d.medicines.length) h += '<div class="card empty"><div class="big">🔍</div><h3>No medicine matched</h3><p class="meta">Check the spelling or strength. Similar names are never treated as the same medicine.</p></div>';
    h += d.offers.map((o, i) => `<article class="card" id="c-${esc(o.id)}" style="animation-delay:${i * 50}ms"><div class="row" style="justify-content:space-between;margin:0"><h3>${esc(o.pharmacy.name)}</h3><span class="badge ${o.status}" title="${ST[o.status][0]}">${ST[o.status][1]}</span></div>
    <div><b>${esc(o.medicine.name)} ${esc(o.medicine.strength)}</b> <span class="meta">${esc(o.medicine.form)}${o.medicine.rx === 'Rx' ? ' · prescription required' : ''}</span></div>
    <div class="price">₹${o.price} <small class="meta">listed price · ${o.source === 'DEMO' ? 'DEMO' : 'pharmacy-reported'}</small></div>
    <div class="meta">≈ ${o.distanceKm} km straight-line · ${o.status === 'stale' ? 'Stale — not confirmed current stock. ' : ''}${esc(prov(o))}</div>
    ${o.approximate ? '<div class="warn">Approximate name match. Check the medicine carefully.</div>' : ''}
    <details><summary>Details</summary><p class="meta">${esc(o.pharmacy.address)} · ${esc(o.pharmacy.hours)} · ${esc(o.pharmacy.phone)}<br>Ranking: ${esc(o.why)}<br>Confirm stock and price with the pharmacy. Ask a pharmacist before any substitution.</p></details>
    <div class="row"><a class="lk" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${o.pharmacy.lat},${o.pharmacy.lng}">Directions</a><button class="ghost" data-e="${esc(o.pharmacy.id)}|${esc(o.medicine.id)}">Ask to confirm</button><button class="ghost" data-r="${esc(o.id)}">Report wrong info</button></div></article>`).join('');
    if (d.places.length) h += `<h3 class="sec">Other pharmacies nearby <small class="meta">(OpenStreetMap · stock unknown)</small></h3>` + d.places.map((p, i) => `<article class="card" style="animation-delay:${i * 40}ms"><div class="row" style="justify-content:space-between;margin:0"><h3>${esc(p.name)}</h3><span class="badge unverified">Unknown</span></div>
    <div class="meta">${esc(p.address || 'Address not listed')} · ≈ ${p.distanceKm} km straight-line${p.hours ? ' · ' + esc(p.hours) : ''}</div><div class="warn">Stock information unavailable — contact pharmacy to confirm.</div>
    <div class="meta">Source: ${esc(p.source)} · checked ${new Date(p.checkedAt).toLocaleTimeString()}</div><div class="row">${p.phone ? `<a class="lk" href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''}<a class="lk" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">Directions</a></div></article>`).join('');
    if (d.medicines.length && !d.offers.length && !d.places.length) h += '<div class="card empty"><div class="big">🗺️</div><h3>No pharmacies in this radius</h3><p class="meta">Try a larger radius or enable demo stock.</p></div>';
    h += `<p class="meta">${esc(d.notice)}</p>`; $('#list').innerHTML = h;
    document.querySelectorAll('[data-e]').forEach(b => b.onclick = async () => { const [pharmacyId, medicineId] = b.dataset.e.split('|'); try { const r = await api('/api/enquiries', { method: 'POST', body: { pharmacyId, medicineId } }); toast(r.data.message); } catch (e) { toast(e.message); } });
    document.querySelectorAll('[data-r]').forEach(b => b.onclick = async () => { const note = prompt('What is wrong with this listing?'); if (note) try { await api('/api/reports/stock', { method: 'POST', body: { inventoryId: b.dataset.r, note } }); toast('Report submitted'); } catch (e) { toast(e.message); } });
    drawMap(d);
  }
  function drawMap(d) {
    if (!window.L) { $('#map').innerHTML = '<div class="card err">Map library failed to load (check internet). List results still work.</div>'; return; }
    try {
      map2 ||= L.map('map'); if (lay) lay.remove(); lay = L.layerGroup().addTo(map2);
      if (!map2._t) { L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map2); map2._t = 1; }
      const c = [d.location.lat, d.location.lng]; L.circle(c, { radius: d.location.radius * 1000, color: '#0fa3a3', weight: 1, fillOpacity: .05 }).addTo(lay);
      d.offers.forEach(o => L.circleMarker([o.pharmacy.lat, o.pharmacy.lng], { radius: 9, color: '#fff', weight: 2, fillColor: COL[o.status], fillOpacity: 1 }).addTo(lay).bindPopup(`<b>${esc(o.pharmacy.name)}</b><br>${ST[o.status][1]} · ₹${o.price}`).on('click', () => document.getElementById('c-' + o.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
      d.places.forEach(p => L.circleMarker([p.lat, p.lng], { radius: 6, color: '#fff', weight: 1, fillColor: '#888', fillOpacity: 1 }).addTo(lay).bindPopup(`<b>${esc(p.name)}</b><br>Stock unknown`));
      map2.setView(c, d.location.radius > 10 ? 11 : d.location.radius > 3 ? 13 : 14); setTimeout(() => map2.invalidateSize(), 150);
    } catch { $('#map').innerHTML = '<div class="card err">Map could not be drawn. List results still work.</div>'; }
  }
  $('#sf').onsubmit = e => { e.preventDefault(); run(); };
  ['#srt', '#stk', '#demo', '#osm', '#frm', '#rad'].forEach(id => $(id).onchange = () => last && run());
  $('#vl').onclick = () => $('#res').classList.add('listview'); $('#vm').onclick = () => { $('#res').classList.remove('listview'); setTimeout(() => map2?.invalidateSize(), 100); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const [m, pl] = b.dataset.s.split('|'); $('#q').value = m; $('#place').value = pl; run(); });
  $('#geo').addEventListener('click', () => { $('#place').value = ''; });
  showR();
  function count(el, to) { const t0 = performance.now(), f = t => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(to * (1 - (1 - k) ** 3)); k < 1 && requestAnimationFrame(f); }; requestAnimationFrame(f); }
  call('/api/health').then(h => document.querySelectorAll('[data-count]').forEach(el => count(el, h.data[el.dataset.count]))).catch(e => { const b = document.createElement('div'); b.className = 'banner'; b.textContent = '⚠ ' + e.message; document.body.prepend(b); });
  addEventListener('scroll', () => document.documentElement.style.setProperty('--sp', (scrollY / (document.body.scrollHeight - innerHeight) * 100 || 0) + '%'), { passive: true });

  // ===== Script 4: animations / premium effects =====
  (() => {
    try { if (!localStorage.getItem('t')) document.documentElement.dataset.t = 'dark'; } catch { document.documentElement.dataset.t = 'dark'; }
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const b = document.createElement('div'); b.className = 'blob b3'; document.body.prepend(b);
    // animated hero title
    const h1 = document.querySelector('.hero h1'); let i = 0;
    const split = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t => { if (!t.trim()) return f.append(t); const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = t; f.append(s); }); c.replaceWith(f); }
      else if (c.nodeType === 1 && c.tagName !== 'BR') split(c);
    });
    if (h1 && !rm) split(h1);
    // 3D tilt + spotlight on cards
    document.addEventListener('pointermove', e => {
      const c = e.target.closest?.('.card'); if (!c) return;
      const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
      if (!rm && r.width < 700) { c.style.setProperty('--ry', ((x / r.width - .5) * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y / r.height) * 9).toFixed(2) + 'deg'); }
    });
    document.addEventListener('pointerout', e => { const c = e.target.closest?.('.card'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
    // button ripple
    document.addEventListener('pointerdown', e => {
      const bt = e.target.closest?.('.btn'); if (!bt || rm) return;
      const r = bt.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement('span');
      s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      bt.append(s); setTimeout(() => s.remove(), 700);
    });
    // cursor glow follower
    if (!rm && matchMedia('(hover:hover)').matches) {
      const cu = document.createElement('div'); cu.className = 'cursor'; document.body.prepend(cu);
      let tx = innerWidth / 2, ty = 200, x = tx, y = ty;
      addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
      (function loop() { x += (tx - x) * .08; y += (ty - y) * .08; cu.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(loop); })();
    }
    // brand ticker
    const st = document.querySelector('.hero .stats');
    if (st) {
      const names = ['Dolo', 'Crocin', 'Mox', 'Glycomet', 'Okacet', 'Azithral', 'Brufen', 'Pantop', 'Ecosprin', 'Atorva', 'Amlokind', 'Omez', 'Montair', 'Electral', 'Shelcal', 'Ciplox', 'Candid', 'Asthalin'];
      const row = names.map(n => `<button class="chip" data-s="${n}|">💊 ${n}</button>`).join('');
      const t = document.createElement('div'); t.className = 'ticker'; t.innerHTML = `<div class="track">${row}${row}</div>`; st.after(t);
    }
  })();

  // ===== Script 5: dropdowns, flow stepper, insights =====
  (() => {
    const LOCS = ['Erode', 'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruppur', 'Trichy', 'Tirunelveli', 'Vellore', 'Thanjavur', 'Namakkal', 'Karur', 'Dindigul', 'Hosur', 'Pollachi', 'Bhavani', 'Perundurai', 'Kanyakumari'].map(n => ({ n, s: 'Tamil Nadu, India' }));
    const ICON = { tablet: '💊', capsule: '💊', syrup: '🧴', cream: '🧴', powder: '🥄', inhaler: '🌬️' };
    let CAT = [];
    fetch('/api/medicines').then(r => r.json()).then(d => CAT = d.data || []).catch(() => { });
    const toItem = m => ({ main: `${m.name} ${m.strength}`, sub: `${m.form} · brands: ${m.brands.join(', ')}`, icon: ICON[m.form] || '💊', tag: m.rx === 'Rx' ? 'Rx' : 'OTC', tc: m.rx === 'Rx' ? 'rx' : 'otc', val: `${m.name} ${m.strength}` });
    function combo(input, o) {
      const wrap = document.createElement('div'); wrap.className = 'field ' + (o.cls || ''); input.before(wrap); wrap.append(input);
      const dd = document.createElement('div'); dd.className = 'dd hidden'; dd.setAttribute('role', 'listbox'); wrap.append(dd);
      input.removeAttribute('list'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-autocomplete', 'list');
      let items = [], act = -1, tm, tok = 0;
      const hl = (t, q) => { const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1; return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
      const show = v => { dd.classList.toggle('hidden', !v); input.setAttribute('aria-expanded', v); };
      const mark = () => dd.querySelectorAll('.ddi').forEach((e, k) => { e.classList.toggle('act', k === act); if (k === act) e.scrollIntoView({ block: 'nearest' }); });
      async function draw() {
        const q = input.value.trim(), my = ++tok, list = await o.items(q); if (my !== tok) return; items = list; act = -1;
        if (!items.length && !o.always) return show(false);
        dd.innerHTML = `<div class="ddh">${esc(o.head(q, items.length))}</div>` + items.map((it, k) => `<div class="ddi" role="option" data-k="${k}" style="--k:${k}"><span class="ib">${it.icon}</span><span class="it"><b>${hl(it.main, q)}</b><small>${esc(it.sub || '')}</small></span>${it.tag ? `<span class="tg ${it.tc || ''}">${esc(it.tag)}</span>` : ''}</div>`).join('');
        show(true);
      }
      function pick(k) { const it = items[k]; if (!it) return; if (it.geo) { show(false); $('#geo').click(); return; } input.value = it.val; show(false); o.onPick(it); }
      dd.addEventListener('mousedown', e => { e.preventDefault(); const r = e.target.closest('.ddi'); if (r) pick(+r.dataset.k); });
      input.addEventListener('focus', draw);
      input.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 120); });
      input.addEventListener('keydown', e => {
        if (dd.classList.contains('hidden')) { if (e.key === 'ArrowDown') draw(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(items.length - 1, act + 1); mark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); mark(); }
        else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); pick(act); }
        else if (e.key === 'Escape') show(false);
      });
      document.addEventListener('click', e => { if (!wrap.contains(e.target)) show(false); });
    }
    const q = $('#q'), place = $('#place');
    combo(q, {
      head: (t, n) => t.length < 2 ? `Popular medicines · ${n}` : `${n} matches`, items: async t => {
        if (/\s(near|in|at)\s/i.test(t)) return [];
        if (t.length < 2) return CAT.slice(0, 12).map(toItem);
        let names = []; try { names = await (await fetch('/api/medicines/suggestions?q=' + encodeURIComponent(t))).json(); } catch { }
        const out = names.map(n => { const m = CAT.find(c => `${c.name} ${c.strength}` === n); return m ? toItem(m) : { main: n, icon: '💊', val: n }; }), tl = t.toLowerCase();
        CAT.forEach(m => { if (!out.some(x => x.val === `${m.name} ${m.strength}`) && (m.brands.some(b => b.toLowerCase().includes(tl)) || m.name.toLowerCase().includes(tl))) out.push(toItem(m)); });
        return out.slice(0, 12);
      }, onPick: () => place.value.trim() ? run() : place.focus()
    });
    combo(place, {
      cls: 'loc', always: true, head: (t, n) => t ? `${n} locations` : `Choose a location · ${n}`, items: async t => {
        const tl = t.toLowerCase(), l = LOCS.filter(x => !tl || x.n.toLowerCase().includes(tl)).map(x => ({ main: x.n, sub: x.s, icon: '📍', val: x.n, tag: 'City', tc: 'otc' }));
        const head = tl ? [] : [{ main: 'Use my current location', sub: 'Browser asks permission. Not stored.', icon: '🎯', geo: 1 }];
        const tail = t && !l.some(x => x.val.toLowerCase() === tl) ? [{ main: `Search “${t}”`, sub: 'Any city, area or PIN code in India', icon: '🔎', val: t }] : [];
        return [...head, ...l, ...tail];
      }, onPick: () => q.value.trim() ? run() : q.focus()
    });
    // rotating placeholder
    const ph = ['Search “Dolo 650”…', 'Try “paracetmol 500 mg”…', 'Amoxicillin, Metformin…', 'Type “dolo near erode”…']; let pi = 0;
    setInterval(() => { if (document.activeElement !== q && !q.value) q.placeholder = ph[pi++ % ph.length]; }, 2600);
    // flow stepper
    const op = document.querySelector('.hero .opts');
    op.insertAdjacentHTML('afterend', '<div class="flow"><div class="fs on" data-st="1"><i>1</i><span>Choose medicine</span></div><div class="fl2"></div><div class="fs" data-st="2"><i>2</i><span>Compare pharmacies</span></div><div class="fl2"></div><div class="fs" data-st="3"><i>3</i><span>Confirm &amp; go</span></div></div>');
    window.flow = n => { document.querySelectorAll('.fs').forEach(e => { const s = +e.dataset.st; e.classList.toggle('done', s < n); e.classList.toggle('on', s === n); }); document.querySelectorAll('.fl2').forEach((e, i) => e.classList.toggle('fill', i < n - 1)); };
    document.addEventListener('click', e => { if (e.target.closest('[data-e]')) flow(4); });
    const _paint = paint2; paint2 = d => { _paint(d); insights(d); flow(3); };
    const _run = run; run = () => { flow(2); return _run(); };
    const _err = showErr; showErr = e => { _err(e); flow(1); };
    function insights(d) {
      if (!d.medicines.length) return;
      const o = d.offers, stock = o.filter(x => x.status === 'in' || x.status === 'low'), pr = stock.map(x => x.price);
      const dist = [...o.map(x => x.distanceKm), ...d.places.map(x => x.distanceKm)].sort((a, b) => a - b);
      const tile = (ic, v, lab, c) => `<div class="tile ${c}"><span class="ti">${ic}</span><b data-n="${v}">0</b><small>${lab}</small></div>`;
      $('#diag').innerHTML = '<div class="ins">' + tile('🏥', new Set(o.map(x => x.pharmacy.id)).size + d.places.length, 'pharmacies found', 't1') + tile('✅', stock.length, 'stock listings', 't2') + tile('₹', pr.length ? Math.min(...pr) : '—', 'lowest in-stock price', 't3') + tile('📏', dist.length ? dist[0] : '—', 'km nearest', 't4') + '</div>';
      document.querySelectorAll('.tile b').forEach(b => { const v = b.dataset.n; Number.isInteger(+v) && v !== '—' ? count(b, +v) : b.textContent = v; });
      if (o[0]) document.getElementById('c-' + o[0].id)?.classList.add('best');
    }
  })();
}

export default function App() {
  useEffect(() => {
    if (window.__medifindBooted) return;
    window.__medifindBooted = true;
    loadLeaflet().then(boot);
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}