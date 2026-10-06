'use strict';

/* ==========================================================================
   Layout helpers for the CSS tools (flexbox, grid, box model, cascade,
   responsive). Layout previews are drawn in the page itself, not in an
   iframe, so they can be measured with getBoundingClientRect: a challenge is
   solved when every item of the student's container sits where the same item
   of the target container sits (relative positions and sizes, within a
   tolerance). Previews use fixed light colours (they show student CSS).
   Generic controls (seg, range, select, num, statusHtml, markSolved, paint)
   live in Tools (js/tools/registry.js); solved ids in challengeStore (core.js).
   ========================================================================== */

const LayoutKit = (() => {
  const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

  /* { flexDirection: 'row' } → 'flex-direction: row;' (empty values are skipped). */
  const decls = (obj) => Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([k, v]) => `${kebab(k)}: ${v};`);
  const styleAttr = (obj) => esc(decls(obj).join(' '));
  const cssBlock = (selector, obj) => {
    const d = decls(obj);
    return d.length ? `${selector} {\n${d.map((x) => `  ${x}`).join('\n')}\n}` : '';
  };

  /* Only the properties whose value differs from the default. */
  const changed = (obj, defaults) => Object.fromEntries(Object.entries(obj).filter(([k, v]) => String(v) !== String(defaults[k])));

  /* Item rectangles relative to their container, in item order ([data-i]). */
  function rectsOf(container) {
    const box = container.getBoundingClientRect();
    return [...container.querySelectorAll(':scope > [data-i]')]
      .sort((a, b) => +a.dataset.i - +b.dataset.i)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
      });
  }

  const sameRects = (ra, rb, tol = 2) => ra.length > 0 && ra.length === rb.length
    && ra.every((r, k) => ['x', 'y', 'w', 'h'].every((p) => Math.abs(r[p] - rb[k][p]) <= tol));

  const code = (css) => `<pre class="tl-out lk-css" aria-label="${esc(t('Generated CSS'))}"><code>${esc(css)}</code></pre>`;

  /* Remove / count / add buttons for the number of items. Actions: <prefix>-count with data-v ±1. */
  const countControl = ({ prefix, n, max }) => `<div class="tl-field"><span id="${prefix}-n-l">${esc(t('Items'))}</span>
      <div class="tl-seg" role="group" aria-labelledby="${prefix}-n-l">
        <button type="button" data-action="${prefix}-count" data-v="-1" data-fid="${prefix}-less" aria-label="${esc(t('Remove an item'))}"${n <= 1 ? ' disabled' : ''}>−</button>
        <span class="lk-count" aria-hidden="true">${n}</span>
        <button type="button" data-action="${prefix}-count" data-v="1" data-fid="${prefix}-more" aria-label="${esc(t('Add an item'))}"${n >= max ? ' disabled' : ''}>+</button>
      </div>
    </div>`;

  /* Playground / Challenges toggle, plus (in challenge mode) the picker and the goal.
     extra: more controls for the same row. Actions: <prefix>-mode, <prefix>-ch. */
  const challengeHeader = ({ prefix, mode, list, index, store, label, extra = '' }) => `
      <div class="tl-row lk-modes">
        ${Tools.seg({ label: t('Mode'), action: `${prefix}-mode`, prop: 'mode', values: [['play', t('Playground')], ['challenge', t('Challenges')]], current: mode, fid: `${prefix}-mode`, mono: false })}
        ${extra}
      </div>
      ${mode === 'challenge' ? `<div class="lk-challenge">
          ${Tools.challengePicker({ list, current: index, store, action: `${prefix}-ch`, label })}
          <p class="tl-goal"><strong>${esc(t(list[index].title))}.</strong> ${md(t(list[index].goal))}</p>
        </div>` : ''}`;

  /* The preview area of a layout playground. parts: { mine, explain, css } → html (repainted by
     Tools.painter through data-part); target() → html of the target preview (drawn once per challenge). */
  const view = ({ mode, parts, target }) => {
    const css = `<div data-part="css">${parts.css()}</div>`;
    if (mode === 'challenge') {
      return `<div class="tl-cols lk-pair">
          <div data-part="mine">${parts.mine()}</div>
          <div>${target()}</div>
        </div>
        <p class="lk-status" data-lk-status></p>${css}`;
    }
    return `<div data-part="mine">${parts.mine()}</div><div data-part="explain">${parts.explain()}</div>${css}`;
  };

  /* A challenge checker for the layout tools: compares [data-lk-box="mine"] with [data-lk-box="target"].
     Reads all geometry first, then writes the status (one layout per check). The target's rectangles
     are kept until the challenge or the target's width changes.
     cfg: { prefix, list, store, notYet }; returns check(root, index), with check.reset(). */
  function challengeChecker({ prefix, list, store, notYet }) {
    let solvedNow = false;
    let cached = { key: '', rects: [] };
    function check(root, index) {
      const mine = root.querySelector('[data-lk-box="mine"]');
      const target = root.querySelector('[data-lk-box="target"]');
      const status = root.querySelector('[data-lk-status]');
      if (!mine || !target || !status) return false;
      const key = `${index}:${target.clientWidth}`;
      if (cached.key !== key) cached = { key, rects: rectsOf(target) };
      const ok = sameRects(rectsOf(mine), cached.rects);
      const ch = list[index];
      status.className = `lk-status${ok ? ' is-ok' : ''}`;
      status.innerHTML = Tools.statusHtml({
        ok,
        okText: t('Solved! Your layout matches the target.'),
        notYet,
        next: index < list.length - 1 ? { action: `${prefix}-ch`, v: index + 1, label: t('Next challenge') } : null,
      });
      if (ok && !solvedNow) Tools.markSolved(root, { store, id: ch.id, action: `${prefix}-ch`, index, say: t('Challenge solved: {title}', { title: t(ch.title) }) });
      solvedNow = ok;
      return ok;
    }
    check.reset = () => { solvedNow = false; cached = { key: '', rects: [] }; };
    return check;
  }

  /* The actions every layout playground shares: <prefix>-pick / -count / -reset / -mode / -ch clicks
     and the gap slider. cfg: { prefix, st, list, maxItems, newItem(), startChallenge(k), resetPlay(),
     refresh(), paint() }. click(el, root) and input(el, root) return true when they handled the event. */
  function playgroundActions({ prefix, st, list, maxItems, newItem, startChallenge, resetPlay, refresh, paint }) {
    const restart = () => (st.mode === 'challenge' ? startChallenge(st.ch) : resetPlay());
    const ACTIONS = {
      pick(v, root) { st.sel = +v; refresh(); Tools.say(root, t('Item {n} selected', { n: st.sel + 1 })); },
      count(v, root) {
        const n = Math.max(1, Math.min(maxItems, st.items.length + +v));
        while (st.items.length < n) st.items.push(newItem());
        st.items.length = n;
        st.sel = Math.min(st.sel, n - 1);
        refresh();
        Tools.say(root, t('{n} items', { n }));
      },
      reset(v, root) { restart(); refresh(); Tools.say(root, t('Reset')); },
      mode(v) { st.mode = v; restart(); refresh(); },
      ch(v, root) { startChallenge(+v); refresh(); Tools.say(root, t('Challenge {n}: {title}', { n: +v + 1, title: t(list[+v].title) })); },
    };
    return {
      click(el, root) {
        const fn = ACTIONS[(el.dataset.action || '').slice(prefix.length + 1)];
        if (!fn || !el.dataset.action.startsWith(`${prefix}-`)) return false;
        fn(el.dataset.v, root);
        return true;
      },
      input(el, root) {
        if (el.dataset.prop !== 'gap') return false;
        st.c.gap = +el.value;
        Tools.showVal(root, 'gap', `${el.value}px`);
        paint();
        return true;
      },
    };
  }

  const ITEM_PAD = [[10, 14], [22, 10], [14, 28], [8, 18], [30, 12], [12, 22], [18, 16], [10, 30], [24, 14], [14, 12], [20, 20], [8, 10]];

  return { kebab, styleAttr, cssBlock, changed, code, countControl, challengeHeader, view, challengeChecker, playgroundActions, ITEM_PAD };
})();
