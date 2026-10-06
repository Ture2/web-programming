'use strict';

/* ==========================================================================
   Box model ('box-model'). Sliders for width, height, padding, border and
   margin plus box-sizing. Shows a DevTools-style diagram (margin › border ›
   padding › content, with numbers), the element drawn at real size, and the
   arithmetic of the rendered size for the current box-sizing. A second part
   demonstrates vertical margin collapsing. Actions: bm-*.
   ========================================================================== */

(() => {
  const DEF = { width: 200, height: 80, padding: 16, border: 4, margin: 24, sizing: 'content-box', mTop: 30, mBottom: 20, collapseIn: 'block' };
  const st = { ...DEF };

  const SLIDERS = [
    ['width', 'width', 40, 360],
    ['height', 'height', 20, 200],
    ['padding', 'padding', 0, 60],
    ['border', 'border-width', 0, 30],
    ['margin', 'margin', 0, 60],
  ];

  function sizes() {
    const extra = 2 * st.padding + 2 * st.border;
    if (st.sizing === 'border-box') {
      const w = Math.max(st.width, extra);
      const h = Math.max(st.height, extra);
      return { boxW: w, boxH: h, contentW: w - extra, contentH: h - extra, clampedW: st.width < extra, clampedH: st.height < extra };
    }
    return { boxW: st.width + extra, boxH: st.height + extra, contentW: st.width, contentH: st.height };
  }

  /* DevTools-like nested boxes; numbers on the four sides of each layer. */
  function diagram(z) {
    const side = (v) => `<span class="bm-t">${v}</span><span class="bm-r">${v}</span><span class="bm-b">${v}</span><span class="bm-l">${v}</span>`;
    return `<div class="bm-diagram" role="img" aria-label="${esc(t('Box model: margin {m}, border {b}, padding {p}, content {w} × {h}', { m: st.margin, b: st.border, p: st.padding, w: z.contentW, h: z.contentH }))}">
        <div class="bm-layer bm-margin"><span class="bm-name">margin</span>${side(st.margin)}
          <div class="bm-layer bm-border"><span class="bm-name">border</span>${side(st.border)}
            <div class="bm-layer bm-padding"><span class="bm-name">padding</span>${side(st.padding)}
              <div class="bm-content">${z.contentW} × ${z.contentH}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function formula(z) {
    if (st.sizing === 'border-box') {
      return `<p class="tl-out bm-formula">${esc(t('box-sizing: border-box → width IS the border box'))}
${esc(t('rendered width  = {w}px', { w: z.boxW }))}${z.clampedW ? `  ${esc(t('(cannot be less than padding + border = {e}px)', { e: 2 * st.padding + 2 * st.border }))}` : ''}
${esc(t('rendered height = {h}px', { h: z.boxH }))}${z.clampedH ? `  ${esc(t('(cannot be less than padding + border = {e}px)', { e: 2 * st.padding + 2 * st.border }))}` : ''}
${esc(t('content width   = {w} − 2×{p} − 2×{b} = {c}px', { w: z.boxW, p: st.padding, b: st.border, c: z.contentW }))}
${esc(t('content height  = {h} − 2×{p} − 2×{b} = {c}px', { h: z.boxH, p: st.padding, b: st.border, c: z.contentH }))}
${esc(t('space taken     = {w} + 2×{m} margin = {s}px', { w: z.boxW, m: st.margin, s: z.boxW + 2 * st.margin }))}</p>
        <p class="tl-explain">${md(t('With **border-box**, the `width` you write is the visible size: padding and border are carved **inside** it. That is why most projects start with `*, *::before, *::after { box-sizing: border-box; }`.'))}</p>`;
    }
    return `<p class="tl-out bm-formula">${esc(t('box-sizing: content-box (default) → width is the CONTENT only'))}
${esc(t('rendered width  = {w} + 2×{p} padding + 2×{b} border = {r}px', { w: st.width, p: st.padding, b: st.border, r: z.boxW }))}
${esc(t('rendered height = {h} + 2×{p} + 2×{b} = {r}px', { h: st.height, p: st.padding, b: st.border, r: z.boxH }))}
${esc(t('space taken     = {r} + 2×{m} margin = {s}px', { r: z.boxW, m: st.margin, s: z.boxW + 2 * st.margin }))}</p>
      <p class="tl-explain">${md(t('With **content-box** (the default), padding and border are **added** to `width`: a `width: 200px` box with 16px padding and a 4px border is really **240px** wide. Margin is never part of the box; it is the space **outside** it.'))}</p>`;
  }

  function preview() {
    const style = LayoutKit.styleAttr({
      boxSizing: st.sizing, width: `${st.width}px`, height: `${st.height}px`, padding: `${st.padding}px`,
      border: `${st.border}px solid #1a1f6c`, margin: `${st.margin}px`,
    });
    return `<div class="bm-stage" aria-hidden="true"><div class="bm-mz"><div class="bm-el" style="${style}"><span>${esc(t('content'))}</span></div></div></div>`;
  }

  function collapseDemo() {
    const block = st.collapseIn === 'block';
    const gap = block ? Math.max(st.mTop, st.mBottom) : st.mTop + st.mBottom;
    return `<div class="bm-collapse">
        <div class="bm-cstage${block ? '' : ' is-flex'}" aria-hidden="true">
          <div class="bm-cbox" style="margin-bottom:${st.mBottom}px">${esc(t('A'))} · margin-bottom: ${st.mBottom}px</div>
          <div class="bm-cbox b2" style="margin-top:${st.mTop}px">${esc(t('B'))} · margin-top: ${st.mTop}px</div>
        </div>
        <p class="tl-explain">${block
          ? md(t('Gap between A and B = **{g}px**, not {s}px: vertical margins of blocks that touch **collapse** into the larger one, max({b}, {tp}).', { g: gap, s: st.mBottom + st.mTop, b: st.mBottom, tp: st.mTop }))
          : md(t('Inside a **flex** (or grid) container margins never collapse: the gap is {b} + {tp} = **{g}px**.', { g: gap, b: st.mBottom, tp: st.mTop }))}</p>
      </div>`;
  }

  function out() {
    const z = sizes();
    return `<div class="tl-cols bm-cols">${diagram(z)}${preview()}</div>${formula(z)}`;
  }

  function body() {
    return `
      <div class="tl-row">
        ${Tools.seg({ label: 'box-sizing', action: 'bm-sizing', prop: 'sizing', values: ['content-box', 'border-box'], current: st.sizing, fid: 'bm-sizing' })}
        <button type="button" class="btn ghost small-btn" data-action="bm-reset" data-fid="bm-reset">${esc(t('Reset'))}</button>
      </div>
      <div class="bm-sliders">${SLIDERS.map(([p, label, min, max]) => Tools.range({ label, prop: p, value: st[p], min, max, fid: `bm-${p}` })).join('')}</div>
      <div data-part="out">${out()}</div>
      <details class="bm-more" data-fid="bm-more">
        <summary>${esc(t('Margin collapsing: why 30px + 20px can be 30px'))}</summary>
        <div class="tl-row">
          ${Tools.range({ label: 'A margin-bottom', prop: 'mBottom', value: st.mBottom, min: 0, max: 60, fid: 'bm-mb' })}
          ${Tools.range({ label: 'B margin-top', prop: 'mTop', value: st.mTop, min: 0, max: 60, fid: 'bm-mt' })}
          ${Tools.seg({ label: t('Parent'), action: 'bm-cin', prop: 'collapseIn', values: [['block', 'display: block'], ['flex', 'display: flex (column)']], current: st.collapseIn, fid: 'bm-cin' })}
        </div>
        <div data-part="collapse">${collapseDemo()}</div>
      </details>`;
  }

  /* Sliders repaint the diagram and the collapse demo at most once per frame. */
  const paint = Tools.painter('box-model', { out, collapse: collapseDemo });

  Tools.register('box-model', {
    title: 'Box model',
    intro: 'Every element is a box made of **content**, **padding**, **border** and **margin**. Move the sliders and switch `box-sizing` to see what `width` really measures.',
    body,
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'bm-sizing') st.sizing = el.dataset.v;
      else if (a === 'bm-cin') st.collapseIn = el.dataset.v;
      else if (a === 'bm-reset') Object.assign(st, DEF);
      else return;
      Tools.refresh('box-model');                 // keeps the collapse <details> open or closed
      const z = sizes();
      Tools.say(root, t('Rendered box {w} × {h} px', { w: z.boxW, h: z.boxH }));
    },
    onInput(e, root) {
      const el = e.target;
      const p = el.dataset.prop;
      if (!p || !(p in st)) return;
      st[p] = +el.value;
      Tools.showVal(root, p, `${el.value}px`);
      paint();
    },
  });
})();
