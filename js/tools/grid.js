'use strict';

/* ==========================================================================
   Grid playground ('grid'). Column and row tracks (validated with
   CSS.supports), gap, item alignment, item count, per-item placement
   (grid-column / grid-row / grid-area) and an optional grid-template-areas
   mode. Numbered grid lines are drawn over the preview from the browser's
   resolved track sizes (getComputedStyle). Challenge mode: reproduce a target
   layout, checked by comparing item rectangles (LayoutKit.challengeChecker).
   Solved ids: challengeStore 'grid-challenges-v1'. Actions: gr-*.
   ========================================================================== */

(() => {
  const C_DEF = { cols: '1fr 1fr 1fr', rows: 'auto', gap: 8, justifyItems: 'stretch', alignItems: 'stretch', areas: '' };
  const I_DEF = { col: '', row: '', area: '' };
  const MAX_ITEMS = 12;
  const DEFAULT_AREAS = '"header header"\n"sidebar main"\n"footer footer"';

  const COL_PRESETS = ['1fr 1fr 1fr', 'repeat(4, 1fr)', '200px 1fr', '1fr 2fr', 'repeat(auto-fit, minmax(120px, 1fr))', '100px auto 100px'];
  const ROW_PRESETS = ['auto', '80px 80px', '60px 1fr 60px', 'repeat(3, 70px)'];
  const ALIGN = ['stretch', 'start', 'center', 'end'];

  const EXPLAIN = {
    fr: '**fr** = a fraction of the free space: `1fr 2fr` gives the second column twice the share of the first, after fixed tracks and gaps are subtracted.',
    repeat: '**repeat(n, size)** writes the same track n times: `repeat(3, 1fr)` = `1fr 1fr 1fr`.',
    minmax: '**minmax(min, max)** lets a track grow between two sizes. With **auto-fit**, the browser creates as many columns as fit — a responsive grid with no media query.',
    auto: '**auto** sizes the track to its content (and lets it stretch to fill the free space).',
    px: 'Fixed tracks (**px**) never change size; the other tracks share what is left.',
    lines: 'Numbers on the edges are **grid lines**, not cells: 3 columns have 4 lines. `grid-column: 1 / 3` means "from line 1 to line 3" (2 columns); `1 / -1` means "to the last line"; `span 2` means "2 tracks from wherever you start".',
    justifyItems: { stretch: 'Items fill their cell horizontally (default).', start: 'Items sit at the left of their cell, at their own width.', center: 'Items are centred horizontally in their cell.', end: 'Items sit at the right of their cell.' },
    alignItems: { stretch: 'Items fill their cell vertically (default).', start: 'Items sit at the top of their cell.', center: 'Items are centred vertically in their cell.', end: 'Items sit at the bottom of their cell.' },
  };

  const CHALLENGES = [
    { id: 'three', title: 'Three equal columns', goal: 'Lay the 6 items out in **3 equal columns**.',
      count: 6, start: { c: { cols: '1fr' } }, target: { c: { cols: 'repeat(3, 1fr)' } } },
    { id: 'sidebar', title: 'Fixed sidebar', goal: 'A **150px** first column and a second column that takes **all the rest**.',
      count: 4, start: { c: { cols: '1fr' } }, target: { c: { cols: '150px 1fr' } } },
    { id: 'ratio', title: 'Two to one', goal: 'Two columns where the **first is twice as wide** as the second.',
      count: 4, start: { c: { cols: '1fr' } }, target: { c: { cols: '2fr 1fr' } } },
    { id: 'span-col', title: 'A wide item', goal: 'Make **item 1 span two columns**. Leave the rest to auto-placement.',
      count: 5, target: { i: { 0: { col: 'span 2' } } } },
    { id: 'full', title: 'Full-width banner', goal: 'Make **item 1 run across the whole row**, from the first line to the last.',
      count: 7, target: { i: { 0: { col: '1 / -1' } } } },
    { id: 'tall', title: 'A tall item', goal: 'Make **item 2 two rows tall** (rows are 70px).',
      count: 6, start: { c: { rows: 'repeat(3, 70px)' } }, target: { c: { rows: 'repeat(3, 70px)' }, i: { 1: { row: 'span 2' } } } },
    { id: 'gap', title: 'Breathing room', goal: 'Use a **24px gap** between all cells.',
      count: 6, target: { c: { gap: 24 } } },
    { id: 'center', title: 'Centred in their cells', goal: 'Rows are 80px tall. Centre every item **horizontally and vertically inside its cell**.',
      count: 6, start: { c: { rows: '80px 80px' } }, target: { c: { rows: '80px 80px', justifyItems: 'center', alignItems: 'center' } } },
    { id: 'areas', title: 'Page layout with areas', goal: 'With grid-template-areas, make the **sidebar run down to the bottom**, next to the footer.',
      count: 4, start: { c: { cols: '120px 1fr', rows: '50px 100px 50px', areas: DEFAULT_AREAS }, i: { 0: { area: 'header' }, 1: { area: 'sidebar' }, 2: { area: 'main' }, 3: { area: 'footer' } } },
      target: { c: { cols: '120px 1fr', rows: '50px 100px 50px', areas: '"header header"\n"sidebar main"\n"sidebar footer"' }, i: { 0: { area: 'header' }, 1: { area: 'sidebar' }, 2: { area: 'main' }, 3: { area: 'footer' } } } },
  ];

  const store = challengeStore('grid-challenges-v1');
  const check = LayoutKit.challengeChecker({ prefix: 'gr', list: CHALLENGES, store, notYet: t('Not yet: compare the two grids and keep adjusting.') });

  function build(spec = {}, count = 6) {
    const n = spec.count || count;
    return {
      c: { ...C_DEF, ...(spec.c || {}) },
      items: Array.from({ length: n }, (_, k) => ({ ...I_DEF, ...((spec.i || {})[k] || {}) })),
    };
  }

  const st = { mode: 'play', ch: 0, sel: 0, areasMode: false, err: {}, ...build({}, 6) };

  function startChallenge(k) {
    const ch = CHALLENGES[k];
    st.ch = k;
    Object.assign(st, build(ch.start || {}, ch.count || 6));
    st.areasMode = !!st.c.areas;
    st.sel = 0;
    st.err = {};
    check.reset();
  }
  function resetPlay() {
    Object.assign(st, build({}, 6), { sel: 0, areasMode: false, err: {} });
  }

  /* Area names used in a grid-template-areas value. */
  const areaNames = (areas) => [...new Set((areas.match(/"[^"]*"/g) || []).join(' ').replace(/"/g, ' ').split(/\s+/).filter((n) => n && !/^\.+$/.test(n)))];

  /* ---- Rendering -------------------------------------------------------------------- */

  const containerCss = (c) => ({
    display: 'grid',
    gridTemplateColumns: c.cols,
    gridTemplateRows: c.rows,
    gridTemplateAreas: c.areas ? c.areas.replace(/\s*\n\s*/g, ' ') : '',
    gap: `${c.gap}px`,
    justifyItems: c.justifyItems,
    alignItems: c.alignItems,
  });
  const itemCss = (it) => ({ gridColumn: it.col, gridRow: it.row, gridArea: it.area });

  function previewHtml(s, { target = false, label }) {
    return `<div class="lk-stage gr-stage${target ? ' is-target' : ''}">
        <p class="lr-label">${esc(label)}</p>
        <div class="gr-wrap">
          <div class="lk-box gr-box" style="${LayoutKit.styleAttr(containerCss(s.c))}" data-lk-box="${target ? 'target' : 'mine'}">
            ${s.items.map((it, k) => `<div class="lk-item c${(k % 6) + 1}${!target && k === st.sel ? ' is-sel' : ''}" data-i="${k}" style="${LayoutKit.styleAttr(itemCss(it))}"${target ? '' : ` data-action="gr-pick" data-v="${k}"`}>${k + 1}${it.area ? `<small>${esc(it.area)}</small>` : ''}</div>`).join('')}
          </div>
          ${target ? '' : '<div class="gr-lines" aria-hidden="true" data-gr-lines></div>'}
        </div>
      </div>`;
  }

  function cssText() {
    const c = containerCss(st.c);
    const d = containerCss(C_DEF);
    const shown = { display: 'grid', gridTemplateColumns: c.gridTemplateColumns };
    ['gridTemplateRows', 'gridTemplateAreas', 'gap', 'justifyItems', 'alignItems'].forEach((k) => { if (c[k] !== d[k]) shown[k] = c[k]; });
    const parts = [LayoutKit.cssBlock('.container', shown)];
    st.items.forEach((it, k) => {
      const css = itemCss(it);
      if (css.gridColumn || css.gridRow || css.gridArea) parts.push(LayoutKit.cssBlock(`.item:nth-child(${k + 1})`, css));
    });
    return parts.join('\n\n');
  }

  function explainHtml() {
    const tracks = `${st.c.cols} ${st.c.rows}`;
    const rows = [md(t(EXPLAIN.lines))];
    if (/fr/.test(tracks)) rows.push(md(t(EXPLAIN.fr)));
    if (/repeat/.test(tracks)) rows.push(md(t(EXPLAIN.repeat)));
    if (/minmax|auto-fit|auto-fill/.test(tracks)) rows.push(md(t(EXPLAIN.minmax)));
    if (/\bauto\b/.test(tracks.replace(/auto-(fit|fill)/g, ''))) rows.push(md(t(EXPLAIN.auto)));
    if (/\dpx/.test(tracks)) rows.push(md(t(EXPLAIN.px)));
    rows.push(`<code>justify-items: ${esc(st.c.justifyItems)}</code> — ${esc(t(EXPLAIN.justifyItems[st.c.justifyItems]))}`);
    rows.push(`<code>align-items: ${esc(st.c.alignItems)}</code> — ${esc(t(EXPLAIN.alignItems[st.c.alignItems]))}`);
    if (st.areasMode) rows.push(md(t('**grid-template-areas** draws the layout as text: each quoted string is a row, each word a cell; repeat a name to make an area span cells (areas must be rectangles); `.` leaves a cell empty. Items join an area with `grid-area: name`.')));
    return `<ul class="tl-explain lk-explain">${rows.map((r) => `<li>${r}</li>`).join('')}</ul>`;
  }

  /* The repainted parts: the student's preview, the explanation and the generated CSS. */
  const PARTS = {
    mine: () => previewHtml(st, { label: st.mode === 'challenge' ? t('Your layout') : t('Preview (click an item to select it)') }),
    explain: explainHtml,
    css: () => LayoutKit.code(cssText()),
  };
  const targetHtml = () => {
    const ch = CHALLENGES[st.ch];
    return previewHtml(build(ch.target, ch.count || 6), { target: true, label: t('Target') });
  };

  const textField = (id, label, key, value, presets) => `<div class="tl-field gr-text">
      <label for="gr-${id}">${esc(label)}</label>
      <input class="tl-input" id="gr-${id}" data-fid="gr-${id}" data-gprop="${key}" value="${esc(value)}" spellcheck="false" autocomplete="off"${st.err[key] ? ` aria-invalid="true" aria-describedby="gr-${id}-err"` : ''}>
      ${st.err[key] ? `<span class="tl-bad gr-err" id="gr-${id}-err">${esc(st.err[key])}</span>` : ''}
      ${presets ? `<div class="gr-presets" role="group" aria-label="${esc(t('Examples for {p}', { p: label }))}">${presets.map((p) => `<button type="button" class="tl-chip" data-action="gr-preset" data-prop="${key}" data-v="${esc(p)}" data-fid="gr-pre-${key}-${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
    </div>`;

  function controlsHtml() {
    const it = st.items[st.sel] || I_DEF;
    const names = areaNames(st.c.areas || '');
    const placement = st.mode === 'play' ? Tools.seg({ label: t('Placement'), action: 'gr-areas', prop: 'areas', values: [['lines', t('Lines')], ['areas', t('Template areas')]], current: st.areasMode ? 'areas' : 'lines', fid: 'gr-amode', mono: false }) : '';
    return `
      ${LayoutKit.challengeHeader({ prefix: 'gr', mode: st.mode, list: CHALLENGES, index: st.ch, store, label: t('Grid challenges'), extra: placement })}
      <fieldset class="lk-group">
        <legend>${esc(t('Container'))} <code>.container</code></legend>
        <div class="tl-row gr-tracks">
          ${textField('cols', 'grid-template-columns', 'cols', st.c.cols, COL_PRESETS)}
          ${textField('rows', 'grid-template-rows', 'rows', st.c.rows, ROW_PRESETS)}
        </div>
        ${st.areasMode ? `<div class="tl-field gr-areas-field">
            <label for="gr-areas">grid-template-areas</label>
            <textarea class="tl-code" id="gr-areas" data-fid="gr-areas" data-gprop="areas" rows="4" spellcheck="false"${st.err.areas ? ' aria-invalid="true" aria-describedby="gr-areas-err"' : ''}>${esc(st.c.areas)}</textarea>
            ${st.err.areas ? `<span class="tl-bad gr-err" id="gr-areas-err">${esc(st.err.areas)}</span>` : ''}
          </div>` : ''}
        <div class="tl-row">
          ${Tools.range({ label: 'gap', prop: 'gap', value: st.c.gap, min: 0, max: 40, fid: 'gr-gap' })}
          ${Tools.seg({ label: 'justify-items', action: 'gr-c', prop: 'justifyItems', values: ALIGN, current: st.c.justifyItems, fid: 'gr-ji' })}
          ${Tools.seg({ label: 'align-items', action: 'gr-c', prop: 'alignItems', values: ALIGN, current: st.c.alignItems, fid: 'gr-ai' })}
        </div>
        <div class="tl-row">
          ${LayoutKit.countControl({ prefix: 'gr', n: st.items.length, max: MAX_ITEMS })}
          <button type="button" class="btn ghost small-btn" data-action="gr-reset" data-fid="gr-reset">${esc(t('Reset'))}</button>
        </div>
      </fieldset>
      <fieldset class="lk-group">
        <legend>${esc(t('Item'))} <code>.item:nth-child(${st.sel + 1})</code></legend>
        <div class="tl-row">${Tools.seg({ label: t('Selected item'), action: 'gr-pick', prop: 'sel', values: st.items.map((_, k) => [k, String(k + 1)]), current: st.sel, fid: 'gr-sel' })}</div>
        <div class="tl-row gr-tracks">
          ${st.areasMode
            ? Tools.select({ label: 'grid-area', fid: 'gr-area', options: [['', t('(auto-placed)')], ...names], current: it.area, data: { iprop: 'area' } })
            : `${textField('col', 'grid-column', 'i:col', it.col, ['span 2', '1 / 3', '2 / -1', '1 / -1'])}
               ${textField('row', 'grid-row', 'i:row', it.row, ['span 2', '1 / 3', '2'])}`}
        </div>
      </fieldset>
      <div class="lk-view">${LayoutKit.view({ mode: st.mode, parts: PARTS, target: targetHtml })}</div>`;
  }

  /* ---- Grid lines overlay and challenge check ------------------------------------------ */

  const px = (list) => list.split(/\s+/).map(parseFloat).filter((n) => !Number.isNaN(n));

  /* Reads the resolved tracks of the student's grid (no writes, so it never forces a second layout). */
  function measureLines(root) {
    const box = root.querySelector('[data-lk-box="mine"]');
    const layer = root.querySelector('[data-gr-lines]');
    if (!box || !layer) return null;
    const cs = getComputedStyle(box);
    const cols = px(cs.gridTemplateColumns);
    const rows = px(cs.gridTemplateRows);
    const gapC = parseFloat(cs.columnGap) || 0;
    const gapR = parseFloat(cs.rowGap) || 0;
    const xs = [parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)];
    cols.forEach((w, k) => xs.push(xs[k] + w + (k < cols.length - 1 ? gapC : 0)));
    const ys = [parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)];
    rows.forEach((h, k) => ys.push(ys[k] + h + (k < rows.length - 1 ? gapR : 0)));
    // A line inside a gap is drawn in the middle of the gap.
    return {
      layer,
      xs: xs.map((x, k) => (k === 0 || k === cols.length ? x : x - gapC / 2)),
      ys: ys.map((y, k) => (k === 0 || k === rows.length ? y : y - gapR / 2)),
      frame: { left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight },
    };
  }

  function drawLines(m) {
    if (!m) return;
    const { layer, xs, ys, frame } = m;
    Object.assign(layer.style, { left: `${frame.left}px`, top: `${frame.top}px`, width: `${frame.width}px`, height: `${frame.height}px` });
    layer.innerHTML = xs.map((x, k) => `<span class="gr-vl" style="left:${x}px"><b>${k + 1}</b></span>`).join('')
      + ys.map((y, k) => `<span class="gr-hl" style="top:${y}px"><b>${k + 1}</b></span>`).join('');
  }

  /* After every paint: measure the lines, check the challenge (both read), then draw the lines. */
  function afterPaint(root) {
    const lines = measureLines(root);
    if (st.mode === 'challenge') check(root, st.ch);
    drawLines(lines);
  }

  const paint = Tools.painter('grid', PARTS, afterPaint);
  const refresh = () => Tools.refresh('grid');
  const shared = LayoutKit.playgroundActions({
    prefix: 'gr', st, list: CHALLENGES, maxItems: MAX_ITEMS, startChallenge, resetPlay, refresh, paint,
    newItem: () => ({ ...I_DEF }),
  });

  /* Applies a typed value when the browser accepts it; otherwise shows why it is ignored. */
  const PROP = { cols: 'grid-template-columns', rows: 'grid-template-rows', areas: 'grid-template-areas', 'i:col': 'grid-column', 'i:row': 'grid-row' };
  function setValue(key, raw, el) {
    const v = key === 'areas' ? raw : raw.trim();
    const value = key === 'areas' ? v.replace(/\s*\n\s*/g, ' ') : v;
    const ok = v === '' ? key !== 'cols' : CSS.supports(PROP[key], value);
    const errEl = el && el.parentElement.querySelector('.gr-err');
    if (!ok) {
      st.err[key] = t('Not valid for {prop}: the preview keeps the last valid value.', { prop: PROP[key] });
      if (el) {
        el.setAttribute('aria-invalid', 'true');
        if (!errEl) el.insertAdjacentHTML('afterend', `<span class="tl-bad gr-err">${esc(st.err[key])}</span>`);
      }
      return;
    }
    delete st.err[key];
    if (el) { el.removeAttribute('aria-invalid'); if (errEl) errEl.remove(); }
    if (key.startsWith('i:')) st.items[st.sel][key.slice(2)] = v;
    else st.c[key] = v;
    paint();
  }

  Tools.register('grid', {
    title: 'Grid playground',
    intro: 'Grid lays items out in **rows and columns at the same time**. Define the tracks, place items on the numbered lines, then try the challenges.',
    challenges: { store, label: 'Grid challenges', ids: () => CHALLENGES.map((c) => c.id) },
    body: controlsHtml,
    mount: afterPaint,
    resize: afterPaint,       // fr tracks change with the window: lines and the challenge check follow
    onClick(el, root) {
      const a = el.dataset.action;
      const v = el.dataset.v;
      if (shared.click(el, root)) return;
      if (a === 'gr-c') { st.c[el.dataset.prop] = v; refresh(); Tools.say(root, `${LayoutKit.kebab(el.dataset.prop)}: ${v}`); }
      else if (a === 'gr-preset') {
        const key = el.dataset.prop;
        if (key.startsWith('i:')) st.items[st.sel][key.slice(2)] = v; else st.c[key] = v;
        delete st.err[key];
        refresh();
        Tools.say(root, `${PROP[key]}: ${v}`);
      } else if (a === 'gr-areas') {
        st.areasMode = v === 'areas';
        if (st.areasMode) {
          Object.assign(st.c, { cols: '120px 1fr', rows: 'auto', areas: DEFAULT_AREAS });
          const names = areaNames(DEFAULT_AREAS);
          st.items.forEach((it, k) => { it.col = ''; it.row = ''; it.area = names[k] || ''; });
          while (st.items.length < 4) st.items.push({ ...I_DEF, area: names[st.items.length] });
        } else {
          st.c.areas = '';
          st.items.forEach((it) => { it.area = ''; });
        }
        st.err = {};
        refresh();
      }
    },
    onInput(e, root) {
      const el = e.target;
      if (shared.input(el, root)) return;
      if (el.dataset.gprop) setValue(el.dataset.gprop, el.value, el);
    },
    onChange(e) {
      const el = e.target;
      if (el.dataset.iprop === 'area') { st.items[st.sel].area = el.value; paint(); }
    },
  });
})();
