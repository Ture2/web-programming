'use strict';

/* ==========================================================================
   Progress across the course: cards read, best quiz scores and tool
   challenges solved (this device only). Route: #/progress. Also draws the
   ring of the app-bar button. Each section reports its own parts
   (ConceptSection's progress()) and each tool with challenges adds one more
   (the `challenges` option of Tools.register); this page only adds them up.
   The summary is cached until a progress store changes ('progress-change').
   ========================================================================== */

const ProgressPage = (() => {
  const tools = (s) => s.tools.map((id) => ({ id, def: Tools.def(id) })).filter((x) => x.def && x.def.progress);

  /* One entry per section, in teaching order: { id, title, base, parts, done, total, pct }. */
  function sections() {
    return SECTIONS.filter((s) => s.data.concepts.length).map((s) => {
      const parts = s.module.progress();
      tools(s).forEach(({ id, def }) => {
        const p = def.progress();
        if (p.total) parts.push({ ...p, done: Math.min(p.done, p.total), next: { href: `${s.base}/practice/${id}`, label: Tools.title(id) } });
      });
      const done = parts.reduce((n, p) => n + p.done, 0);
      const total = parts.reduce((n, p) => n + p.total, 0);
      return { id: s.id, title: t(s.title), base: s.base, parts, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    });
  }

  let cache = null;
  function summary() {
    if (cache) return cache;
    const secs = sections();
    const done = secs.reduce((n, s) => n + s.done, 0);
    const total = secs.reduce((n, s) => n + s.total, 0);
    return (cache = { secs, done, total, pct: total ? Math.round((done / total) * 100) : 0 });
  }

  /* A ring showing pct (0–100). size in px; the label is for the big ring only. */
  function ring(pct, size, label = '') {
    const r = size / 2 - (size > 40 ? 6 : 3);
    const c = 2 * Math.PI * r;
    const w = size > 40 ? 8 : 3.5;
    return `<svg class="pring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">
        <circle class="pring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}"/>
        <circle class="pring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${w}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
        ${label ? `<text x="50%" y="50%" class="pring-text" dominant-baseline="central" text-anchor="middle">${esc(label)}</text>` : ''}
      </svg>`;
  }

  const bar = (p, key) => {
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return `<div class="prow${p.done >= p.total && p.total ? ' is-done' : ''}">
        <span class="prow-label" id="pl-${esc(key)}">${esc(p.label)}</span>
        <div class="pbar" role="progressbar" aria-labelledby="pl-${esc(key)}" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><span style="width:${pct}%"></span></div>
        <span class="prow-n">${p.done}/${p.total}</span>
      </div>`;
  };

  function sectionHtml(s) {
    const next = s.parts.find((p) => p.done < p.total && p.next);
    return `<article class="pcard" aria-labelledby="pc-${s.id}">
        <header class="pcard-head">
          <h2 id="pc-${s.id}"><a href="${s.base}">${esc(s.title)}</a></h2>
          <a class="pcard-pdf" href="${summaryPdf(s.id)}" download title="${esc(t('Download the summary of {section} (PDF)', { section: s.title }))}">PDF</a>
          <span class="pcard-pct">${s.pct}%</span>
        </header>
        ${s.parts.map((p, k) => bar(p, `${s.id}-${k}`)).join('')}
        <p class="pcard-next">${next
          ? `<a class="btn" href="${next.next.href}">${esc(t('Continue'))}</a><span class="pcard-what">${esc(next.label)}: ${esc(next.next.label)}</span>`
          : `<span class="pcard-done">${ICON.ok}${esc(t('Section complete'))}</span>`}</p>
      </article>`;
  }

  function render() {
    const s = summary();
    $('#view').innerHTML = `
      <section class="progress-page" aria-labelledby="progress-h">
        <header class="progress-head">
          ${ring(s.pct, 112, `${s.pct}%`)}
          <div>
            <h1 id="progress-h" tabindex="-1">${esc(t('Your progress'))}</h1>
            <p class="story">${esc(t('{done} of {total} steps: cards read, quiz answers right and tool challenges solved.', { done: s.done, total: s.total }))}</p>
          </div>
        </header>
        <div class="pgrid">${s.secs.map(sectionHtml).join('')}</div>
        <footer class="progress-foot">
          <p class="meta">${esc(t('Saved in this browser only. It is never sent anywhere, and another device starts from zero.'))}</p>
          <button type="button" class="btn ghost" data-action="clear-progress" data-fid="clear-progress">${esc(t('Clear all progress'))}</button>
        </footer>
      </section>`;
    return t('Your progress');
  }

  /* Keys that count towards progress (fixed once every script has loaded). */
  let keys = null;
  const progressKeys = () => keys || (keys = new Set([
    ...SECTIONS.flatMap((s) => s.module.progressKeys),
    ...SECTIONS.flatMap((s) => tools(s).map((x) => x.def.storeKey)),
  ]));
  /* Saved work (code, layouts) is cleared with the progress; language, theme and rail layout stay. */
  const workKeys = () => SECTIONS.flatMap((s) => s.tools.map((id) => Tools.def(id)).filter((d) => d && d.workKey).map((d) => d.workKey));

  function onClick(el) {
    if (el.dataset.action !== 'clear-progress') return;
    if (!window.confirm(t('Clear your progress and saved work in every section on this device? This cannot be undone.'))) return;
    [...progressKeys(), ...workKeys()].forEach((k) => makeStore(k).clear());
    location.reload();               // every section keeps its state in memory
  }

  /* The app-bar button: a small ring and the overall percentage. */
  let shownPct = null;
  function updateButton() {
    const btn = $('#progress-btn');
    if (!btn) return;
    const s = summary();
    if (s.pct === shownPct) return;
    shownPct = s.pct;
    btn.querySelector('.progress-ring').innerHTML = ring(s.pct, 28);
    btn.querySelector('.progress-pct').textContent = `${s.pct}%`;
    btn.setAttribute('aria-label', t('Your progress: {pct}%', { pct: s.pct }));
    btn.title = t('Your progress: {pct}%', { pct: s.pct });
  }
  /* Only stores that count towards progress invalidate the summary (not saved work or layout). */
  window.addEventListener('progress-change', (e) => {
    if (!progressKeys().has(e.detail)) return;
    cache = null;
    updateButton();
  });

  /* The n quiz topics with the lowest best score (as a share of the topic), among topics already tried. */
  function weakTopics(n) {
    return SECTIONS.flatMap((s) => s.module.topicScores().filter((x) => x.tried && x.total && x.best < x.total).map((x) => ({ ...x, section: t(s.title), ratio: x.best / x.total })))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, n);
  }

  return { render, onClick, updateButton, summary, ring, weakTopics };
})();
