/* ============================================================================
   QUIFF CUTS — booking.js
   ----------------------------------------------------------------------------
   🔴 SAB SE AHEM TABDEELI (07-Sep-2026):
      PEHLE booking sirf WhatsApp par bheji jati thi — kahin MEHFOOZ nahi hoti thi.
      Agar browser ne WhatsApp ki khirki rok di, ya customer ne bhejne se pehle
      band kar di — booking HAMESHA ke liye gum. Salon ke paas koi record hi nahi.

      AB: pehle Firestore me MEHFOOZ, phir WhatsApp khulta hai.
      Firestore na chale to bhi WhatsApp phir bhi khulta hai (customer ka kaam
      kabhi na ruke) — magar screen saaf batati hai ke record nahi bana.
   ========================================================================= */

import { db, fbReady, collection, addDoc, serverTimestamp, SALON, esc } from './firebase.js?v=526c1913';

/* Services — sirf NAAM (qeemat safhon par hai, do jagah na likhi jaye) */
const SERVICES = [
    'Hair Cut', 'Beard Trim', 'Hair & Beard Cut', 'Shaving', 'Hair Style',
    'Head Wash', 'Nose Strip', 'Hair Color', 'Hair Keratin', 'Beard Color', 'Face Cleansing',
    'Facial Treatment', 'Massage', 'Mani Pedi', 'Wax', 'Makeup', 'Groom Package'
];
const PACKAGES = ['Basic Grooming', 'Refresh & Style', 'Complete Color', 'VIP Grooming'];

const T = {
    slotGone:  { en: 'That time has already passed today.', ur: 'Ye waqt aaj guzar chuka hai.' },
    needName:  { en: 'Please enter your name.',            ur: 'Apna naam likhein.' },
    needPhone: { en: 'Please enter a valid phone number.', ur: 'Durust phone number likhein.' },
    needDate:  { en: 'Please choose a date.',              ur: 'Tareekh chunein.' },
    needTime:  { en: 'Please choose a time.',              ur: 'Waqt chunein.' },
    needSvc:   { en: 'Please choose a service.',           ur: 'Service chunein.' },
    saving:    { en: 'Saving your booking…',               ur: 'Booking mehfooz ki ja rahi hai…' },
    savedOk:   { en: 'Booking saved. Opening WhatsApp to confirm…',
                 ur: 'Booking mehfooz ho gayi. Tasdeeq ke liye WhatsApp khul raha hai…' },
    savedBad:  { en: 'We could not save it on our side, so please SEND the WhatsApp message — that is what confirms your booking.',
                 ur: 'Hamari taraf mehfooz nahi ho saka — is liye WhatsApp ka paigham ZAROOR bhejein, usi se booking pakki hoti hai.' }
};
const t = k => (T[k] && T[k][window.qcLang ? window.qcLang() : 'en']) || (T[k] && T[k].en) || '';

/* ── Waqt ke khane: 10:00 AM se 01:30 AM tak, aadhe ghante ke faasle par ─── */
function buildSlots() {
    const box = document.getElementById('slots');
    if (!box) return;
    let html = '';
    for (let m = SALON.openHour * 60; m < SALON.closeHour * 60; m += 30) {
        const h24 = Math.floor(m / 60) % 24;
        const mm = m % 60;
        const ampm = h24 < 12 ? 'AM' : 'PM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const label = h12 + ':' + String(mm).padStart(2, '0') + ' ' + ampm;
        html += '<button type="button" class="slot" data-min="' + m + '" aria-pressed="false">' + label + '</button>';
    }
    box.innerHTML = html;
}

/* Aaj ki tareekh par guzra hua waqt band kar do (warna log guzra waqt chun lete hain) */
function refreshSlots() {
    const dateEl = document.getElementById('bkDate');
    if (!dateEl) return;
    const today = new Date();
    const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const isToday = dateEl.value === iso;
    const nowMin = today.getHours() * 60 + today.getMinutes();

    document.querySelectorAll('#slots .slot').forEach(b => {
        const m = parseInt(b.getAttribute('data-min'), 10);
        // raat 12 ke baad wale khane (>=24h) aaj ke liye hamesha khule hain
        const past = isToday && m < 24 * 60 && m <= nowMin + 20;
        b.disabled = past;
        b.style.opacity = past ? '.35' : '';
        b.style.cursor = past ? 'not-allowed' : '';
        if (past && b.getAttribute('aria-pressed') === 'true') {
            b.setAttribute('aria-pressed', 'false');
            const h = document.getElementById('bkTime'); if (h) h.value = '';
        }
    });
}

function fillServices() {
    const sel = document.getElementById('bkService');
    if (!sel) return;
    const lang = window.qcLang ? window.qcLang() : 'en';
    let html = '<option value="" disabled selected>' +
        (lang === 'ur' ? 'Service chunein…' : 'Choose a service…') + '</option>';
    html += '<optgroup label="' + (lang === 'ur' ? 'Packages (bachat ke sath)' : 'Packages (best value)') + '">';
    PACKAGES.forEach(p => { html += '<option value="' + esc(p) + '">' + esc(p) + '</option>'; });
    html += '</optgroup><optgroup label="' + (lang === 'ur' ? 'Aam services' : 'Individual services') + '">';
    SERVICES.forEach(s => { html += '<option value="' + esc(s) + '">' + esc(s) + '</option>'; });
    html += '</optgroup>';
    sel.innerHTML = html;

    // ?pkg=VIP%20Grooming se seedha wohi package chun lo
    const want = new URLSearchParams(location.search).get('pkg');
    if (want) {
        const hit = [...sel.options].find(o => o.value === want);
        if (hit) sel.value = want;
    }
}

