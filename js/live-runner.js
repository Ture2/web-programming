'use strict';

/* ==========================================================================
   "Try it" boxes on concept cards (card.live):
     { kind: 'html', html, css, js? }  editable HTML / CSS (/ JS) with a live
                                       preview in a sandboxed iframe; console
                                       output of the page's script is shown.
     { kind: 'js', code }              editable JavaScript, Run (Ctrl+Enter),
                                       console output below (js/sandbox.js).
     { kind: 'react', code, css?, api? }  an editable React component (JSX) with a
                                       live preview and console (js/react-runner.js);
                                       api: true | { latency, fail } answers fetch('/api/…')
                                       from the mock REST API.
   Edits live in memory only (Reset brings back the original). Every box is a
   [data-live-box="<cardId>"] element; events arrive delegated from the section.
   ========================================================================== */

const LiveRunner = (() => {
  const edits = {};                       // cardId → { html, css, js, code }
  const cards = {};                       // cardId → live spec

  const box = (id) => document.querySelector(`[data-live-box="${CSS.escape(id)}"]`);
  const current = (id) => ({ ...cards[id], ...(edits[id] || {}) });

  const area = (id, part, label, value, rows) => `<div class="lr-pane">
      <label class="lr-label" for="lr-${esc(id)}-${part}">${esc(label)}</label>
      <textarea class="lr-code" id="lr-${esc(id)}-${part}" data-lr-part="${part}" data-fid="lr-${esc(id)}-${part}" rows="${rows}" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(value || '')}</textarea>
    </div>`;

  const lines = (s) => Math.min(14, Math.max(3, String(s || '').split('\n').length + 1));

  function html(c) {
    const spec = c.live;
    cards[c.id] = spec;
    const v = current(c.id);
    const id = c.id;
    if (spec.kind === 'js') {
      return `<section class="live-box" data-live-box="${esc(id)}" aria-label="${esc(t('Try it: {title}', { title: c.title }))}">
          <header class="lr-head"><span class="tool-badge" aria-hidden="true">${esc(t('Try it'))}</span><p class="lr-title">${esc(t('Edit the code and run it'))}</p></header>
          ${area(id, 'code', t('JavaScript'), v.code, lines(v.code))}
          <p class="lr-actions">
            <button type="button" class="btn" data-action="lr-run" data-fid="lr-run-${esc(id)}">${esc(t('Run'))}</button>
            <button type="button" class="btn ghost" data-action="lr-reset" data-fid="lr-reset-${esc(id)}">${esc(t('Reset'))}</button>
            <span class="muted small">${esc(t('Ctrl+Enter runs the code · Esc then Tab leaves the editor'))}</span>
          </p>
          <div class="lr-console" data-lr-out role="log" aria-label="${esc(t('Console output'))}"><p class="muted small">${esc(t('Output appears here.'))}</p></div>
        </section>`;
    }
    if (spec.kind === 'react') {
      const parts = [area(id, 'code', 'App.jsx', v.code, lines(v.code))];
      if (spec.css !== undefined) parts.push(area(id, 'css', 'CSS', v.css, lines(v.css)));
      return `<section class="live-box" data-live-box="${esc(id)}" aria-label="${esc(t('Try it: {title}', { title: c.title }))}">
          <header class="lr-head"><span class="tool-badge" aria-hidden="true">${esc(t('Try it'))}</span><p class="lr-title">${esc(t('Edit the component: the preview updates as you type'))}</p>
            <button type="button" class="btn ghost small-btn" data-action="lr-reset" data-fid="lr-reset-${esc(id)}">${esc(t('Reset'))}</button></header>
          <div class="lr-grid lr-n${parts.length}">${parts.join('')}</div>
          <p class="muted small lr-hint">${esc(t('Tab indents · Esc then Tab leaves the editor'))}${spec.api ? ` · ${esc(t("fetch('/api/…') is answered by a mock API that starts afresh on every change"))}` : ''}</p>
          <div class="lr-preview-wrap">
            <p class="lr-label">${esc(t('Preview'))}</p>
            <iframe class="lr-preview" sandbox="allow-scripts allow-modals allow-forms" title="${esc(t('Preview of your component'))}" data-lr-frame></iframe>
          </div>
          <div class="lr-console" data-lr-out role="log" aria-label="${esc(t('Console output'))}"></div>
        </section>`;
    }
    const parts = [area(id, 'html', 'HTML', v.html, lines(v.html))];
    if (spec.css !== undefined) parts.push(area(id, 'css', 'CSS', v.css, lines(v.css)));
    if (spec.js !== undefined) parts.push(area(id, 'js', 'JavaScript', v.js, lines(v.js)));
    return `<section class="live-box" data-live-box="${esc(id)}" aria-label="${esc(t('Try it: {title}', { title: c.title }))}">
        <header class="lr-head"><span class="tool-badge" aria-hidden="true">${esc(t('Try it'))}</span><p class="lr-title">${esc(t('Edit the code: the preview updates as you type'))}</p>
          <button type="button" class="btn ghost small-btn" data-action="lr-reset" data-fid="lr-reset-${esc(id)}">${esc(t('Reset'))}</button></header>
        <div class="lr-grid lr-n${parts.length}">${parts.join('')}</div>
        <p class="muted small lr-hint">${esc(t('Tab indents · Esc then Tab leaves the editor'))}</p>
        <div class="lr-preview-wrap">
          <p class="lr-label">${esc(t('Preview'))}</p>
          <iframe class="lr-preview" sandbox="allow-scripts allow-modals allow-forms" title="${esc(t('Preview of your code'))}" data-lr-frame></iframe>
        </div>
        ${spec.js !== undefined ? `<div class="lr-console" data-lr-out role="log" aria-label="${esc(t('Console output'))}"></div>` : ''}
      </section>`;
  }

  /* ---- Output ----------------------------------------------------------------- */

  async function runJs(id) {
    const el = box(id);
    if (!el) return;
    const out = el.querySelector('[data-lr-out]');
    out.innerHTML = `<p class="muted small">${esc(t('Running…'))}</p>`;
    const r = await Sandbox.runJs(current(id).code);
    out.innerHTML = Sandbox.consoleHtml(r.logs, r.error);
    announce(r.error ? t('Error: {msg}', { msg: r.error }) : t('{n} lines of output', { n: r.logs.length }));
  }

  function renderPreview(id) {
    const el = box(id);
    if (!el) return;
    const frame = el.querySelector('[data-lr-frame]');
    const out = el.querySelector('[data-lr-out]');
    if (out) out.innerHTML = '';
    const v = current(id);
    if (cards[id].kind === 'react') { renderReact(id, el, frame, out, v); return; }
    frame.srcdoc = Sandbox.page({ html: v.html, css: v.css, js: v.js, bridge: v.js !== undefined });
  }

  /* React: compile with Sucrase (loaded on first use), then run in the frame. A compile error keeps
     the last good preview, dimmed, and shows the error with the line it points at. */
  const runs = {};                       // cardId → number of the latest compile (late results are dropped)
  async function renderReact(id, el, frame, out, v) {
    const run = (runs[id] = (runs[id] || 0) + 1);
    const wrap = frame.closest('.lr-preview-wrap');
    const fail = (html) => { out.innerHTML = html; wrap.classList.add('is-stale'); };
    if (location.protocol === 'file:') {
      fail(`<p class="lr-line lr-warn">${esc(t('React previews need the page to be served over http(s). Run npm run site:serve and open http://localhost:8080.'))}</p>`);
      return;
    }
    try { await ReactRunner.load(); } catch (e) {
      fail(Sandbox.lineHtml({ level: 'error', text: t('Could not load the JSX compiler. Reload the page to try again.') }));
      return;
    }
    if (run !== runs[id]) return;
    const r = ReactRunner.compile(v.code, window.Sucrase.transform);
    if (!r.ok) {
      const at = r.error.line ? ` ${t('(line {line}, column {col})', { line: r.error.line, col: r.error.column + 1 })}` : '';
      fail(`${Sandbox.lineHtml({ level: 'error', text: `SyntaxError: ${r.error.message}${at}` })}${r.error.frame ? `<pre class="lr-frame">${esc(r.error.frame)}</pre>` : ''}`);
      return;
    }
    wrap.classList.remove('is-stale');
    frame.srcdoc = ReactRunner.page({ code: r.code, selfRender: r.selfRender, css: v.css, api: cards[id].api || null });
  }

  /* Console lines from preview frames, buffered and written once per frame (capped per box). */
  const pending = new Map();              // frame window → { out, lines }
  let flushing = 0;
  function flush() {
    flushing = 0;
    pending.forEach(({ out, lines }) => {
      const room = Sandbox.MAX_LINES - out.childElementCount;   // a runaway loop cannot freeze the page
      if (room > 0) out.insertAdjacentHTML('beforeend', lines.slice(0, room).map(Sandbox.lineHtml).join(''));
    });
    pending.clear();
  }
  Sandbox.onConsole((win, msg) => {
    let entry = pending.get(win);
    if (!entry) {
      const frame = [...document.querySelectorAll('[data-lr-frame]')].find((f) => f.contentWindow === win);
      const out = frame && frame.closest('[data-live-box]').querySelector('[data-lr-out]');
      if (!out) return;
      pending.set(win, (entry = { out, lines: [] }));
    }
    entry.lines.push(msg);
    if (!flushing) flushing = requestAnimationFrame(flush);
  });

  const previewers = {};                 // one debounced preview per box
  const previewSoon = (id) => (previewers[id] = previewers[id] || debounce(() => renderPreview(id), 350))();

  function mountAll(scope = document) {
    scope.querySelectorAll('[data-live-box]').forEach((el) => {
      const id = el.dataset.liveBox;
      if (cards[id] && cards[id].kind !== 'js') renderPreview(id);
    });
  }

  /* ---- Events (return true when handled) ------------------------------------------ */

  const idOf = (el) => { const b = el.closest && el.closest('[data-live-box]'); return b ? b.dataset.liveBox : null; };

  function onClick(el) {
    const id = idOf(el);
    if (!id) return false;
    if (el.dataset.action === 'lr-run') runJs(id);
    else if (el.dataset.action === 'lr-reset') {
      delete edits[id];
      const b = box(id);
      b.querySelectorAll('[data-lr-part]').forEach((ta) => { ta.value = cards[id][ta.dataset.lrPart] || ''; });
      if (cards[id].kind === 'js') b.querySelector('[data-lr-out]').innerHTML = '';
      else renderPreview(id);
      announce(t('Code reset'));
    }
    return true;
  }

  function onInput(e) {
    const ta = e.target;
    const id = idOf(ta);
    if (!id || !ta.dataset.lrPart) return false;
    edits[id] = { ...(edits[id] || {}), [ta.dataset.lrPart]: ta.value };
    if (cards[id].kind !== 'js') previewSoon(id);
    return true;
  }

  function onKeydown(e) {
    const ta = e.target;
    const id = idOf(ta);
    if (!id || !ta.dataset.lrPart) return false;
    return codeEditorKeydown(e, cards[id].kind === 'js' ? () => runJs(id) : null);
  }

  return { html, mountAll, onClick, onInput, onKeydown };
})();
