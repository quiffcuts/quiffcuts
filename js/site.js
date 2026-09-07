/* ============================================================================
   QUIFF CUTS — site.js
   Har safhe par chalta hai: nav · zubaan ka switch · scroll reveal · saal
   ----------------------------------------------------------------------------
   🌐 ZUBAAN KA QAIDA (ye sab se ahem hai):
      - DEFAULT hamesha ENGLISH
      - Roman Urdu SIRF tab jab customer khud chune
      - Ek waqt me SIRF EK zubaan screen par — dono kabhi ek sath nahi
      Matn is tarah likha jata hai:  <span data-en="Book Now" data-ur="Booking Karein">Book Now</span>
      Khane ka placeholder:          <input data-en-ph="Your full name" data-ur-ph="Apna poora naam">
   ========================================================================= */
(function () {
    'use strict';

    var LANG_KEY = 'qc_lang';
    var VALID = { en: 1, ur: 1 };

    /* ── 1. ZUBAAN ───────────────────────────────────────────────────────── */

    function savedLang() {
        try {
            var v = localStorage.getItem(LANG_KEY);
            return VALID[v] ? v : 'en';          // 🛟 kachra ho to hamesha English
        } catch (e) {
            return 'en';                          // private window / storage band
        }
    }

    function applyLang(lang) {
        if (!VALID[lang]) lang = 'en';
        var html = document.documentElement;
        html.setAttribute('data-lang', lang);
        html.setAttribute('lang', lang === 'ur' ? 'ur-Latn-PK' : 'en');

        // matn
        var nodes = document.querySelectorAll('[data-en][data-ur]');
        for (var i = 0; i < nodes.length; i++) {
            var t = nodes[i].getAttribute(lang === 'ur' ? 'data-ur' : 'data-en');
            if (t !== null) nodes[i].textContent = t;
        }
        // placeholder
        var ph = document.querySelectorAll('[data-en-ph][data-ur-ph]');
        for (var j = 0; j < ph.length; j++) {
            var p = ph[j].getAttribute(lang === 'ur' ? 'data-ur-ph' : 'data-en-ph');
            if (p !== null) ph[j].setAttribute('placeholder', p);
        }
        // button ki halat
        var btns = document.querySelectorAll('.lang button[data-lang]');
        for (var k = 0; k < btns.length; k++) {
            btns[k].setAttribute('aria-pressed', btns[k].getAttribute('data-lang') === lang ? 'true' : 'false');
        }

        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* chup-chaap */ }
        window.QC_LANG = lang;
        document.dispatchEvent(new CustomEvent('qc:lang', { detail: { lang: lang } }));
    }

    window.qcLang = function () { return window.QC_LANG || 'en'; };
    window.qcSetLang = applyLang;

    /* ── 2. NAV ──────────────────────────────────────────────────────────── */

    function initNav() {
        var burger = document.querySelector('.nav__burger');
        var links = document.querySelector('.nav__links');
        var nav = document.querySelector('.nav');

        if (burger && links) {
            burger.addEventListener('click', function () {
                var open = links.classList.toggle('is-open');
                burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            // link dabate hi menu band (warna mobile par khula reh jata hai)
            links.addEventListener('click', function (e) {
                if (e.target.tagName === 'A') {
                    links.classList.remove('is-open');
                    burger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (nav) {
            var onScroll = function () {
                nav.classList.toggle('is-scrolled', window.scrollY > 12);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }

        /* Is waqt kaun sa safha khula hai.
           Pate saaf hain (/services), magar host `/services.html` bhi qabool
           karta hai — is liye dono shaklon ko ek jaisa samajhte hain. */
        var here = (location.pathname || '/').replace(/\.html$/, '').replace(/\/index$/, '/');
        if (here === '') here = '/';
        var all = document.querySelectorAll('.nav__links a[href]');
        for (var i = 0; i < all.length; i++) {
            var h = (all[i].getAttribute('href') || '').replace(/\.html$/, '');
            if (h === here) all[i].setAttribute('aria-current', 'page');
        }
    }

    /* ── 3. SCROLL REVEAL ────────────────────────────────────────────────── */

    function initReveal() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;

        // 🛟 purana browser ya "kam harkat" — sab foran dikha do, chhupa hua kuch na rahe
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!('IntersectionObserver' in window) || reduce) {
            for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add('is-in');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        for (var j = 0; j < items.length; j++) io.observe(items[j]);
    }

    /* ── 4. SAAL ─────────────────────────────────────────────────────────── */

    /* Salon 2024 me bana. Copyright hamesha "2024–<is saal>" —
       ek hi saal ho to sirf "2024" (2024–2024 bhadda lagta hai). */
    var FOUNDED = 2024;

    function initYear() {
        var now = new Date().getFullYear();
        var txt = (now > FOUNDED) ? (FOUNDED + '–' + now) : String(FOUNDED);
        var y = document.querySelectorAll('[data-year]');
        for (var i = 0; i < y.length; i++) y[i].textContent = txt;
    }

    /* ── 5. 🔴 DUPLICATE SE BACHAO ───────────────────────────────────────
       Jab site kisi arzi pate par chal rahi ho (quiffcuts.pages.dev,
       netlify.app, localhost) to Google usay index NA kare — warna wohi site
       DO pate par nazar aati hai aur Google usay "duplicate" samajh kar ASAL
       site (quiffcuts.com) ko neeche kar deta hai.
       Canonical pehle se har safhe par hai; ye us par doosra taala hai.      */
    var LIVE_HOSTS = ['quiffcuts.com', 'www.quiffcuts.com'];

    function guardHost() {
        var h = (location.hostname || '').toLowerCase();
        if (!h || h === '') return;                       // file:// — kuch na karo
        if (LIVE_HOSTS.indexOf(h) >= 0) return;           // asal pata — sab theek

        // pehle se koi robots meta ho to usay chhero mat
        if (document.querySelector('meta[name="robots"]')) return;

        var m = document.createElement('meta');
        m.name = 'robots';
        m.content = 'noindex, nofollow';
        document.head.appendChild(m);
    }

    /* ── 6. SHURU ────────────────────────────────────────────────────────── */

    function boot() {
        try { guardHost(); } catch (e) { }
        try { applyLang(savedLang()); } catch (e) { }
        try { initNav(); } catch (e) { }
        try { initReveal(); } catch (e) { }
        try { initYear(); } catch (e) { }

        document.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('.lang button[data-lang]');
            if (b) applyLang(b.getAttribute('data-lang'));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
