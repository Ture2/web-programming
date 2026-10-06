'use strict';

/* ==========================================================================
   Interactive tools. Each tool file calls Tools.register(id, def):

     def = {
       title,                 // shown in the tool header and in the practice rail
       intro,                 // one sentence shown above the full-size (practice) version
       body(root, opts),      // → HTML string of the tool body (opts.full on practice pages)
       mount(root),           // optional: after the HTML is in the page (iframes, measuring, listeners)
       resize(root),          // optional: after the window is resized (once per frame)
       onClick(el, root, e),  // optional delegated handlers; el = closest [data-action]
       onInput(e, root), onChange(e, root), onKeydown(e, root), onSubmit(form, root),
       challenges: { store, label, ids() },  // optional: store = challengeStore(key) from core.js;
                              // the registry derives storeKey and progress() for the progress page
       workKey,               // optional: localStorage key of saved work (cleared with progress)
     }
   Events reach a tool only when they happen inside its element (js/main.js asks
   LiveRunner and Tools to claim events before the page module).

   A tool lives in <section data-widget="id">; its body is in [data-body] and
   it announces results in its own [data-live] region (Tools.say). A page shows
   at most one instance of a tool; tools keep their state at module level, so
   the card version and the practice page share it. Partial repaints use one
   convention: elements marked data-part="name" (Tools.paint / Tools.painter).
   By convention data-action names carry the tool's short prefix (e.g. "fx-"
   for flexbox) so they read clearly in the markup.
   Shared controls: Tools.seg, range, select, num, statusHtml, challengePicker,
   markSolved.
   ========================================================================== */

