'use strict';

/* ==========================================================================
   Responsive preview ('responsive'). An editable page (HTML + CSS with media
   queries) shown in a sandboxed iframe whose width is the "viewport" width
   (320–1440 px, presets for phone / tablet / laptop). Wider frames are scaled
   down to fit, so the media queries still see the real width. A ruler shows
   every breakpoint found in the CSS and which @media rules are active at the
   current width (computed here: min-width / max-width / width ranges, px or
   em/rem at 16px). Actions: rs-*.
   ========================================================================== */

(() => {
  const MIN = 320;
  const MAX = 1440;
  const FRAME_H = 440;

  const HTML = `<header class="top">
  <h1>Café Sol</h1>
  <nav><a href="#">Menu</a> <a href="#">Visit</a> <a href="#">Contact</a></nav>
</header>
<main class="cards">
  <article class="card">Espresso</article>
  <article class="card">Flat white</article>
  <article class="card">Cold brew</article>
  <article class="card">Chai latte</article>
  <article class="card">Croissant</article>
  <article class="card">Banana bread</article>
</main>`;

  const CSS_SRC = `/* Mobile first: the base styles are for small screens. */
body { margin: 0; font-family: Arial, sans-serif; }
.top { padding: 12px 16px; background: #1a1f6c; color: #fff; }
.top h1 { margin: 0 0 6px; font-size: 22px; }
.top a { color: #fff; margin-right: 12px; }
.cards {
  display: grid;
  grid-template-columns: 1fr;   /* one column */
  gap: 12px;
  padding: 16px;
}
.card { padding: 28px 12px; background: #f0ece8; border-left: 4px solid #ff5700; }

/* Tablet and up: two columns. */
@media (min-width: 600px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
}

/* Laptop and up: three columns, header on one line. */
@media (min-width: 960px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .top h1 { margin: 0; }
}`;

  const PRESETS = [['phone', 375], ['tablet', 768], ['laptop', 1280]];
  const st = { html: HTML, css: CSS_SRC, width: 375 };

  /* ---- Media queries -------------------------------------------------------------- */

  const toPx = (n, unit) => (unit === 'px' || !unit ? n : n * 16);

  /* One condition list ("(min-width: 600px) and (max-width: 900px)") → test(width). */
  function parseCondition(text) {
    const tests = [];
    const points = [];
    const re = /\(\s*(min|max)-width\s*:\s*([\d.]+)\s*(px|em|rem)?\s*\)|\(\s*width\s*(>=|<=|>|<)\s*([\d.]+)\s*(px|em|rem)?\s*\)|\(\s*([\d.]+)\s*(px|em|rem)?\s*(<=|<)\s*width\s*(<=|<)\s*([\d.]+)\s*(px|em|rem)?\s*\)/gi;
    let m;
    while ((m = re.exec(text))) {
      if (m[1]) {
        const v = toPx(+m[2], m[3]);
        points.push(v);
        tests.push(m[1].toLowerCase() === 'min' ? (w) => w >= v : (w) => w <= v);
      } else if (m[4]) {
        const v = toPx(+m[5], m[6]);
        points.push(v);
        const op = m[4];
        tests.push((w) => (op === '>=' ? w >= v : op === '<=' ? w <= v : op === '>' ? w > v : w < v));
      } else {
        const a = toPx(+m[7], m[8]);
        const b = toPx(+m[11], m[12]);
        points.push(a, b);
        const [o1, o2] = [m[9], m[10]];
        tests.push((w) => (o1 === '<=' ? a <= w : a < w) && (o2 === '<=' ? w <= b : w < b));
      }
    }
    const not = /^\s*not\b/i.test(text);
    const printOnly = /\bprint\b/i.test(text) && !/\b(screen|all)\b/i.test(text);
    return { points, test: (w) => !printOnly && (not ? !tests.every((f) => f(w)) : tests.every((f) => f(w))), widthBased: tests.length > 0 };
  }

  /* Every @media prelude in the CSS: { text, points, active(width) }; a comma means "or".
     Parsed once per CSS text (the width slider only re-tests). */
  let parsed = { css: null, list: [] };
  const queries = () => (parsed.css === st.css ? parsed.list : (parsed = { css: st.css, list: mediaQueries(st.css) }).list);
  function mediaQueries(css) {
    const out = [];
    const re = /@media([^{]+)\{/gi;
    let m;
    while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, '')))) {
      const text = m[1].trim();
      const alts = text.split(',').map(parseCondition);
      out.push({ text, points: alts.flatMap((a) => a.points), active: (w) => alts.some((a) => a.test(w)), widthBased: alts.some((a) => a.widthBased) });
    }
    return out;
  }

  /* ---- Rendering ---------------------------------------------------------------------- */

  const pos = (w) => `${(((Math.min(MAX, Math.max(MIN, w)) - MIN) / (MAX - MIN)) * 100).toFixed(2)}%`;

  function rulerHtml() {
    const mq = queries();
    const points = [...new Set(mq.flatMap((q) => q.points))].sort((a, b) => a - b);
    return `<div class="rs-ruler" aria-hidden="true">
        <div class="rs-track">
          ${points.map((p) => `<span class="rs-bp" style="left:${pos(p)}"><b>${p}px</b></span>`).join('')}
          <span class="rs-now" style="left:${pos(st.width)}"><b>${st.width}px</b></span>
        </div>
        <div class="rs-scale"><span>${MIN}</span><span>${MAX}px</span></div>
      </div>
      ${mq.length ? `<ul class="rs-queries">${mq.map((q) => {
        const on = q.active(st.width);
        return `<li class="${on ? 'is-on' : ''}"><span class="rs-flag" data-on="${esc(t('active'))}" data-off="${esc(t('inactive'))}">${esc(on ? t('active') : t('inactive'))}</span><code>@media ${esc(q.text)}</code>${q.widthBased ? '' : ` <span class="muted small">${esc(t('(not width-based)'))}</span>`}</li>`;
      }).join('')}</ul>` : `<p class="muted">${esc(t('No @media rules in the CSS yet.'))}</p>`}`;
  }

  function body() {
    return `
      <div class="tl-row rs-controls">
        ${Tools.range({ label: t('Viewport width'), prop: 'width', value: st.width, min: MIN, max: MAX, fid: 'rs-w', cls: 'rs-width' })}
        ${Tools.seg({ label: t('Devices'), action: 'rs-preset', prop: 'width', values: PRESETS.map(([k, w]) => [w, `${t(k[0].toUpperCase() + k.slice(1))} ${w}`]), current: st.width, fid: 'rs-pre', mono: false })}
      </div>
      <div data-part="ruler">${rulerHtml()}</div>
      <div class="rs-viewport" data-rs-viewport>
        <div class="rs-scaler" data-rs-scaler>
          <iframe class="rs-frame" sandbox="allow-scripts" title="${esc(t('Your page at {w}px wide', { w: st.width }))}" data-rs-frame width="${st.width}" height="${FRAME_H}"></iframe>
        </div>
      </div>
      <p class="muted small" data-rs-scale></p>
      <div class="tl-cols rs-editors">
        <div class="tl-field"><label for="rs-css">CSS</label><textarea class="tl-code" id="rs-css" data-fid="rs-css" data-rs="css" rows="18" spellcheck="false">${esc(st.css)}</textarea></div>
        <div class="tl-field"><label for="rs-html">HTML</label><textarea class="tl-code" id="rs-html" data-fid="rs-html" data-rs="html" rows="18" spellcheck="false">${esc(st.html)}</textarea></div>
      </div>
      <p class="lr-actions"><button type="button" class="btn ghost small-btn" data-action="rs-reset" data-fid="rs-reset">${esc(t('Reset the code'))}</button></p>
      <div class="tl-explain rs-explain">
        <p>${md(t('**Mobile first** (this example): write the base CSS for small screens, then add `@media (min-width: …)` rules that switch on as the screen gets **wider**. Each breakpoint only adds what changes.'))}</p>
        <p>${md(t('**Desktop first**: write the CSS for large screens, then undo it with `@media (max-width: …)` rules as the screen gets **narrower**. It works, but phones download and override the desktop layout.'))}</p>
        <p>${md(t('Media queries test the **viewport** (the visible page area), not the device. Without `<meta name="viewport" content="width=device-width, initial-scale=1">` in the `<head>`, phones pretend to be about 980px wide and your breakpoints never fire.'))}</p>
      </div>`;
  }

  /* The space available for the frame: measured on mount and after a window resize only, so
     dragging the width slider never forces a layout read. */
  let avail = 0;
  const measure = (root) => { const vp = root.querySelector('[data-rs-viewport]'); avail = vp ? vp.clientWidth : 0; };

  /* Width of the iframe, and a scale-down when it is wider than the space available. */
  function layout(root) {
    const vp = root.querySelector('[data-rs-viewport]');
    const scaler = root.querySelector('[data-rs-scaler]');
    const frame = root.querySelector('[data-rs-frame]');
    if (!vp || !frame) return;
    const scale = Math.min(1, (avail || st.width) / st.width);
    frame.width = String(st.width);
    frame.style.width = `${st.width}px`;
    frame.title = t('Your page at {w}px wide', { w: st.width });
    scaler.style.transform = scale < 1 ? `scale(${scale})` : '';
    scaler.style.width = `${st.width}px`;
    vp.style.height = `${Math.ceil(FRAME_H * scale) + 2}px`;
    const note = root.querySelector('[data-rs-scale]');
    if (note) note.textContent = scale < 1 ? t('The page is {w}px wide, shown here at {p}% so it fits.', { w: st.width, p: Math.round(scale * 100) }) : t('Shown at real size: {w}px.', { w: st.width });
  }

  function loadFrame(root) {
    const frame = root.querySelector('[data-rs-frame]');
    if (frame) frame.srcdoc = Sandbox.page({ html: st.html, css: st.css, baseCss: false });
  }

  function mount(root) {
    measure(root);
    layout(root);
    loadFrame(root);
  }

  /* A new width only moves the marker and re-tests the parsed queries (at most once per frame);
     nothing is re-rendered. */
  let frameReq = 0;
  function setWidth(root, w, speak = false) {
    st.width = Math.max(MIN, Math.min(MAX, Math.round(w)));
    if (!frameReq) frameReq = requestAnimationFrame(() => { frameReq = 0; Tools.each('responsive', showWidth); });
    if (speak) Tools.say(root, t('{w}px wide: {n} media queries active', { w: st.width, n: queries().filter((q) => q.active(st.width)).length }));
  }
  function showWidth(r) {
    const mq = queries();
    Tools.showVal(r, 'width', `${st.width}px`);
    const range = r.querySelector('#rs-w');
    if (range && +range.value !== st.width) range.value = st.width;
    r.querySelectorAll('[data-action="rs-preset"]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === st.width)));
    const now = r.querySelector('.rs-now');
    if (now) { now.style.left = pos(st.width); now.firstElementChild.textContent = `${st.width}px`; }
    r.querySelectorAll('.rs-queries li').forEach((li, k) => {
      const on = !!mq[k] && mq[k].active(st.width);
      li.classList.toggle('is-on', on);
      const flag = li.querySelector('.rs-flag');
      flag.textContent = on ? flag.dataset.on : flag.dataset.off;
    });
    layout(r);
  }

  /* Edits: the ruler (new breakpoints) and the page are redrawn once typing pauses. */
  const reloadSoon = debounce(() => Tools.each('responsive', (r) => {
    Tools.paint(r, { ruler: rulerHtml });
    loadFrame(r);
  }), 400);

  Tools.register('responsive', {
    title: 'Responsive preview',
    intro: 'Resize the viewport and watch **media queries** switch on and off. Edit the CSS to add your own breakpoints.',
    body,
    mount,
    resize(root) { measure(root); layout(root); },
    onClick(el, root) {
      if (el.dataset.action === 'rs-preset') setWidth(root, +el.dataset.v, true);
      else if (el.dataset.action === 'rs-reset') {
        st.html = HTML;
        st.css = CSS_SRC;
        Tools.refresh('responsive');
        Tools.say(root, t('Code reset'));
      }
    },
    onInput(e, root) {
      const el = e.target;
      if (el.dataset.prop === 'width') { setWidth(root, +el.value); return; }
      if (!el.dataset.rs) return;
      st[el.dataset.rs] = el.value;
      reloadSoon();
    },
  });
})();
