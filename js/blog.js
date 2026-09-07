/* ============================================================================
   QUIFF CUTS — blog.js
   Blog posts Firestore se (admin panel se likhe jate hain)
   🛟 Kuch na mile ya net na ho — safha phir bhi theek dikhta hai.
   ========================================================================= */

import { fetchList, esc } from './firebase.js?v=81dc4fd8';

function niceDate(v) {
    try {
        var d = v && v.toDate ? v.toDate() : (v ? new Date(v) : null);
        if (!d || isNaN(d)) return '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
}

/* ── Matn ko HTML me badalna — MEHFOOZ tareeqe se ────────────────────────────
   Purani posts me <b> jaisi shaklein likhi hui hain, is liye unhen chalna
   chahiye. Magar admin ka matn seedha innerHTML me daalna KHATARNAK hai.

   Tareeqa: PEHLE sab kuch escape karo, PHIR sirf ginti ki chand mehfooz
   shaklein wapas kholo — aur wo bhi BINA KISI attribute ke.
   Is se <script>, onclick, href — kuch bhi zinda nahi bach sakta.          */
var SAFE_TAGS = 'b|strong|i|em|u|s|br|p|ul|ol|li|blockquote|h3|h4';

function safeHtml(raw) {
    var s = esc(raw);
    // sirf saada shaklein: <b> </b> <br> <br/> — attribute wali kabhi nahi
    var re = new RegExp('&lt;(/?)(' + SAFE_TAGS + ')\\s*/?&gt;', 'gi');
    return s.replace(re, '<$1$2>');
}

function paras(text) {
    var body = safeHtml(text);
    // agar likhne wale ne khud <p> ya <br> lagaya hai to dobara mat lagao
    if (/<(p|br|ul|ol|blockquote|h3|h4)\b/i.test(body)) return body;
    return body.split(/\n\s*\n/).map(function (p) {
        return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
}

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

    box.innerHTML = good.map(function (p) {
        var d = niceDate(p.timestamp || p.createdAt);
        return '<article class="card">' +
            (d ? '<div class="crumbs" style="margin-bottom: var(--s-3);">' + esc(d) + '</div>' : '') +
            '<h2 style="font-size: var(--t-xl); margin-bottom: var(--s-4);">' + esc(p.title || '') + '</h2>' +
            '<div class="prose" style="max-width:none;">' + paras(p.content || '') + '</div>' +
            '</article>';
    }).join('');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot().catch(function () { }); });
else boot().catch(function () { });