const Tools = (() => {
  const REG = {};

  function register(id, def) {
    if (REG[id]) console.warn(`[tools] ${id} registered twice`);
    const ch = def.challenges;
    REG[id] = ch ? {
      ...def,
      storeKey: ch.store.key,
      progress: () => { const ids = ch.ids(); return { label: t(ch.label), done: ch.store.count(ids), total: ids.length }; },
    } : def;
  }

  const has = (id) => !!REG[id];
  const def = (id) => REG[id] || null;
  const title = (id) => (REG[id] ? t(REG[id].title) : id);
  const intro = (id) => (REG[id] && REG[id].intro ? t(REG[id].intro) : '');

  /* Where the full-size version of a tool lives (set by toolPractice). */
  const HOME = {};
  const setHome = (id, href) => { HOME[id] = href; };

  /* opts.full: the practice page, which supplies its own heading (opts.labelledBy = its id). */
  function html(id, opts = {}) {
    const d = REG[id];
    if (!d) {
      console.warn(`[tools] unknown tool ${id}`);
      return '';
    }
    const full = !!opts.full;
    const head = full ? '' : `<header class="tool-head">
          <span class="tool-badge" aria-hidden="true">${esc(t('Try it'))}</span>
          <h3 id="tool-${esc(id)}-h" class="tool-title">${esc(title(id))}</h3>
          ${HOME[id] ? `<a class="tool-open" href="${HOME[id]}">${esc(t('Open full size'))}</a>` : ''}
        </header>`;
    return `<section class="tool${full ? ' tool-full' : ''}" data-widget="${esc(id)}" aria-labelledby="${esc(full && opts.labelledBy ? opts.labelledBy : `tool-${id}-h`)}">
        ${head}
        <div class="tool-body" data-body>${d.body(null, { full })}</div>
        <p class="sr-only" data-live aria-live="polite"></p>
      </section>`;
  }

  const rootOf = (el) => (el && el.closest ? el.closest('[data-widget]') : null);
  const defOf = (root) => (root ? REG[root.dataset.widget] : null);

  /* fn(root) for the tool's element on the page. */
  const each = (id, fn) => document.querySelectorAll(`[data-widget="${CSS.escape(id)}"]`).forEach(fn);

  /* Re-renders a tool body, keeping focus (with caret, scroll and open <details>), then mounts it again. */
  function refresh(id) {
    each(id, (root) => {
      const body = root.querySelector('[data-body]');
      keepFocus(() => { body.innerHTML = REG[id].body(root, { full: root.classList.contains('tool-full') }); });
      if (REG[id].mount) REG[id].mount(root);
    });
  }

  /* Repaints the [data-part="name"] pieces of a tool now: parts = { name: (root) => html }. */
  function paint(root, parts) {
    root.querySelectorAll('[data-part]').forEach((el) => {
      const fn = parts[el.dataset.part];
      if (fn) el.innerHTML = fn(root);
    });
  }

  /* The same, at most once per frame (sliders, typing); after(root) runs once the parts are in. */
  function painter(id, parts, after) {
    let frame = 0;
    return () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        each(id, (root) => { paint(root, parts); if (after) after(root); });
      });
    };
  }

  /* Announces a result in the tool's own live region. */
  function say(root, text) {
    const el = root && root.querySelector('[data-live]');
    if (el) el.textContent = text;
  }

  function mountAll(scope = document) {
    scope.querySelectorAll('[data-widget]').forEach((root) => {
      const d = defOf(root);
      if (d && d.mount) d.mount(root);
    });
  }

  /* One window listener for every tool: def.resize(root) once per frame after a resize. */
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => document.querySelectorAll('[data-widget]').forEach((root) => {
      const d = defOf(root);
      if (d && d.resize) d.resize(root);
    }));
  });

  /* ---- Shared controls ---------------------------------------------------------- */

  const dataAttrs = (data = {}) => Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const pair = (o) => (Array.isArray(o) ? o : [o, o]);

  /* A row of toggle buttons; each carries data-prop / data-v and aria-pressed. */
  const seg = ({ label, action, prop, values, current, fid, mono = true }) => `<div class="tl-field">
      <span id="${fid}-l">${esc(label)}</span>
      <div class="tl-seg${mono ? '' : ' tl-seg-text'}" role="group" aria-labelledby="${fid}-l">${values.map((v) => {
        const [val, txt] = pair(v);
        return `<button type="button" data-action="${action}" data-prop="${esc(prop)}" data-v="${esc(val)}" data-fid="${fid}-${esc(val)}" aria-pressed="${String(val) === String(current)}">${esc(txt)}</button>`;
      }).join('')}</div>
    </div>`;

  /* A slider with its live value (<output data-val="prop">, see showVal). */
  const range = ({ label, prop, value, min, max, step = 1, unit = 'px', fid, cls = '' }) => `<div class="tl-field tl-rangefield${cls ? ` ${cls}` : ''}">
      <label for="${fid}">${esc(label)} <output class="tl-val" data-val="${esc(prop)}" for="${fid}">${esc(value)}${unit}</output></label>
      <input class="tl-range" type="range" id="${fid}" data-fid="${fid}" data-prop="${esc(prop)}" min="${min}" max="${max}" step="${step}" value="${esc(value)}">
    </div>`;

  /* Updates the visible value next to a slider. */
  const showVal = (root, prop, text) => root.querySelectorAll(`[data-val="${CSS.escape(prop)}"]`).forEach((o) => { o.textContent = text; });

  /* A labelled <select>: options = [value | [value, text]]; data = { name: value } → data-name attributes. */
  const select = ({ label, fid, options, current, data, cls = '' }) => `<div class="tl-field${cls ? ` ${cls}` : ''}">
      <label for="${fid}">${esc(label)}</label>
      <select class="tl-select" id="${fid}" data-fid="${fid}"${dataAttrs(data)}>${options.map((o) => {
        const [v, txt] = pair(o);
        return `<option value="${esc(v)}"${String(v) === String(current) ? ' selected' : ''}>${esc(txt)}</option>`;
      }).join('')}</select>
    </div>`;

  /* A labelled number input. */
  const num = ({ label, fid, value, min, max, step = 1, data, cls = '' }) => `<div class="tl-field${cls ? ` ${cls}` : ''}">
      <label for="${fid}">${esc(label)}</label>
      <input class="tl-input tl-num" type="number" id="${fid}" data-fid="${fid}"${dataAttrs(data)} value="${esc(value)}"${min !== undefined ? ` min="${min}"` : ''}${max !== undefined ? ` max="${max}"` : ''} step="${step}">
    </div>`;

  /* The result line of a challenge or exercise: ok with an optional "Next" button, or not yet. */
  const statusHtml = ({ ok, okText, notYet, next }) => (ok
    ? `${ICON.ok}<span>${esc(okText)}${next ? ` <button type="button" class="btn small-btn" data-action="${next.action}" data-v="${next.v}" data-fid="${next.action}-next">${esc(next.label)}</button>` : ''}</span>`
    : `<span class="muted">${esc(notYet)}</span>`);

  /* The challenge picker shared by every tool with challenges: numbered toggle buttons, solved ones
     marked. free: optional { value, label } for an extra "free play" button. */
  const challengePicker = ({ list, current, store, action, label, free }) => `<ul class="tl-challenges" aria-label="${esc(label)}">${list.map((c, k) => {
      const done = store.isSolved(c.id);
      return `<li><button type="button" data-action="${action}" data-v="${k}" data-fid="${action}-${k}" aria-pressed="${k === current}" class="${done ? 'is-done' : ''}" title="${esc(t(c.title))}">${k + 1}<span class="sr-only"> · ${esc(t(c.title))}<span data-solved>${done ? ` ${esc(t('(solved)'))}` : ''}</span></span></button></li>`;
    }).join('')}${free ? `<li><button type="button" data-action="${action}" data-v="${esc(free.value)}" data-fid="${action}-free" aria-pressed="${current === free.value}">${esc(free.label)}</button></li>` : ''}</ul>`;

  /* Marks a challenge solved (once), announces it and ticks its picker button (class and
     screen-reader text). Returns true the first time. */
  function markSolved(root, { store, id, action, index, say: text }) {
    const first = store.mark(id);
    if (text) say(root, text);
    if (first) {
      root.querySelectorAll(`[data-action="${CSS.escape(action)}"][data-v="${index}"]`).forEach((b) => {
        b.classList.add('is-done');
        const sr = b.querySelector('[data-solved]');
        if (sr) sr.textContent = ` ${t('(solved)')}`;
      });
    }
    return first;
  }

  /* ---- Delegated events: return true when a tool handled the event. ---------------- */

  function onClick(el, e) {
    const root = rootOf(el);
    const d = defOf(root);
    if (!d || !d.onClick) return false;
    d.onClick(el, root, e);
    return true;
  }
  const forward = (name) => (e) => {
    const root = rootOf(e.target);
    const d = defOf(root);
    if (!d || !d[name]) return false;
    d[name](e, root);
    return true;
  };
  function onSubmit(form) {
    const root = rootOf(form);
    const d = defOf(root);
    if (!d || !d.onSubmit) return false;
    d.onSubmit(form, root);
    return true;
  }

  return {
    register, has, def, title, intro, html, each, refresh, paint, painter, say, mountAll, setHome,
    seg, range, showVal, select, num, statusHtml, challengePicker, markSolved,
    onClick, onSubmit, onInput: forward('onInput'), onChange: forward('onChange'), onKeydown: forward('onKeydown'),
  };
})();

/* The "Tools" hub of a concept section: one practice page per tool, full size.
   Routes: <base>/practice (first tool) and <base>/practice/<toolId>. */
function toolPractice(base, ids) {
  if (!ids.length) return null;
  const label = 'Tools';
  ids.forEach((id) => Tools.setHome(id, `${base}/practice/${id}`));
  const pick = (rest) => {
    const id = (rest || '').split('/')[1];
    return ids.includes(id) ? id : ids[0];
  };
  return {
    label,
    match: (r) => r === 'practice' || /^practice\/[\w-]+$/.test(r),
    links: (rest) => ids.map((id) => ({ href: `${base}/practice/${id}`, label: Tools.title(id), current: rest !== null && pick(rest) === id })),
    render(rest) {
      const id = pick(rest);
      $('#practice-slot').innerHTML = `
        <header class="practice-head">
          <p class="concept-count">${esc(t(label))}</p>
          <h2 id="practice-h" tabindex="-1">${esc(Tools.title(id))}</h2>
          ${Tools.intro(id) ? `<p class="summary">${md(Tools.intro(id))}</p>` : ''}
        </header>
        ${Tools.html(id, { full: true, labelledBy: 'practice-h' })}`;
      return Tools.title(id);
    },
  };
}
