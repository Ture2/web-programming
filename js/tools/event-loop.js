'use strict';

/* ==========================================================================
   event-loop (Server-side JavaScript): the event-loop visualiser.

   Step through: pick a small program and step forwards / backwards (or play)
     through its execution. The page shows the code with the current line, the
     call stack, the timers and callbacks waiting in the Web / Node APIs, the
     microtask queue, the task (macrotask) queue, the console, and one sentence
     saying why this step happens now. The Node-only programs add the nextTick
     queue and the check queue (setImmediate).
   Predict the output: put the console lines of a program in order with the
     up / down buttons, then check. Solved challenges: 'event-loop-challenges-v1'.

   Simulation and challenges: js/tools/event-loop-engine.js (tested against real
   Node output). Stepping repaints only data-part="step".
   ========================================================================== */

(() => {
  const E = EventLoopEngine;
  const store = challengeStore('event-loop-challenges-v1');
  const CH = E.CHALLENGES;

  const el = { mode: 'run', id: 'promise', step: 0, playing: false, timer: null, ch: 0, orders: {}, results: {} };
  let run = E.run(el.id);

  const retrace = () => { run = E.run(el.id); el.step = 0; };
  function stop() { el.playing = false; clearInterval(el.timer); el.timer = null; }

  const orderOf = (chId) => el.orders[chId] || (el.orders[chId] = E.scrambled(chId));
  const current = () => run.steps[el.step];

  /* ---- Step through ------------------------------------------------------------------- */

  function programSelect() {
    const group = (tab, label) => `<optgroup label="${esc(t(label))}">${E.PRESETS.filter((p) => p.tab === tab).map((p) => `<option value="${esc(p.id)}"${p.id === el.id ? ' selected' : ''}>${esc(t(p.title))}</option>`).join('')}</optgroup>`;
    return `<div class="tl-field el-prog">
        <label for="el-prog">${esc(t('Program'))}</label>
        <select class="tl-select" id="el-prog" data-fid="el-prog" data-el="preset">${group('js', 'Browser and Node')}${group('node', 'Node only')}</select>
      </div>`;
  }

  const isFresh = (st, panel, label) => !!(st && st.fresh && st.fresh.panel === panel && st.fresh.label === label);

  /* One panel: a labelled list (items: strings or { label, detail }); empty → a muted "empty". */
  function panel(st, key, title, items, opts = {}) {
    const id = `el-p-${key}`;
    let marked = false;
    const li = (item) => {
      const label = typeof item === 'string' ? item : item.label;
      const fresh = !marked && isFresh(st, key, label);
      if (fresh) marked = true;
      return `<li${fresh ? ' class="is-new"' : ''}><span class="el-item-label">${esc(label)}</span>${item.detail ? `<span class="el-detail">${esc(item.detail)}</span>` : ''}${fresh ? ` <span class="el-new">${esc(t('new'))}</span>` : ''}</li>`;
    };
    return `<div class="el-panel el-${key}${opts.wide ? ' el-wide' : ''}">
        <p class="lr-label" id="${id}">${esc(t(title))}${opts.hint ? ` <span class="el-hint">${esc(t(opts.hint))}</span>` : ''}</p>
        ${items.length ? `<ol class="el-list" aria-labelledby="${id}">${items.map(li).join('')}</ol>` : `<p class="el-empty">${esc(t('empty'))}</p>`}
      </div>`;
  }

  function panelsHtml(st) {
    const node = run.preset.tab === 'node';
    const s = st || { stack: [], waiting: [], ticks: [], micro: [], tasks: [], checks: [], out: [] };
    return `<div class="el-panels">
        ${panel(st, 'stack', 'Call stack', s.stack.slice().reverse(), { hint: '(top first)' })}
        ${panel(st, 'waiting', node ? 'Node APIs: timers and waiting callbacks' : 'Web APIs: timers and waiting callbacks', s.waiting)}
        ${node ? panel(st, 'ticks', 'nextTick queue', s.ticks) : ''}
        ${panel(st, 'micro', 'Microtask queue', s.micro, { hint: '(promises, await)' })}
        ${panel(st, 'tasks', node ? 'Timers queue (timers phase)' : 'Task queue (macrotasks)', s.tasks)}
        ${node ? panel(st, 'checks', 'Check queue (setImmediate)', s.checks) : ''}
        <div class="el-panel el-wide el-out">
          <p class="lr-label" id="el-p-out">${esc(t('Console'))}</p>
          <div class="lr-console" role="log" aria-labelledby="el-p-out">${Sandbox.consoleHtml(s.out.map((text) => ({ level: 'log', text })), null, t('Nothing printed yet.'))}</div>
        </div>
      </div>`;
  }

  const codeHtml = (code, line, label, fid) => `<ol class="vr-code el-code" aria-label="${esc(label)}" tabindex="0" data-fid="${fid}">${code.map((l, k) => `<li${k === line ? ' class="is-current" aria-current="step"' : ''}><code>${esc(l) || ' '}</code></li>`).join('')}</ol>`;

  function stepHtml() {
    const st = current();
    const last = run.steps.length - 1;
    return `
        <div class="tl-row el-controls">
          <button type="button" class="btn ghost" data-action="el-prev" data-fid="el-prev"${el.step <= 0 ? ' disabled' : ''}>${esc(t('Previous'))}</button>
          <button type="button" class="btn" data-action="el-next" data-fid="el-next"${el.step >= last ? ' disabled' : ''}>${esc(t('Next step'))}</button>
          <button type="button" class="btn ghost" data-action="el-play" data-fid="el-play"${el.step >= last && !el.playing ? ' disabled' : ''}>${esc(el.playing ? t('Pause') : t('Play'))}</button>
          <button type="button" class="btn ghost" data-action="el-reset" data-fid="el-reset">${esc(t('Restart'))}</button>
          <span class="muted small">${esc(t('Step {n} of {total}', { n: el.step + 1, total: run.steps.length }))}</span>
          <span class="el-clock">${esc(t('Time'))} <strong>${esc(String(st ? st.now : 0))} ms</strong></span>
        </div>
        <div class="el-grid">
          <div class="el-left">
            ${codeHtml(run.preset.code, st ? st.line : null, t('Program'), 'el-code')}
            <p class="tl-explain el-explain">${st ? md(st.text) : ''}</p>
          </div>
          ${panelsHtml(st)}
        </div>`;
  }

  function runHtml() {
    const node = run.preset.tab === 'node';
    return `
        <div class="tl-row">${programSelect()}</div>
        ${node ? `<p class="tl-explain el-node-note">${md(t('**Node only.** `process.nextTick` and `setImmediate` do not exist in browsers. This order holds when the code runs as a CommonJS file with `node file.js`.'))}</p>` : ''}
        <div data-part="step">${stepHtml()}</div>`;
  }

  /* ---- Predict the output ----------------------------------------------------------------- */

  function predictHtml() {
    const c = CH[el.ch];
    const p = E.byId(c.preset);
    const lines = E.answer(c.id);
    const order = orderOf(c.id);
    const res = el.results[c.id] || null;
    const solved = store.isSolved(c.id);
    const items = order.map((idx, pos) => {
      const mark = res ? `<span class="el-mark">${res.right[pos] ? ICON.ok : ICON.bad}<span class="sr-only">${esc(res.right[pos] ? t('right place') : t('wrong place'))}</span></span>` : '';
      return `<li class="el-item${res ? (res.right[pos] ? ' is-right' : ' is-wrong') : ''}">
          <span class="el-pos" aria-hidden="true">${pos + 1}</span>
          <code class="el-line">${esc(lines[idx])}</code>
          ${mark}
          <span class="el-moves">
            <button type="button" class="btn ghost small-btn" data-action="el-up" data-v="${idx}" data-fid="el-up-${idx}"${pos === 0 ? ' disabled' : ''}><span aria-hidden="true">↑</span><span class="sr-only">${esc(t('Move “{line}” up', { line: lines[idx] }))}</span></button>
            <button type="button" class="btn ghost small-btn" data-action="el-dn" data-v="${idx}" data-fid="el-dn-${idx}"${pos === order.length - 1 ? ' disabled' : ''}><span aria-hidden="true">↓</span><span class="sr-only">${esc(t('Move “{line}” down', { line: lines[idx] }))}</span></button>
          </span>
        </li>`;
    }).join('');
    let status = '';
    if (res && res.ok) status = `<p class="tl-explain el-result">${ICON.ok}<span><strong>${esc(t('Correct!'))}</strong> ${md(t(c.why))}</span></p>`;
    else if (res) status = `<p class="tl-explain el-result el-bad">${ICON.bad}<span>${esc(t('{n} of {total} lines are in the right place. Move the others and check again, or watch the program step by step.', { n: res.score, total: lines.length }))}</span></p>`;
    return `
        <div class="el-modes">
          <p class="lr-label" aria-hidden="true">${esc(t('Challenges'))}</p>
          ${Tools.challengePicker({ list: CH, current: el.ch, store, action: 'el-ch', label: t('Challenges') })}
        </div>
        <div class="tl-goal">
          <p><strong>${esc(t(c.title))}</strong>${solved ? ` <span class="el-solved">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
          <p>${esc(t('In what order does the console print these lines? Put them in order with the arrow buttons (1 = printed first), then check.'))}</p>
          ${p.tab === 'node' ? `<p class="small">${md(t('**Node only**: run as a CommonJS file with `node file.js`.'))}</p>` : ''}
        </div>
        <div class="el-predict">
          ${codeHtml(p.code, null, t('Program'), 'el-code-p')}
          <div>
            <p class="lr-label" id="el-order-l">${esc(t('Your predicted order'))}</p>
            <ol class="el-order" aria-labelledby="el-order-l">${items}</ol>
            <div class="tl-row el-actions">
              <button type="button" class="btn" data-action="el-check" data-fid="el-check">${esc(t('Check my order'))}</button>
              <button type="button" class="btn ghost" data-action="el-watch" data-fid="el-watch">${esc(t('Watch it step by step'))}</button>
            </div>
          </div>
        </div>
        ${status}`;
  }

  /* ---- Events ----------------------------------------------------------------------------- */

  const paintStep = (root) => keepFocus(() => Tools.paint(root, { step: stepHtml }));
  const sayStep = (root) => { const st = current(); if (st) Tools.say(root, st.text.replace(/\*\*|`/g, '')); };

  function move(root, idx, dir) {
    const c = CH[el.ch];
    const order = orderOf(c.id);
    const pos = order.indexOf(idx);
    const to = pos + dir;
    if (pos < 0 || to < 0 || to >= order.length) return;
    [order[pos], order[to]] = [order[to], order[pos]];
    delete el.results[c.id];
    Tools.refresh('event-loop');
    // At the top or the bottom the pressed button is disabled: keep focus on the same line.
    if (!root.contains(document.activeElement) || document.activeElement === document.body) {
      const other = root.querySelector(`[data-fid="el-${dir < 0 ? 'dn' : 'up'}-${idx}"]`);
      if (other) other.focus({ preventScroll: true });
    }
    Tools.say(root, t('“{line}” is now number {n}.', { line: E.answer(c.id)[idx], n: to + 1 }));
  }

  Tools.register('event-loop', {
    title: 'Event-loop visualiser',
    intro: 'JavaScript runs one thing at a time. Step through small programs and watch the call stack, the timers, the microtask queue and the task queue decide what runs next. Then predict the output yourself.',
    body() {
      return `
        <div class="el">
          ${Tools.seg({ label: t('Mode'), action: 'el-mode', prop: 'mode', values: [['run', t('Step through')], ['predict', t('Predict the output')]], current: el.mode, fid: 'el-mode', mono: false })}
          <div class="el-body">${el.mode === 'run' ? runHtml() : predictHtml()}</div>
        </div>`;
    },
    onClick(elm, root) {
      const a = elm.dataset.action;
      const last = run.steps.length - 1;
      switch (a) {
        case 'el-mode':
          stop();
          el.mode = elm.dataset.v;
          Tools.refresh('event-loop');
          Tools.say(root, el.mode === 'run' ? t('Step through') : t('Predict the output'));
          return;
        case 'el-next': stop(); el.step = Math.min(last, el.step + 1); break;
        case 'el-prev': stop(); el.step = Math.max(0, el.step - 1); break;
        case 'el-reset': stop(); el.step = 0; break;
        case 'el-play':
          if (el.playing) stop();
          else if (reduceMotion) el.step = last;              // no autoplay: jump to the end
          else {
            el.playing = true;
            el.timer = setInterval(() => {
              if (!root.isConnected) { stop(); return; }      // the page changed
              if (el.step >= run.steps.length - 1) stop();
              else el.step++;
              paintStep(root);
            }, 1400);
          }
          paintStep(root);
          if (!el.playing) sayStep(root);
          return;
        case 'el-ch':
          el.ch = Number(elm.dataset.v);
          Tools.refresh('event-loop');
          Tools.say(root, t(CH[el.ch].title));
          return;
        case 'el-up': move(root, Number(elm.dataset.v), -1); return;
        case 'el-dn': move(root, Number(elm.dataset.v), 1); return;
        case 'el-check': {
          const c = CH[el.ch];
          const res = E.check(c.id, orderOf(c.id));
          el.results[c.id] = res;
          if (res.ok) Tools.markSolved(root, { store, id: c.id, action: 'el-ch', index: el.ch, say: t('Correct! {why}', { why: c.why.replace(/\*\*|`/g, '') }) });
          else Tools.say(root, t('{n} of {total} lines are in the right place.', { n: res.score, total: res.right.length }));
          Tools.refresh('event-loop');
          return;
        }
        case 'el-watch':
          stop();
          el.mode = 'run';
          el.id = CH[el.ch].preset;
          retrace();
          Tools.refresh('event-loop');
          Tools.say(root, t('Step through: {title}', { title: run.preset.title }));
          return;
        default:
          return;
      }
      paintStep(root);
      sayStep(root);
    },
    onChange(e, root) {
      if (e.target.dataset.el !== 'preset') return;
      stop();
      el.id = e.target.value;
      retrace();
      Tools.refresh('event-loop');
      Tools.say(root, t('{title}: {n} steps', { title: run.preset.title, n: run.steps.length }));
    },
    challenges: { store, label: 'Event-loop challenges', ids: () => CH.map((c) => c.id) },
  });
})();
