'use strict';

/* ==========================================================================
   Cascade tools.

   'specificity'      Several rules set `color` on one fixed paragraph. For each
                      rule: does it match, its (a, b, c) specificity, and where it
                      lands in the cascade (importance → specificity → source
                      order). The winner colours the paragraph, with the reason
                      it beat the runner-up. Rules can be added, removed and
                      reordered. Actions: sp-*.
   'selector-tester'  Editable sample HTML + a selector: which elements match,
                      highlighted in a sandboxed preview, with the selector's
                      specificity. Exercises are checked by comparing the matched
                      elements with those of a reference selector. Solved ids:
                      challengeStore 'selector-challenges-v1'. Actions: st-*.

   Matching uses DOMParser (inert: scripts in the sample never run here).
   ========================================================================== */

(() => {
  const S = SpecificityEngine;
  const fmt = S.format;

  /* Specificity triple as three labelled boxes. */
  const triple = (s) => `<span class="sp-triple" aria-label="${esc(t('specificity {s}: {a} IDs, {b} classes, {c} types', { s: fmt(s), a: s[0], b: s[1], c: s[2] }))}"><span class="sp-a" title="${esc(t('IDs'))}">${s[0]}</span><span class="sp-b" title="${esc(t('classes, attributes, pseudo-classes'))}">${s[1]}</span><span class="sp-c" title="${esc(t('types, pseudo-elements'))}">${s[2]}</span></span>`;

  const KIND = {
    id: 'ID', class: 'class', attribute: 'attribute', 'pseudo-class': 'pseudo-class', 'pseudo-element': 'pseudo-element',
    type: 'type', universal: 'universal (0)', combinator: 'combinator (0)', where: ':where() (0)', functional: 'its most specific argument', list: 'list', unknown: '?',
  };
  const partsHtml = (sel) => `<span class="sp-parts">${S.explain(sel).filter((p) => p.kind !== 'combinator' || p.text.trim()).map((p) => `<span class="sp-part sp-k-${p.kind}" title="${esc(t(KIND[p.kind]))} ${esc(fmt(p.spec))}"><code>${esc(p.text.trim() || '␣')}</code><small>${esc(t(KIND[p.kind]))}</small></span>`).join('')}</span>`;

  /* =========================================================================
     1. Specificity and the cascade
     ========================================================================= */

  const TARGET_HTML = '<div id="page" class="article">\n  <p id="intro" class="lead note">Hello, cascade!</p>\n</div>';
  const DEFAULT_RULES = [
    { sel: 'p', color: 'navy', imp: false },
    { sel: '.lead', color: 'green', imp: false },
    { sel: 'div p.note', color: 'purple', imp: false },
    { sel: '.article .lead', color: 'teal', imp: false },
    { sel: '#intro', color: 'crimson', imp: false },
  ];
  const sp = { rules: DEFAULT_RULES.map((r) => ({ ...r })) };
  const targetDoc = parseHtml(`<body>${TARGET_HTML}</body>`);
  const targetEl = targetDoc.getElementById('intro');

  /* Per rule: valid, matches, specificity of the matching list item(s). */
  function analyse() {
    return sp.rules.map((r, k) => {
      const sel = r.sel.trim();
      const valid = sel !== '' && !queryAll(targetDoc, sel).error;
      const items = valid ? S.list(sel) : [];
      const matching = items.filter((x) => { try { return targetEl.matches(x.selector); } catch (e) { return false; } });
      const spec = matching.length ? matching.reduce((m, x) => (S.compare(x.spec, m) > 0 ? x.spec : m), [0, 0, 0]) : (items[0] ? S.specificity(sel) : [0, 0, 0]);
      const color = CSS.supports('color', r.color) ? r.color : null;
      return { k, r, sel, valid, matches: matching.length > 0, spec, color };
    });
  }

  /* Cascade order for one property: !important first, then specificity, then later source order. */
  const cascade = (list) => list.filter((x) => x.valid && x.matches && x.color)
    .sort((x, y) => (+y.r.imp - +x.r.imp) || S.compare(y.spec, x.spec) || (y.k - x.k));

  function why(win, next) {
    if (!win) return t('No rule matches the paragraph, so it **inherits** its colour from its parent (here, the default text colour).');
    if (!next) return t('Only one rule matches the paragraph, so it wins without a contest.');
    if (win.r.imp && !next.r.imp) return t('Rule {w} is marked `!important`: important declarations beat every normal one, whatever their specificity. (Use it rarely: it makes CSS hard to override.)', { w: win.k + 1 });
    const c = S.compare(win.spec, next.spec);
    if (c > 0) {
      const col = win.spec[0] !== next.spec[0] ? t('IDs') : win.spec[1] !== next.spec[1] ? t('classes') : t('types');
      return t('Both are {kind}. Rule {w} {ws} beats rule {n} {ns}: the columns are compared **from left to right** and the first difference decides — here the **{col}** column. One ID beats any number of classes.', {
        kind: win.r.imp ? t('important') : t('normal declarations'), w: win.k + 1, ws: fmt(win.spec), n: next.k + 1, ns: fmt(next.spec), col,
      });
    }
    return t('Rules {n} and {w} have the **same specificity** {s}, so **source order** decides: the one written later (rule {w}) wins.', { n: next.k + 1, w: win.k + 1, s: fmt(win.spec) });
  }

  /* The output for one analysis: { html, win }; the last one is kept so announcements reuse it. */
  let spLast = { win: null, html: '' };
  function spOut() {
    const list = analyse();
    const order = cascade(list);
    return (spLast = { win: order[0], html: spOutHtml(list, order, order[0]) });
  }

  function spOutHtml(list, order, win) {
    const pos = new Map(order.map((x, i) => [x.k, i + 1]));
    const rows = list.map((x) => {
      let state;
      if (!x.valid) state = `<span class="tl-bad">${esc(t('invalid selector'))}</span>`;
      else if (!x.color) state = `<span class="tl-bad">${esc(t('invalid colour'))}</span>`;
      else if (!x.matches) state = `<span class="muted">${esc(t('does not match'))}</span>`;
      else if (x === win) state = `<span class="tl-ok">${esc(t('wins'))}</span>`;
      else state = `<span>${esc(t('loses (#{n} in the cascade)', { n: pos.get(x.k) }))}</span>`;
      return `<tr class="${x === win ? 'is-win' : ''}${x.valid && x.matches ? '' : ' is-off'}">
          <th scope="row">${x.k + 1}</th>
          <td><code>${esc(x.sel || '—')}</code>${x.valid && x.sel ? partsHtml(x.sel) : ''}</td>
          <td>${x.valid ? triple(x.spec) : ''}</td>
          <td>${state}</td>
        </tr>`;
    }).join('');
    return `
      <div class="sp-target">
        <p class="lr-label">${esc(t('The element'))}</p>
        <pre class="sp-html"><code>${esc(TARGET_HTML)}</code></pre>
        <p class="sp-result"${win ? ` style="color:${esc(win.color)}"` : ''}>${esc(t('Hello, cascade!'))}</p>
      </div>
      <div class="scroll"><table class="src sp-table">
        <caption>${esc(t('Rules in source order, with their specificity (IDs, classes, types)'))}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">${esc(t('Selector'))}</th><th scope="col">${esc(t('Specificity'))}</th><th scope="col">${esc(t('Result'))}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="tl-explain"><strong>${win ? esc(t('Rule {n} wins: color: {c}.', { n: win.k + 1, c: win.color })) : esc(t('No winner.'))}</strong> ${md(why(win, order[1]))}</p>
      <p class="muted small">${md(t('The cascade, in order: **importance** (`!important`) → **specificity** → **source order**. Inline `style="…"` beats every selector; inherited values lose to any rule that targets the element itself.'))}</p>`;
  }

  function spBody() {
    const n = sp.rules.length;
    const rows = sp.rules.map((r, k) => `<li class="sp-rule">
        <span class="sp-n" aria-hidden="true">${k + 1}</span>
        <div class="tl-field sp-sel"><label for="sp-sel-${k}">${esc(t('Selector {n}', { n: k + 1 }))}</label>
          <input class="tl-input" id="sp-sel-${k}" data-fid="sp-sel-${k}" data-sp="sel" data-k="${k}" value="${esc(r.sel)}" spellcheck="false" autocomplete="off"></div>
        <div class="tl-field sp-col"><label for="sp-col-${k}">color</label>
          <input class="tl-input" id="sp-col-${k}" data-fid="sp-col-${k}" data-sp="color" data-k="${k}" value="${esc(r.color)}" spellcheck="false" autocomplete="off"></div>
        <label class="tl-check sp-imp"><input type="checkbox" data-fid="sp-imp-${k}" data-sp="imp" data-k="${k}"${r.imp ? ' checked' : ''}> !important</label>
        <span class="sp-btns">
          <button type="button" class="btn ghost small-btn" data-action="sp-up" data-k="${k}" data-fid="sp-up-${k}" aria-label="${esc(t('Move rule {n} up', { n: k + 1 }))}"${k === 0 ? ' disabled' : ''}>↑</button>
          <button type="button" class="btn ghost small-btn" data-action="sp-down" data-k="${k}" data-fid="sp-down-${k}" aria-label="${esc(t('Move rule {n} down', { n: k + 1 }))}"${k === n - 1 ? ' disabled' : ''}>↓</button>
          <button type="button" class="btn ghost small-btn" data-action="sp-del" data-k="${k}" data-fid="sp-del-${k}" aria-label="${esc(t('Remove rule {n}', { n: k + 1 }))}"${n <= 1 ? ' disabled' : ''}>✕</button>
        </span>
      </li>`).join('');
    return `
      <ol class="sp-rules" aria-label="${esc(t('Rules'))}">${rows}</ol>
      <p class="lr-actions">
        <button type="button" class="btn ghost small-btn" data-action="sp-add" data-fid="sp-add"${n >= 8 ? ' disabled' : ''}>${esc(t('Add a rule'))}</button>
        <button type="button" class="btn ghost small-btn" data-action="sp-reset" data-fid="sp-reset">${esc(t('Reset'))}</button>
      </p>
      <div data-part="view">${spOut().html}</div>`;
  }

  const announceWinner = (root, win) => Tools.say(root, win ? t('Rule {n} wins: color {c}', { n: win.k + 1, c: win.color }) : t('No rule matches'));

  /* Typing: only the result part is redrawn (debounced), so the inputs keep focus and caret. */
  function spPaint(root) {
    const out = spOut();
    Tools.paint(root, { view: () => out.html });
    announceWinner(root, out.win);
  }
  const spPaintSoon = debounce(spPaint, 120);

  Tools.register('specificity', {
    title: 'Specificity and the cascade',
    intro: 'When several rules set the same property on one element, the browser picks **one winner**. Edit the selectors, mark one `!important` or reorder them, and see who wins and why.',
    body: spBody,
    onClick(el, root) {
      const k = +el.dataset.k;
      const a = el.dataset.action;
      if (a === 'sp-add') sp.rules.push({ sel: 'p.lead', color: 'orange', imp: false });
      else if (a === 'sp-del') sp.rules.splice(k, 1);
      else if (a === 'sp-up' && k > 0) [sp.rules[k - 1], sp.rules[k]] = [sp.rules[k], sp.rules[k - 1]];
      else if (a === 'sp-down' && k < sp.rules.length - 1) [sp.rules[k + 1], sp.rules[k]] = [sp.rules[k], sp.rules[k + 1]];
      else if (a === 'sp-reset') sp.rules = DEFAULT_RULES.map((r) => ({ ...r }));
      else return;
      Tools.refresh('specificity');                // the body already contains the new result
      announceWinner(root, spLast.win);
    },
    onInput(e, root) {
      const el = e.target;
      if (!el.dataset.sp) return;
      const r = sp.rules[+el.dataset.k];
      if (el.dataset.sp === 'imp') { r.imp = el.checked; spPaint(root); } else { r[el.dataset.sp] = el.value; spPaintSoon(root); }
    },
  });

  /* =========================================================================
     2. Selector tester
     ========================================================================= */

  const SAMPLE = `<header>
  <h1 class="title">My blog</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/about" class="active">About</a>
  </nav>
</header>
<main>
  <article class="post featured">
    <h2>First post</h2>
    <p>Read the <a href="/guide">guide</a> first.</p>
    <p class="note">Posted today</p>
  </article>
  <article class="post">
    <h2>Second post</h2>
    <p>Hello <em>world</em>.</p>
    <ul>
      <li>One</li>
      <li class="note">Two</li>
      <li>Three</li>
    </ul>
  </article>
</main>
<footer>
  <p>© 2026 <a href="/contact">Contact</a></p>
</footer>`;

  const EXERCISES = [
    { id: 'all-p', title: 'Exercise 1', goal: 'Select **every paragraph**.', answer: 'p' },
    { id: 'nav-links', title: 'Exercise 2', goal: 'Select **only the links inside the nav**.', answer: 'nav a' },
    { id: 'note', title: 'Exercise 3', goal: 'Select **every element with the class** `note`.', answer: '.note' },
    { id: 'featured-h2', title: 'Exercise 4', goal: 'Select **the heading of the featured post only**.', answer: '.featured h2' },
    { id: 'not-active', title: 'Exercise 5', goal: 'Select **every link except the active one**.', answer: 'a:not(.active)' },
    { id: 'after-h2', title: 'Exercise 6', goal: 'Select the paragraphs that come **immediately after an h2**.', answer: 'h2 + p' },
    { id: 'second-li', title: 'Exercise 7', goal: 'Select **the second list item**, without using its class.', answer: 'li:nth-child(2)' },
    { id: 'children', title: 'Exercise 8', goal: 'Select the paragraphs that are **direct children** of an article (not the one in the footer).', answer: 'article > p' },
    { id: 'attr', title: 'Exercise 9', goal: 'Select the links whose `href` **starts with** `/a` or `/g`.', answer: 'a[href^="/a"], a[href^="/g"]' },
  ];
  const stStore = challengeStore('selector-challenges-v1');
  const ts = { html: SAMPLE, sel: 'nav a', ex: -1 };

  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${[...el.classList].map((c) => `.${c}`).join('')}`;

  /* The sample parsed once per HTML text (typing a selector re-queries the same document). */
  let parsed = { html: null, doc: null };
  const sampleDoc = () => (parsed.html === ts.html ? parsed.doc : (parsed = { html: ts.html, doc: parseHtml(`<body>${ts.html}</body>`) }).doc);

  function match(sel) {
    const doc = sampleDoc();
    const s = sel.trim();
    return s ? { doc, ...queryAll(doc, s) } : { doc, error: '', nodes: [] };
  }

  /* Same elements: both lists come from one document, in document order. */
  const sameSet = (a, b) => a.length === b.length && a.every((n, k) => n === b[k]);

  function stResult() {
    const r = match(ts.sel);
    const verdict = ts.ex >= 0 && !r.error && ts.sel.trim() ? sameSet(r.nodes, queryAll(r.doc, EXERCISES[ts.ex].answer).nodes) : null;
    return { ...r, verdict };
  }

  /* The preview is built from a clean copy (the cached document is never marked). */
  function previewDoc(r) {
    const copy = inertHtml(r.doc.cloneNode(true));
    if (!r.error && ts.sel.trim()) queryAll(copy, ts.sel.trim()).nodes.forEach((n, k) => n.setAttribute('data-match', String(k + 1)));
    const css = '[data-match]{outline:3px solid #ff5700;outline-offset:2px;background:#fff1e8}'
      + '[data-match]::before{content:attr(data-match);display:inline-block;margin-right:4px;padding:0 5px;border-radius:8px;background:#1a1f6c;color:#fff;font:700 11px/16px Arial,sans-serif;vertical-align:2px}'
      + 'a{color:#1a1f6c}nav a{margin-right:8px}';
    return Sandbox.page({ html: copy.body.innerHTML, css });
  }

  function stOut(r) {
    const spec = !r.error && ts.sel.trim() ? S.list(ts.sel) : [];
    const ex = ts.ex >= 0 ? EXERCISES[ts.ex] : null;
    return `
      ${r.error ? `<p class="tl-bad">${esc(r.error)}</p>` : `<p class="st-count"><strong>${esc(r.nodes.length === 1 ? t('1 element matches') : t('{n} elements match', { n: r.nodes.length }))}</strong>
        ${spec.map((x) => `<span class="st-spec"><code>${esc(x.selector)}</code> ${triple(x.spec)}</span>`).join('')}</p>`}
      ${ex && !r.error && ts.sel.trim() ? `<p class="lk-status${r.verdict ? ' is-ok' : ''}">${Tools.statusHtml({
        ok: r.verdict,
        okText: t('Correct! Exactly the right elements.'),
        notYet: t('Not yet: your selector matches different elements from the ones asked for.'),
        next: ts.ex < EXERCISES.length - 1 ? { action: 'st-ex', v: ts.ex + 1, label: t('Next exercise') } : null,
      })}</p>` : ''}
      ${r.nodes.length ? `<ol class="st-list">${r.nodes.map((n) => `<li><code>${esc(describe(n))}</code> <span class="muted">${esc((n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40))}</span></li>`).join('')}</ol>` : ''}`;
  }

  /* The last result, shared by the body and the preview (one parse per update). */
  let last = null;

  function stBody() {
    const r = (last = stResult());
    const ex = ts.ex >= 0 ? EXERCISES[ts.ex] : null;
    return `
      ${Tools.challengePicker({ list: EXERCISES, current: ts.ex, store: stStore, action: 'st-ex', label: t('Selector exercises'), free: { value: -1, label: t('Free') } })}
      ${ex ? `<p class="tl-goal"><strong>${esc(t('Exercise {n}.', { n: ts.ex + 1 }))}</strong> ${md(t(ex.goal))}</p>` : `<p class="tl-goal">${md(t('Type any selector, or pick an exercise. You can also edit the HTML.'))}</p>`}
      <div class="tl-field st-sel"><label for="st-sel">${esc(t('Selector'))}</label>
        <input class="tl-input" id="st-sel" data-fid="st-sel" data-st="sel" value="${esc(ts.sel)}" spellcheck="false" autocomplete="off" autocapitalize="off"></div>
      <div data-part="view">${stOut(r)}</div>
      <div class="tl-cols st-cols">
        <div class="tl-field"><label for="st-html">HTML</label>
          <textarea class="tl-code" id="st-html" data-fid="st-html" data-st="html" rows="16" spellcheck="false">${esc(ts.html)}</textarea>
          <p class="lr-actions"><button type="button" class="btn ghost small-btn" data-action="st-reset" data-fid="st-reset">${esc(t('Reset the HTML'))}</button></p></div>
        <div class="tl-field"><span class="lr-label">${esc(t('Preview: matches are outlined and numbered'))}</span>
          <iframe class="tl-frame st-frame" sandbox="allow-scripts" title="${esc(t('Preview with the matching elements highlighted'))}" data-st-frame></iframe></div>
      </div>`;
  }

  function stMount(root) {
    const frame = root.querySelector('[data-st-frame]');
    if (frame && last) frame.srcdoc = previewDoc(last);
  }

  function stUpdate(root) {
    const r = (last = stResult());
    Tools.paint(root, { view: () => stOut(r) });
    stMount(root);
    if (r.error) Tools.say(root, r.error);
    else if (r.verdict) Tools.markSolved(root, { store: stStore, id: EXERCISES[ts.ex].id, action: 'st-ex', index: ts.ex, say: t('Correct!') });
    else Tools.say(root, t('{n} elements match', { n: r.nodes.length }));
  }
  const stUpdateSoon = { html: debounce(stUpdate, 400), sel: debounce(stUpdate, 150) };

  Tools.register('selector-tester', {
    title: 'Selector tester',
    intro: 'A selector is a **question** the browser asks about every element: "do you match?". Type one and see exactly which elements answer yes.',
    challenges: { store: stStore, label: 'Selector exercises', ids: () => EXERCISES.map((e) => e.id) },
    body: stBody,
    mount: stMount,
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'st-ex') {
        ts.ex = +el.dataset.v;
        ts.sel = '';
        ts.html = SAMPLE;
        Tools.refresh('selector-tester');
        root.querySelector('#st-sel')?.focus();
        Tools.say(root, ts.ex >= 0 ? t('Exercise {n}', { n: ts.ex + 1 }) : t('Free mode'));
      } else if (a === 'st-reset') {
        ts.html = SAMPLE;
        Tools.refresh('selector-tester');
      }
    },
    onInput(e, root) {
      const el = e.target;
      if (!el.dataset.st) return;
      ts[el.dataset.st] = el.value;
      stUpdateSoon[el.dataset.st](root);
    },
  });
})();
