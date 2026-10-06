'use strict';

/* ==========================================================================
   Component test runner engine (pure, no page globals; also runs in Node:
   site/test/styling-testing-engine.test.mjs). The component-tests tool
   (js/tools/styling-testing-tools.js) loads this same file inside a sandboxed
   frame, next to React, and runs the student's tests there.

   A small, teaching subset of Vitest, React Testing Library, user-event and
   jest-dom. Everything that does not need a browser lives here:

   Nodes: the engine reads any DOM-like tree through nodeType, tagName,
     getAttribute, attributes, childNodes, parentNode, nodeValue and the
     value / checked / selected properties, so the real DOM and the tiny fake
     DOM of the unit tests both work.

   ComponentTestEngine.roleOf(node) → 'button' | 'textbox' | … | null
     The explicit role attribute, else the implicit role of the element (a subset
     of the HTML-ARIA mapping: buttons, links, headings, form fields, lists,
     landmarks, tables, img, paragraph…).
   ComponentTestEngine.accessibleName(node) → string
     A subset of the accessible-name computation: aria-labelledby, aria-label,
     <label> (for= or wrapping), alt, value of input buttons, the text content for
     roles named from content (button, link, heading, cell, option…), title,
     placeholder. Hidden content (aria-hidden, hidden) is skipped.
   ComponentTestEngine.isInaccessible(node, env) → bool (hidden, aria-hidden,
     display: none, visibility: hidden on the node or an ancestor).
   ComponentTestEngine.queryAll(type, container, matcher, options, env) → [nodes]
     type: Role | LabelText | PlaceholderText | Text | DisplayValue | AltText | Title | TestId
   ComponentTestEngine.queries(container, env) → { getByRole, queryByText, findAllByLabelText… }
     the 48 query functions bound to a container, with Testing Library's error
     messages (shortened). find* retry with env.waitFor (default: waitFor below).
   ComponentTestEngine.waitFor(callback, { timeout = 1000, interval = 50, onStart, onEnd })
   ComponentTestEngine.prettyDom(node, max) / describe(node) / format(value) / equals(a, b)
   ComponentTestEngine.createExpect(env) → expect(value).toBe(…) / .not / .resolves / .rejects
     Vitest's core matchers, the mock matchers and jest-dom's DOM matchers.
   ComponentTestEngine.createVi() → { fn, spyOn, restoreAllMocks, clearAllMocks, isMockFunction }
   ComponentTestEngine.createRunner() → { api: { describe, it, test, beforeEach, afterEach }, run(opts) }
     run({ timeout, afterEach }) → Promise<[{ name, status: 'pass' | 'fail' | 'skip', error, duration }]>
   ComponentTestEngine.lineOf(stack, file) → the line of `file` in an error stack (−1 for the wrapper line)
   ComponentTestEngine.advise(source) → [{ rule, level: 'warn' | 'info', text, line }]
     advice in the spirit of eslint-plugin-testing-library and eslint-plugin-jest-dom.
   ComponentTestEngine.COMPONENTS, CHALLENGES, variantCode(component, variant),
     variantsOf(challenge), judge(challenge, runs, source), validateChallenge(c)
   ========================================================================== */

