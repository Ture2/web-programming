'use strict';

/* ==========================================================================
   Language and theme. Loaded first.
   - The site ships in English only. To add Spanish: add 'es' to LANGS, add
     data/es/*.js (same ids as data/en) and a UI.es dictionary for t().
   - LANG comes from ?lang= (also remembered), then the saved choice, then the
     browser language; unsupported languages fall back to English.
   - DATA[lang] is filled by data/<lang>/*.js; sections read it through
     langData() / sectionData() in js/core.js.
   - t('English text', { name }) translates interface text: the English text is
     the key.
   ========================================================================== */

const LANGS = ['en'];
const DATA = { en: {} };
const UI = {};

const LANG = (() => {
  let fromUrl = null;
  try { fromUrl = new URLSearchParams(location.search).get('lang'); } catch (e) { /* old browser */ }
  if (LANGS.includes(fromUrl)) {
    try { localStorage.setItem('lang', fromUrl); } catch (e) { /* no storage available */ }
    return fromUrl;
  }
  try {
    const saved = localStorage.getItem('lang');
    if (LANGS.includes(saved)) return saved;
  } catch (e) { /* no storage available */ }
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : 'en';
})();
document.documentElement.lang = LANG;

/* Theme: 'light' | 'dark' | 'system' (default). The inline script in index.html applies the saved
   theme before the first paint; THEME keeps the choice for the settings menu. */
const THEMES = ['light', 'dark', 'system'];
let THEME = 'system';
try { const saved = localStorage.getItem('theme'); if (THEMES.includes(saved)) THEME = saved; } catch (e) { /* no storage available */ }
function applyTheme(theme) {
  THEME = THEMES.includes(theme) ? theme : 'system';
  if (THEME === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = THEME;
}
applyTheme(THEME);
function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem('theme', THEME); } catch (e) { /* no storage available */ }
}

const tMissing = new Set();

/* Interface text in the current language. {name} placeholders are filled from params. */
function t(text, params) {
  let s = text;
  if (LANG !== 'en') {
    const dict = UI[LANG] || {};
    if (Object.prototype.hasOwnProperty.call(dict, text)) s = dict[text];
    else if (!tMissing.has(text)) { tMissing.add(text); console.warn(`[i18n] missing ${LANG}: ${text}`); }
  }
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}

/* Changes the language: remembered on this device, then the page reloads on the same route. */
function setLang(lang) {
  if (!LANGS.includes(lang) || lang === LANG) return;
  try { localStorage.setItem('lang', lang); } catch (e) { /* no storage available */ }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  url.searchParams.set('lang', lang);          // also works when storage is blocked
  location.replace(url.toString());
}
