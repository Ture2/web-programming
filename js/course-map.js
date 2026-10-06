'use strict';

/* ==========================================================================
   Topic map: every section drawn where its code runs in a web app.
     Browser (web standards, then the front-end application) ⇄ HTTP ⇄
     Server (runtime › routes › auth) ⇄ Database, with version control underneath.
   Each section is one link with its card count, tool count and progress ring.
   Used by the home page and by the app bar's "Topic map" dialog.
   PLACE puts each section id in a zone; a new section needs an entry here.
   ========================================================================== */

const CourseMap = (() => {
  /* Zone and one-line role of each section; the server zone nests runtime › routes › auth. */
  const PLACE = {
    html: { zone: 'browser', role: 'Structure and meaning' },
    css: { zone: 'browser', role: 'Presentation and layout' },
    js: { zone: 'browser', role: 'Behaviour' },
    dom: { zone: 'browser', role: 'The page as objects' },
    overview: { zone: 'http', role: 'URLs, requests and responses' },
    rest: { zone: 'http', role: 'Resources, methods and status codes' },
    node: { zone: 'server', role: 'The runtime' },
    express: { zone: 'server', role: 'How a request travels' },
    auth: { zone: 'server', role: 'Who may call what' },
    sql: { zone: 'database', role: 'Tables and queries' },
    mongo: { zone: 'database', role: 'Documents and collections' },
    components: { zone: 'app', role: 'The interface as a tree of components' },
    'state-effects': { zone: 'app', role: 'Data that changes, and side effects' },
    'data-fetching': { zone: 'app', role: 'Talking to the API' },
    routing: { zone: 'app', role: 'Screens and URLs' },
    'shared-state': { zone: 'app', role: 'Where state lives' },
    'styling-testing': { zone: 'app', role: 'Looks and checks' },
    git: { zone: 'vcs', role: 'Every change to the code, recorded' },
  };

  const byId = (id) => SECTIONS.find((s) => s.id === id);

  function node(id, opts) {
    const s = byId(id);
    if (!s) return '';
    const p = ProgressPage.summary().secs.find((x) => x.id === id) || { pct: 0 };
    const n = s.tools.length;
    const cards = s.data.concepts.length;
    return `<a class="cm-node" href="${s.base}"${opts.current === s ? ' aria-current="page"' : ''}>
        <span class="cm-node-name">${railIcon(s.icon)}<span>${esc(t(s.title))}</span></span>
        <span class="cm-role">${esc(t(PLACE[id].role))}</span>
        <span class="cm-meta">
          <span class="cm-cards">${esc(cards === 1 ? t('1 card') : t('{n} cards', { n: cards }))}</span>
          ${n ? `<span class="cm-tools" title="${esc(t('{n} interactive tools', { n }))}">${railIcon('practice')}${n}<span class="sr-only"> ${esc(n === 1 ? t('interactive tool') : t('interactive tools'))}</span></span>` : ''}
          <span class="cm-ring" title="${esc(t('{pct}% done', { pct: p.pct }))}">${ProgressPage.ring(p.pct, 26)}<span class="sr-only">${esc(t('{pct}% done', { pct: p.pct }))}</span></span>
        </span>
      </a>`;
  }

  const ids = (zone) => Object.keys(PLACE).filter((id) => PLACE[id].zone === zone && byId(id));

  function zone(key, title, sub, body, idp) {
    return `<section class="cm-zone cm-${key}" aria-labelledby="${idp}-${key}">
        <header class="cm-zone-head"><h3 id="${idp}-${key}">${esc(t(title))}</h3><p>${esc(t(sub))}</p></header>
        ${body}
      </section>`;
  }

  /* A wire between two zones: one arrow each way, labelled. */
  const wire = (cls, out, back, body = '') => `<div class="cm-wire ${cls}">
      <p class="cm-arrow cm-out"><span>${esc(t(out))}</span></p>
      ${body}
      <p class="cm-arrow cm-back"><span>${esc(t(back))}</span></p>
    </div>`;

  /* opts: { current: section | null, idp: id prefix (the map can be on the page and in the dialog) }. */
  function html(opts = {}) {
    const o = { current: null, idp: 'cm', ...opts };
    const list = (zoneKey) => `<div class="cm-nodes">${ids(zoneKey).map((id) => node(id, o)).join('')}</div>`;
    // The front-end application runs on top of the web standards, in the same browser.
    const app = ids('app').length
      ? `<div class="cm-box cm-box-app"><p class="cm-box-h">${esc(t('Front-end application'))}</p>${list('app')}</div>`
      : `<p class="cm-soon">${esc(t('Front-end applications (components, state, client-side routing): in preparation'))}</p>`;
    const server = `<div class="cm-box cm-box-node">${node('node', o)}
        <div class="cm-box cm-box-express">${node('express', o)}
          <div class="cm-box cm-box-auth">${node('auth', o)}</div>
        </div>
      </div>`;
    return `<div class="cm">
        <div class="cm-zones">
          ${zone('browser', 'Browser', 'Runs on the user’s device', `${list('browser')}${app}`, o.idp)}
          ${wire('cm-http', 'Request', 'Response', `<p class="cm-wire-h">HTTP</p>${list('http')}`)}
          ${zone('server', 'Server', 'Answers each request', server, o.idp)}
          ${wire('cm-db-wire', 'Query', 'Data')}
          ${zone('database', 'Database', 'Keeps the data', list('database'), o.idp)}
        </div>
        <div class="cm-git">
          ${node('git', o)}
          <p class="cm-git-note">${esc(t('The code of every zone lives in a repository: each commit records a change, branches let you try an idea safely, and a pull request brings it back.'))}</p>
        </div>
        <p class="cm-legend"><span>${railIcon('practice')}${esc(t('Interactive tools in the section'))}</span><span>${ProgressPage.ring(40, 18)}${esc(t('Your progress (cards read, quiz, tool challenges)'))}</span></p>
      </div>`;
  }

  return { html };
})();
