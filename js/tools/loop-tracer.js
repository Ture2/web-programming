'use strict';

/* ==========================================================================
   loop-tracer (JavaScript): pick a loop, change its numbers and
   step through it line by line: the current line, the condition that is
   checked, the variables after every step and the console output.
   Simulation: js/tools/loop-engine.js (stops after 200 steps: infinite loop).
   Stepping repaints only the step part (data-part="step"); the loop's settings stay.
   ========================================================================== */

(() => {
  const PHASE = {
    init: 'Initialise: the variable gets its first value (this runs once).',
    check: 'Check the condition. true → run the body again; false → leave the loop.',
    body: 'Run the body.',
    update: 'Update the loop variable, then go back to the condition.',
    after: 'The loop has finished: the code after it runs.',
  };
  const FIELDS = {
    count: [['start', 'Start', 'number'], ['cmp', 'Comparison', 'cmp'], ['end', 'End', 'number'], ['step', 'Step (+=)', 'number']],
    sum: [['n', 'n', 'number']],
    countdown: [['start', 'Start', 'number'], ['step', 'Step (-=)', 'number']],
    forof: [['words', 'Words (comma-separated)', 'words']],
    nested: [['rows', 'Rows', 'number'], ['cols', 'Columns', 'number']],
  };

  const lt = { id: 'count', params: {}, step: 0, playing: false, timer: null };
  Object.keys(LoopEngine.TEMPLATES).forEach((k) => { lt.params[k] = JSON.parse(JSON.stringify(LoopEngine.TEMPLATES[k].params)); });

  let run = null;
  let checks = [];                        // indexes of the 'check' steps, for the history table
  const retrace = () => {
    run = LoopEngine.trace(lt.id, lt.params[lt.id]);
    checks = run.steps.map((st, k) => (st.phase === 'check' ? k : -1)).filter((k) => k >= 0);
    lt.step = 0;
  };
  retrace();

  function stop() { lt.playing = false; clearInterval(lt.timer); lt.timer = null; }

  function fieldHtml([key, label, kind]) {
    const v = lt.params[lt.id][key];
    const id = `lt-${key}`;
    if (kind === 'cmp') return Tools.select({ label: t(label), fid: id, options: ['<', '<=', '>', '>=', '!=='], current: v, data: { lt: key } });
    if (kind === 'words') {
      return `<div class="tl-field lt-words"><label for="${id}">${esc(t(label))}</label><input id="${id}" class="tl-input" data-lt="${key}" data-fid="${id}" value="${esc(v.join(', '))}" autocomplete="off"></div>`;
    }
    return Tools.num({ label: t(label), fid: id, value: v, data: { lt: key } });
  }

  function historyHtml() {
    const rows = checks.filter((k) => k <= lt.step).map((k) => run.steps[k]);
    if (!rows.length) return '';
    const names = [...new Set(rows.flatMap((s) => Object.keys(s.vars)))];
    return `<div class="scroll lt-history"><table class="src"><caption>${esc(t('Every time the condition was checked'))}</caption>
        <thead><tr><th scope="col">#</th>${names.map((n) => `<th scope="col"><code>${esc(n)}</code></th>`).join('')}<th scope="col">${esc(t('Condition'))}</th></tr></thead>
        <tbody>${rows.map((s, k) => `<tr><th scope="row">${k + 1}</th>${names.map((n) => `<td><code>${n in s.vars ? esc(String(s.vars[n])) : ''}</code></td>`).join('')}<td><code>${esc(s.cond.expr)}</code> → <strong class="${s.cond.value ? 'tl-ok' : 'tl-bad'}">${s.cond.value}</strong></td></tr>`).join('')}</tbody></table></div>`;
  }

  function describe(st) {
    if (!st) return '';
    const cond = st.cond ? ` ${st.cond.expr} → ${st.cond.value}.` : '';
    return `${t(PHASE[st.phase])}${cond}`;
  }

  /* The part that changes at every step: controls, program, variables, console, history. */
  function stepHtml() {
    const st = run.steps[lt.step];
    const last = run.steps.length - 1;
    return `
        <div class="tl-row lt-controls">
          <button type="button" class="btn ghost" data-action="lt-prev" data-fid="lt-prev"${lt.step <= 0 ? ' disabled' : ''}>${esc(t('Previous'))}</button>
          <button type="button" class="btn" data-action="lt-next" data-fid="lt-next"${lt.step >= last ? ' disabled' : ''}>${esc(t('Next step'))}</button>
          <button type="button" class="btn ghost" data-action="lt-play" data-fid="lt-play"${lt.step >= last && !lt.playing ? ' disabled' : ''}>${esc(lt.playing ? t('Pause') : t('Play'))}</button>
          <button type="button" class="btn ghost" data-action="lt-reset" data-fid="lt-reset">${esc(t('Restart'))}</button>
          <span class="muted small">${esc(t('Step {n} of {total}', { n: run.steps.length ? lt.step + 1 : 0, total: run.steps.length }))}</span>
        </div>
        <div class="tl-cols">
          <div>
            <ol class="vr-code lt-code" aria-label="${esc(t('Program'))}" tabindex="0" data-fid="lt-code">${run.code.map((l, k) => `<li${st && k === st.line ? ' class="is-current" aria-current="step"' : ''}><code>${esc(l)}</code></li>`).join('')}</ol>
            <p class="tl-explain lt-phase">${esc(describe(st))}</p>
          </div>
          <div>
            <p class="lr-label">${esc(t('Variables now'))}</p>
            <dl class="lt-vars">${st ? Object.entries(st.vars).map(([k, v]) => `<div><dt><code>${esc(k)}</code></dt><dd><code>${esc(String(v))}</code></dd></div>`).join('') : ''}</dl>
            <p class="lr-label">${esc(t('Console'))}</p>
            <div class="lr-console" role="log">${Sandbox.consoleHtml(st ? st.out.map((text) => ({ level: 'log', text })) : [], null, null)}</div>
          </div>
        </div>
        ${historyHtml()}`;
  }

  /* Repaints the step, keeping focus on the button that was pressed. */
  const paintStep = (root) => keepFocus(() => Tools.paint(root, { step: stepHtml }));

  Tools.register('loop-tracer', {
    title: 'Loop tracer',
    intro: 'A loop repeats a body while a condition is true. Step through one and watch the condition, the variables and the output at every step.',
    body() {
      return `
        <div class="tl-row">
          ${Tools.select({ label: t('Loop'), fid: 'lt-tpl', options: Object.entries(LoopEngine.TEMPLATES).map(([k, v]) => [k, t(v.title)]), current: lt.id, data: { lt: 'template' } })}
          ${FIELDS[lt.id].map(fieldHtml).join('')}
        </div>
        ${run.error ? `<p class="tl-bad" role="alert">${esc(run.error)}</p>` : ''}
        ${run.truncated ? `<p class="tl-explain lt-warn"><strong>${esc(t('Infinite loop!'))}</strong> ${esc(t('The condition never becomes false, so the loop would run forever (stopped after {n} steps). Check the step: does it move the variable towards the end? Is the comparison the right way round?', { n: LoopEngine.MAX_STEPS }))}</p>` : ''}
        <div data-part="step">${stepHtml()}</div>`;
    },
    onClick(el, root) {
      const last = run.steps.length - 1;
      const a = el.dataset.action;
      if (a === 'lt-next') { stop(); lt.step = Math.min(last, lt.step + 1); }
      else if (a === 'lt-prev') { stop(); lt.step = Math.max(0, lt.step - 1); }
      else if (a === 'lt-reset') { stop(); lt.step = 0; }
      else if (a === 'lt-play') {
        if (lt.playing) stop();
        else if (reduceMotion) lt.step = last;            // no autoplay: jump to the end
        else {
          lt.playing = true;
          lt.timer = setInterval(() => {
            if (!root.isConnected) { stop(); return; }    // the page changed
            if (lt.step >= run.steps.length - 1) stop();
            else lt.step++;
            paintStep(root);
          }, 650);
        }
      } else return;
      paintStep(root);
      if (!lt.playing) Tools.say(root, describe(run.steps[lt.step]));
    },
    onChange(e, root) {
      const key = e.target.dataset.lt;
      if (!key) return;
      stop();
      if (key === 'template') lt.id = e.target.value;
      else if (key === 'words') lt.params[lt.id].words = e.target.value.split(',').map((w) => w.trim()).filter(Boolean);
      else if (key === 'cmp') lt.params[lt.id].cmp = e.target.value;
      else lt.params[lt.id][key] = Number(e.target.value);
      retrace();
      Tools.refresh('loop-tracer');
      Tools.say(root, run.truncated ? t('Infinite loop: stopped after {n} steps', { n: LoopEngine.MAX_STEPS }) : t('{n} steps', { n: run.steps.length }));
    },
  });
})();
