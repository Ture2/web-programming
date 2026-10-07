'use strict';

/* ==========================================================================
   Router and start-up. Hash routes:
     #/                                         Home: the topic map and where to continue
     <section base>[/card | /quiz[/topic] | /practice[/tool] | /summary]
         bases: #/<area>/<slug>, e.g. #/browser/css, #/server/routes (js/sections/sections.js)
     #/progress                                 Progress across every section
   Routes from before the sections were renamed redirect (LEGACY_ROUTES), so bookmarks work.
   ========================================================================== */

(() => {
  const view = $('#view');
  let current = null;           // module handling #view

  /* The static shell in index.html is written in English: translate it once. */
  function translateShell() {
    $('.skip').textContent = t('Skip to content');
    $('.brand-name').textContent = t('Web Application Programming');
    $('.progress-label').textContent = t('Progress');
    $('#footer-course').textContent = t('Web Application Programming · Escuela Politécnica Superior');
    $('#settings-label').textContent = t('Settings');
    $('#settings-btn').title = t('Settings');
    $('#settings-title').textContent = t('Settings');
    $('#set-theme-h').textContent = t('Theme');
    $('#crumbs').setAttribute('aria-label', t('You are here'));
    $('#map-btn-label').textContent = t('Topic map');
    $('#map-dialog-h').textContent = t('Topic map');
    $('#map-close-label').textContent = t('Close');
    const labels = { light: t('Light'), dark: t('Dark'), system: t('System') };
    document.querySelectorAll('.settings-panel [data-set]').forEach((b) => { if (labels[b.dataset.value]) b.textContent = labels[b.dataset.value]; });
  }
  translateShell();

  /* ---- Settings menu: theme (language joins it when Spanish is added) ------------ */

  const settingsBtn = $('#settings-btn');
  const panel = $('#settings-panel');

  function markSettings() {
    const now = { lang: LANG, theme: THEME };
    panel.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-pressed', String(now[b.dataset.set] === b.dataset.value)));
  }
  function openSettings() {
    markSettings();
    panel.hidden = false;
    settingsBtn.setAttribute('aria-expanded', 'true');
    (panel.querySelector('[aria-pressed="true"]') || panel.querySelector('button')).focus();
  }
  function closeSettings(focusButton = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    settingsBtn.setAttribute('aria-expanded', 'false');
    if (focusButton) settingsBtn.focus();
  }
  settingsBtn.addEventListener('click', () => (panel.hidden ? openSettings() : closeSettings()));
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    if (b.dataset.set === 'lang') { setLang(b.dataset.value); return; }
    if (b.dataset.set === 'theme') {
      setTheme(b.dataset.value);
      markSettings();
      announce(t('Theme: {theme}', { theme: b.textContent }));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closeSettings(); });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.settings')) closeSettings(false);
  });

  /* ---- Topic map dialog (js/course-map.js), drawn fresh on each opening ---------- */

  const mapBtn = $('#map-btn');
  const mapDialog = $('#map-dialog');
  let mapSection = null;                // the section on screen, highlighted in the map
  function openMap() {
    closeSettings(false);
    $('#map-dialog-body').innerHTML = CourseMap.html({ current: mapSection, idp: 'dm' });
    mapDialog.showModal();
    ($('#map-dialog-body [aria-current]') || $('#map-close')).focus();
  }
  mapBtn.addEventListener('click', openMap);
  $('#map-close').addEventListener('click', () => mapDialog.close());
  // A click on the backdrop (outside the dialog box) closes it too.
  mapDialog.addEventListener('click', (e) => { if (e.target === mapDialog) mapDialog.close(); });
  mapDialog.addEventListener('close', () => { if (document.activeElement === document.body) mapBtn.focus(); });

  /* ---- Routes ------------------------------------------------------------------- */

  const PAGES = { '#/': HomePage, '#/progress': ProgressPage };

  /* Old section bases → current ones (bookmarks, links shared before the rename). */
  const LEGACY_ROUTES = {
    '#/web/overview': '#/http/web', '#/web/html': '#/browser/html', '#/web/css': '#/browser/css',
    '#/web/js': '#/browser/js', '#/web/dom': '#/browser/dom',
    '#/backend/node': '#/server/runtime', '#/backend/express': '#/server/routes', '#/backend/rest': '#/http/api-design',
    '#/backend/sql': '#/database/relational', '#/backend/mongo': '#/database/documents', '#/backend/auth': '#/server/auth',
    '#/git': '#/vcs/repositories',
  };
  const under = (hash, base) => hash === base || hash.startsWith(`${base}/`);

  function parse() {
    const hash = location.hash || '#/';
    if (PAGES[hash]) return { section: null, rest: '', module: PAGES[hash] };
    const s = SECTIONS.find((x) => under(hash, x.base));
    if (s) return { section: s, rest: hash.slice(s.base.length + 1) };
    const old = Object.keys(LEGACY_ROUTES).find((b) => under(hash, b));
    return old ? { redirect: LEGACY_ROUTES[old] + hash.slice(old.length) } : null;
  }

  /* App bar: "Server › Routes and middleware" on a section page; the map button everywhere but home. */
  function header(route) {
    const s = route.section;
    $('#crumbs').innerHTML = s ? `<ol>
        <li class="crumb-area">${esc(t(AREAS[s.area].title))}</li>
        <li><a href="${s.base}" aria-current="page">${esc(t(s.title))}</a></li>
      </ol>` : '';
    $('#crumbs').hidden = !s;
    mapSection = s;
    mapBtn.hidden = route.module === HomePage;
    if (mapDialog.open) mapDialog.close();
  }

  function render() {
    const route = parse();
    if (!route || route.redirect) { history.replaceState(null, '', route ? route.redirect : '#/'); render(); return; }
    header(route);
    current = route.module || route.section.module;
    // Modules that draw a full-height rail on the left edge (ConceptSection) use the full width.
    $('#main').classList.toggle('is-wide', !!current.wide);
    $('#progress-btn').toggleAttribute('aria-current', current === ProgressPage);
    $('.brand').toggleAttribute('aria-current', current === HomePage);
    const title = current.render(route.rest);
    document.title = title ? `${title} · ${t('Web Application Programming')}` : t('Web Application Programming');
    DELEGATES.forEach((d) => d.mountAll(view));
    focusableScrollers(view);
    ProgressPage.updateButton();
  }
  window.addEventListener('resize', debounce(() => focusableScrollers(view), 200));

  /* Delegated events. Embedded components ("Try it" boxes, tools) claim the events inside their own
     element first (each returns true when it handled one); everything else goes to the page module. */
  const DELEGATES = [LiveRunner, Tools];
  const claim = (name, ...args) => DELEGATES.some((d) => d[name] && d[name](...args));

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || el.tagName === 'FORM') return;
    if (el.tagName === 'A') e.preventDefault();   // in-page links handled by the module, not the router
    if (!claim('onClick', el, e) && current && current.onClick) current.onClick(el, e);
  });
  ['input', 'change', 'keydown'].forEach((type) => {
    const name = `on${type[0].toUpperCase()}${type.slice(1)}`;   // onInput, onChange, onKeydown
    view.addEventListener(type, (e) => { if (!claim(name, e) && current && current[name]) current[name](e); });
  });
  view.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!claim('onSubmit', e.target) && current && current.onSubmit) current.onSubmit(e.target);
  });

  // After the page is drawn and scrolled to the top, a module may scroll to a part of it (a concept on a group page).
  const settle = () => { if (current && current.afterNavigate) current.afterNavigate(); };
  window.addEventListener('hashchange', () => {
    render();
    try { window.scrollTo(0, 0); } catch (e) { /* environments without scrolling */ }
    settle();
  });

  render();
  settle();
})();
