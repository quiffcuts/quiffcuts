/* ============================================================================
   QUIFF CUTS — gallery.js
   Hero ki tasveerein · home ki jhalak · poori gallery · lightbox
   ----------------------------------------------------------------------------
   Sab kuch Firestore se aata hai (admin panel se daali gayi tasveerein).
   🛟 Net na ho ya Firebase na chale — safha PHIR BHI theek dikhta hai,
      bas tasveeron ki jagah saaf paigham aa jata hai. Kuch tootta nahi.
   ========================================================================= */

import { fetchList, esc } from './firebase.js?v=81dc4fd8';

/* ── 1. HERO — dheeme dheeme badalti tasveerein ──────────────────────────── */

async function initHero() {
    const box = document.getElementById('heroBg');
    if (!box) return;

    const rows = await fetchList('heroImages', { orderBy: 'timestamp', dir: 'desc', limit: 6 });
    const urls = rows.map(r => r && r.url).filter(Boolean);
    if (!urls.length) return;              // 🛟 koi tasveer nahi → saada gehra hero (bura nahi lagta)

    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = urls[0];
    img.style.transition = 'opacity 1.2s ease';
    box.appendChild(img);

    if (urls.length < 2) return;

    // "kam harkat" wale computer par tasveer badalti hi nahi
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    urls.slice(1).forEach(u => { const p = new Image(); p.src = u; });   // pehle se utar lo

    let i = 0;
    setInterval(() => {
        i = (i + 1) % urls.length;
        img.style.opacity = '0';
        setTimeout(() => { img.src = urls[i]; img.style.opacity = ''; }, 700);
    }, 6500);
}

/* ── 2. TASVEER KA KHANA ─────────────────────────────────────────────────── */

function shotHtml(url, cat) {
    return '<figure class="shot" data-cat="' + esc(cat || 'all') + '">' +
           '<img src="' + esc(url) + '" alt="Quiff Cuts work" loading="lazy" decoding="async">' +
           '</figure>';
}

function say(box, en, ur) {
    const ur_ = (window.qcLang && window.qcLang() === 'ur');
    box.innerHTML = '<div class="empty" style="grid-column:1/-1;">' + esc(ur_ ? ur : en) + '</div>';
}

/* ── 3. HOME KI JHALAK — 6 nayi tasveerein ──────────────────────────────── */

async function initHomeShots() {
    const box = document.getElementById('homeShots');
    if (!box) return;

    const rows = await fetchList('galleryImages', { orderBy: 'timestamp', dir: 'desc', limit: 6 });
    const good = rows.filter(r => r && r.url);

    if (!good.length) {
        say(box, 'Our gallery is being updated — please check back soon.',
                 'Gallery abhi update ho rahi hai — thori der baad dekhein.');
        return;
    }
    box.innerHTML = good.map(r => shotHtml(r.url, r.category)).join('');
}

/* ── 4. POORI GALLERY — chhanni ke sath ─────────────────────────────────── */

let ALL = [];

function paintGrid() {
    const box = document.getElementById('galleryGrid');
    if (!box) return;
    const on = document.querySelector('.gfilter[aria-pressed="true"]');
    const cat = on ? on.getAttribute('data-cat') : 'all';
    const rows = (cat === 'all') ? ALL : ALL.filter(r => r.category === cat);

    if (!rows.length) {
        say(box, 'No photos in this category yet.', 'Is kism ki koi tasveer abhi nahi hai.');
        return;
    }
    box.innerHTML = rows.map(r => shotHtml(r.url, r.category)).join('');
}

async function initGalleryPage() {
    const box = document.getElementById('galleryGrid');
    if (!box) return;

    const rows = await fetchList('galleryImages', { orderBy: 'timestamp', dir: 'desc' });
    ALL = rows.filter(r => r && r.url);

    if (!ALL.length) {
        say(box, 'Our gallery is being updated — please check back soon.',
                 'Gallery abhi update ho rahi hai — thori der baad dekhein.');
        return;
    }
    paintGrid();

    document.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('.gfilter');
        if (!b) return;
        document.querySelectorAll('.gfilter').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        paintGrid();
    });
}

/* ── 5. LIGHTBOX ─────────────────────────────────────────────────────────── */

function initLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    const img = lb.querySelector('img');

    const close = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; };

    document.addEventListener('click', e => {
        const shot = e.target.closest && e.target.closest('.shot img');
        if (shot) {
            img.src = shot.src;
            img.hidden = false;          /* shuru me chhupi hoti hai — khali src se
                                            browser fazool request bhejta hai */
            lb.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            return;
        }
        if (e.target === lb || (e.target.closest && e.target.closest('.lightbox__x'))) close();
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ── 6. SHURU ────────────────────────────────────────────────────────────── */

function boot() {
    initHero().catch(() => {});
    initHomeShots().catch(() => {});
    initGalleryPage().catch(() => {});
    try { initLightbox(); } catch (e) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