const ComponentTestEngine = (() => {
  const ELEMENT = 1;
  const TEXT = 3;
  const DOCUMENT = 9;
  const FRAGMENT = 11;

  /* ---- Node helpers ---------------------------------------------------------------------- */

  const isNode = (v) => !!v && typeof v === 'object' && typeof v.nodeType === 'number' && 'childNodes' in v;
  const tagOf = (n) => (n && n.nodeType === ELEMENT ? String(n.tagName || '').toLowerCase() : '');
  const attr = (n, name) => (n && n.nodeType === ELEMENT && n.getAttribute ? n.getAttribute(name) : null);
  const hasAttr = (n, name) => attr(n, name) !== null;
  const kids = (n) => Array.from((n && n.childNodes) || []);
  const normalize = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const isRegExp = (v) => Object.prototype.toString.call(v) === '[object RegExp]';

  function attrList(n) {
    return Array.from(n.attributes || []).map((a) => [a.name, a.value]);
  }

  /* The descendants of root (not root itself), elements only, in document order. */
  function elements(root) {
    const out = [];
    (function walk(n) {
      kids(n).forEach((k) => {
        if (k.nodeType === ELEMENT) { out.push(k); walk(k); }
      });
    })(root);
    return out;
  }

  function topOf(n) {
    let x = n;
    while (x && x.parentNode) x = x.parentNode;
    return x;
  }

  function byId(n, id) {
    if (!id) return null;
    const top = topOf(n);
    if (top && typeof top.getElementById === 'function') return top.getElementById(id);
    return [top, ...elements(top)].find((e) => e && e.nodeType === ELEMENT && attr(e, 'id') === id) || null;
  }

  function textOf(n) {
    if (!n) return '';
    if (n.nodeType === TEXT) return String(n.nodeValue == null ? '' : n.nodeValue);
    if (n.nodeType === ELEMENT || n.nodeType === DOCUMENT || n.nodeType === FRAGMENT) {
      const t = tagOf(n);
      if (t === 'script' || t === 'style') return '';
      return kids(n).map(textOf).join('');
    }
    return '';
  }

  /* Testing Library's getNodeText: the element's own text nodes only. */
  const ownText = (n) => kids(n).filter((k) => k.nodeType === TEXT).map((k) => k.nodeValue).join('');

  function closest(n, pred) {
    let x = n;
    while (x && x.nodeType === ELEMENT) {
      if (pred(x)) return x;
      x = x.parentNode;
    }
    return null;
  }

  function inDocument(n) {
    const top = topOf(n);
    return !!top && top.nodeType === DOCUMENT;
  }

  /* ---- Hidden and inaccessible ---------------------------------------------------------- */

  function styleHidden(n) {
    const s = String(attr(n, 'style') || '');
    return /(^|;)\s*display\s*:\s*none/i.test(s) || /(^|;)\s*visibility\s*:\s*hidden/i.test(s);
  }

  /* Hidden by its own attributes or style (not looking at the ancestors). */
  function selfHidden(n, env) {
    return hasAttr(n, 'hidden') || attr(n, 'aria-hidden') === 'true' || styleHidden(n) || !!(env && env.computedHidden && env.computedHidden(n));
  }

  /* env.computedHidden(node) (optional, the browser's getComputedStyle) adds stylesheet rules. */
  function isInaccessible(n, env) {
    let x = n;
    while (x && x.nodeType === ELEMENT) {
      if (selfHidden(x, env)) return true;
      x = x.parentNode;
    }
    return false;
  }

  /* ---- Roles ------------------------------------------------------------------------------ */

  const SECTIONING = /^(article|aside|main|nav|section)$/;

  function inputRole(n) {
    const type = String(attr(n, 'type') || 'text').toLowerCase();
    if (/^(button|submit|reset|image)$/.test(type)) return 'button';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'number') return 'spinbutton';
    if (type === 'range') return 'slider';
    if (type === 'search') return hasAttr(n, 'list') ? 'combobox' : 'searchbox';
    if (/^(text|email|tel|url)$/.test(type)) return hasAttr(n, 'list') ? 'combobox' : 'textbox';
    return null;   // password, hidden, file, date, colour…: no ARIA role
  }

  function implicitRole(n) {
    const t = tagOf(n);
    switch (t) {
      case 'button': return 'button';
      case 'a': case 'area': return hasAttr(n, 'href') ? 'link' : null;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
      case 'input': return inputRole(n);
      case 'textarea': return 'textbox';
      case 'select': return hasAttr(n, 'multiple') || Number(attr(n, 'size')) > 1 ? 'listbox' : 'combobox';
      case 'option': return 'option';
      case 'ul': case 'ol': case 'menu': return 'list';
      case 'li': return 'listitem';
      case 'nav': return 'navigation';
      case 'main': return 'main';
      case 'aside': return 'complementary';
      case 'header': return closest(n.parentNode, (x) => SECTIONING.test(tagOf(x))) ? null : 'banner';
      case 'footer': return closest(n.parentNode, (x) => SECTIONING.test(tagOf(x))) ? null : 'contentinfo';
      case 'section': return hasAttr(n, 'aria-label') || hasAttr(n, 'aria-labelledby') ? 'region' : null;
      case 'form': return 'form';
      case 'article': return 'article';
      case 'dialog': return 'dialog';
      case 'img': return attr(n, 'alt') === '' ? 'presentation' : 'img';
      case 'table': return 'table';
      case 'tr': return 'row';
      case 'td': return 'cell';
      case 'th': return 'columnheader';
      case 'thead': case 'tbody': case 'tfoot': return 'rowgroup';
      case 'p': return 'paragraph';
      case 'progress': return 'progressbar';
      case 'hr': return 'separator';
      case 'fieldset': return 'group';
      case 'output': return 'status';
      default: return null;
    }
  }

  function roleOf(n) {
    if (!n || n.nodeType !== ELEMENT) return null;
    const explicit = normalize(attr(n, 'role')).split(' ')[0];
    return explicit || implicitRole(n);
  }

  /* ---- Accessible name (a subset of the W3C algorithm) ------------------------------------- */

  const NAME_FROM_CONTENT = new Set(['button', 'link', 'heading', 'cell', 'columnheader', 'rowheader', 'row', 'option',
    'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'tooltip', 'treeitem', 'gridcell']);
  const LABELABLE = /^(input|textarea|select|button|meter|output|progress)$/;
  const BLOCK = /^(address|article|aside|blockquote|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|td|th|tr|ul)$/;

  function labelsOf(n) {
    if (!LABELABLE.test(tagOf(n)) || (tagOf(n) === 'input' && String(attr(n, 'type')).toLowerCase() === 'hidden')) return [];
    const out = [];
    const id = attr(n, 'id');
    if (id) elements(topOf(n)).forEach((l) => { if (tagOf(l) === 'label' && attr(l, 'for') === id) out.push(l); });
    const wrap = closest(n.parentNode, (x) => tagOf(x) === 'label');
    if (wrap && !hasAttr(wrap, 'for') && !out.includes(wrap)) out.push(wrap);
    return out;
  }

  /* The control a <label> labels: for= by id, else the first labelable descendant. */
  function controlOf(label) {
    if (hasAttr(label, 'for')) {
      const el = byId(label, attr(label, 'for'));
      return el && LABELABLE.test(tagOf(el)) ? el : null;
    }
    return elements(label).find((e) => LABELABLE.test(tagOf(e)) && !(tagOf(e) === 'input' && String(attr(e, 'type')).toLowerCase() === 'hidden')) || null;
  }

  function controlValue(n) {
    const t = tagOf(n);
    if (t === 'select') {
      const opts = elements(n).filter((o) => tagOf(o) === 'option');
      const sel = opts.filter((o) => (o.selected !== undefined ? o.selected : hasAttr(o, 'selected')));
      return (sel.length ? sel : opts.slice(0, 1)).map((o) => normalize(textOf(o))).join(' ');
    }
    if (t === 'input' || t === 'textarea') return String(n.value != null ? n.value : attr(n, 'value') || '');
    return '';
  }

  function nameOf(n, st, fromContent) {
    if (n.nodeType === TEXT) return String(n.nodeValue || '');
    if (n.nodeType !== ELEMENT) return '';
    if (st.seen.has(n)) return '';
    st.seen.add(n);
    const t = tagOf(n);
    const role = roleOf(n);
    const ids = normalize(attr(n, 'aria-labelledby'));
    if (ids && !st.labelledBy) {
      const parts = ids.split(' ').map((id) => byId(n, id)).filter(Boolean)
        .map((el) => normalize(nameOf(el, { ...st, labelledBy: true, referenced: true, seen: new Set() }, true)));
      const s = parts.filter(Boolean).join(' ');
      if (s) return s;
    }
    const label = normalize(attr(n, 'aria-label'));
    if (label && !(fromContent && /^(textbox|searchbox|combobox|listbox|spinbutton|slider)$/.test(role))) return label;
    if (fromContent && /^(textbox|searchbox|spinbutton|slider)$/.test(role)) return controlValue(n);
    if (fromContent && /^(combobox|listbox)$/.test(role)) return controlValue(n);
    if (t === 'input') {
      const type = String(attr(n, 'type') || 'text').toLowerCase();
      if (type === 'submit' || type === 'reset' || type === 'button') return attr(n, 'value') || (type === 'submit' ? 'Submit' : type === 'reset' ? 'Reset' : '');
      if (type === 'image') return attr(n, 'alt') || '';
    }
    if (t === 'img' || (t === 'area')) { const alt = attr(n, 'alt'); if (alt) return alt; }
    if (!fromContent) {
      const labels = labelsOf(n);
      if (labels.length) {
        const s = labels.map((l) => normalize(contentName(l, st, n))).filter(Boolean).join(' ');
        if (s) return s;
      }
      if (t === 'fieldset') { const lg = kids(n).find((k) => tagOf(k) === 'legend'); if (lg) return contentName(lg, st); }
      if (t === 'table') { const cap = kids(n).find((k) => tagOf(k) === 'caption'); if (cap) return contentName(cap, st); }
    }
    if (fromContent || NAME_FROM_CONTENT.has(role)) {
      const c = contentName(n, st);
      if (normalize(c)) return c;
    }
    const title = attr(n, 'title');
    if (title && !fromContent) return title;
    const ph = attr(n, 'placeholder');
    if (ph && !fromContent && (t === 'input' || t === 'textarea')) return ph;
    return '';
  }

  function contentName(n, st, skip) {
    return kids(n).map((k) => {
      if (k === skip) return '';
      if (k.nodeType === TEXT) return String(k.nodeValue || '');
      if (k.nodeType !== ELEMENT) return '';
      if (selfHidden(k, st.env) && !st.referenced) return '';
      const s = nameOf(k, st, true);
      return BLOCK.test(tagOf(k)) ? ` ${s} ` : s;
    }).join('');
  }

  function accessibleName(n, env) {
    if (!n || n.nodeType !== ELEMENT) return '';
    return normalize(nameOf(n, { seen: new Set(), env, labelledBy: false, referenced: false }, false));
  }

  /* ---- Text matching ---------------------------------------------------------------------- */

  function matches(text, matcher, node, exact = true) {
    if (text == null) return false;
    const s = normalize(text);
    if (typeof matcher === 'string' || typeof matcher === 'number') {
      const m = String(matcher);
      return exact ? s === m : s.toLowerCase().includes(m.toLowerCase());
    }
    if (isRegExp(matcher)) { matcher.lastIndex = 0; return matcher.test(s); }
    if (typeof matcher === 'function') return !!matcher(s, node);
    return false;
  }

  const showMatcher = (m) => (isRegExp(m) ? String(m) : typeof m === 'function' ? 'a function' : String(m));
  const quoteMatcher = (m) => (isRegExp(m) ? String(m) : typeof m === 'function' ? 'a function' : `"${m}"`);

  /* ---- Pretty DOM ------------------------------------------------------------------------- */

  const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;

  function prettyDom(node, max = 1500) {
    const out = [];
    (function walk(n, depth) {
      const pad = '  '.repeat(depth);
      if (n.nodeType === TEXT) { const v = normalize(n.nodeValue); if (v) out.push(pad + v); return; }
      if (n.nodeType === DOCUMENT || n.nodeType === FRAGMENT) { kids(n).forEach((k) => walk(k, depth)); return; }
      if (n.nodeType !== ELEMENT) return;
      const t = tagOf(n);
      if (t === 'script' || t === 'style') return;
      const attrs = attrList(n).map(([k, v]) => ` ${k}="${v}"`).join('');
      const ch = kids(n).filter((k) => k.nodeType === ELEMENT || (k.nodeType === TEXT && normalize(k.nodeValue)));
      if (!ch.length) { out.push(`${pad}<${t}${attrs}${VOID.test(t) ? ' />' : `></${t}>`}`); return; }
      out.push(`${pad}<${t}${attrs}>`);
      ch.forEach((k) => walk(k, depth + 1));
      out.push(`${pad}</${t}>`);
    })(node, 0);
    const s = out.join('\n');
    return s.length > max ? `${s.slice(0, max)}\n…` : s;
  }

  /* One line: <button class="x">Increment</button> */
  function describe(n) {
    if (!isNode(n)) return format(n);
    if (n.nodeType === TEXT) return JSON.stringify(n.nodeValue);
    if (n.nodeType === DOCUMENT) return '#document';
    const t = tagOf(n);
    const attrs = attrList(n).filter(([k]) => k !== 'style').slice(0, 4).map(([k, v]) => ` ${k}="${v.length > 30 ? `${v.slice(0, 30)}…` : v}"`).join('');
    if (VOID.test(t)) return `<${t}${attrs} />`;
    let text = normalize(textOf(n));
    if (text.length > 40) text = `${text.slice(0, 40)}…`;
    return `<${t}${attrs}>${text}</${t}>`;
  }

  /* ---- Values: format and deep equality ---------------------------------------------------- */

  function format(v, depth = 0) {
    if (typeof v === 'string') return `'${v}'`;
    if (v === null || v === undefined || typeof v === 'boolean') return String(v);
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'symbol') return v.toString();
    if (typeof v === 'function') return v._isMockFunction ? `[Function ${v.getMockName()}]` : `[Function ${v.name || 'anonymous'}]`;
    if (isNode(v)) return describe(v);
    if (v instanceof Error || (v && typeof v.message === 'string' && typeof v.name === 'string' && 'stack' in v)) return `[${v.name}: ${v.message}]`;
    if (depth > 3) return Array.isArray(v) ? '[Array]' : '[Object]';
    if (Array.isArray(v)) return v.length ? `[ ${v.map((x) => format(x, depth + 1)).join(', ')} ]` : '[]';
    if (isRegExp(v)) return String(v);
    if (v instanceof Date) return v.toISOString();
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    return `{ ${keys.map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${format(v[k], depth + 1)}`).join(', ')} }`;
  }

  /* toEqual: same structure and values; properties that are undefined are ignored. */
  function equals(a, b, seen = []) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
    if (isNode(a) || isNode(b)) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (isRegExp(a) || isRegExp(b)) return String(a) === String(b);
    if (seen.some(([x, y]) => x === a && y === b)) return true;
    const next = seen.concat([[a, b]]);
    if (Array.isArray(a)) return a.length === b.length && a.every((x, k) => equals(x, b[k], next));
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equals(a[k], b[k], next));
  }

  /* ---- Queries ------------------------------------------------------------------------------ */

  const TYPES = ['Role', 'LabelText', 'PlaceholderText', 'Text', 'DisplayValue', 'AltText', 'Title', 'TestId'];

  function stateOk(n, role, o) {
    if (o.level !== undefined) {
      const lv = attr(n, 'aria-level') ? Number(attr(n, 'aria-level')) : /^h[1-6]$/.test(tagOf(n)) ? Number(tagOf(n)[1]) : null;
      if (lv !== o.level) return false;
    }
    if (o.checked !== undefined) {
      const c = attr(n, 'aria-checked') !== null ? attr(n, 'aria-checked') === 'true' : !!n.checked;
      if (c !== o.checked) return false;
    }
    if (o.pressed !== undefined && (attr(n, 'aria-pressed') === 'true') !== o.pressed) return false;
    if (o.expanded !== undefined && (attr(n, 'aria-expanded') === 'true') !== o.expanded) return false;
    if (o.selected !== undefined) {
      const s = attr(n, 'aria-selected') !== null ? attr(n, 'aria-selected') === 'true' : !!n.selected;
      if (s !== o.selected) return false;
    }
    return true;
  }

  function labelMatches(container, matcher, exact) {
    const labels = elements(container).filter((l) => tagOf(l) === 'label' && matches(textOf(l), matcher, l, exact));
    return labels;
  }

  function queryAll(type, container, matcher, options = {}, env = {}) {
    const o = options || {};
    const exact = o.exact !== false;
    const all = elements(container);
    switch (type) {
      case 'Role': {
        return all.filter((n) => {
          const role = roleOf(n);
          if (!role || role !== String(matcher)) return false;
          if (!o.hidden && isInaccessible(n, env)) return false;
          if (!stateOk(n, role, o)) return false;
          if (o.name !== undefined && !matches(accessibleName(n, env), o.name, n, true)) return false;
          return true;
        });
      }
      case 'LabelText': {
        const found = [];
        const add = (n) => { if (n && !found.includes(n)) found.push(n); };
        labelMatches(container, matcher, exact).forEach((l) => add(controlOf(l)));
        all.forEach((n) => {
          if (hasAttr(n, 'aria-label') && matches(attr(n, 'aria-label'), matcher, n, exact)) add(n);
          const ids = normalize(attr(n, 'aria-labelledby'));
          if (ids && matches(ids.split(' ').map((id) => textOf(byId(n, id))).join(' '), matcher, n, exact)) add(n);
        });
        return all.filter((n) => found.includes(n));
      }
      case 'PlaceholderText': return all.filter((n) => hasAttr(n, 'placeholder') && matches(attr(n, 'placeholder'), matcher, n, exact));
      case 'Text': {
        const ignore = o.ignore === undefined ? /^(script|style)$/ : null;
        return all.filter((n) => (!ignore || !ignore.test(tagOf(n))) && matches(ownText(n), matcher, n, exact) && (!o.selector || (n.matches && n.matches(o.selector))));
      }
      case 'DisplayValue': return all.filter((n) => /^(input|textarea|select)$/.test(tagOf(n)) && matches(controlValue(n), matcher, n, exact));
      case 'AltText': return all.filter((n) => /^(img|input|area)$/.test(tagOf(n)) && hasAttr(n, 'alt') && matches(attr(n, 'alt'), matcher, n, exact));
      case 'Title': return all.filter((n) => hasAttr(n, 'title') && matches(attr(n, 'title'), matcher, n, exact));
      case 'TestId': return all.filter((n) => hasAttr(n, 'data-testid') && matches(attr(n, 'data-testid'), matcher, n, exact));
      default: throw new Error(`Unknown query type: ${type}`);
    }
  }

  /* Every accessible element with a role, for "Here are the accessible roles". */
  function rolesSummary(container, env) {
    const lines = [];
    elements(container).forEach((n) => {
      const role = roleOf(n);
      if (!role || isInaccessible(n, env) || role === 'presentation' || role === 'none') return;
      const name = accessibleName(n, env);
      lines.push(`  ${role}${name ? ` "${name.length > 50 ? `${name.slice(0, 50)}…` : name}"` : ''}`);
    });
    return lines.slice(0, 30).concat(lines.length > 30 ? [`  … ${lines.length - 30} more`] : []).join('\n');
  }

  function queryError(message) {
    const e = new Error(message);
    e.name = 'TestingLibraryElementError';
    return e;
  }

  function roleWhat(matcher, o) {
    const extra = ['level', 'checked', 'pressed', 'expanded', 'selected'].filter((k) => o && o[k] !== undefined).map((k) => `${k}: ${o[k]}`);
    return `role "${matcher}"${o && o.name !== undefined ? ` and name ${quoteMatcher(o.name)}` : ''}${extra.length ? ` (${extra.join(', ')})` : ''}`;
  }

  function notFound(type, container, matcher, o, env) {
    const dom = `\n\n${prettyDom(container)}`;
    switch (type) {
      case 'Role': {
        const roles = rolesSummary(container, env);
        return queryError(`Unable to find an accessible element with the ${roleWhat(matcher, o)}\n\n${roles ? `Here are the accessible roles:\n\n${roles}` : 'There are no accessible roles. But there might be some inaccessible roles. If you wish to access them, then set the `hidden` option to `true`.'}`);
      }
      case 'LabelText': {
        if (labelMatches(container, matcher, !o || o.exact !== false).length) {
          return queryError(`Found a label with the text of: ${showMatcher(matcher)}, however no form control was found associated to that label. Make sure you're using the "for" attribute or "aria-labelledby" attribute correctly.${dom}`);
        }
        return queryError(`Unable to find a label with the text of: ${showMatcher(matcher)}${dom}`);
      }
      case 'PlaceholderText': return queryError(`Unable to find an element with the placeholder text of: ${showMatcher(matcher)}${dom}`);
      case 'Text': return queryError(`Unable to find an element with the text: ${showMatcher(matcher)}. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.${dom}`);
      case 'DisplayValue': return queryError(`Unable to find an element with the display value: ${showMatcher(matcher)}.${dom}`);
      case 'AltText': return queryError(`Unable to find an element with the alt text: ${showMatcher(matcher)}${dom}`);
      case 'Title': return queryError(`Unable to find an element with the title: ${showMatcher(matcher)}.${dom}`);
      default: return queryError(`Unable to find an element by: [data-testid="${showMatcher(matcher)}"]${dom}`);
    }
  }

  function multiple(type, matcher, o, found) {
    const what = {
      Role: roleWhat(matcher, o),
      LabelText: `text of: ${showMatcher(matcher)}`,
      PlaceholderText: `placeholder text of: ${showMatcher(matcher)}`,
      Text: `text: ${showMatcher(matcher)}`,
      DisplayValue: `display value: ${showMatcher(matcher)}`,
      AltText: `alt text: ${showMatcher(matcher)}`,
      Title: `title: ${showMatcher(matcher)}`,
      TestId: `by: [data-testid="${showMatcher(matcher)}"]`,
    }[type];
    return queryError(`Found multiple elements with the ${what}\n\nHere are the matching elements:\n\n${found.slice(0, 6).map((n) => `  ${describe(n)}`).join('\n')}\n\n(If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).`);
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  /* Testing Library's waitFor: call cb until it stops throwing, or reject with its last error. */
  async function waitFor(cb, opts = {}) {
    const timeout = opts.timeout == null ? 1000 : opts.timeout;
    const interval = opts.interval == null ? 50 : opts.interval;
    if (typeof cb !== 'function') throw new TypeError('Received `callback` arg must be a function');
    if (opts.onStart) opts.onStart();
    const start = Date.now();
    let last = null;
    try {
      for (;;) {
        try {
          const v = cb();
          return v && typeof v.then === 'function' ? await v : v;
        } catch (e) { last = e; }
        if (Date.now() - start >= timeout) break;
        await sleep(interval);
      }
    } finally {
      if (opts.onEnd) opts.onEnd();
    }
    const err = last || new Error(`Timed out in waitFor after ${timeout}ms.`);
    if (last && err.message && !/^Timed out/.test(err.message)) err.message = `${err.message}\n\n(waited ${timeout} ms)`;
    throw err;
  }

  function queries(container, env = {}) {
    const wait = env.waitFor || waitFor;
    const out = {};
    TYPES.forEach((type) => {
      const all = (m, o) => queryAll(type, container, m, o, env);
      const getAll = (m, o) => { const f = all(m, o); if (!f.length) throw notFound(type, container, m, o || {}, env); return f; };
      const get = (m, o) => { const f = getAll(m, o); if (f.length > 1) throw multiple(type, m, o || {}, f); return f[0]; };
      out[`queryAllBy${type}`] = all;
      out[`getAllBy${type}`] = getAll;
      out[`getBy${type}`] = get;
      out[`queryBy${type}`] = (m, o) => { const f = all(m, o); if (f.length > 1) throw multiple(type, m, o || {}, f); return f[0] || null; };
      out[`findBy${type}`] = (m, o, w) => wait(() => get(m, o), w || {});
      out[`findAllBy${type}`] = (m, o, w) => wait(() => getAll(m, o), w || {});
    });
    return out;
  }

  /* ---- Mock functions (vi) ----------------------------------------------------------------- */

  function createVi() {
    let spies = [];
    let mocks = [];
    function fn(impl) {
      const st = { impl, once: [], name: 'spy' };
      const mock = { calls: [], results: [], instances: [], lastCall: undefined };
      function spy(...args) {
        mock.calls.push(args);
        mock.lastCall = args;
        mock.instances.push(this);
        const f = st.once.length ? st.once.shift() : st.impl;
        try {
          const r = f ? f.apply(this, args) : undefined;
          mock.results.push({ type: 'return', value: r });
          return r;
        } catch (e) {
          mock.results.push({ type: 'throw', value: e });
          throw e;
        }
      }
      spy._isMockFunction = true;
      spy.mock = mock;
      spy.getMockName = () => st.name;
      spy.mockName = (n) => { st.name = String(n); return spy; };
      spy.mockImplementation = (f) => { st.impl = f; return spy; };
      spy.mockImplementationOnce = (f) => { st.once.push(f); return spy; };
      spy.mockReturnValue = (v) => spy.mockImplementation(() => v);
      spy.mockReturnValueOnce = (v) => spy.mockImplementationOnce(() => v);
      spy.mockResolvedValue = (v) => spy.mockImplementation(() => Promise.resolve(v));
      spy.mockResolvedValueOnce = (v) => spy.mockImplementationOnce(() => Promise.resolve(v));
      spy.mockRejectedValue = (v) => spy.mockImplementation(() => Promise.reject(v));
      spy.mockRejectedValueOnce = (v) => spy.mockImplementationOnce(() => Promise.reject(v));
      spy.mockClear = () => { mock.calls.length = 0; mock.results.length = 0; mock.instances.length = 0; mock.lastCall = undefined; return spy; };
      spy.mockReset = () => { spy.mockClear(); st.impl = spy._original || undefined; st.once = []; return spy; };
      spy.mockRestore = () => { spy.mockReset(); if (spy._restore) spy._restore(); return spy; };
      mocks.push(spy);
      return spy;
    }
    function spyOn(obj, method) {
      if (!obj || typeof obj[method] !== 'function') throw new TypeError(`vi.spyOn() can only spy on a function. Received ${format(obj && obj[method])}.`);
      const original = obj[method];
      const callThrough = function (...args) { return original.apply(this, args); };
      const spy = fn(callThrough);
      spy._original = callThrough;
      spy.mockName(String(method));
      spy._restore = () => { obj[method] = original; };
      obj[method] = spy;
      spies.push(spy);
      return spy;
    }
    return {
      fn,
      spyOn,
      isMockFunction: (f) => typeof f === 'function' && !!f._isMockFunction,
      restoreAllMocks() { spies.forEach((s) => s._restore()); spies = []; },
      clearAllMocks() { mocks.forEach((m) => m.mockClear()); },
      resetAllMocks() { mocks.forEach((m) => m.mockReset()); },
    };
  }

  /* ---- expect ------------------------------------------------------------------------------ */

  function assertionError(message) {
    const e = new Error(message);
    e.name = 'AssertionError';
    return e;
  }

  const ordinal = (k) => { const n = k + 1; const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; return `${n}${s}`; };

  function createExpect(env = {}) {
    const inDoc = env.inDocument || inDocument;
    const active = env.activeElement || ((n) => { const top = topOf(n); return top && top.activeElement; });

    function needNode(name, v, isNot) {
      if (!isNode(v) || v.nodeType !== ELEMENT) {
        throw assertionError(`expect(received)${isNot ? '.not' : ''}.${name}()\n\nreceived value must be an HTMLElement or an SVGElement.\nReceived has value: ${format(v)}`);
      }
    }
    function needMock(v) {
      if (typeof v !== 'function' || !v._isMockFunction) throw assertionError(`${format(v)} is not a spy or a call to a spy!`);
    }
    const head = (name, isNot, arg = '') => `expect(element)${isNot ? '.not' : ''}.${name}(${arg})\n\n`;
    const not = (isNot, s) => (isNot ? s.replace('{not}', 'not ') : s.replace('{not}', ''));

    function isDisabled(n) {
      const t = tagOf(n);
      if (/^(button|input|select|textarea|optgroup|option|fieldset)$/.test(t) && hasAttr(n, 'disabled')) return true;
      if (/^(button|input|select|textarea)$/.test(t)) {
        const fs = closest(n.parentNode, (x) => tagOf(x) === 'fieldset' && hasAttr(x, 'disabled'));
        if (fs) {
          const legend = kids(fs).find((k) => tagOf(k) === 'legend');
          if (!legend || !closest(n, (x) => x === legend)) return true;
        }
      }
      return false;
    }

    function valueOf(n) {
      const t = tagOf(n);
      if (t === 'select') {
        const opts = elements(n).filter((o) => tagOf(o) === 'option');
        const sel = opts.filter((o) => (o.selected !== undefined ? o.selected : hasAttr(o, 'selected'))).map((o) => (attr(o, 'value') !== null ? attr(o, 'value') : normalize(textOf(o))));
        return hasAttr(n, 'multiple') ? sel : (sel[0] !== undefined ? sel[0] : null);
      }
      const type = String(attr(n, 'type') || '').toLowerCase();
      const v = n.value != null ? String(n.value) : attr(n, 'value') || '';
      if (t === 'input' && type === 'number') return v === '' ? null : Number(v);
      return v;
    }

    const M = {
      toBe(r, e) {
        return { pass: Object.is(r, e), message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be ${format(e)} // Object.is equality${!isNot && equals(r, e) ? '\n\nIf it should pass with deep equality, replace "toBe" with "toStrictEqual"' : ''}` };
      },
      toEqual(r, e) { return { pass: equals(r, e), message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to deeply equal ${format(e)}` }; },
      toStrictEqual(r, e) { return { pass: equals(r, e), message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to strictly equal ${format(e)}` }; },
      toBeTruthy(r) { return { pass: !!r, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be truthy` }; },
      toBeFalsy(r) { return { pass: !r, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be falsy` }; },
      toBeNull(r) { return { pass: r === null, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be null` }; },
      toBeUndefined(r) { return { pass: r === undefined, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be undefined` }; },
      toBeDefined(r) { return { pass: r !== undefined, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be defined` }; },
      toContain(r, e) {
        const pass = typeof r === 'string' ? r.includes(String(e)) : !!r && typeof r.includes === 'function' ? r.includes(e) : false;
        return { pass, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to include ${format(e)}` };
      },
      toHaveLength(r, n) {
        const len = r != null && typeof r.length === 'number' ? r.length : undefined;
        return { pass: len === n, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to have a length of ${n}${len === undefined ? '' : ` but got ${len}`}` };
      },
      toMatch(r, e) {
        const pass = typeof r === 'string' && (isRegExp(e) ? (e.lastIndex = 0, e.test(r)) : r.includes(String(e)));
        return { pass, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to ${isRegExp(e) ? 'match' : 'include'} ${format(e)}` };
      },
      toBeGreaterThan(r, e) { return { pass: r > e, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be greater than ${format(e)}` }; },
      toBeLessThan(r, e) { return { pass: r < e, message: (isNot) => `expected ${format(r)} ${isNot ? 'not ' : ''}to be less than ${format(e)}` }; },
      toThrow(r, e) {
        let thrown = null;
        let did = false;
        if (typeof r === 'function') {
          try { r(); } catch (err) { did = true; thrown = err; }
        } else if (r && typeof r === 'object' && typeof r.message === 'string') {
          did = true;                       // expect(promise).rejects.toThrow(…): the rejection reason
          thrown = r;
        } else throw assertionError(`expected ${format(r)} to be a function`);
        const msg = thrown && thrown.message !== undefined ? String(thrown.message) : String(thrown);
        const pass = did && (e === undefined || (isRegExp(e) ? e.test(msg) : typeof e === 'string' ? msg.includes(e) : typeof e === 'function' ? thrown instanceof e : true));
        return { pass, message: (isNot) => (did ? `expected function ${isNot ? 'not ' : ''}to throw${e !== undefined ? ` an error matching ${format(e)}` : ''}, but it threw ${format(thrown)}` : `expected function to throw an error, but it did not`) };
      },
      toHaveBeenCalled(r) {
        needMock(r);
        const n = r.mock.calls.length;
        return { pass: n > 0, message: (isNot) => (isNot ? `expected "${r.getMockName()}" to not be called at all, but actually been called ${n} times` : `expected "${r.getMockName()}" to be called at least once`) };
      },
      toHaveBeenCalledTimes(r, k) {
        needMock(r);
        const n = r.mock.calls.length;
        return { pass: n === k, message: (isNot) => `expected "${r.getMockName()}" ${isNot ? 'not ' : ''}to be called ${k} times, but got ${n} times` };
      },
      toHaveBeenCalledWith(r, ...args) {
        needMock(r);
        const calls = r.mock.calls;
        const pass = calls.some((c) => equals(c, args));
        return { pass, message: (isNot) => `expected "${r.getMockName()}" ${isNot ? 'not ' : ''}to be called with arguments: ${format(args)}\n\nReceived:\n${calls.length ? calls.map((c, k) => `  ${ordinal(k)} ${r.getMockName()} call: ${format(c)}`).join('\n') : '  (no calls)'}\n\nNumber of calls: ${calls.length}` };
      },
      toHaveBeenLastCalledWith(r, ...args) {
        needMock(r);
        const last = r.mock.calls[r.mock.calls.length - 1];
        return { pass: !!last && equals(last, args), message: (isNot) => `expected last "${r.getMockName()}" call ${isNot ? 'not ' : ''}to have been called with ${format(args)}\n\nReceived: ${last ? format(last) : '(no calls)'}` };
      },

      /* jest-dom */
      toBeInTheDocument(r) {
        if (r === null || r === undefined) {
          return { pass: false, message: (isNot) => `${head('toBeInTheDocument', isNot)}received value must be an HTMLElement or an SVGElement.\nReceived has value: ${format(r)}` };
        }
        if (!isNode(r)) needNode('toBeInTheDocument', r, false);
        const pass = inDoc(r);
        return { pass, message: (isNot) => `${head('toBeInTheDocument', isNot)}${isNot ? `expected document not to contain element, found ${describe(r)} instead` : 'element could not be found in the document'}` };
      },
      toHaveTextContent(r, e, opts = {}) {
        needNode('toHaveTextContent', r);
        const content = opts.normalizeWhitespace === false ? textOf(r) : normalize(textOf(r));
        const empty = typeof e === 'string' && e === '';
        const pass = !empty && (isRegExp(e) ? (e.lastIndex = 0, e.test(content)) : content.includes(String(e)));
        return { pass, message: (isNot) => `${head('toHaveTextContent', isNot)}${empty ? 'Checking with empty string will always match, use .toBeEmptyDOMElement() instead' : `Expected element ${isNot ? 'not ' : ''}to have text content:\n  ${showMatcher(e)}\nReceived:\n  ${content}`}` };
      },
      toBeDisabled(r) {
        needNode('toBeDisabled', r);
        const pass = isDisabled(r);
        return { pass, message: (isNot) => `${head('toBeDisabled', isNot)}Received element ${isNot ? 'is' : 'is not'} disabled:\n  ${describe(r)}` };
      },
      toBeEnabled(r) {
        needNode('toBeEnabled', r);
        const pass = !isDisabled(r);
        return { pass, message: (isNot) => `${head('toBeEnabled', isNot)}Received element ${isNot ? 'is' : 'is not'} enabled:\n  ${describe(r)}` };
      },
      toHaveValue(r, e) {
        needNode('toHaveValue', r);
        if (tagOf(r) === 'input' && /^(checkbox|radio)$/.test(String(attr(r, 'type')).toLowerCase())) {
          throw assertionError('input with type=checkbox or type=radio cannot be used with .toHaveValue(). Use .toBeChecked() for type=checkbox or .toHaveFormValues() instead');
        }
        const v = valueOf(r);
        const pass = e === undefined ? v !== '' && v !== null : equals(v, e);
        return { pass, message: (isNot) => `${head('toHaveValue', isNot, e === undefined ? '' : format(e))}Expected the element ${isNot ? 'not ' : ''}to have value:\n  ${e === undefined ? '(any)' : format(e)}\nReceived:\n  ${format(v)}` };
      },
      toBeChecked(r) {
        needNode('toBeChecked', r);
        const role = roleOf(r);
        if (!/^(checkbox|radio|switch|menuitemcheckbox|menuitemradio)$/.test(role || '')) {
          throw assertionError(`only inputs with type="checkbox" or type="radio" or elements with role=checkbox, role=radio or role=switch and a valid aria-checked attribute can be used with .toBeChecked(). Use .toHaveValue() instead`);
        }
        const pass = tagOf(r) === 'input' ? !!r.checked : attr(r, 'aria-checked') === 'true';
        return { pass, message: (isNot) => `${head('toBeChecked', isNot)}Received element ${isNot ? 'is' : 'is not'} checked:\n  ${describe(r)}` };
      },
      toHaveAttribute(r, name, value) {
        needNode('toHaveAttribute', r);
        const actual = attr(r, name);
        const pass = actual !== null && (value === undefined || equals(actual, value));
        const show = (v) => (v === null ? 'null' : `${name}="${v}"`);
        return { pass, message: (isNot) => `${head('toHaveAttribute', isNot, format(name))}Expected the element ${isNot ? 'not ' : ''}to have attribute:\n  ${value === undefined ? name : `${name}="${value}"`}\nReceived:\n  ${show(actual)}` };
      },
      toHaveClass(r, ...names) {
        needNode('toHaveClass', r);
        const have = normalize(attr(r, 'class')).split(' ').filter(Boolean);
        const want = names.flatMap((x) => normalize(x).split(' ')).filter(Boolean);
        const pass = want.length ? want.every((c) => have.includes(c)) : have.length > 0;
        return { pass, message: (isNot) => `${head('toHaveClass', isNot)}Expected the element ${isNot ? 'not ' : ''}to have class:\n  ${want.join(' ') || '(any class)'}\nReceived:\n  ${have.join(' ')}` };
      },
      toBeVisible(r) {
        needNode('toBeVisible', r);
        const pass = inDoc(r) && !isInaccessible(r, { computedHidden: env.computedHidden });
        return { pass, message: (isNot) => `${head('toBeVisible', isNot)}Received element ${isNot ? 'is' : 'is not'} visible${pass || !inDoc(r) ? '' : ': it, or one of its ancestors, is hidden'}:\n  ${describe(r)}` };
      },
      toHaveFocus(r) {
        needNode('toHaveFocus', r);
        const a = active(r);
        return { pass: a === r, message: (isNot) => `${head('toHaveFocus', isNot)}Expected element ${isNot ? 'not ' : ''}with focus:\n  ${describe(r)}\nReceived element with focus:\n  ${a ? describe(a) : 'null'}` };
      },
      toHaveAccessibleName(r, e) {
        needNode('toHaveAccessibleName', r);
        const name = accessibleName(r, env);
        const pass = e === undefined ? name !== '' : matches(name, e, r, true);
        return { pass, message: (isNot) => `${head('toHaveAccessibleName', isNot, e === undefined ? '' : format(e))}Expected element ${isNot ? 'not ' : ''}to have accessible name:\n  ${e === undefined ? '(any)' : showMatcher(e)}\nReceived:\n  ${name}` };
      },
      toBeEmptyDOMElement(r) {
        needNode('toBeEmptyDOMElement', r);
        const pass = !kids(r).some((k) => k.nodeType === ELEMENT || k.nodeType === TEXT);
        return { pass, message: (isNot) => `${head('toBeEmptyDOMElement', isNot)}Received element ${isNot ? 'is' : 'is not'} empty:\n  ${describe(r)}` };
      },
    };

    function expect(received) {
      function build(isNot, mode) {
        const api = {};
        Object.keys(M).forEach((name) => {
          api[name] = (...args) => {
            const check = (value) => {
              const r = M[name](value, ...args);
              if (r.pass === isNot) throw assertionError(r.message(isNot));
            };
            if (!mode) { check(received); return undefined; }
            if (!received || typeof received.then !== 'function') {
              return Promise.reject(assertionError(`expected ${format(received)} to be a promise (.${mode} needs a promise: did you call the function?)`));
            }
            return received.then(
              (v) => { if (mode === 'rejects') throw assertionError(`promise resolved ${format(v)} instead of rejecting`); check(v); },
              (err) => { if (mode === 'resolves') throw assertionError(`promise rejected ${format(err)} instead of resolving`); check(err); },
            );
          };
        });
        return api;
      }
      const api = build(false, null);
      api.not = build(true, null);
      api.resolves = build(false, 'resolves');
      api.resolves.not = build(true, 'resolves');
      api.rejects = build(false, 'rejects');
      api.rejects.not = build(true, 'rejects');
      return api;
    }
    expect.MATCHERS = Object.keys(M);
    return expect;
  }

  /* ---- The runner (describe / it / beforeEach / afterEach) -------------------------------------- */

  function createRunner() {
    const root = { name: '', parent: null, items: [], before: [], after: [], skip: false };
    let cur = root;
    let running = false;
    let hasOnly = false;

    function describe(name, fn) {
      if (typeof fn !== 'function') throw new TypeError(`describe("${name}") needs a function as its second argument.`);
      const s = { kind: 'suite', name: String(name), parent: cur, items: [], before: [], after: [], skip: false };
      cur.items.push(s);
      const prev = cur;
      cur = s;
      try { fn(); } finally { cur = prev; }
    }
    describe.skip = (name, fn) => { describe(name, fn); cur.items[cur.items.length - 1].skip = true; };

    function test(name, fn, timeout) {
      if (running) throw new Error('Calling the test function inside another test function is not allowed. Please put it inside "describe" or "suite" so it can be properly collected.');
      if (typeof fn !== 'function') throw new TypeError(`test("${name}") needs a function as its second argument.`);
      cur.items.push({ kind: 'test', name: String(name), fn, timeout: typeof timeout === 'number' ? timeout : null, parent: cur });
    }
    test.skip = (name) => { cur.items.push({ kind: 'test', name: String(name), skip: true, parent: cur }); };
    test.todo = test.skip;
    test.only = (name, fn, timeout) => { test(name, fn, timeout); cur.items[cur.items.length - 1].only = true; hasOnly = true; };

    const beforeEach = (fn) => { cur.before.push(fn); };
    const afterEach = (fn) => { cur.after.push(fn); };

    function flat(s, path, skipped, out) {
      s.items.forEach((it) => {
        if (it.kind === 'suite') flat(it, path.concat(it.name), skipped || it.skip, out);
        else out.push({ ...it, path: path.concat(it.name), skip: skipped || !!it.skip });
      });
      return out;
    }
    function chain(s) { const out = []; let x = s; while (x) { out.unshift(x); x = x.parent; } return out; }

    function withTimeout(call, ms) {
      let timer = null;
      return Promise.race([
        Promise.resolve().then(call),
        new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(`Test timed out in ${ms}ms.\nIf this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".`)), ms); }),
      ]).finally(() => clearTimeout(timer));
    }

    const toErr = (e) => ({
      name: (e && e.name) || 'Error',
      message: e && e.message !== undefined ? String(e.message) : String(e),
      stack: String((e && e.stack) || ''),
    });

    async function run(opts = {}) {
      const timeout = opts.timeout || 2000;
      const tests = flat(root, [], false, []);
      const results = [];
      for (const t of tests) {
        const name = t.path.join(' > ');
        if (t.skip || (hasOnly && !t.only)) { results.push({ name, status: 'skip', error: null, duration: 0 }); continue; }
        const started = Date.now();
        let error = null;
        running = true;
        const suites = chain(t.parent);
        try {
          for (const s of suites) for (const f of s.before) await withTimeout(() => f(), timeout);
          await withTimeout(() => t.fn(), t.timeout || timeout);
        } catch (e) { error = e; }
        for (const s of suites.slice().reverse()) {
          for (const f of s.after) { try { await f(); } catch (e) { error = error || e; } }
        }
        if (opts.afterEach) { try { await opts.afterEach(); } catch (e) { error = error || e; } }
        running = false;
        results.push({ name, status: error ? 'fail' : 'pass', error: error ? toErr(error) : null, duration: Date.now() - started });
      }
      return results;
    }

    return { api: { describe, it: test, test, beforeEach, afterEach }, run, count: () => flat(root, [], false, []).length };
  }

  /* The student's line for a stack: "Counter.test.jsx:9:20" → 8 (the runner adds one wrapper line). */
  function lineOf(stack, file) {
    const re = new RegExp(`${String(file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`);
    const m = String(stack || '').match(re);
    return m ? Math.max(1, Number(m[1]) - 1) : null;
  }

  /* ---- Advice (like eslint-plugin-testing-library) ---------------------------------------------- */

  function advise(source) {
    const src = String(source || '');
    const lines = src.split('\n');
    const out = [];
    const add = (rule, level, text, re) => {
      const k = lines.findIndex((l) => re.test(l.replace(/\/\/.*$/, '')));
      if (k >= 0 && !out.some((o) => o.rule === rule)) out.push({ rule, level, text, line: k + 1 });
    };
    add('no-test-id', 'warn', 'A **test id** is invisible to users. Prefer `getByRole` (with `name`), `getByLabelText` or `getByText`; keep `data-testid` as a last resort.', /\b(get|query|find)(All)?ByTestId\b/);
    add('no-node-access', 'warn', '**DOM access** (`querySelector`, `.textContent`, `.className`, `.firstChild`…) ties the test to the markup. Query like a user and assert with jest-dom (`toHaveTextContent`, `toBeInTheDocument`).', /\.(querySelector(All)?|textContent|innerHTML|className|classList|firstChild|lastChild|children|parentElement|parentNode)\b/);
    add('prefer-presence-queries', 'warn', '`getBy…` **throws** when nothing is found, so `expect(getBy…).not.toBeInTheDocument()` can never pass. Use `queryBy…` to check that something is absent.', /\bgetBy\w+\([^)]*\)\s*\)\s*\.not\.toBeInTheDocument/);
    add('await-async-queries', 'warn', '`findBy…` returns a **promise**: write `await screen.findBy…(…)` (and mark the test `async`).', /^(?!.*\bawait\b)(?!.*\breturn\b).*\bfind(All)?By\w+\(/);
    add('await-async-events', 'warn', '`user.click` and `user.type` return **promises**: `await` them, or the assertion runs before the click has happened.', /^(?!.*\bawait\b).*\b(user|userEvent)\.(click|dblClick|type|clear|keyboard|selectOptions|tab|hover)\(/);
    add('prefer-find-by', 'info', '`await waitFor(() => screen.getBy…(…))` is the long way of writing `await screen.findBy…(…)`.', /waitFor\(\s*\(\)\s*=>\s*(screen\.)?getBy\w+\([^)]*\)\s*\)/);
    add('prefer-user-event', 'info', '`fireEvent` dispatches **one** DOM event. `userEvent` behaves like a person (pointer, focus, keyboard, one key at a time), so it catches more bugs.', /\bfireEvent\.\w+\(/);
    add('prefer-to-have-text-content', 'info', 'Prefer `expect(el).toHaveTextContent(…)` to comparing `.textContent` yourself: the failure message shows the element.', /\.textContent\)\s*\.(toBe|toEqual|toContain)\(/);
    add('prefer-screen-queries', 'info', 'Prefer `screen.getBy…` to the queries returned by `render`: one way of querying in every test, nothing to destructure.', /const\s*\{[^}]*\b(get|query|find)(All)?By\w+[^}]*\}\s*=\s*render\(/);
    add('no-unnecessary-act', 'info', '`render`, `userEvent` and `findBy` already wrap React updates in `act`; you do not need to call `act` yourself here.', /\bact\(/);
    if (/\b(it|test)\s*\(/.test(src) && !/\bexpect\s*\(/.test(src)) {
      out.push({ rule: 'expect-expect', level: 'warn', text: 'No `expect(…)`: a test without an assertion only proves that nothing threw.', line: lines.findIndex((l) => /\b(it|test)\s*\(/.test(l)) + 1 });
    }
    return out.sort((a, b) => a.line - b.line);
  }

  /* ---- The components under test ----------------------------------------------------------- */

  const COMPONENTS = {
    counter: {
      file: 'Counter.jsx', name: 'Counter', title: 'Counter',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter';

describe('Counter', () => {
  test('starts at the initial value', () => {
    render(<Counter initial={5} />);
    expect(screen.getByText('Count: 5')).toBeInTheDocument();
  });

  test('Reset is disabled at zero', () => {
    render(<Counter />);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});`,
      code: `import { useState } from 'react';

export default function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)} disabled={count === 0}>
        Reset
      </button>
    </div>
  );
}`,
    },
    counterBem: {
      file: 'Counter.jsx', name: 'Counter', title: 'Counter (BEM classes)',
      code: `import { useState } from 'react';
import './Counter.css';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="counter">
      <p className="counter__value">Count: {count}</p>
      <button className="counter__inc" onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
    },
    todoForm: {
      file: 'TodoForm.jsx', name: 'TodoForm', title: 'TodoForm (with validation)',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TodoForm from './TodoForm';

test('Enter in the field submits the form', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<TodoForm onAdd={onAdd} />);
  await user.type(screen.getByLabelText('Task title'), 'Call Ana{Enter}');
  expect(onAdd).toHaveBeenCalledTimes(1);
});`,
      code: `import { useState } from 'react';

export default function TodoForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (title.trim() === '') {
      setError('Title is required');
      return;
    }
    onAdd(title.trim());
    setTitle('');
    setError('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="title">Task title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
        aria-invalid={error ? 'true' : undefined} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Add task</button>
    </form>
  );
}`,
    },
    todoFormIds: {
      file: 'TodoForm.jsx', name: 'TodoForm', title: 'TodoForm (with test ids)',
      code: `import { useState } from 'react';

export default function TodoForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (title.trim() === '') {
      setError('Title is required');
      return;
    }
    onAdd(title.trim());
    setTitle('');
    setError('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="title">Task title</label>
      <input id="title" data-testid="title-input" value={title}
        onChange={(e) => setTitle(e.target.value)} />
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" data-testid="submit">Add task</button>
    </form>
  );
}`,
    },
    taskList: {
      file: 'TaskList.jsx', name: 'TaskList', title: 'TaskList (fetches /api/tasks)',
      starter: `import { render, screen } from '@testing-library/react';
import TaskList from './TaskList';

test('shows a loading message first', () => {
  render(<TaskList />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
});`,
      code: `import { useEffect, useState } from 'react';

export default function TaskList() {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    fetch('/api/tasks?limit=5')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => { if (!ignore) setTasks(data); })
      .catch((err) => { if (!ignore) setError(err.message); });
    return () => { ignore = true; };
  }, []);

  if (error) return <p role="alert">Could not load tasks: {error}</p>;
  if (!tasks) return <p role="status">Loading…</p>;
  if (tasks.length === 0) return <p>No tasks yet.</p>;
  return (
    <ul aria-label="Tasks">
      {tasks.map((t) => <li key={t.id}>{t.title}</li>)}
    </ul>
  );
}`,
    },
    muteToggle: {
      file: 'MuteToggle.jsx', name: 'MuteToggle', title: 'MuteToggle (a toggle button)',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MuteToggle from './MuteToggle';

test('is not pressed at first', () => {
  render(<MuteToggle />);
  expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'false');
});`,
      code: `import { useState } from 'react';
import './MuteToggle.css';

export default function MuteToggle() {
  const [muted, setMuted] = useState(false);
  return (
    <button type="button"
      className={muted ? 'toggle toggle--on' : 'toggle'}
      aria-pressed={muted}
      onClick={() => setMuted(!muted)}>
      Mute
    </button>
  );
}`,
    },
  };

  /* The components offered in free mode. */
  const FREE = ['counter', 'todoForm', 'taskList', 'muteToggle'];

  /* A variant: the component with some text replaced ({ kind: 'bug' | 'refactor', label, edits: [[from, to]] }). */
  function variantCode(componentId, variant) {
    let code = COMPONENTS[componentId].code;
    (variant && variant.edits ? variant.edits : []).forEach(([from, to]) => {
      if (!code.includes(from)) throw new Error(`Variant "${variant.label}": "${from}" not found in ${componentId}`);
      code = code.split(from).join(to);
    });
    return code;
  }

  /* ---- Challenges ------------------------------------------------------------------------------- */

  const CHALLENGES = [
    { id: 'first-test', component: 'counter', title: 'Your first test: render and find',
      goal: 'Complete the test: render `Counter` and check that the screen shows **Count: 0**. The checker also runs your test against a broken counter that starts at 1: your test must fail there.',
      hint: 'Find the paragraph by its text and assert it is there: `expect(screen.getByText(\'Count: 0\')).toBeInTheDocument();`',
      starter: `import { render, screen } from '@testing-library/react';
import Counter from './Counter';

test('starts at zero', () => {
  render(<Counter />);
  // Find "Count: 0" on the screen and check that it is there.

});`,
      variants: [
        { kind: 'bug', label: 'the counter starts at 1', edits: [['useState(initial)', 'useState(initial + 1)']] },
      ],
      requires: [{ re: /\bscreen\.(get|find|query)(All)?By\w+\(/, text: 'Query through `screen`, the whole page as the user sees it.' }],
    },
    { id: 'catch-increment', component: 'counter', title: 'Catch a broken increment',
      goal: 'Write a test that **fails when the counter does not increment properly**. Click the button the way a user would (`userEvent`), find it **by its role and name**, and check the text. Three broken counters are waiting.',
      hint: 'Click twice, then check: `await user.click(screen.getByRole(\'button\', { name: \'Increment\' }))` (twice), then `expect(screen.getByText(\'Count: 2\')).toBeInTheDocument()`. Why twice? One of the bugs only shows on the second click.',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter';

test('adds one on every click', async () => {
  const user = userEvent.setup();
  render(<Counter />);
  // Click "Increment" (find it by role and name), then check the count.

});`,
      variants: [
        { kind: 'bug', label: 'the button does nothing', edits: [['setCount(count + 1)', 'setCount(count)']] },
        { kind: 'bug', label: 'each click adds two', edits: [['setCount(count + 1)', 'setCount(count + 2)']] },
        { kind: 'bug', label: 'only the first click counts', edits: [['setCount(count + 1)', 'setCount(initial + 1)']] },
      ],
      requires: [
        { re: /ByRole\(\s*['"]button['"]\s*,\s*\{[^}]*\bname\s*:/, text: 'Find the button with `getByRole(\'button\', { name: … })`.' },
        { re: /\b(user|userEvent)\.click\(|fireEvent\.click\(/, text: 'Click it (`user.click`).' },
      ],
    },
    { id: 'label-and-submit', component: 'todoForm', title: 'Find the input by its label',
      goal: 'Test the happy path of the form: find the field **by its label** ("Task title"), type `  Buy milk ` (with the spaces), press **Add task**, then check that `onAdd` was called with **`\'Buy milk\'`** (trimmed) and that the field is **empty** again.',
      hint: '`await user.type(screen.getByLabelText(\'Task title\'), \'  Buy milk \')`, then `await user.click(screen.getByRole(\'button\', { name: \'Add task\' }))`, then `expect(onAdd).toHaveBeenCalledWith(\'Buy milk\')` and `expect(screen.getByLabelText(\'Task title\')).toHaveValue(\'\')`.',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TodoForm from './TodoForm';

test('adds a task and clears the field', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<TodoForm onAdd={onAdd} />);
  // 1. Type "  Buy milk " into the field labelled "Task title".
  // 2. Click "Add task".
  // 3. Check what onAdd received, and that the field is empty.

});`,
      variants: [
        { kind: 'bug', label: 'onAdd is never called', edits: [['    onAdd(title.trim());\n', '']] },
        { kind: 'bug', label: 'the title is not trimmed', edits: [['onAdd(title.trim())', 'onAdd(title)']] },
        { kind: 'bug', label: 'the field is not cleared', edits: [["    setTitle('');\n", '']] },
      ],
      requires: [{ re: /\b(get|find|query)(All)?ByLabelText\(/, text: 'Find the field with `getByLabelText`.' }],
    },
    { id: 'error-and-absence', component: 'todoForm', title: 'An error that appears only when needed',
      goal: 'Two checks in one test: **before** submitting there is **no** error message, and after submitting an empty title an **alert** says "Title is required" and `onAdd` was **not** called. Find the message by its **role**.',
      hint: 'Absence: `expect(screen.queryByRole(\'alert\')).not.toBeInTheDocument()`. Presence: `expect(screen.getByRole(\'alert\')).toHaveTextContent(\'Title is required\')`. And `expect(onAdd).not.toHaveBeenCalled()`.',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TodoForm from './TodoForm';

test('shows an error only for an empty title', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<TodoForm onAdd={onAdd} />);
  // 1. No alert yet.
  // 2. Submit the empty form.
  // 3. An alert with "Title is required", and onAdd not called.

});`,
      variants: [
        { kind: 'bug', label: 'the error shows from the start', edits: [["const [error, setError] = useState('');", "const [error, setError] = useState('Title is required');"]] },
        { kind: 'bug', label: 'an empty title is added anyway', edits: [["      setError('Title is required');\n      return;\n", "      setError('Title is required');\n"]] },
        { kind: 'bug', label: 'the error is not announced (no role="alert")', edits: [['<p role="alert">', '<p className="error">']] },
      ],
      requires: [{ re: /\bqueryBy\w+\(/, text: 'Check the absence with a `queryBy…` query.' }],
    },
    { id: 'wait-for-list', component: 'taskList', title: 'Wait for the list to load',
      goal: 'This test fails: the tasks arrive from the API **after** the first render. Make it wait for them, then also check that the **Loading…** message is gone. Here a small fake API answers `/api/tasks` after 300 ms, the way a mock server (such as MSW) does in a real project.',
      hint: '`expect(await screen.findByText(\'Write the API skeleton\')).toBeInTheDocument()` waits up to 1 s. Then `expect(screen.queryByText(\'Loading…\')).not.toBeInTheDocument()`. Do not forget `async` on the test.',
      starter: `import { render, screen } from '@testing-library/react';
import TaskList from './TaskList';

test('shows the tasks from the API', () => {
  render(<TaskList />);
  expect(screen.getByText('Write the API skeleton')).toBeInTheDocument();
});`,
      variants: [
        { kind: 'bug', label: 'the list never leaves "Loading…"', edits: [['if (!ignore) setTasks(data);', 'if (ignore) setTasks(data);']] },
        { kind: 'bug', label: 'the tasks are thrown away (shows "No tasks yet.")', edits: [['if (!ignore) setTasks(data);', 'if (!ignore) setTasks([]);']] },
      ],
      requires: [{ re: /\bawait\b[\s\S]*\b(find(All)?By\w+|waitFor)\(/, text: 'Wait with `await screen.findBy…` (or `await waitFor`).' }],
    },
    { id: 'mock-fetch-error', component: 'taskList', title: 'Make the server fail',
      goal: 'Test the **error state**: replace `fetch` for this test so it answers **500** (or fails), then check that an **alert** tells the user the tasks could not be loaded. The runner restores `fetch` after each test.',
      hint: '`vi.spyOn(globalThis, \'fetch\').mockResolvedValue(new Response(null, { status: 500 }))`, render, then `expect(await screen.findByRole(\'alert\')).toHaveTextContent(\'Could not load tasks\')`.',
      starter: `import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TaskList from './TaskList';

test('tells the user when the tasks cannot be loaded', async () => {
  // 1. Make fetch answer 500 for this test.
  render(<TaskList />);
  // 2. Wait for the alert and check its text.

});`,
      variants: [
        { kind: 'bug', label: 'errors are swallowed (stays on "Loading…")', edits: [['.catch((err) => { if (!ignore) setError(err.message); });', '.catch(() => {});']] },
      ],
      requires: [
        { re: /\bvi\.(spyOn\(\s*(globalThis|window)\s*,\s*['"]fetch['"]|fn\()|\b(globalThis|window)\.fetch\s*=/, text: 'Replace `fetch` with a mock (`vi.spyOn(globalThis, \'fetch\')`).' },
        { re: /ByRole\(\s*['"]alert['"]/, text: 'Find the message by its role, `alert`.' },
      ],
    },
    { id: 'brittle-counter', component: 'counterBem', title: 'Brittle test: survive a style refactor',
      goal: 'This test passes, but it is **brittle**: it finds elements by CSS class and reads `.textContent`. Rewrite it to query **by role** and assert with jest-dom. It must still pass after two harmless refactors (CSS Modules; an icon in the button) and fail when the button is broken.',
      hint: '`await user.click(screen.getByRole(\'button\', { name: \'Increment\' }))`, then `expect(screen.getByText(\'Count: 1\')).toBeInTheDocument()`. No `container`, no class names.',
      starter: `import { render, fireEvent } from '@testing-library/react';
import Counter from './Counter';

test('increments', () => {
  const { container } = render(<Counter />);
  fireEvent.click(container.querySelector('.counter__inc'));
  expect(container.querySelector('.counter__value').textContent).toBe('Count: 1');
});`,
      variants: [
        { kind: 'refactor', label: 'styles moved to a CSS Module (new class names)', edits: [["import './Counter.css';", "import styles from './Counter.module.css';"], ['className="counter"', 'className={styles.wrapper}'], ['className="counter__value"', 'className={styles.value}'], ['className="counter__inc"', 'className={styles.increment}']] },
        { kind: 'refactor', label: 'an icon was added to the button', edits: [['        Increment\n', '        <span aria-hidden="true">+ </span>Increment\n']] },
        { kind: 'bug', label: 'the button does nothing', edits: [['setCount(count + 1)', 'setCount(count)']] },
      ],
      requires: [{ re: /ByRole\(/, text: 'Query by role.' }],
      forbids: [{ re: /querySelector|\.textContent|\.className|container\./, text: 'No `container.querySelector`, `.textContent` or class names.' }],
    },
    { id: 'brittle-form', component: 'todoFormIds', title: 'Brittle test: no test ids',
      goal: 'This test leans on **test ids** and a CSS class. Rewrite it the way a user finds things: the button by its **role and name**, the message by its **role** (`alert`). It must survive a refactor that removes the test ids and renames the class, and fail when the message is no longer announced.',
      hint: '`await user.click(screen.getByRole(\'button\', { name: \'Add task\' }))`, then `expect(screen.getByRole(\'alert\')).toHaveTextContent(\'Title is required\')`.',
      starter: `import { render, screen, fireEvent } from '@testing-library/react';
import TodoForm from './TodoForm';

test('shows an error for an empty title', () => {
  render(<TodoForm onAdd={() => {}} />);
  fireEvent.click(screen.getByTestId('submit'));
  expect(document.querySelector('.error').textContent).toBe('Title is required');
});`,
      variants: [
        { kind: 'refactor', label: 'test ids removed, class renamed', edits: [[' data-testid="title-input"', ''], [' data-testid="submit"', ''], ['className="error"', 'className="form-error"']] },
        { kind: 'bug', label: 'the message is no longer announced (no role="alert")', edits: [[' role="alert"', '']] },
      ],
      requires: [{ re: /ByRole\(\s*['"]alert['"]/, text: 'Find the message with `getByRole(\'alert\')`.' }],
      forbids: [{ re: /ByTestId|querySelector|\.textContent/, text: 'No test ids, `querySelector` or `.textContent`.' }],
    },
    { id: 'brittle-toggle', component: 'muteToggle', title: 'Brittle test: test the state the user perceives',
      goal: 'This test checks a **class name**, an implementation detail. A screen-reader user knows the button is on from `aria-pressed`. Rewrite the assertion around **what the user perceives**: it must survive a CSS Module refactor and fail when `aria-pressed` stops changing.',
      hint: 'After the click: `expect(screen.getByRole(\'button\', { name: \'Mute\', pressed: true })).toBeInTheDocument()`, or `expect(button).toHaveAttribute(\'aria-pressed\', \'true\')`.',
      starter: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MuteToggle from './MuteToggle';

test('mutes on click', async () => {
  const user = userEvent.setup();
  const { container } = render(<MuteToggle />);
  await user.click(screen.getByText('Mute'));
  expect(container.firstChild.className).toBe('toggle toggle--on');
});`,
      variants: [
        { kind: 'refactor', label: 'class names now come from a CSS Module', edits: [["import './MuteToggle.css';", "import styles from './MuteToggle.module.css';"], ["className={muted ? 'toggle toggle--on' : 'toggle'}", 'className={muted ? `${styles.toggle} ${styles.on}` : styles.toggle}']] },
        { kind: 'bug', label: 'aria-pressed never changes', edits: [['aria-pressed={muted}', 'aria-pressed={false}']] },
        { kind: 'bug', label: 'the click does nothing', edits: [['onClick={() => setMuted(!muted)}', 'onClick={() => setMuted(muted)}']] },
      ],
      requires: [{ re: /pressed\s*:\s*true|aria-pressed/, text: 'Check the pressed state (`pressed: true` or `aria-pressed`).' }],
      forbids: [{ re: /\.className|firstChild|querySelector|toHaveClass/, text: 'No class names or DOM navigation.' }],
    },
  ];

  /* The runs a challenge needs: the component as given, then each variant. */
  function variantsOf(c) {
    return [{ kind: 'original', label: 'as given', edits: [] }].concat(c ? c.variants : []);
  }

  const stripComments = (s) => String(s || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  /* runs: [{ variant, results, fileError }] in the order of variantsOf(c). → { ok, items } */
  function judge(c, runs, source) {
    const src = stripComments(source);
    const items = [];
    const original = runs[0];
    const tests = original && !original.fileError ? original.results.filter((r) => r.status !== 'skip') : [];
    if (original && original.fileError) {
      items.push({ status: 'bad', text: `The test file did not run: ${original.fileError}` });
      return { ok: false, items };
    }
    if (!tests.length) {
      items.push({ status: 'bad', text: 'No test found: write one with `test(\'…\', () => { … })`.' });
      return { ok: false, items };
    }
    if (!/\bexpect\s*\(/.test(src)) items.push({ status: 'bad', text: 'Your test has no `expect(…)`: it checks nothing.' });
    const failing = tests.filter((r) => r.status === 'fail');
    items.push(failing.length
      ? { status: 'bad', text: `Against the component **as given**, ${failing.length} of ${tests.length} test${tests.length === 1 ? '' : 's'} fail${failing.length === 1 ? 's' : ''}: a correct component must pass.` }
      : { status: 'ok', text: `Against the component **as given**: ${tests.length} test${tests.length === 1 ? '' : 's'} pass${tests.length === 1 ? 'es' : ''}.` });
    runs.slice(1).forEach((run) => {
      const v = run.variant;
      const fails = run.fileError || run.results.some((r) => r.status === 'fail');
      if (v.kind === 'bug') {
        items.push(fails
          ? { status: 'ok', text: `Bug caught (**${v.label}**): a test fails.` }
          : { status: 'bad', text: `Bug missed (**${v.label}**): every test still passes.` });
      } else {
        items.push(fails
          ? { status: 'bad', text: `Brittle (**${v.label}**): a test fails after this harmless refactor, although the user sees no difference.` }
          : { status: 'ok', text: `Refactor survived (**${v.label}**): every test still passes.` });
      }
    });
    (c.requires || []).forEach((r) => {
      if (!r.re.test(src)) items.push({ status: 'bad', text: r.text });
    });
    (c.forbids || []).forEach((r) => {
      if (r.re.test(src)) items.push({ status: 'bad', text: r.text });
    });
    return { ok: items.every((i) => i.status === 'ok'), items };
  }

  function validateChallenge(c) {
    const problems = [];
    ['id', 'title', 'goal', 'hint', 'starter', 'component'].forEach((k) => { if (!c[k]) problems.push(`${c.id}: missing ${k}`); });
    if (!COMPONENTS[c.component]) problems.push(`${c.id}: unknown component ${c.component}`);
    else {
      (c.variants || []).forEach((v) => {
        try {
          const code = variantCode(c.component, v);
          if (code === COMPONENTS[c.component].code) problems.push(`${c.id}: variant "${v.label}" changes nothing`);
        } catch (e) { problems.push(`${c.id}: ${e.message}`); }
        if (!/^(bug|refactor)$/.test(v.kind)) problems.push(`${c.id}: variant kind ${v.kind}`);
      });
      if (!(c.variants || []).some((v) => v.kind === 'bug')) problems.push(`${c.id}: needs at least one bug variant`);
    }
    return problems;
  }

  return {
    ELEMENT, TEXT, DOCUMENT,
    normalize, textOf, ownText, elements, isNode, inDocument, isInaccessible,
    implicitRole, roleOf, accessibleName, labelsOf, controlOf,
    matches, queryAll, queries, rolesSummary, waitFor, TYPES,
    prettyDom, describe, format, equals,
    createExpect, createVi, createRunner, lineOf, advise,
    COMPONENTS, FREE, CHALLENGES, variantCode, variantsOf, judge, validateChallenge,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ComponentTestEngine;
