/* ============================================================================
   QUIFF CUTS — reviews.js
   Google Reviews ka widget (Elfsight) — aur us ka pehredaar.
   ----------------------------------------------------------------------------
   🔎 08-Sep-2026 ko jo mila:
      Widget purani site par BHI khali tha — yani kabhi chala hi nahi.
      Elfsight ke jawab me `reviews: 0` aata hai, halanke Google par salon ki
      asli listing mojood hai (Quiff Cuts Salon · 4.9).
      Yani masla Elfsight ke khaate ka hai, website ka nahi.

   🛡️ Is liye section aisa banaya gaya hai ke KISI BHI SURAT ME khali na lage:
      · widget chal jaye  → asli reviews upar nazar aate hain
      · widget khali rahe → wo 0 oonchai leta hai (koi khali jagah nahi),
                            aur neeche ke DO button hamesha kaam ke rehte hain.
      Is liye yahan kuch chhupane ki zaroorat hi nahi — sirf faasla theek
      karna hai jab widget waqai kuch dikhaye.
   ========================================================================= */
(function () {
    'use strict';

    var BOX = '[class^="elfsight-app-"], [class*=" elfsight-app-"]';
    var WAIT = 14000;
    var STEP = 500;

    function boot() {
        var box = document.querySelector(BOX);
        if (!box) return;

        var waited = 0;
        var timer = setInterval(function () {
            waited += STEP;
            if (box.children.length > 0 && box.offsetHeight > 60) {
                box.style.marginBottom = 'var(--s-6)';   /* reviews aa gaye — neeche faasla */
                clearInterval(timer);
                return;
            }
            if (waited >= WAIT) clearInterval(timer);    /* khali raha — kuch nahi karna */
        }, STEP);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
