const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let loc = { lat: 11.341, lng: 77.7172 }, me = null, map, layer, mode = 'login';
const api = async (u, o = {}) => { const r = await fetch(u, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && JSON.stringify(o.body) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d; };
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
