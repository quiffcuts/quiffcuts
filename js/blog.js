/* ============================================================================
   QUIFF CUTS — blog.js
   Blog posts Firestore se (admin panel se likhe jate hain)
   🛟 Kuch na mile ya net na ho — safha phir bhi theek dikhta hai.
   ========================================================================= */

import { fetchList, esc } from './firebase.js?v=526c1913';

function niceDate(v) {
    try {
        var d = v && v.toDate ? v.toDate() : (v ? new Date(v) : null);
        if (!d || isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
}

/* ── Matn ko HTML me badalna — MEHFOOZ tareeqe se ────────────────────────────
   Purani posts me <b> aur <a href="..."> jaisi shaklein likhi hui hain, is
   liye unhen chalna chahiye. Magar admin ka matn seedha innerHTML me daalna
   KHATARNAK hai.

   Tareeqa: PEHLE sab kuch escape karo, PHIR sirf ginti ki chand mehfooz
   shaklein wapas kholo.
   Is se <script>, onclick, onerror — kuch bhi zinda nahi bach sakta.        */
var SAFE_TAGS = 'b|strong|i|em|u|s|br|p|ul|ol|li|blockquote|h3|h4';

/* Link ka pata SIRF in shaklon me chalta hai. `javascript:` kabhi nahi. */
var SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/|#)[^\s<>"']*$/i;

/* 🔗 PURANI SINGLE-PAGE SITE KI NISHANI
   Purani website EK hi safha thi, is liye us waqt likhi gayi posts me
   `#booking` jaise andar wale nishan hain. Ab har hissa apna alag safha hai,
   is liye wo nishan kahin nahi jate — unhen naye safhe ke pate par bhej dete
   hain. Baqi koi bhi `#...` jyun ka tyun rehta hai. */
var OLD_ANCHORS = {
    '#booking': '/booking', '#book': '/booking',
    '#services': '/services', '#packages': '/packages',
    '#gallery': '/gallery', '#team': '/team',
    '#contact': '/contact', '#blog': '/blog'
};

function fixHref(h) {
    var k = String(h || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(OLD_ANCHORS, k) ? OLD_ANCHORS[k] : h;
}

function safeHtml(raw) {
    var s = esc(raw);

    // 1) saada shaklein: <b> </b> <br> — attribute wali kabhi nahi
    var re = new RegExp('&lt;(/?)(' + SAFE_TAGS + ')\\s*/?&gt;', 'gi');
    s = s.replace(re, '<$1$2>');

    // 2) LINK — href me koi KHALI JAGAH nahi chalti, is liye us ke sath koi
    //    doosra attribute (onclick waghera) chipkaya hi nahi ja sakta.
    s = s.replace(/&lt;a\s+href=&quot;([^\s<>]*?)&quot;\s*&gt;/gi, function (m, href) {
        if (!SAFE_HREF.test(href)) return '';          // shak ho to link hi nahi
        var h = fixHref(href);
        var bahar = /^https?:\/\//i.test(h);           // bahar ka link naye tab me
        return '<a href="' + h + '"' + (bahar ? ' target="_blank" rel="noopener"' : '') + '>';
    });
    s = s.replace(/&lt;\/a&gt;/gi, '</a>');

    return s;
}

function paras(text) {
    var body = safeHtml(text);
    // agar likhne wale ne khud <p> ya <br> lagaya hai to dobara mat lagao
    if (/<(p|br|ul|ol|blockquote|h3|h4)\b/i.test(body)) return body;
    return body.split(/\n\s*\n/).map(function (p) {
        return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
}

/* ── Safha banana ────────────────────────────────────────────────────────────
   Har post ek KHULNE WALA khana (accordion) hai — wohi shakl jo FAQ par hai.
   Pehli post khuli rehti hai (warna safha khali lagta hai), baqi band —
   is se fehrist bikhri hui nahi, ek tarteeb me nazar aati hai.            */
async function boot() {
    var box = document.getElementById('blogList');
    if (!box) return;

    var rows = await fetchList('blogPosts', { orderBy: 'timestamp', dir: 'desc' });
    var good = rows.filter(function (r) { return r && (r.title || r.content); });

    if (!good.length) {
        var ur = (window.qcLang && window.qcLang() === 'ur');
        box.innerHTML = '<div class="empty">' + esc(ur
            ? 'Abhi koi post nahi. Jald hi kuch likhenge — tab tak Instagram par hamara kaam dekhein.'
            : 'No posts yet. We are writing — meanwhile, see our work on Instagram.') + '</div>';
        return;
    }

    box.innerHTML = good.map(function (p, i) {
        var d = niceDate(p.timestamp || p.createdAt);
        return '<details' + (i === 0 ? ' open' : '') + '>' +
            '<summary><span>' +
            (d ? '<span class="acc__date">' + esc(d) + '</span>' : '') +
            '<span class="acc__title">' + esc(p.title || '') + '</span>' +
            '</span></summary>' +
            '<div class="acc__body prose" style="max-width:none;">' + paras(p.content || '') + '</div>' +
            '</details>';
    }).join('');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot().catch(function () { }); });
else boot().catch(function () { });