function bad(id, on) {
    const f = document.getElementById(id);
    if (f && f.closest) f.closest('.field').classList.toggle('field--bad', !!on);
}

function setMsg(text, kind) {
    const el = document.getElementById('bkMsg');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = kind === 'bad' ? 'var(--bad)' : (kind === 'ok' ? 'var(--ok)' : 'var(--text-soft)');
    el.style.display = text ? 'block' : 'none';
}

/* ── Booking bhejna ──────────────────────────────────────────────────────── */
async function submit(e) {
    e.preventDefault();

    const name = document.getElementById('bkName').value.trim();
    const phone = document.getElementById('bkPhone').value.trim();
    const date = document.getElementById('bkDate').value;
    const time = document.getElementById('bkTime').value;
    const service = document.getElementById('bkService').value;
    const note = document.getElementById('bkNote').value.trim();

    ['bkName', 'bkPhone', 'bkDate', 'bkService'].forEach(i => bad(i, false));

    if (name.length < 2) { bad('bkName', 1); setMsg(t('needName'), 'bad'); return; }
    if (phone.replace(/\D/g, '').length < 10) { bad('bkPhone', 1); setMsg(t('needPhone'), 'bad'); return; }
    if (!date) { bad('bkDate', 1); setMsg(t('needDate'), 'bad'); return; }
    if (!service) { bad('bkService', 1); setMsg(t('needSvc'), 'bad'); return; }
    if (!time) { setMsg(t('needTime'), 'bad'); return; }

    const btn = document.getElementById('bkSubmit');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + esc(t('saving'));
    setMsg(t('saving'));

    const id = 'QC-' + String(Date.now()).slice(-6);
    let saved = false;

    /* 1️⃣ PEHLE mehfooz — yehi asal tabdeeli hai */
    if (fbReady) {
        try {
            await addDoc(collection(db, 'bookings'), {
                bookingId: id, name, phone, date, time, service, note,
                status: 'new',
                source: 'website',
                createdAt: serverTimestamp()
            });
            saved = true;
        } catch (err) {
            console.warn('[quiffcuts] booking mehfooz nahi hui:', err && err.message);
        }
    }

    /* 2️⃣ PHIR WhatsApp — chahe upar wala kaamyab ho ya nahi */
    const lines = [
        '*--- New Booking ---*',
        '*Booking ID:* ' + id,
        '*Name:* ' + name,
        '*Phone:* ' + phone,
        '*Date:* ' + date,
        '*Time:* ' + time,
        '*Service:* ' + service
    ];
    if (note) lines.push('*Note:* ' + note);
    window.open('https://wa.me/' + SALON.waNumber + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');

    setMsg(saved ? t('savedOk') : t('savedBad'), saved ? 'ok' : 'bad');
    showPass({ id, name, date, time, service, saved });

    btn.disabled = false;
    btn.innerHTML = original;
    document.getElementById('bookForm').reset();
    document.querySelectorAll('#slots .slot').forEach(b => b.setAttribute('aria-pressed', 'false'));
}

/* ── Tasdeeq ka card ─────────────────────────────────────────────────────── */
function showPass(b) {
    const wrap = document.getElementById('passWrap');
    if (!wrap) return;
    const d = new Date(b.date + 'T00:00:00');
    const nice = isNaN(d) ? b.date : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('passId').textContent = b.id;
    document.getElementById('passName').textContent = b.name;
    document.getElementById('passDate').textContent = nice;
    document.getElementById('passTime').textContent = b.time;
    document.getElementById('passService').textContent = b.service;

    const qr = document.getElementById('passQr');
    if (qr && window.QRCode) {
        qr.innerHTML = '';
        try {
            new window.QRCode(qr, {
                text: 'Quiff Cuts\n' + b.id + '\n' + b.name + '\n' + nice + ' ' + b.time + '\n' + b.service,
                width: 132, height: 132, correctLevel: window.QRCode.CorrectLevel.M
            });
        } catch (e) { /* QR na bane to card phir bhi theek hai */ }
    }

    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* pass ki tasveer utarna */
function savePass() {
    const card = document.getElementById('passCard');
    if (!card || !window.html2canvas) return;
    window.html2canvas(card, { backgroundColor: '#121214', scale: 2 }).then(cv => {
        const a = document.createElement('a');
        a.download = 'QuiffCuts-' + document.getElementById('passId').textContent + '.png';
        a.href = cv.toDataURL('image/png');
        a.click();
    }).catch(() => {});
}

/* ── Shuru ───────────────────────────────────────────────────────────────── */
function boot() {
    const form = document.getElementById('bookForm');
    if (!form) return;

    buildSlots();
    fillServices();

    const dateEl = document.getElementById('bkDate');
    if (dateEl) {
        const n = new Date();
        const iso = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
        dateEl.min = iso;                 // guzri hui tareekh chuni hi na ja sake
        if (!dateEl.value) dateEl.value = iso;
        dateEl.addEventListener('change', refreshSlots);
    }
    refreshSlots();
    setInterval(refreshSlots, 60000);     // waqt guzarne par khane khud band ho jayen

    document.getElementById('slots').addEventListener('click', e => {
        const b = e.target.closest('.slot');
        if (!b || b.disabled) return;
        document.querySelectorAll('#slots .slot').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        document.getElementById('bkTime').value = b.textContent.trim();
        setMsg('');
    });

    form.addEventListener('submit', submit);

    const dl = document.getElementById('passSave');
    if (dl) dl.addEventListener('click', savePass);

    // zubaan badle to dropdown bhi badle
    document.addEventListener('qc:lang', () => {
        const keep = document.getElementById('bkService').value;
        fillServices();
        if (keep) document.getElementById('bkService').value = keep;
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
