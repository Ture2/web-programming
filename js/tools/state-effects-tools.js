'use strict';

/* ==========================================================================
   render-cycle (State and effects): a step-through visualiser of how React runs
   one component. Simulation: js/tools/state-effects-engine.js (its console was
   checked against React 19 in a real browser).

   Step through: pick a scenario (two set calls, an updater, batching, effect
     dependencies, cleanup, a stale interval, StrictMode, fetch with abort…),
     optionally wrap it in <StrictMode>, and step forwards / backwards (or play):
     event → update queued → render N with its snapshot → commit → cleanup →
     effect, with the code line, the committed state, the queued updates, the
     screen and the console at every step.
   Predict the console: read a scenario and pick the console it prints from four
     candidates. Solved challenges: challengeStore 'render-cycle-challenges-v1'.
   Stepping repaints only data-part="rc-step".
   ========================================================================== */

(() => {
  const E = RenderCycleEngine;
  const store = challengeStore('render-cycle-challenges-v1');
  const CH = E.CHALLENGES;

  const rc = { mode: 'run', id: 'set-twice', strict: false, step: 0, playing: false, timer: null, ch: 0, picks: {} };
  let run = E.run(rc.id, { strict: rc.strict });

  const retrace = () => { run = E.run(rc.id, { strict: rc.strict }); rc.step = 0; };
  function stop() { rc.playing = false; clearInterval(rc.timer); rc.timer = null; }
  const current = () => run.steps[rc.step];

  const KIND = {
    event: 'Event', queue: 'Update queued', process: 'Queue processed', bail: 'Render skipped', render: 'Render',
    strict: 'StrictMode', commit: 'Commit', skip: 'Effect skipped', cleanup: 'Cleanup', effect: 'Effect',
    log: 'console.log', timer: 'Timer', network: 'Network', unmount: 'Unmount', ignored: 'Update ignored',
  };
  const plain = (s) => String(s).replace(/\*\*|`/g, '');
  const showVal = (v) => (Array.isArray(v) ? `[${v.length} item${v.length === 1 ? '' : 's'}]` : typeof v === 'string' ? `"${v}"` : String(v));

  /* ---- Step through ------------------------------------------------------------------- */

  function scenarioSelect() {
    const groups = [...new Set(E.SCENARIOS.map((s) => s.group))];
    return `<div class="tl-field rc-pick">
        <label for="rc-scn">${esc(t('Scenario'))}</label>
        <select class="tl-select" id="rc-scn" data-fid="rc-scn" data-rc="scenario">${groups.map((g) => `<optgroup label="${esc(t(g))}">${E.SCENARIOS.filter((s) => s.group === g).map((s) => `<option value="${esc(s.id)}"${s.id === rc.id ? ' selected' : ''}>${esc(t(s.title))}</option>`).join('')}</optgroup>`).join('')}</select>
      </div>`;
  }

  const codeHtml = (code, line, fid) => `<ol class="vr-code rc-code" aria-label="${esc(t('Component code'))}" tabindex="0" data-fid="${fid}">${code.map((l, k) => `<li${k === line ? ' class="is-current" aria-current="step"' : ''}><code>${esc(l) || ' '}</code></li>`).join('')}</ol>`;

  function panelsHtml(st) {
    const entries = Object.entries(st.state);
    return `<div class="rc-panels">
        <div class="rc-panel rc-state">
          <p class="lr-label" id="rc-p-state">${esc(t('State (last committed)'))}</p>
          ${entries.length ? `<dl class="rc-kv" aria-labelledby="rc-p-state">${entries.map(([k, v]) => `<div><dt><code>${esc(k)}</code></dt><dd><code>${esc(showVal(v))}</code></dd></div>`).join('')}</dl>` : `<p class="rc-empty">${esc(t('no state'))}</p>`}
        </div>
        <div class="rc-panel rc-queue">
          <p class="lr-label" id="rc-p-queue">${esc(t('Queued updates'))}</p>
          ${st.pending.length ? `<ol class="rc-list" aria-labelledby="rc-p-queue">${st.pending.map((p) => `<li><code>${esc(p)}</code></li>`).join('')}</ol>` : `<p class="rc-empty">${esc(t('empty'))}</p>`}
        </div>
        <div class="rc-panel rc-screen">
          <p class="lr-label" id="rc-p-screen">${esc(t('Screen'))} <span class="rc-render">${esc(t('renders so far: {n}', { n: st.render }))}</span></p>
          <p class="rc-ui" aria-labelledby="rc-p-screen">${esc(st.screen || t('(nothing yet)'))}</p>
        </div>
        <div class="rc-panel rc-out">
          <p class="lr-label" id="rc-p-out">${esc(t('Console'))}</p>
          <div class="lr-console" role="log" aria-labelledby="rc-p-out">${Sandbox.consoleHtml(st.out.map((text) => ({ level: 'log', text })), null, t('Nothing printed yet.'))}</div>
        </div>
      </div>`;
  }

  function timelineHtml() {
    return `<details class="rc-all" data-fid="rc-all"><summary>${esc(t('All {n} steps', { n: run.steps.length }))}</summary>
        <ol class="rc-steps">${run.steps.map((s, k) => `<li${k === rc.step ? ' class="is-current"' : ''}><button type="button" class="rc-jump" data-action="rc-go" data-v="${k}" data-fid="rc-go-${k}"${k === rc.step ? ' aria-current="step"' : ''}><span class="rc-t">${esc(`${s.t} ms`)}</span> <span class="rc-k rc-k-${s.kind}">${esc(t(KIND[s.kind]))}</span> <span class="rc-tx">${esc(plain(s.text))}</span></button></li>`).join('')}</ol>
      </details>`;
  }

  function stepHtml() {
    const st = current();
    const last = run.steps.length - 1;
    return `
        <div class="tl-row rc-controls">
          <button type="button" class="btn ghost" data-action="rc-prev" data-fid="rc-prev"${rc.step <= 0 ? ' disabled' : ''}>${esc(t('Previous'))}</button>
          <button type="button" class="btn" data-action="rc-next" data-fid="rc-next"${rc.step >= last ? ' disabled' : ''}>${esc(t('Next step'))}</button>
          <button type="button" class="btn ghost" data-action="rc-play" data-fid="rc-play"${rc.step >= last && !rc.playing ? ' disabled' : ''}>${esc(rc.playing ? t('Pause') : t('Play'))}</button>
          <button type="button" class="btn ghost" data-action="rc-reset" data-fid="rc-reset">${esc(t('Restart'))}</button>
          <span class="muted small">${esc(t('Step {n} of {total}', { n: rc.step + 1, total: run.steps.length }))} · t = ${esc(String(st.t))} ms</span>
        </div>
        <div class="rc-grid">
          <div class="rc-left">
            ${codeHtml(run.scenario.code, st.line, 'rc-code')}
          </div>
          <div class="rc-right">
            <p class="tl-explain rc-explain"><span class="rc-k rc-k-${st.kind}">${esc(t(KIND[st.kind]))}</span> ${md(st.text)}</p>
            ${panelsHtml(st)}
          </div>
        </div>
        ${timelineHtml()}`;
  }

  function runHtml() {
    const sc = run.scenario;
    return `
        <div class="tl-row rc-top">
          ${scenarioSelect()}
          <label class="tl-check rc-strict"><input type="checkbox" data-rc="strict" data-fid="rc-strict"${run.strict ? ' checked' : ''}${sc.strict ? ' disabled' : ''}> ${md(t('Wrap in `<StrictMode>` (development)'))}</label>
        </div>
        <p class="rc-note">${md(t(sc.note))}</p>
        <div data-part="rc-step">${stepHtml()}</div>`;
  }

  /* ---- Predict the console ------------------------------------------------------------ */

  function predictHtml() {
    const c = CH[rc.ch];
    const sc = E.byId(c.scenario);
    const choices = E.choices(c.id);
    const pick = rc.picks[c.id];
    const right = choices.findIndex((_, k) => E.check(c.id, k));
    const solved = store.isSolved(c.id);
    const answered = pick !== undefined;
    const events = sc.actions.map((a) => `${a.at} ms: ${a.label}`);
    return `
        <div class="rc-modes">
          <p class="lr-label" aria-hidden="true">${esc(t('Challenges'))}</p>
          ${Tools.challengePicker({ list: CH, current: rc.ch, store, action: 'rc-ch', label: t('Predict-the-console challenges') })}
        </div>
        <div class="tl-goal">
          <p><strong>${esc(t(c.title))}</strong>${solved ? ` <span class="rc-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
          <p>${esc(t('Read the component and what the user does. Which console does it print? Pick one.'))}</p>
          <p class="small">${md(t(sc.note))}</p>
          ${events.length ? `<ul class="rc-events">${events.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="small">${esc(t('The user does nothing: only the mount.'))}</p>`}
        </div>
        <div class="rc-predict">
          ${codeHtml(sc.code, null, 'rc-code-p')}
          <div class="rc-choices" role="group" aria-label="${esc(t('Possible console outputs'))}">
            ${choices.map((lines, k) => {
              const cls = answered ? (k === right ? ' is-right' : k === pick ? ' is-wrong' : '') : '';
              const state = answered && k === right ? ` <span class="sr-only">${esc(t('(the right answer)'))}</span>` : answered && k === pick ? ` <span class="sr-only">${esc(t('(your answer, wrong)'))}</span>` : '';
              return `<button type="button" class="rc-choice${cls}" data-action="rc-pick" data-v="${k}" data-fid="rc-pick-${k}" aria-pressed="${pick === k}">
                  <span class="rc-choice-n">${esc(t('Console {x}', { x: String.fromCharCode(65 + k) }))}${state}</span>
                  <ol class="rc-choice-lines">${lines.map((l) => `<li><code>${esc(l)}</code></li>`).join('')}</ol>
                </button>`;
            }).join('')}
          </div>
        </div>
        ${answered ? `<p class="tl-explain rc-result${pick === right ? '' : ' rc-bad'}">${pick === right ? ICON.ok : ICON.bad}<span><strong>${esc(pick === right ? t('Correct!') : t('Not this one: the right console is highlighted.'))}</strong> ${md(t(c.why))}</span></p>` : ''}
        <div class="tl-row rc-actions">
          <button type="button" class="btn ghost" data-action="rc-watch" data-fid="rc-watch">${esc(t('Watch it step by step'))}</button>
          ${answered ? `<button type="button" class="btn ghost" data-action="rc-retry" data-fid="rc-retry">${esc(t('Try again'))}</button>` : ''}
        </div>`;
  }

  /* ---- Events ----------------------------------------------------------------------------- */

  const paintStep = (root) => keepFocus(() => Tools.paint(root, { 'rc-step': stepHtml }));
  const sayStep = (root) => { const st = current(); if (st) Tools.say(root, `${t(KIND[st.kind])}: ${plain(st.text)}`); };

  Tools.register('render-cycle', {
    title: 'Render-cycle visualiser',
    intro: 'Watch React run a component: an event queues an update, React renders with a new snapshot of state, commits the result to the page, then runs cleanups and effects. Step through small scenarios, then predict their console yourself.',
    body() {
      return `
        <div class="rc">
          ${Tools.seg({ label: t('Mode'), action: 'rc-mode', prop: 'mode', values: [['run', t('Step through')], ['predict', t('Predict the console')]], current: rc.mode, fid: 'rc-mode', mono: false })}
          <div class="rc-body">${rc.mode === 'run' ? runHtml() : predictHtml()}</div>
        </div>`;
    },
    onClick(el, root) {
      const a = el.dataset.action;
      const last = run.steps.length - 1;
      switch (a) {
        case 'rc-mode':
          stop();
          rc.mode = el.dataset.v;
          Tools.refresh('render-cycle');
          Tools.say(root, rc.mode === 'run' ? t('Step through') : t('Predict the console'));
          return;
        case 'rc-next': stop(); rc.step = Math.min(last, rc.step + 1); break;
        case 'rc-prev': stop(); rc.step = Math.max(0, rc.step - 1); break;
        case 'rc-reset': stop(); rc.step = 0; break;
        case 'rc-go': stop(); rc.step = Math.max(0, Math.min(last, Number(el.dataset.v))); break;
        case 'rc-play':
          if (rc.playing) stop();
          else if (reduceMotion) rc.step = last;
          else {
            rc.playing = true;
            rc.timer = setInterval(() => {
              if (!root.isConnected) { stop(); return; }
              if (rc.step >= run.steps.length - 1) stop();
              else rc.step++;
              paintStep(root);
            }, 1300);
          }
          paintStep(root);
          if (!rc.playing) sayStep(root);
          return;
        case 'rc-ch':
          rc.ch = Number(el.dataset.v);
          Tools.refresh('render-cycle');
          Tools.say(root, t(CH[rc.ch].title));
          return;
        case 'rc-pick': {
          const c = CH[rc.ch];
          const k = Number(el.dataset.v);
          rc.picks[c.id] = k;
          const ok = E.check(c.id, k);
          Tools.refresh('render-cycle');
          if (ok) Tools.markSolved(root, { store, id: c.id, action: 'rc-ch', index: rc.ch, say: t('Correct! {why}', { why: plain(c.why) }) });
          else Tools.say(root, t('Not this one. {why}', { why: plain(c.why) }));
          const focus = root.querySelector(`[data-fid="rc-pick-${k}"]`);
          if (focus) focus.focus({ preventScroll: true });
          return;
        }
        case 'rc-retry':
          delete rc.picks[CH[rc.ch].id];
          Tools.refresh('render-cycle');
          { const f = root.querySelector('[data-fid="rc-pick-0"]'); if (f) f.focus({ preventScroll: true }); }
          Tools.say(root, t('Pick a console again.'));
          return;
        case 'rc-watch':
          stop();
          rc.mode = 'run';
          rc.id = CH[rc.ch].scenario;
          rc.strict = false;
          retrace();
          Tools.refresh('render-cycle');
          Tools.say(root, t('Step through: {title}', { title: t(run.scenario.title) }));
          return;
        default:
          return;
      }
      paintStep(root);
      sayStep(root);
    },
    onChange(e, root) {
      const k = e.target.dataset.rc;
      if (k === 'scenario') rc.id = e.target.value;
      else if (k === 'strict') rc.strict = e.target.checked;
      else return;
      stop();
      retrace();
      Tools.refresh('render-cycle');
      Tools.say(root, t('{title}{strict}: {n} steps, {lines} console lines', { title: t(run.scenario.title), strict: run.strict ? t(' in StrictMode') : '', n: run.steps.length, lines: run.out.length }));
    },
    challenges: { store, label: 'Render-cycle challenges', ids: () => CH.map((c) => c.id) },
  });
})();
