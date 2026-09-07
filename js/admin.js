/* ============================================================================
   QUIFF CUTS — admin.js   (sirf malik / manager ke liye)
   ----------------------------------------------------------------------------
   Chaar kaam:
     1. BOOKINGS  — fehrist, ginti, halat badalna (naya / ho gaya / cancel)
     2. GALLERY   — nayi tasveer daalna, purani hatana
     3. BLOG      — post likhna, mitana
     4. HERO      — home ki bari tasveerein
   Tasveerein Cloudinary par jati hain (muft), un ka pata Firestore me.
   ========================================================================= */

import {
    db, auth, fbReady, CLOUDINARY, esc,
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
    query, orderBy, serverTimestamp,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from './firebase.js?v=81dc4fd8';

const $ = id => document.getElementById(id);
let CUR_TAB = 'bookings';
let BOOKINGS = [];

/* ── Chhote madadgar ─────────────────────────────────────────────────────── */

function toast(msg, kind) {
    const el = $('adMsg');
    if (!el) return;
    el.textContent = msg;
    el.style.color = kind === 'bad' ? 'var(--bad)' : (kind === 'ok' ? 'var(--ok)' : 'var(--text-soft)');
    el.style.display = msg ? 'block' : 'none';
    if (msg && kind === 'ok') setTimeout(() => { if (el.textContent === msg) el.style.display = 'none'; }, 4000);
}

function dayKey(v) {
    try {
        const d = v && v.toDate ? v.toDate() : new Date(v);
        if (isNaN(d)) return '';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } catch (e) { return ''; }
}

function todayIso() {
    const n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}

function daysAgoIso(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ── 1. BOOKINGS ─────────────────────────────────────────────────────────── */

async function loadBookings() {
    const box = $('bkList');
    if (!box || !fbReady) return;
    box.innerHTML = '<div class="empty">Loading…</div>';

    try {
        const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
        BOOKINGS = [];
        snap.forEach(d => BOOKINGS.push(Object.assign({ _id: d.id }, d.data())));
    } catch (e) {
        box.innerHTML = '<div class="empty">Could not load bookings: ' + esc(e.message || '') + '</div>';
        return;
    }
    paintStats();
    paintBookings();
}

function paintStats() {
    const today = todayIso(), w = daysAgoIso(7), m = daysAgoIso(30);
    let nToday = 0, nWeek = 0, nMonth = 0, nNew = 0;
    const svc = {};

    BOOKINGS.forEach(b => {
        const made = dayKey(b.createdAt) || b.date || '';
        if (made === today) nToday++;
        if (made >= w) nWeek++;
        if (made >= m) { nMonth++; if (b.service) svc[b.service] = (svc[b.service] || 0) + 1; }
        if ((b.status || 'new') === 'new') nNew++;
    });

    const top = Object.keys(svc).sort((a, b) => svc[b] - svc[a])[0];

    $('stToday').textContent = nToday;
    $('stWeek').textContent = nWeek;
    $('stMonth').textContent = nMonth;
    $('stNew').textContent = nNew;
    $('stTop').textContent = top ? (top + ' (' + svc[top] + ')') : '—';
}

function paintBookings() {
    const box = $('bkList');
    const want = ($('bkFilter') && $('bkFilter').value) || 'all';
    const rows = BOOKINGS.filter(b => want === 'all' || (b.status || 'new') === want);

    if (!rows.length) {
        box.innerHTML = '<div class="empty">No bookings here yet.</div>';
        return;
    }

    const tone = { new: 'var(--gold)', done: 'var(--ok)', cancelled: 'var(--bad)' };

    box.innerHTML = rows.map(b => {
        const st = b.status || 'new';
        return '<div class="card" style="border-inline-start:2px solid ' + (tone[st] || 'var(--line)') + ';">' +
            '<div class="row" style="justify-content:space-between; align-items:flex-start;">' +
              '<div>' +
                '<strong>' + esc(b.name || '—') + '</strong> ' +
                '<span class="muted" style="font-size:var(--t-xs);">' + esc(b.bookingId || '') + '</span><br>' +
                '<span class="gold" style="font-size:var(--t-sm);">' + esc(b.service || '—') + '</span><br>' +
                '<span class="muted" style="font-size:var(--t-sm);">' + esc(b.date || '') + ' · ' + esc(b.time || '') + '</span>' +
                (b.note ? '<br><span class="muted" style="font-size:var(--t-xs);">“' + esc(b.note) + '”</span>' : '') +
              '</div>' +
              '<div style="text-align:end;">' +
                '<a class="btn btn--wa btn--sm" href="https://wa.me/' + esc(String(b.phone || '').replace(/\D/g, '').replace(/^0/, '92')) + '" target="_blank" rel="noopener">' +
                  '<i class="fa-brands fa-whatsapp"></i> ' + esc(b.phone || '') + '</a>' +
              '</div>' +
            '</div>' +
            '<div class="row" style="margin-top:var(--s-4); gap:var(--s-2);">' +
              '<button class="slot" type="button" data-bk="' + esc(b._id) + '" data-st="new"       aria-pressed="' + (st === 'new') + '">New</button>' +
              '<button class="slot" type="button" data-bk="' + esc(b._id) + '" data-st="done"      aria-pressed="' + (st === 'done') + '">Done</button>' +
              '<button class="slot" type="button" data-bk="' + esc(b._id) + '" data-st="cancelled" aria-pressed="' + (st === 'cancelled') + '">Cancelled</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

async function setStatus(id, st) {
    try {
        await updateDoc(doc(db, 'bookings', id), { status: st });
        const hit = BOOKINGS.find(b => b._id === id);
        if (hit) hit.status = st;
        paintStats(); paintBookings();
        toast('Saved.', 'ok');
    } catch (e) { toast('Could not save: ' + (e.message || ''), 'bad'); }
}

/* ── 2. TASVEER UPLOAD (Cloudinary) ──────────────────────────────────────── */

async function upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY.preset);
    const r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY.cloud + '/image/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.secure_url) throw new Error(j.error && j.error.message ? j.error.message : 'Upload failed');
    return j.secure_url;
}

async function doUpload(colName, extra) {
    const f = $('imgFile');
    if (!f || !f.files || !f.files[0]) { toast('Choose a photo first.', 'bad'); return; }
    const btn = $('imgGo');
    btn.disabled = true; toast('Uploading…');
    try {
        const url = await upload(f.files[0]);
        await addDoc(collection(db, colName), Object.assign({ url: url, timestamp: serverTimestamp() }, extra || {}));
        f.value = '';
        toast('Photo added.', 'ok');
        loadImages();
    } catch (e) {
        toast('Upload failed: ' + (e.message || ''), 'bad');
    }
    btn.disabled = false;
}

async function loadImages() {
    const box = $('imgList');
    if (!box || !fbReady) return;
    const col = ($('imgDest') && $('imgDest').value) || 'galleryImages';
    box.innerHTML = '<div class="empty">Loading…</div>';
    try {
        const snap = await getDocs(query(collection(db, col), orderBy('timestamp', 'desc')));
        const rows = [];
        snap.forEach(d => rows.push(Object.assign({ _id: d.id }, d.data())));
        if (!rows.length) { box.innerHTML = '<div class="empty">No photos here yet.</div>'; return; }
        box.innerHTML = rows.map(r =>
            '<figure class="shot" style="cursor:default;">' +
              '<img src="' + esc(r.url) + '" alt="" loading="lazy">' +
              '<button class="lightbox__x" type="button" style="position:absolute; top:6px; right:6px; width:32px; height:32px; background:rgba(0,0,0,.6);"' +
              ' data-del="' + esc(r._id) + '" data-col="' + esc(col) + '" title="Delete">&times;</button>' +
            '</figure>').join('');
    } catch (e) {
        box.innerHTML = '<div class="empty">Could not load: ' + esc(e.message || '') + '</div>';
    }
}

/* ── 3. BLOG ─────────────────────────────────────────────────────────────── */

async function savePost() {
    const t = $('pgTitle').value.trim(), c = $('pgBody').value.trim();
    if (!t || !c) { toast('Title and text are both needed.', 'bad'); return; }
    const btn = $('pgGo'); btn.disabled = true; toast('Saving…');
    try {
        await addDoc(collection(db, 'blogPosts'), { title: t, content: c, timestamp: serverTimestamp() });
        $('pgTitle').value = ''; $('pgBody').value = '';
        toast('Post published.', 'ok');
        loadPosts();
    } catch (e) { toast('Could not save: ' + (e.message || ''), 'bad'); }
    btn.disabled = false;
}

async function loadPosts() {
    const box = $('pgList');
    if (!box || !fbReady) return;
    box.innerHTML = '<div class="empty">Loading…</div>';
    try {
        const snap = await getDocs(query(collection(db, 'blogPosts'), orderBy('timestamp', 'desc')));
        const rows = [];
        snap.forEach(d => rows.push(Object.assign({ _id: d.id }, d.data())));
        if (!rows.length) { box.innerHTML = '<div class="empty">No posts yet.</div>'; return; }
        box.innerHTML = rows.map(p =>
            '<div class="card row" style="justify-content:space-between; align-items:flex-start;">' +
              '<div><strong>' + esc(p.title || '') + '</strong><br>' +
              '<span class="muted" style="font-size:var(--t-sm);">' + esc(String(p.content || '').slice(0, 130)) + '…</span></div>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-del="' + esc(p._id) + '" data-col="blogPosts">Delete</button>' +
            '</div>').join('');
    } catch (e) { box.innerHTML = '<div class="empty">Could not load: ' + esc(e.message || '') + '</div>'; }
}

/* ── Mitana (ek hi raasta, tasdeeq ke sath) ──────────────────────────────── */

async function del(col, id) {
    if (!window.confirm('Delete this permanently? This cannot be undone.')) return;
    try {
        await deleteDoc(doc(db, col, id));
        toast('Deleted.', 'ok');
        if (col === 'blogPosts') loadPosts(); else loadImages();
    } catch (e) { toast('Could not delete: ' + (e.message || ''), 'bad'); }
}

/* ── TABS ────────────────────────────────────────────────────────────────── */

function showTab(name) {
    CUR_TAB = name;
    ['bookings', 'gallery', 'blog'].forEach(t => {
        const p = $('tab-' + t); if (p) p.hidden = (t !== name);
        const b = document.querySelector('.adtab[data-tab="' + t + '"]');
        if (b) b.setAttribute('aria-pressed', String(t === name));
    });
    if (name === 'bookings') loadBookings();
    if (name === 'gallery') loadImages();
    if (name === 'blog') loadPosts();
}

/* ── LOGIN ───────────────────────────────────────────────────────────────── */

function boot() {
    if (!fbReady) {
        toast('Firebase is not reachable. Check your internet and reload.', 'bad');
        return;
    }

    $('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('loginGo'); btn.disabled = true; toast('Signing in…');
        try {
            await signInWithEmailAndPassword(auth, $('adEmail').value.trim(), $('adPass').value);
            toast('');
        } catch (err) {
            toast('Sign-in failed. Check the email and password.', 'bad');
        }
        btn.disabled = false;
    });

    $('adOut').addEventListener('click', () => signOut(auth).catch(() => { }));

    onAuthStateChanged(auth, user => {
        $('loginBox').hidden = !!user;
        $('panelBox').hidden = !user;
        if (user) {
            $('adWho').textContent = user.email || '';
            showTab('bookings');
        }
    });

    document.addEventListener('click', e => {
        const tab = e.target.closest && e.target.closest('.adtab');
        if (tab) { showTab(tab.getAttribute('data-tab')); return; }

        const st = e.target.closest && e.target.closest('[data-bk]');
        if (st) { setStatus(st.getAttribute('data-bk'), st.getAttribute('data-st')); return; }

        const d = e.target.closest && e.target.closest('[data-del]');
        if (d) { del(d.getAttribute('data-col'), d.getAttribute('data-del')); return; }
    });

    $('bkFilter').addEventListener('change', paintBookings);
    $('bkReload').addEventListener('click', loadBookings);
    $('imgDest').addEventListener('change', loadImages);
    $('imgGo').addEventListener('click', () => {
        const col = $('imgDest').value;
        doUpload(col, col === 'galleryImages' ? { category: $('imgCat').value } : {});
    });
    $('pgGo').addEventListener('click', savePost);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
