'use strict';

/* ==========================================================================
   The sections, each a ConceptSection (js/concept-section.js) fed by
   data/<lang>/<file>.js and a "Tools" hub (js/tools/registry.js).
   Order here is learning order; SECTIONS is read by the router, the home page,
   the progress page, the map and tools/build-pdfs.mjs.
   Sections are named by concept; a framework (Express, MongoDB, React…) is only the
   worked example inside the cards. Each belongs to an area of a web app (AREAS), which
   is also the first part of its route: #/<area>/<slug>. `id` names the data, storage keys
   and PDF, so it never changes; a renamed route goes in LEGACY_ROUTES (js/main.js).
   ========================================================================== */

/* Where the code runs, in the order a request travels. */
const AREAS = {
  browser: { title: 'Browser' },
  http: { title: 'HTTP' },
  server: { title: 'Server' },
  database: { title: 'Database' },
  vcs: { title: 'Version control' },
};

const SECTIONS = (() => {
  const LIST = [
    { id: 'overview', prefix: 'WEB', base: '#/http/web', title: 'How the web works', badge: 'WEB', icon: 'web', area: 'http',
      blurb: 'Clients, servers, URLs and HTTP: what happens between typing an address and seeing a page.',
      tools: ['url-anatomy', 'http-explorer'] },
    { id: 'html', prefix: 'HTML', base: '#/browser/html', title: 'HTML', badge: '</>', icon: 'semantic', area: 'browser',
      blurb: 'Structure and meaning: elements, attributes, semantic landmarks, links, images and forms.',
      tools: ['semantic-outline'] },
    { id: 'css', prefix: 'CSS', base: '#/browser/css', title: 'CSS', badge: 'CSS', icon: 'grid', area: 'browser',
      blurb: 'Selectors, the cascade, the box model, Flexbox, Grid and responsive design.',
      tools: ['specificity', 'selector-tester', 'box-model', 'flexbox', 'grid', 'responsive'] },
    { id: 'js', prefix: 'JS', base: '#/browser/js', title: 'JavaScript', badge: 'JS', icon: 'func', area: 'browser',
      blurb: 'Values, types, logic, loops, arrays, objects and functions.',
      tools: ['playground', 'truthy-table', 'value-reference', 'loop-tracer'] },
    { id: 'dom', prefix: 'DOM', base: '#/browser/dom', title: 'DOM and events', badge: 'DOM', icon: 'tree', area: 'browser',
      blurb: 'Reading and changing the page from JavaScript, and reacting to the user.',
      tools: ['dom-tree', 'event-propagation'] },
    { id: 'node', prefix: 'NODE', base: '#/server/runtime', title: 'Server-side JavaScript', badge: 'RUN', icon: 'server', area: 'server',
      blurb: 'JavaScript outside the browser: the runtime, packages, modules, environment variables and the event loop.',
      tools: ['event-loop'] },
    { id: 'express', prefix: 'EXPRESS', base: '#/server/routes', title: 'Routes and middleware', badge: 'MW', icon: 'pipeline', area: 'server',
      blurb: 'Routes, middleware, controllers and error handling: how a request travels through a server.',
      tools: ['middleware-pipeline', 'route-matcher'] },
    { id: 'rest', prefix: 'REST', base: '#/http/api-design', title: 'Designing APIs', badge: 'API', icon: 'arrow', area: 'http',
      blurb: 'Resources, methods, status codes and JSON: designing, building and testing a CRUD API.',
      tools: ['api-builder', 'status-chooser'] },
    { id: 'sql', prefix: 'SQL', base: '#/database/relational', title: 'Relational databases', badge: 'SQL', icon: 'database', area: 'database',
      blurb: 'Tables, keys and SQL queries, and how the models layer of an API talks to the database.',
      tools: ['sql-runner'] },
    { id: 'mongo', prefix: 'MONGO', base: '#/database/documents', title: 'Document databases', badge: 'DOC', icon: 'doc', area: 'database',
      blurb: 'Documents and collections: embedding, find filters, projection, aggregation and indexes.',
      tools: ['mongo-playground'] },
    { id: 'auth', prefix: 'AUTH', base: '#/server/auth', title: 'Authentication and security', badge: 'SEC', icon: 'lock', area: 'server',
      blurb: 'Who is calling and what they may do: password hashing, sessions and JWT, CORS, validation and pagination.',
      tools: ['jwt-inspector', 'hash-cost', 'cors-sim'] },
    { id: 'components', prefix: 'COMPONENTS', base: '#/browser/components', title: 'Components', badge: 'CMP', icon: 'component', area: 'browser',
      blurb: 'Building an interface from components: JSX, props, lists and keys, conditional rendering, events and forms.',
      tools: ['jsx-viewer', 'component-playground'] },
    { id: 'state-effects', prefix: 'STATE', base: '#/browser/state-effects', title: 'State and effects', badge: 'STA', icon: 'state', area: 'browser',
      blurb: 'State that triggers a re-render, effects that synchronise with the outside world, and the rules that keep them predictable.',
      tools: ['render-cycle'] },
    { id: 'data-fetching', prefix: 'FETCH', base: '#/browser/data-fetching', title: 'Fetching data', badge: 'NET', icon: 'fetch', area: 'browser',
      blurb: 'Calling an API from the front end: loading, error and empty states, tokens, cancellation, search and pagination.',
      tools: ['fetch-lab'] },
    { id: 'routing', prefix: 'ROUTING', base: '#/browser/routing', title: 'Client-side routing', badge: 'RTE', icon: 'route', area: 'browser',
      blurb: 'One page, many screens: routes, URL parameters, nested layouts, navigation and protected routes.',
      tools: ['router-sim'] },
    { id: 'shared-state', prefix: 'SHARED', base: '#/browser/shared-state', title: 'Shared state', badge: 'SHR', icon: 'share', area: 'browser',
      blurb: 'Where state should live: lifting it up, prop drilling, context and an authentication provider.',
      tools: ['state-tree'] },
    { id: 'styling-testing', prefix: 'STYLING', base: '#/browser/styling-testing', title: 'Styling and testing', badge: 'STY', icon: 'brush', area: 'browser',
      blurb: 'Styling components without collisions, responsive layouts, and a first automated component test.',
      tools: ['component-tests'] },
    { id: 'git', prefix: 'GIT', base: '#/vcs/repositories', title: 'Version control', badge: 'VCS', icon: 'branch', area: 'vcs',
      blurb: 'Tracking every change to the code, from the first commit to branches, pull requests and conflicts.',
      tools: ['git-sim'] },
  ];

  LIST.forEach((s, k) => {
    s.data = sectionData(s.prefix);
    s.tools = s.tools.filter((id) => Tools.has(id) || console.warn(`[tools] ${s.id}: unknown tool ${id}`));
    const next = LIST[k + 1];
    s.module = ConceptSection({
      base: s.base,
      title: () => t(s.title),
      course: () => t(AREAS[s.area].title),
      badge: s.badge,
      pdf: s.id,
      groups: s.data.groups,
      concepts: s.data.concepts,
      quiz: s.data.quiz,
      topics: s.data.topics,
      quizKey: `${s.id}-quiz-v1`,
      practice: toolPractice(s.base, s.tools),
      perfectText: () => (next ? t('You did not miss any. Move on to {next}.', { next: t(next.title) }) : t('You did not miss any. Well done!')),
      nextLink: next ? { href: next.base, label: () => t('Go to {next}', { next: t(next.title) }) } : null,
    });
  });
  return LIST;
})();
