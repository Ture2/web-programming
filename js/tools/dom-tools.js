'use strict';

/* ==========================================================================
   DOM tools.

   dom-tree           edit HTML and see the tree the browser builds from it
                      (DOMParser: scripts never run), with a querySelector /
                      querySelectorAll tester that highlights the matches. The
                      tree is drawn once per HTML text; a new selector only moves
                      the match marks, so collapsed nodes stay collapsed.
   event-propagation  real nested elements with capture / bubble listeners you
                      switch on and off, stopPropagation, and event delegation.
                      Listeners are attached in mount() to fresh markup (every
                      re-render replaces the elements, and their listeners with them).
   ========================================================================== */

(() => {
  /* ======================================================================
     1. DOM tree + selector tester
     ====================================================================== */

  const SAMPLE = `<h1 id="title">My tasks</h1>
<ul class="tasks">
  <li class="task done">Buy milk</li>
  <li class="task">Study the <strong>DOM</strong></li>
</ul>
<table>
  <tr><td>Mon</td><td>3 tasks</td></tr>
</table>
<button type="button" class="add">Add task</button>`;

  const dt = { html: SAMPLE, selector: 'li.task', all: true, ws: false };

  /* The parsed document, re-parsed only when the HTML text changes. */
  let parsed = { html: null, doc: null };
  const docOf = (html) => (parsed.html === html ? parsed.doc : (parsed = { html, doc: parseHtml(html) }).doc);

  function attrs(el) {
    return [...el.attributes].map((a) => ` <span class="dt-attr">${esc(a.name)}</span>=<span class="dt-val">"${esc(a.value)}"</span>`).join('');
  }

  /* One node of the tree; index: Map element → its number (data-dt-i, also the details' data-fid,
     so keepFocus keeps a collapsed node collapsed across a refresh). */
  function nodeHtml(node, index) {
    if (node.nodeType === 3) {
      const blank = !node.textContent.trim();
      if (blank && !dt.ws) return '';
      const shown = blank ? node.textContent.replace(/\n/g, '⏎').replace(/ /g, '·') : node.textContent;
      return `<li class="dt-text${blank ? ' is-ws' : ''}"><span class="dt-kind">#text</span> <code>"${esc(shown)}"</code></li>`;
    }
    if (node.nodeType === 8) return `<li class="dt-text"><span class="dt-kind">#comment</span> <code>${esc(node.textContent)}</code></li>`;
    if (node.nodeType !== 1) return '';
    const i = index.size;
    index.set(node, i);
    const kids = [...node.childNodes].map((c) => nodeHtml(c, index)).join('');
    const head = `<span class="dt-head"><span class="dt-tag">&lt;${esc(node.tagName.toLowerCase())}${attrs(node)}&gt;</span></span>`;
    return kids
      ? `<li class="dt-el" data-dt-i="${i}"><details open data-fid="dt-n-${i}"><summary>${head}</summary><ul>${kids}</ul></details></li>`
      : `<li class="dt-el dt-leaf" data-dt-i="${i}">${head}</li>`;
  }

  /* The tree markup, rebuilt only when the HTML or the whitespace option changes. */
  let tree = { key: null, html: '', index: new Map(), version: 0 };
  function treeOf() {
    const key = `${dt.ws ? 1 : 0}|${dt.html}`;
    if (tree.key !== key) {
      const index = new Map();
      const html = `<ul class="dt-tree" aria-label="${esc(t('DOM tree'))}">${nodeHtml(docOf(dt.html).documentElement, index)}</ul>`;
      tree = { key, html, index, version: tree.version + 1 };
    }
    return tree;
  }

  /* → { matches, error } for the current selector and method. */
  function matchesOf() {
    if (!dt.selector.trim()) return { matches: [], error: '' };
    const { nodes, error } = queryAll(docOf(dt.html), dt.selector);
    return { matches: dt.all ? nodes : nodes.slice(0, 1), error };
  }

  /* The result line, the first match's textContent / innerHTML and notes about the parsed tree. */
  function resultHtml({ matches, error }) {
    const doc = docOf(dt.html);
    const notes = [];
    if (!/<html[\s>]/i.test(dt.html) || !/<body[\s>]/i.test(dt.html)) notes.push(t('The browser added `<html>`, `<head>` and `<body>` that are not in your source: every document has them.'));
    if (doc.querySelector('tbody') && !/<tbody/i.test(dt.html)) notes.push(t('The browser inserted a `<tbody>` inside the table. `table > tr` would match nothing: the DOM is the parsed tree, not your text.'));
    const call = dt.all ? `document.querySelectorAll('${dt.selector}')` : `document.querySelector('${dt.selector}')`;
    const first = matches[0];
    const result = error ? `<p class="tl-bad" role="alert">${esc(error)}</p>`
      : dt.all
        ? `<p><code>${esc(call)}</code> → ${esc(t('a NodeList with {n} element(s)', { n: matches.length }))}</p>`
        : `<p><code>${esc(call)}</code> → ${first ? `${esc(t('the first match:'))} <code>&lt;${esc(first.tagName.toLowerCase())}&gt;</code>` : '<code>null</code>'}</p>`;
    return `
      ${result}
      ${first ? `<div class="tl-cols dt-first">
          <div><p class="lr-label">${esc(t('First match: textContent'))}</p><pre class="tl-out">${esc(JSON.stringify(first.textContent))}</pre></div>
          <div><p class="lr-label">${esc(t('First match: innerHTML'))}</p><pre class="tl-out">${esc(JSON.stringify(first.innerHTML))}</pre></div>
        </div>` : ''}
      ${notes.map((n) => `<p class="tl-explain">${md(n)}</p>`).join('')}`;
  }

  /* Moves the match marks in the drawn tree (no re-render). */
  function markTree(root, matches) {
    const box = root.querySelector('[data-part="tree"]');
    if (!box) return;
    box.querySelectorAll('.is-match').forEach((li) => li.classList.remove('is-match'));
    box.querySelectorAll('.dt-hit').forEach((h) => h.remove());
    matches.forEach((m, k) => {
      const li = box.querySelector(`[data-dt-i="${tree.index.get(m)}"]`);
      if (!li) return;
      li.classList.add('is-match');
      li.querySelector('.dt-head').insertAdjacentHTML('beforeend', ` <span class="dt-hit">${esc(dt.all ? `[${k}]` : t('match'))}</span>`);
    });
  }

  function dtUpdate(root) {
    const m = matchesOf();
    const tr = treeOf();
    const box = root.querySelector('[data-part="tree"]');
    if (box && box.dataset.version !== String(tr.version)) {
      box.innerHTML = tr.html;
      box.dataset.version = tr.version;
    }
    Tools.paint(root, { result: () => resultHtml(m) });
    markTree(root, m.matches);
    Tools.say(root, t('{n} match(es)', { n: m.matches.length }));
  }
  const dtUpdateSoon = debounce(dtUpdate, 200);

  Tools.register('dom-tree', {
    title: 'DOM tree explorer',
    intro: 'The browser turns your HTML text into a tree of objects: the DOM. JavaScript works on that tree. Edit the HTML, explore the tree and test selectors.',
    body() {
      return `
        <div class="tl-cols">
          <div class="tl-field"><label for="dt-html">${esc(t('HTML'))}</label>
            <textarea id="dt-html" class="tl-code" rows="12" data-dt="html" data-fid="dt-html" spellcheck="false" autocapitalize="off">${esc(dt.html)}</textarea></div>
          <div>
            <div class="tl-field"><label for="dt-sel">${esc(t('CSS selector'))}</label>
              <input id="dt-sel" class="tl-input" data-dt="selector" data-fid="dt-sel" value="${esc(dt.selector)}" spellcheck="false" autocomplete="off"></div>
            <div class="tl-row dt-opts">
              ${Tools.seg({ label: t('Method'), action: 'dt-all', prop: 'all', values: [['0', 'querySelector'], ['1', 'querySelectorAll']], current: dt.all ? '1' : '0', fid: 'dt-all' })}
              <label class="tl-check"><input type="checkbox" data-dt="ws" data-fid="dt-ws"${dt.ws ? ' checked' : ''}> ${esc(t('Show whitespace text nodes'))}</label>
            </div>
            <p class="muted small">${esc(t('Try: #title · .done · ul > li · li strong · table > tr · tbody tr td:last-child'))}</p>
          </div>
        </div>
        <div data-part="result">${resultHtml(matchesOf())}</div>
        <p class="lr-label">${esc(t('DOM tree'))}</p>
        <div data-part="tree" data-version="${treeOf().version}">${tree.html}</div>`;
    },
    mount: (root) => markTree(root, matchesOf().matches),
    onClick(el, root) {
      if (el.dataset.action !== 'dt-all') return;
      dt.all = el.dataset.v === '1';
      Tools.refresh('dom-tree');
      Tools.say(root, dt.all ? 'querySelectorAll' : 'querySelector');
    },
    onInput(e, root) {
      const k = e.target.dataset.dt;
      if (k === 'html') dt.html = e.target.value;
      else if (k === 'selector') dt.selector = e.target.value;
      else return;
      dtUpdateSoon(root);
    },
    onChange(e, root) {
      if (e.target.dataset.dt !== 'ws') return;
      dt.ws = e.target.checked;
      dtUpdate(root);
    },
  });

  /* ======================================================================
     2. Event propagation
     ====================================================================== */

  const LEVELS = ['outer', 'middle', 'inner'];
  const ep = {
    listen: { outer: { capture: true, bubble: true }, middle: { capture: true, bubble: true }, inner: { capture: false, bubble: true } },
    stopAt: 'none',
    delegate: false,
    added: 0,
  };
  const PHASE_NAME = { 1: 'capturing', 2: 'at target', 3: 'bubbling' };

  const describeEl = (el) => (el && el.dataset ? `${el.tagName.toLowerCase()}.${(el.className || '').split(' ').find((c) => /^ep-(outer|middle|inner)$/.test(c)) || ''}` : '?')
    .replace('.ep-', '.');

  function addLog(root, html) {
    const log = root.querySelector('[data-ep-log]');
    if (!log) return;
    const empty = log.querySelector('.ep-empty');
    if (empty) empty.remove();
    log.insertAdjacentHTML('beforeend', `<li>${html}</li>`);
    log.scrollTop = log.scrollHeight;
  }

  function flash(el) {
    if (!el) return;
    el.classList.add('ep-flash');
    setTimeout(() => el.classList.remove('ep-flash'), reduceMotion ? 900 : 500);
  }

  function mountEvents(root) {
    const stage = root.querySelector('[data-ep-stage]');
    if (!stage) return;
    const listen = (el, fn, capture) => el.addEventListener('click', fn, capture);
    if (ep.delegate) {
      const outer = stage.querySelector('.ep-outer');
      listen(outer, (e) => {
        const btn = e.target.closest('button');
        flash(e.currentTarget);
        addLog(root, `<strong>${esc(t('delegated'))}</strong> · ${esc(t('listener on'))} <code>div.outer</code> · target <code>${esc(describeEl(e.target))}</code> · <code>e.target.closest('button')</code> → ${btn ? `<code>${esc(btn.textContent.trim())}</code> ${esc(t('handled'))}` : `<code>null</code> ${esc(t('ignored (not a button)'))}`}`);
        if (btn) Tools.say(root, t('Delegated listener handled {name}', { name: btn.textContent.trim() }));
      }, false);
      return;
    }
    LEVELS.forEach((lvl) => {
      const els = lvl === 'inner' ? [stage.querySelector('.ep-inner:not([data-ep-added])')] : [stage.querySelector(`.ep-${lvl}`)];
      ['capture', 'bubble'].forEach((phase) => {
        if (!ep.listen[lvl][phase]) return;
        els.forEach((el) => listen(el, (e) => {
          flash(e.currentTarget);
          const stop = ep.stopAt === `${lvl}-${phase}`;
          if (stop) e.stopPropagation();
          addLog(root, `<span class="ep-phase ep-p${e.eventPhase}">${esc(t(PHASE_NAME[e.eventPhase]))}</span> ${esc(t('{phase} listener on', { phase: t(phase) }))} <code>${esc(describeEl(e.currentTarget))}</code> · target <code>${esc(describeEl(e.target))}</code>${stop ? ` · <strong class="tl-bad">stopPropagation()</strong>` : ''}`);
        }, phase === 'capture'));
      });
    });
  }

  const optionList = () => [['none', t('nowhere')], ...LEVELS.flatMap((l) => ['capture', 'bubble'].map((p) => [`${l}-${p}`, t('{level}, {phase} listener', { level: l, phase: p })]))];

  Tools.register('event-propagation', {
    title: 'Event propagation',
    intro: 'A click travels down from the window to the element you clicked (capturing), then back up (bubbling). Switch listeners on and off and click the button.',
    body() {
      const added = Array.from({ length: ep.added }, (_, k) => `<button type="button" class="ep-inner" data-ep-added>${esc(t('New button {n}', { n: k + 1 }))}</button>`).join('');
      return `
        <div class="tl-row">
          <label class="tl-check"><input type="checkbox" data-ep="delegate" data-fid="ep-delegate"${ep.delegate ? ' checked' : ''}> ${esc(t('Event delegation: one listener on the outer div only'))}</label>
        </div>
        ${ep.delegate ? '' : `<div class="scroll"><table class="src ep-table"><caption>${esc(t('Listeners (addEventListener("click", fn, capture))'))}</caption>
            <thead><tr><th scope="col">${esc(t('Element'))}</th><th scope="col">${esc(t('Capture (true)'))}</th><th scope="col">${esc(t('Bubble (false)'))}</th></tr></thead>
            <tbody>${LEVELS.map((l) => `<tr><th scope="row"><code>${l}</code></th>${['capture', 'bubble'].map((p) => `<td><label><input type="checkbox" data-ep="listen" data-level="${l}" data-phase="${p}" data-fid="ep-${l}-${p}"${ep.listen[l][p] ? ' checked' : ''}><span class="sr-only"> ${esc(t('{level} {phase} listener', { level: l, phase: p }))}</span></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>
          ${Tools.select({ label: t('Call stopPropagation() in'), fid: 'ep-stop', options: optionList(), current: ep.stopAt, data: { ep: 'stop' }, cls: 'ep-stop' })}`}
        <div class="tl-cols">
          <div class="ep-stage" data-ep-stage>
            <div class="ep-box ep-outer"><span class="ep-label">div.outer</span>
              <div class="ep-box ep-middle"><span class="ep-label">div.middle</span>
                <button type="button" class="ep-inner">${esc(t('Click me'))}</button>
                ${added}
              </div>
            </div>
            <p class="lr-actions"><button type="button" class="btn ghost small-btn" data-action="ep-add" data-fid="ep-add">${esc(t('Add a new button'))}</button>
              <button type="button" class="btn ghost small-btn" data-action="ep-clear" data-fid="ep-clear">${esc(t('Clear the log'))}</button></p>
          </div>
          <div>
            <p class="lr-label">${esc(t('Log (in the order the listeners ran)'))}</p>
            <ol class="ep-log" data-ep-log aria-live="polite"><li class="ep-empty muted small">${esc(t('Click the button.'))}</li></ol>
          </div>
        </div>
        <p class="tl-explain">${md(ep.delegate
          ? t('With delegation, buttons added **after** the listener was attached work too, because the click bubbles up to the outer div, where `event.target` tells you what was clicked. This is how a to-do list handles the delete button of every new item.')
          : t('`event.target` is the element clicked (it never changes); `event.currentTarget` is the element whose listener is running. New buttons get no listener of their own here, but their clicks still bubble to the middle and outer divs.'))}</p>`;
    },
    mount: mountEvents,
    onClick(el, root) {
      const a = el.dataset.action;
      if (a === 'ep-clear') {
        const log = root.querySelector('[data-ep-log]');
        log.innerHTML = `<li class="ep-empty muted small">${esc(t('Click the button.'))}</li>`;
        Tools.say(root, t('Log cleared'));
      } else if (a === 'ep-add') {
        ep.added = Math.min(4, ep.added + 1);
        Tools.refresh('event-propagation');
        Tools.say(root, t('A new button was added'));
      }
    },
    onChange(e, root) {
      const k = e.target.dataset.ep;
      if (k === 'delegate') ep.delegate = e.target.checked;
      else if (k === 'listen') ep.listen[e.target.dataset.level][e.target.dataset.phase] = e.target.checked;
      else if (k === 'stop') ep.stopAt = e.target.value;
      else return;
      Tools.refresh('event-propagation');
      Tools.say(root, t('Listeners updated. Click the button.'));
    },
  });
})();
