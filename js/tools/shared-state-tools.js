'use strict';

/* ==========================================================================
   state-tree (Shared state): place a piece of state (or a context provider) in a
   component tree and see who reads it, which props have to be passed down through
   components that do not use them, and which components re-render when it changes.
   Model and rules: js/tools/shared-state-engine.js (pure, unit-tested).

   Free play: pick a piece of state, Props or Context (switching clears the placement),
     composition (Layout takes its content as children), memo, provider style; "Place here"
     on any component (placing it twice shows the duplicated-state warning).
   Challenges: placement goals (checked on every change) and "select the components"
     questions (checked with a button). Solved: challengeStore 'state-tree-challenges-v1'.
   ========================================================================== */

(() => {
  const E = StateTreeEngine;
  const store = challengeStore('state-tree-challenges-v1');
  const CH = E.CHALLENGES;

  const st = { ch: 'free', cfg: { ...E.DEFAULT, placements: [] }, picked: [], answered: false };
  const free = { ...E.DEFAULT, placements: [] };          // free-play setup, kept while doing challenges

  const plain = (s) => String(s).replace(/\*\*|`/g, '');
  const cur = () => (st.ch === 'free' ? null : CH[st.ch]);
  const picking = () => { const c = cur(); return !!c && c.kind === 'pick'; };
  const list = (ids) => (ids.length ? ids.join(', ') : t('none'));

  function loadChallenge(k) {
    if (st.ch === 'free') Object.assign(free, st.cfg, { placements: [...st.cfg.placements] });
    st.ch = k;
    st.picked = [];
    st.answered = false;
    if (k === 'free') st.cfg = { ...free, placements: [...free.placements] };
    else st.cfg = E.norm({ ...E.DEFAULT, ...CH[k].preset });
  }

  /* ---- Controls ------------------------------------------------------------------------- */

  function controlsHtml() {
    const c = st.cfg;
    const locked = picking();
    const dis = locked ? ' disabled' : '';
    return `<fieldset class="st-controls"${dis}>
        <legend class="sr-only">${esc(t('Setup'))}</legend>
        ${Tools.select({ label: t('Piece of state'), fid: 'st-item', current: c.item, data: { st: 'item' }, cls: 'st-item', options: E.ITEMS.map((i) => [i.id, t(i.label)]) })}
        ${Tools.seg({ label: t('How it travels'), action: 'st-set', prop: 'mode', values: [['props', t('Props (lift state)')], ['context', t('Context')]], current: c.mode, fid: 'st-mode', mono: false })}
        ${c.mode === 'context' ? Tools.seg({ label: t('Provider'), action: 'st-set', prop: 'providerStyle', values: [['wrapper', t('Provider component with children')], ['inline', t('Inline in the holder')]], current: c.providerStyle, fid: 'st-style', mono: false }) : ''}
        <div class="st-checks">
          <label class="tl-check"><input type="checkbox" data-st="composition" data-fid="st-comp"${c.composition ? ' checked' : ''}> <span>${md(t('Composition: App passes Header, Sidebar and TaskPage into Layout as `children`'))}</span></label>
          <label class="tl-check"><input type="checkbox" data-st="memo" data-fid="st-memo"${c.memo ? ' checked' : ''}> <span>${md(t('`memo` on every component (stable callbacks)'))}</span></label>
        </div>
      </fieldset>`;
  }

  /* ---- The tree ------------------------------------------------------------------------- */

  function rowHtml(id, r, reveal) {
    const c = st.cfg;
    const user = r.item.users.find((u) => u.node === id);
    const placed = c.placements.includes(id);
    const drill = reveal.drill ? r.drill.find((d) => d.node === id) : null;
    const tags = [];
    if (placed) tags.push(`<span class="st-tag st-holds">${esc(c.mode === 'context' ? (c.providerStyle === 'wrapper' ? t('wrapped by the provider') : t('holds the state + provider')) : t('holds the state'))}</span>`);
    if (user && user.reads) tags.push(`<span class="st-tag st-reads">${esc(t('reads'))} <code>${esc(user.reads)}</code></span>`);
    if (user && user.writes) tags.push(`<span class="st-tag st-writes">${esc(t('changes it'))}${c.mode === 'props' ? ` <code>${esc(user.writes)}</code>` : ''}</span>`);
    if (drill) tags.push(`<span class="st-tag ${drill.uses ? 'st-fwd' : 'st-drill'}">${esc(drill.uses ? t('also passes on') : t('only passes on'))} <code>${esc(drill.props.filter((p) => !drill.uses || ![user && user.reads, user && user.writes].includes(p)).join(', ') || drill.props.join(', '))}</code></span>`);
    if (r.outside.includes(id)) tags.push(`<span class="st-tag st-out">${esc(t('cannot reach it'))}</span>`);
    if (reveal.rerender && r.rerender.includes(id)) tags.push(`<span class="st-tag st-rr">${esc(t('re-renders'))}</span>`);
    const composed = c.composition && E.COMPOSED.includes(id);
    const owner = composed ? `<span class="st-owner">${esc(t('created by App, shown inside Layout'))}</span>` : '';
    const sel = st.picked.includes(id);
    const btn = picking()
      ? `<button type="button" class="st-btn${sel ? ' is-on' : ''}" data-action="st-pick" data-v="${esc(id)}" data-fid="st-pick-${esc(id)}" aria-pressed="${sel}"${st.answered ? ' disabled' : ''}>${esc(sel ? t('Selected') : t('Select'))}<span class="sr-only"> ${esc(id)}</span></button>`
      : `<button type="button" class="st-btn${placed ? ' is-on' : ''}" data-action="st-place" data-v="${esc(id)}" data-fid="st-place-${esc(id)}" aria-pressed="${placed}">${esc(placed ? t('Remove') : t('Place here'))}<span class="sr-only"> ${esc(id)}</span></button>`;
    const cls = ['st-node'];
    if (placed) cls.push('is-holder');
    if (user) cls.push('is-user');
    if (reveal.rerender && r.rerender.includes(id)) cls.push('is-rr');
    if (drill && !drill.uses) cls.push('is-drill');
    if (r.outside.includes(id)) cls.push('is-out');
    if (picking() && sel) cls.push('is-picked');
    const provider = placed && c.mode === 'context' && c.providerStyle === 'wrapper' && r.status === 'ok'
      ? `<li class="st-node st-provider" style="--d:${E.depth(id)}"><div class="st-row"><div class="st-main"><span class="st-name"><code>&lt;${esc(r.item.provider)}&gt;</code></span><span class="st-tags"><span class="st-tag st-holds">${esc(t('holds the state'))}</span>${reveal.rerender ? `<span class="st-tag st-rr">${esc(t('re-renders'))}</span>` : ''}</span></div></div></li>`
      : '';
    return `${provider}<li class="${cls.join(' ')}" style="--d:${E.depth(id) + (provider ? 1 : 0)}">
        <div class="st-row">
          <div class="st-main">
            <span class="st-name"><code>${esc(id)}</code> <span class="st-role">${esc(t(E.NODES.find((n) => n.id === id).role))}</span>${owner}</span>
            ${tags.length ? `<span class="st-tags">${tags.join('')}</span>` : ''}
          </div>
          ${btn}
        </div>
      </li>`;
  }

  function treeHtml(r, reveal) {
    // a provider wrapper shifts the subtree under the placed node one level to the right
    const c = st.cfg;
    const wrapAt = c.mode === 'context' && c.providerStyle === 'wrapper' && r.status === 'ok' ? r.holder : null;
    const rows = E.IDS.map((id) => {
      const inside = wrapAt && (id === wrapAt || isBelow(id, wrapAt));
      return rowHtml(id, r, reveal).replace(/style="--d:(\d+)"/g, (m, d) => (inside && id !== wrapAt ? `style="--d:${Number(d) + 1}"` : m));
    });
    return `<ol class="st-tree" aria-label="${esc(t('Component tree'))}">${rows.join('')}</ol>`;
  }
  const isBelow = (id, top) => { for (let p = E.parentOf(id); p; p = E.parentOf(p)) if (p === top) return true; return false; };

  /* ---- The analysis --------------------------------------------------------------------- */

  function statusHtml(r) {
    const c = st.cfg;
    if (r.status === 'empty') return `<p class="tl-explain st-status">${esc(t(picking() ? 'Nothing placed.' : c.mode === 'context' ? 'Press "Place here" on the component the provider should wrap.' : 'Press "Place here" on the component that should hold this state.'))}</p>`;
    if (r.status === 'duplicate') return `<p class="tl-explain st-status st-bad">${ICON.bad}<span>${md(t(r.notes[0]))}</span></p>`;
    if (r.status === 'outside') {
      const why = c.mode === 'context'
        ? t('{list} {is} not inside the provider, so useContext there returns the default value, not this state.', { list: r.outside.join(', '), is: r.outside.length > 1 ? 'are' : 'is' })
        : t('{list} {is} not below {holder}: props only flow down, so {it} cannot read or change it.', { list: r.outside.join(', '), is: r.outside.length > 1 ? 'are' : 'is', holder: r.holder, it: r.outside.length > 1 ? 'they' : 'it' });
      return `<p class="tl-explain st-status st-bad">${ICON.bad}<span><strong>${esc(t('Misplaced.'))}</strong> ${esc(why)} ${esc(t('Closest common parent: {lca}.', { lca: c.mode === 'context' ? r.renderLca : r.propsLca }))}</span></p>`;
    }
    const warn = r.tooHigh || r.notes.length;
    return `<p class="tl-explain st-status${warn ? ' st-warn' : ''}">${warn ? ICON.note : ICON.ok}<span><strong>${esc(t('Every user can reach it.'))}</strong> ${r.notes.map((n) => esc(t(n))).join(' ')}</span></p>`;
  }

  function factsHtml(r, reveal) {
    if (r.status !== 'ok') return '';
    const c = st.cfg;
    const total = E.IDS.length;
    const rr = r.rerender.length + (r.extra ? 1 : 0);
    const facts = [];
    facts.push([t('Used by'), r.item.users.map((u) => u.node).join(', ')]);
    if (reveal.drill) {
      facts.push([t('Passed on without being used'), c.mode === 'context' ? t('none: consumers call useContext') : list(r.drillOnly)]);
    }
    if (reveal.rerender) {
      facts.push([t('Re-render when it changes'), `${list([...(r.extra ? [r.extra] : []), ...r.rerender])} (${rr}/${total + (r.extra ? 1 : 0)})`]);
    }
    const code = E.codeLines(r);
    return `<dl class="st-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${reveal.rerender || reveal.drill ? `<p class="lr-label">${esc(t('What the code looks like'))}</p><pre class="st-code" tabindex="0" aria-label="${esc(t('Code sketch'))}"><code>${esc(code.join('\n'))}</code></pre>` : ''}`;
  }

  /* ---- Challenges ----------------------------------------------------------------------- */

  function goalHtml() {
    const c = cur();
    if (!c) return `<p class="st-intro small">${md(t('Free play: choose a piece of state, then place it. The tree marks who reads it, who only passes it on, and who re-renders when it changes.'))}</p>`;
    const solved = store.isSolved(c.id);
    return `<div class="tl-goal">
        <p><strong>${esc(t(c.title))}</strong>${solved ? ` <span class="st-done">${ICON.ok}${esc(t('Solved'))}</span>` : ''}</p>
        <p>${md(t(c.goal))}</p>
        ${c.hint ? `<details class="st-hint"><summary>${esc(t('Hint'))}</summary><p>${md(t(c.hint))}</p></details>` : ''}
      </div>`;
  }

  function pickFooter() {
    const c = cur();
    if (!picking()) {
      if (!c) return '';
      const ok = E.check(c.id, st.cfg);
      return `<p class="tl-explain st-result${ok ? '' : ' st-pending'}">${ok ? `${ICON.ok}<span><strong>${esc(t('Solved!'))}</strong> ${md(t(c.why))}</span>` : `<span class="muted">${esc(t('Not yet: change the setup until the goal is met.'))}</span>`}</p>`;
    }
    if (!st.answered) {
      return `<div class="tl-row st-actions"><button type="button" class="btn" data-action="st-check" data-fid="st-check">${esc(t('Check my answer'))}</button>
        <span class="muted small">${esc(t('{n} selected', { n: st.picked.length }))}</span></div>`;
    }
    const ok = E.check(c.id, st.cfg, st.picked);
    const answer = E.answerOf(c);
    return `<p class="tl-explain st-result${ok ? '' : ' st-bad'}">${ok ? ICON.ok : ICON.bad}<span><strong>${esc(ok ? t('Correct!') : t('Not quite. The answer: {list}.', { list: answer.join(', ') }))}</strong> ${md(t(c.why))}</span></p>
      <div class="tl-row st-actions"><button type="button" class="btn ghost" data-action="st-retry" data-fid="st-retry">${esc(t('Try again'))}</button></div>`;
  }

  /* ---- Tool ----------------------------------------------------------------------------- */

  function bodyHtml() {
    const r = E.analyse(st.cfg);
    const c = cur();
    const ask = c && c.kind === 'pick' ? c.ask : null;
    // a question hides its own answer until it is checked
    const reveal = { drill: !(ask === 'drill' && !st.answered), rerender: !(ask && !st.answered) };
    return `
      <div class="st">
        <div class="st-ch">
          <p class="lr-label" aria-hidden="true">${esc(t('Challenges'))}</p>
          ${Tools.challengePicker({ list: CH, current: st.ch, store, action: 'st-ch', label: t('State-tree challenges'), free: { value: 'free', label: t('Free play') } })}
        </div>
        ${goalHtml()}
        ${controlsHtml()}
        <div class="st-grid">
          <div class="st-left">${treeHtml(r, reveal)}</div>
          <div class="st-right">${statusHtml(r)}${factsHtml(r, reveal)}</div>
        </div>
        ${pickFooter()}
      </div>`;
  }

  function summary() {
    const r = E.analyse(st.cfg);
    if (r.status === 'empty') return t('Nothing placed.');
    if (r.status === 'duplicate') return plain(r.notes[0]);
    if (r.status === 'outside') return t('Misplaced: {list} cannot reach it.', { list: r.outside.join(', ') });
    if (picking() && !st.answered) return t('Placed in {holder}.', { holder: r.holder });
    return t('Placed in {holder}. Passed on without being used: {d}. Re-renders: {n}.', { holder: r.holder, d: st.cfg.mode === 'context' ? t('none') : list(r.drillOnly), n: r.rerender.length + (r.extra ? 1 : 0) });
  }

  function afterChange(root) {
    Tools.refresh('state-tree');
    const c = cur();
    if (c && c.kind === 'place' && E.check(c.id, st.cfg)) {
      Tools.markSolved(root, { store, id: c.id, action: 'st-ch', index: st.ch, say: t('Solved! {why}', { why: plain(c.why) }) });
      Tools.refresh('state-tree');
    } else Tools.say(root, summary());
  }

  Tools.register('state-tree', {
    title: 'State tree',
    intro: 'Decide where a piece of state lives. Place it (or a context provider) at a component and see who can read it, which components only pass props along, and which re-render when it changes.',
    body: () => bodyHtml(),
    onClick(el, root) {
      const a = el.dataset.action;
      const v = el.dataset.v;
      switch (a) {
        case 'st-ch':
          loadChallenge(v === 'free' ? 'free' : Number(v));
          Tools.refresh('state-tree');
          Tools.say(root, st.ch === 'free' ? t('Free play') : `${t(cur().title)}. ${plain(t(cur().goal))}`);
          return;
        case 'st-set':
          if (picking() || st.cfg[el.dataset.prop] === v) return;
          st.cfg[el.dataset.prop] = v;
          // props and a provider are different code: switching means placing it again
          if (el.dataset.prop === 'mode') st.cfg.placements = [];
          afterChange(root);
          return;
        case 'st-place': {
          const p = st.cfg.placements;
          st.cfg.placements = p.includes(v) ? p.filter((x) => x !== v) : [...p, v];
          afterChange(root);
          return;
        }
        case 'st-pick':
          if (st.answered) return;
          st.picked = st.picked.includes(v) ? st.picked.filter((x) => x !== v) : [...st.picked, v];
          Tools.refresh('state-tree');
          Tools.say(root, t('{id} {state}. {n} selected.', { id: v, state: st.picked.includes(v) ? t('selected') : t('not selected'), n: st.picked.length }));
          return;
        case 'st-check': {
          const c = cur();
          st.answered = true;
          const ok = E.check(c.id, st.cfg, st.picked);
          Tools.refresh('state-tree');
          if (ok) Tools.markSolved(root, { store, id: c.id, action: 'st-ch', index: st.ch, say: t('Correct! {why}', { why: plain(c.why) }) });
          else Tools.say(root, t('Not quite. The answer: {list}. {why}', { list: E.answerOf(c).join(', '), why: plain(c.why) }));
          if (ok) Tools.refresh('state-tree');
          const f = root.querySelector('[data-fid="st-retry"]') || root.querySelector('.st-result');
          if (f && f.focus) f.focus({ preventScroll: true });
          return;
        }
        case 'st-retry':
          st.picked = [];
          st.answered = false;
          Tools.refresh('state-tree');
          { const f = root.querySelector('[data-fid="st-check"]'); if (f) f.focus({ preventScroll: true }); }
          Tools.say(root, t('Select the components again.'));
          return;
        default:
      }
    },
    onChange(e, root) {
      if (picking()) return;
      const k = e.target.dataset.st;
      if (k === 'item') { st.cfg.item = e.target.value; st.cfg.placements = []; }
      else if (k === 'composition' || k === 'memo') st.cfg[k] = e.target.checked;
      else return;
      afterChange(root);
    },
    challenges: { store, label: 'State-tree challenges', ids: () => CH.map((c) => c.id) },
  });
})();
