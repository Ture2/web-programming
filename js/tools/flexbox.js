'use strict';

/* ==========================================================================
   Flexbox playground ('flexbox'). Container properties, items (+ / −) and
   per-item properties; the preview is a real flex container in the page, with
   the main and cross axes drawn over it, the generated CSS and a plain-English
   explanation of every current value. Challenge mode: reproduce a target
   layout; solved when every item matches the target's position and size
   (LayoutKit.challengeChecker). Solved ids: challengeStore 'flex-challenges-v1'.
   Actions: fx-*.
   ========================================================================== */

(() => {
  const C_DEF = { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'flex-start', alignItems: 'stretch', alignContent: 'normal', gap: 8 };
  const I_DEF = { flexGrow: 0, flexShrink: 1, flexBasis: 'auto', order: 0, alignSelf: 'auto' };
  const MAX_ITEMS = 10;

  const VALUES = {
    flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
    flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
    justifyContent: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
    alignItems: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
    alignContent: ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'stretch'],
    alignSelf: ['auto', 'stretch', 'flex-start', 'center', 'flex-end'],
    flexBasis: ['auto', '0', '60px', '120px', '30%', '50%'],
  };

  const EXPLAIN = {
    flexDirection: {
      row: 'The **main axis** runs left → right, so items sit side by side. The cross axis runs top → bottom.',
      'row-reverse': 'Main axis right → left: item 1 starts at the right. Only the visual order changes, not the HTML (screen readers and Tab still follow the HTML).',
      column: 'The **main axis** runs top → bottom, so items stack. Now `justify-content` works vertically and `align-items` horizontally.',
      'column-reverse': 'Main axis bottom → top: item 1 sits at the bottom. Only the visual order changes.',
    },
    flexWrap: {
      nowrap: 'All items stay on **one line**; if they do not fit they shrink (`flex-shrink`) and may overflow.',
      wrap: 'Items that do not fit move to a **new line** below (a new column with `column`).',
      'wrap-reverse': 'Like wrap, but new lines go **above** (cross axis reversed).',
    },
    justifyContent: {
      'flex-start': 'Items pack at the **start of the main axis**; free space stays at the end.',
      center: 'Items pack in the **middle of the main axis**, with equal free space on both sides.',
      'flex-end': 'Items pack at the **end of the main axis**.',
      'space-between': 'First item at the start, last at the end, the free space **between** items is equal. No space at the edges.',
      'space-around': 'Every item gets equal space on **both sides**, so the gaps between items are twice the edge gaps.',
      'space-evenly': 'All gaps, including the two edges, are **exactly equal**.',
    },
    alignItems: {
      stretch: 'Items **stretch** to fill the line on the cross axis (only when they have no fixed cross size). This is the default.',
      'flex-start': 'Items align to the **start of the cross axis** and keep their own size.',
      center: 'Items are **centred on the cross axis** — the classic way to centre vertically in a row.',
      'flex-end': 'Items align to the **end of the cross axis**.',
      baseline: 'Items align so their **first lines of text** sit on the same baseline.',
    },
    alignContent: {
      normal: 'With one line this does nothing. With several (wrap) it behaves like `stretch`.',
      'flex-start': 'With several lines, the **lines** pack at the start of the cross axis.',
      center: 'With several lines, the **lines** pack in the middle of the cross axis.',
      'flex-end': 'With several lines, the **lines** pack at the end of the cross axis.',
      'space-between': 'With several lines, free space goes **between the lines**.',
      stretch: 'With several lines, the lines **grow** to share the free space.',
    },
  };

  const CHALLENGES = [
    { id: 'end', title: 'Push everything to the right', goal: 'Move all items to the **end of the main axis**, keeping them together.',
      target: { c: { justifyContent: 'flex-end' } } },
    { id: 'center', title: 'Dead centre', goal: 'Centre the items **horizontally and vertically** inside the box.',
      target: { c: { justifyContent: 'center', alignItems: 'center' } } },
    { id: 'between', title: 'Navigation bar', goal: 'First item at the left edge, last at the right edge, **equal space between** them; all vertically centred.',
      target: { c: { justifyContent: 'space-between', alignItems: 'center' } } },
    { id: 'column', title: 'Stack and centre', goal: 'Stack the items **vertically** and centre them **horizontally** (each keeps its own width).',
      target: { c: { flexDirection: 'column', alignItems: 'center' } } },
    { id: 'grow', title: 'Item 2 takes the rest', goal: 'Make **item 2 grow** to fill all the free space in the row. The others keep their size.',
      target: { i: { 1: { flexGrow: 1 } } } },
    { id: 'order', title: 'First goes last', goal: 'Show **item 1 at the end** of the row without touching the HTML.',
      target: { i: { 0: { order: 1 } } } },
    { id: 'self', title: 'One item breaks ranks', goal: 'Items are aligned to the top. Send **only item 3 to the bottom**.',
      start: { c: { alignItems: 'flex-start' } },
      target: { c: { alignItems: 'flex-start' }, i: { 2: { alignSelf: 'flex-end' } } } },
    { id: 'wrap', title: 'Let it wrap', goal: 'Each item wants 30% of the row. Let them **wrap onto new lines** instead of squeezing, with a **16px gap**.',
      count: 6, start: { all: { flexBasis: '30%' } },
      target: { c: { flexWrap: 'wrap', gap: 16 }, all: { flexBasis: '30%' } } },
    { id: 'equal', title: 'Equal columns', goal: 'Make the 3 items share the row **equally**, whatever their content. Hint: grow from a basis of zero.',
      count: 3, even: true,
      target: { all: { flexGrow: 1, flexBasis: '0' } } },
    { id: 'reverse-col', title: 'Bottom-up', goal: 'Stack the items **from the bottom up** (item 1 at the bottom), aligned to the left edge.',
      target: { c: { flexDirection: 'column-reverse', alignItems: 'flex-start' } } },
  ];

  const store = challengeStore('flex-challenges-v1');
  const check = LayoutKit.challengeChecker({ prefix: 'fx', list: CHALLENGES, store, notYet: t('Not yet: compare the two boxes and keep adjusting.') });

  /* A layout spec: { c: container, i: { index: item props }, all: props for every item, count }. */
  function build(spec = {}, count = 4) {
    const n = spec.count || count;
    const c = { ...C_DEF, ...(spec.c || {}) };
    const items = Array.from({ length: n }, (_, k) => ({ ...I_DEF, ...(spec.all || {}), ...((spec.i || {})[k] || {}) }));
    return { c, items };
  }

  const st = {
    mode: 'play',            // 'play' | 'challenge'
    ch: 0,
    sel: 0,
    ...build({}, 4),
  };

  function startChallenge(k) {
    const ch = CHALLENGES[k];
    st.ch = k;
    Object.assign(st, build(ch.start || {}, ch.count || 4), { sel: 0 });
    check.reset();
  }
  const resetPlay = () => Object.assign(st, build({}, 4), { sel: 0 });

  /* ---- Rendering ------------------------------------------------------------------- */

  const itemStyle = (it, k, even) => {
    const [v, h] = even ? [16, 16] : LayoutKit.ITEM_PAD[k % LayoutKit.ITEM_PAD.length];
    return LayoutKit.styleAttr({ padding: `${v}px ${h}px`, ...LayoutKit.changed(it, I_DEF) });
  };
  const containerStyle = (c) => LayoutKit.styleAttr({ display: 'flex', ...c, gap: `${c.gap}px` });

  function previewHtml(s, { target = false, even = false, label }) {
    const dir = s.c.flexDirection;
    return `<div class="lk-stage${target ? ' is-target' : ''}">
        <p class="lr-label">${esc(label)}</p>
        <div class="lk-box fx-box" style="${containerStyle(s.c)}" data-lk-box="${target ? 'target' : 'mine'}">
          ${s.items.map((it, k) => `<div class="lk-item c${(k % 6) + 1}${!target && k === st.sel ? ' is-sel' : ''}" data-i="${k}" style="${itemStyle(it, k, even)}"${target ? '' : ` data-action="fx-pick" data-v="${k}"`}>${k + 1}</div>`).join('')}
          ${target ? '' : `<div class="fx-axes fx-${dir}" aria-hidden="true"><span class="fx-main"><b>${esc(t('main axis'))}</b></span><span class="fx-cross"><b>${esc(t('cross axis'))}</b></span></div>`}
        </div>
      </div>`;
  }

  function cssText() {
    const c = LayoutKit.changed(st.c, C_DEF);
    if ('gap' in c) c.gap = `${c.gap}px`;
    const parts = [LayoutKit.cssBlock('.container', { display: 'flex', ...c })];
    st.items.forEach((it, k) => {
      const ch = LayoutKit.changed(it, I_DEF);
      if (Object.keys(ch).length) parts.push(LayoutKit.cssBlock(`.item:nth-child(${k + 1})`, ch));
    });
    return parts.join('\n\n');
  }

  function explainHtml() {
    const it = st.items[st.sel];
    const rows = ['flexDirection', 'flexWrap', 'justifyContent', 'alignItems']
      .concat(st.c.flexWrap !== 'nowrap' ? ['alignContent'] : [])
      .map((p) => `<li><code>${LayoutKit.kebab(p)}: ${esc(st.c[p])}</code> — ${md(t(EXPLAIN[p][st.c[p]]))}</li>`);
    if (it) {
      const g = +it.flexGrow;
      const sh = +it.flexShrink;
      rows.push(`<li><code>${esc(t('item {n}', { n: st.sel + 1 }))}: flex: ${g} ${sh} ${esc(it.flexBasis)}</code> — ${md(t('starts at **{b}** (flex-basis), then {grow} and {shrink}.', {
        b: it.flexBasis === 'auto' ? t('its content size') : it.flexBasis,
        grow: g ? t('takes **{g} share(s)** of the free space', { g }) : t('**does not grow** into free space'),
        shrink: sh ? t('may shrink when space runs out') : t('**never shrinks** below its basis'),
      }))}</li>`);
    }
    return `<ul class="tl-explain lk-explain">${rows.join('')}</ul>`;
  }

  /* The repainted parts: the student's preview, the explanation and the generated CSS. */
  const PARTS = {
    mine: () => previewHtml(st, { label: st.mode === 'challenge' ? t('Your layout') : t('Preview (click an item to select it)') }),
    explain: explainHtml,
    css: () => LayoutKit.code(cssText()),
  };
  const targetHtml = () => {
    const ch = CHALLENGES[st.ch];
    return previewHtml(build(ch.target, ch.count || 4), { target: true, even: ch.even, label: t('Target') });
  };

  function controlsHtml() {
    const it = st.items[st.sel] || I_DEF;
    const segs = [
      ['flexDirection', 'flex-direction'], ['flexWrap', 'flex-wrap'], ['justifyContent', 'justify-content'],
      ['alignItems', 'align-items'],
    ];
    if (st.c.flexWrap !== 'nowrap') segs.push(['alignContent', 'align-content']);
    return `
      ${LayoutKit.challengeHeader({ prefix: 'fx', mode: st.mode, list: CHALLENGES, index: st.ch, store, label: t('Flexbox challenges') })}
      <fieldset class="lk-group">
        <legend>${esc(t('Container'))} <code>.container</code></legend>
        <div class="tl-row">${segs.map(([p, css]) => Tools.seg({ label: css, action: 'fx-c', prop: p, values: VALUES[p], current: st.c[p], fid: `fx-${p}` })).join('')}</div>
        <div class="tl-row">
          ${Tools.range({ label: 'gap', prop: 'gap', value: st.c.gap, min: 0, max: 40, fid: 'fx-gap' })}
          ${LayoutKit.countControl({ prefix: 'fx', n: st.items.length, max: MAX_ITEMS })}
          <button type="button" class="btn ghost small-btn" data-action="fx-reset" data-fid="fx-reset">${esc(t('Reset'))}</button>
        </div>
      </fieldset>
      <fieldset class="lk-group">
        <legend>${esc(t('Item'))} <code>.item:nth-child(${st.sel + 1})</code></legend>
        <div class="tl-row">
          ${Tools.seg({ label: t('Selected item'), action: 'fx-pick', prop: 'sel', values: st.items.map((_, k) => [k, String(k + 1)]), current: st.sel, fid: 'fx-sel' })}
        </div>
        <div class="tl-row">
          ${Tools.num({ label: 'flex-grow', fid: 'fx-grow', value: it.flexGrow, min: 0, max: 10, data: { iprop: 'flexGrow' } })}
          ${Tools.num({ label: 'flex-shrink', fid: 'fx-shrink', value: it.flexShrink, min: 0, max: 10, data: { iprop: 'flexShrink' } })}
          ${Tools.num({ label: 'order', fid: 'fx-order', value: it.order, min: -5, max: 10, data: { iprop: 'order' } })}
          ${Tools.select({ label: 'flex-basis', fid: 'fx-basis', options: VALUES.flexBasis, current: it.flexBasis, data: { iprop: 'flexBasis' } })}
        </div>
        <div class="tl-row">${Tools.seg({ label: 'align-self', action: 'fx-i', prop: 'alignSelf', values: VALUES.alignSelf, current: it.alignSelf, fid: 'fx-alignSelf' })}</div>
      </fieldset>
      <div class="lk-view">${LayoutKit.view({ mode: st.mode, parts: PARTS, target: targetHtml })}</div>`;
  }

  /* ---- Updates ------------------------------------------------------------------------ */

  const afterPaint = (root) => { if (st.mode === 'challenge') check(root, st.ch); };
  const paint = Tools.painter('flexbox', PARTS, afterPaint);
  const refresh = () => Tools.refresh('flexbox');
  const shared = LayoutKit.playgroundActions({
    prefix: 'fx', st, list: CHALLENGES, maxItems: MAX_ITEMS, startChallenge, resetPlay, refresh, paint,
    newItem: () => ({ ...I_DEF, ...(st.mode === 'challenge' ? (CHALLENGES[st.ch].start || {}).all || {} : {}) }),
  });

  Tools.register('flexbox', {
    title: 'Flexbox playground',
    intro: 'Flexbox lays items out along **one axis**. Change the container and item properties and watch the items move; then try the challenges.',
    challenges: { store, label: 'Flexbox challenges', ids: () => CHALLENGES.map((c) => c.id) },
    body: controlsHtml,
    mount: afterPaint,
    resize: afterPaint,
    onClick(el, root) {
      const a = el.dataset.action;
      const v = el.dataset.v;
      if (shared.click(el, root)) return;
      if (a === 'fx-c') { st.c[el.dataset.prop] = v; refresh(); Tools.say(root, `${LayoutKit.kebab(el.dataset.prop)}: ${v}`); }
      else if (a === 'fx-i') { st.items[st.sel][el.dataset.prop] = v; refresh(); Tools.say(root, t('item {n}', { n: st.sel + 1 }) + `: align-self: ${v}`); }
    },
    onInput(e, root) {
      const el = e.target;
      if (shared.input(el, root)) return;
      if (el.dataset.iprop && el.type === 'number') {
        if (el.value === '' || Number.isNaN(+el.value)) return;
        st.items[st.sel][el.dataset.iprop] = +el.value;
        paint();
      }
    },
    onChange(e) {
      const el = e.target;
      if (el.dataset.iprop === 'flexBasis') { st.items[st.sel].flexBasis = el.value; paint(); }
    },
  });
})();
