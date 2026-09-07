/* ============================================================================
   QUIFF CUTS — firebase.js
   Firebase ka raabta SIRF YAHAN. Baqi har file yahin se leti hai.
   ----------------------------------------------------------------------------
   ⚠️ WAJAH: pehle ye config safhe ke andar likhi hui thi. Ab kal ko project
      badle to sirf YE file badalni hogi — 14 safhe nahi.

   ℹ️ Ye chaabiyan "khufia" nahi hoti — Firebase ki web keys har site par
      khuli hoti hain. Asal hifazat FIRESTORE RULES par hai (server par),
      jo likhne ki ijazat sirf logged-in admin ko deti hain.
   ========================================================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc,
    query, orderBy, limit, where, serverTimestamp, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
    apiKey: 'AIzaSyApbKqy3oi3bGugP9XL1T2Q7SW9FhHcx5Y',
    authDomain: 'quiffcuts-3bee4.firebaseapp.com',
    projectId: 'quiffcuts-3bee4',
    storageBucket: 'quiffcuts-3bee4.firebasestorage.app',
    messagingSenderId: '1067777064918',
    appId: '1:1067777064918:web:15e622dc21675e2032ee77',
    measurementId: 'G-LNXSLNZVMR'
};

/* Cloudinary — tasveerein yahan jati hain (muft: 25 GB/mahina) */
export const CLOUDINARY = {
    cloud: 'dtacwfyx2',
    preset: 'quiffcuts_preset'
};

/* Salon ki maloomat — EK jagah. Har safha yahin se leta hai. */
export const SALON = {
    name: 'Quiff Cuts',
    phone: '+92 308 2270007',
    waNumber: '923082270007',
    email: 'info@quiffcuts.com',
    address: 'Model City 1, Eden Valley, Faisalabad, Pakistan',
    hours: '10:00 AM – 02:00 AM',
    openHour: 10,
    closeHour: 26            /* 26 = agle din 2 baje — raat ke waqt ka hisaab isi se */
};

let _app = null, _db = null, _auth = null;

/* 🛟 Firebase na chale (net band / CDN block) to poori site phir bhi chalti hai.
   Har bulane wala `null` sambhalta hai. */
try {
    _app = initializeApp(firebaseConfig);
    _db = getFirestore(_app);
    _auth = getAuth(_app);
} catch (e) {
    console.warn('[quiffcuts] Firebase shuru nahi ho saka:', e && e.message);
}

export const db = _db;
export const auth = _auth;
export const fbReady = !!_db;

export {
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
    query, orderBy, limit, where, serverTimestamp,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
};

/* ── Chhote madadgar ─────────────────────────────────────────────────────── */

/** Firestore se ek fehrist — nakami par HAMESHA khali array (safha kabhi na toote) */
export async function fetchList(col, opts) {
    if (!_db) return [];
    opts = opts || {};
    try {
        let q = collection(_db, col);
        const parts = [];
        if (opts.orderBy) parts.push(orderBy(opts.orderBy, opts.dir || 'desc'));
        if (opts.limit) parts.push(limit(opts.limit));
        const snap = await getDocs(parts.length ? query(q, ...parts) : q);
        const out = [];
        snap.forEach(d => out.push(Object.assign({ id: d.id }, d.data())));
        return out;
    } catch (e) {
        console.warn('[quiffcuts] ' + col + ' nahi mila:', e && e.message);
        return [];
    }
}

/** HTML se bachao — kisi bhi bahar ke matn ko screen par lagane se pehle */
export function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
