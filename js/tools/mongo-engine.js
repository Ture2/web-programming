'use strict';

/* ==========================================================================
   Mongo engine (pure, no DOM; also runs in Node: site/test/mongo-engine.test.mjs).
   A small in-memory MongoDB for the mongo-playground tool (document databases, MongoDB syntax).

     MongoEngine.createDb()              → a fresh database "app" with the seed data
     MongoEngine.run(db, source)         → { results: [result, …] } (stops at the first error)
     MongoEngine.parseValue(text)        → a value from a relaxed JSON / shell literal
     MongoEngine.parseProgram(text)      → the parsed statements (db.<coll>.<method>(…)…)
     MongoEngine.match(doc, filter)      → does the document match the filter?
     MongoEngine.format(value, { ejson }) → shell-style text, or Extended JSON
     MongoEngine.compare(actual, expected, { ordered }) → { same, reason }
     MongoEngine.checkChallenge(id, db, results) → { ok, reason } (CHALLENGES below)

   Student input is never evaluated as JavaScript: the shell syntax (db.tasks.find(…),
   chained .sort/.skip/.limit, ObjectId(…), ISODate(…), /regex/i) is parsed here.
   Supported: find, findOne, countDocuments, distinct, insertOne, insertMany, updateOne,
   updateMany (with $set $unset $inc $push $addToSet $pull, upsert), deleteOne, deleteMany,
   aggregate ($match $project $addFields/$set $unset $group $sort $skip $limit $unwind
   $count $lookup), createIndex, getIndexes, dropIndex, explain() (simplified), show collections.
   Query operators: $eq $ne $gt $gte $lt $lte $in $nin $exists $regex $not $elemMatch $size
   $all, and $and $or $nor at the top level, with MongoDB's array and dot-path semantics.
   A result: { ok, src, kind: 'docs' | 'doc' | 'value' | 'write' | 'info', docs?, value?,
   message, notes: [text], sql?: { sql } | { why }, op, coll } or { ok: false, error }.
   ========================================================================== */

const MongoEngine = (() => {
  const DB_NAME = 'app';

  /* ---- Values ------------------------------------------------------------------------ */

  class ObjectId {
    constructor(hex) { this.hex = String(hex).toLowerCase(); }
    toString() { return this.hex; }
  }

  class MongoError extends Error {
    constructor(message, pos) { super(message); this.pos = pos; }
  }

  const isOid = (v) => v instanceof ObjectId;
  const isDate = (v) => v instanceof Date;
  const isRegex = (v) => v instanceof RegExp;
  const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !isOid(v) && !isDate(v) && !isRegex(v);

  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (isOid(v)) return new ObjectId(v.hex);
    if (isDate(v)) return new Date(v.getTime());
    if (isRegex(v)) return new RegExp(v.source, v.flags);
    if (isPlain(v)) { const o = {}; Object.keys(v).forEach((k) => { o[k] = clone(v[k]); }); return o; }
    return v;
  }

  /* BSON comparison order: null/missing < numbers < strings < objects < arrays < ObjectId < booleans < dates < regex. */
  function rank(v) {
    if (v === undefined || v === null) return 1;
    if (typeof v === 'number') return 2;
    if (typeof v === 'string') return 3;
    if (Array.isArray(v)) return 5;
    if (isOid(v)) return 6;
    if (typeof v === 'boolean') return 7;
    if (isDate(v)) return 8;
    if (isRegex(v)) return 9;
    return 4;
  }

  function cmp(a, b) {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    switch (ra) {
      case 1: return 0;
      case 2: return a < b ? -1 : a > b ? 1 : 0;
      case 3: return a < b ? -1 : a > b ? 1 : 0;
      case 5: {
        for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmp(a[i], b[i]); if (c) return c; }
        return a.length - b.length;
      }
      case 6: return a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0;
      case 7: return Number(a) - Number(b);
      case 8: return a.getTime() - b.getTime();
      case 9: return cmp(a.source + a.flags, b.source + b.flags);
      default: {
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
          const c = cmp(ka[i], kb[i]) || cmp(a[ka[i]], b[kb[i]]);
          if (c) return c;
        }
        return ka.length - kb.length;
      }
    }
  }
  const equal = (a, b) => rank(a) === rank(b) && cmp(a, b) === 0;

  /* ---- Formatting --------------------------------------------------------------------- */

  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

  function toEjson(v) {
    if (v === undefined) return null;
    if (Array.isArray(v)) return v.map(toEjson);
    if (isOid(v)) return { $oid: v.hex };
    if (isDate(v)) return { $date: v.toISOString() };
    if (isRegex(v)) return { $regularExpression: { pattern: v.source, options: v.flags } };
    if (isPlain(v)) { const o = {}; Object.keys(v).forEach((k) => { o[k] = toEjson(v[k]); }); return o; }
    return v;
  }

  function shell(v, indent, width) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'string') return quote(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (isOid(v)) return `ObjectId('${v.hex}')`;
    if (isDate(v)) return `ISODate('${v.toISOString()}')`;
    if (isRegex(v)) return `/${v.source}/${v.flags}`;
    const pad = '  '.repeat(indent + 1);
    const end = '  '.repeat(indent);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const parts = v.map((x) => shell(x, indent + 1, width));
      const flat = `[ ${parts.join(', ')} ]`;
      if (!flat.includes('\n') && flat.length + indent * 2 <= width) return flat;
      return `[\n${parts.map((p) => pad + p).join(',\n')}\n${end}]`;
    }
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    const parts = keys.map((k) => `${IDENT.test(k) ? k : quote(k)}: ${shell(v[k], indent + 1, width)}`);
    const flat = `{ ${parts.join(', ')} }`;
    if (!flat.includes('\n') && flat.length + indent * 2 <= width) return flat;
    return `{\n${parts.map((p) => pad + p).join(',\n')}\n${end}}`;
  }

  /* Shell style (mongosh) by default; { ejson: true } gives relaxed Extended JSON, the JSON form of BSON. */
  function format(v, opts = {}) {
    if (opts.ejson) return JSON.stringify(toEjson(v), null, 2);
    return shell(v, 0, opts.width || 64);
  }
  const inline = (v) => shell(v, 1, 1e9);

  /* ---- Parsing: relaxed JSON / shell literals ----------------------------------------------- */

  const WORDS = { true: true, false: false, null: null };

  /* ObjectId() with no argument in the editor: a new id, like the shell (timestamp + random + counter). */
  let idCounter = 0x900;
  const freshId = () => new ObjectId(Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + '9c8b7a6f5e' + (++idCounter).toString(16).padStart(6, '0'));

  function lineCol(src, pos) {
    const before = src.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    return { line, col };
  }

  /* A parser over one source string; every function moves p.i. */
  function parser(src) {
    const p = { src, i: 0 };
    const fail = (msg, at = p.i) => { throw new MongoError(msg, at); };
    const where = (at) => { const lc = lineCol(src, at); return `line ${lc.line}, column ${lc.col}`; };
    const peek = () => src[p.i];

    p.ws = () => {
      for (;;) {
        while (p.i < src.length && /\s/.test(src[p.i])) p.i++;
        if (src.startsWith('//', p.i)) { while (p.i < src.length && src[p.i] !== '\n') p.i++; continue; }
        if (src.startsWith('/*', p.i)) {
          const end = src.indexOf('*/', p.i + 2);
          if (end < 0) fail('This comment is never closed: add */.');
          p.i = end + 2;
          continue;
        }
        return;
      }
    };
    p.eat = (ch) => { p.ws(); if (src[p.i] === ch) { p.i++; return true; } return false; };
    p.expect = (ch, what) => { p.ws(); if (src[p.i] !== ch) fail(what || `Expected \`${ch}\` here.`); p.i++; };
    p.ident = () => {
      p.ws();
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(p.i));
      if (!m) return null;
      p.i += m[0].length;
      return m[0];
    };
    p.where = where;
    p.fail = fail;
    p.peek = peek;

    function string() {
      const q = src[p.i];
      const start = p.i;
      p.i++;
      let out = '';
      while (p.i < src.length && src[p.i] !== q) {
        let c = src[p.i];
        if (c === '\n') fail(`This string is not closed: add ${q} before the end of the line.`, start);
        if (c === '\\') {
          p.i++;
          c = src[p.i];
          const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', 0: '\0' };
          if (c === 'u') { out += String.fromCharCode(parseInt(src.slice(p.i + 1, p.i + 5), 16)); p.i += 4; } else out += map[c] !== undefined ? map[c] : c;
        } else out += c;
        p.i++;
      }
      if (p.i >= src.length) fail(`This string is not closed: add ${q}.`, start);
      p.i++;
      return out;
    }

    function number() {
      const m = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(p.i));
      if (!m) fail('Expected a number.');
      p.i += m[0].length;
      return Number(m[0]);
    }

    function regex() {
      const start = p.i;
      p.i++;
      let body = '';
      let inClass = false;
      while (p.i < src.length) {
        const c = src[p.i];
        if (c === '\n') break;
        if (c === '\\') { body += c + src[p.i + 1]; p.i += 2; continue; }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        body += c;
        p.i++;
      }
      if (src[p.i] !== '/') fail('This regular expression is not closed: add / after the pattern.', start);
      p.i++;
      const flags = /^[a-z]*/.exec(src.slice(p.i))[0];
      p.i += flags.length;
      if (/[^ims]/.test(flags)) fail(`Unsupported regular expression flag in "${flags}": use i, m or s.`, p.i - flags.length);
      try { return new RegExp(body, flags); } catch (e) { return fail(`Invalid regular expression: ${e.message}`, start); }
    }

    function helper(name, start) {
      p.expect('(', `${name} needs parentheses: ${name}('…').`);
      p.ws();
      let arg;
      if (src[p.i] !== ')') arg = value();
      p.expect(')', `Expected \`)\` to close ${name}(…).`);
      if (name === 'ObjectId') {
        if (arg === undefined) return freshId();
        if (typeof arg !== 'string' || !/^[0-9a-fA-F]{24}$/.test(arg)) fail('ObjectId needs a string of 24 hexadecimal characters, e.g. ObjectId(\'650f1c2a9b3e4d5f6a7b8c9d\').', start);
        return new ObjectId(arg);
      }
      const d = arg === undefined ? new Date() : new Date(arg);
      if (typeof arg !== 'string' && typeof arg !== 'number' && arg !== undefined) fail(`${name} needs a date string such as '2026-09-01'.`, start);
      if (Number.isNaN(d.getTime())) fail(`"${arg}" is not a valid date: write it like '2026-09-01' or '2026-09-01T10:30:00Z'.`, start);
      return d;
    }

    function object() {
      const open = p.i;
      p.i++;
      const out = {};
      for (;;) {
        p.ws();
        if (src[p.i] === '}') { p.i++; return out; }
        if (p.i >= src.length) fail(`Expected \`}\` to close the object opened at ${where(open)}.`);
        const kpos = p.i;
        let key;
        const c = src[p.i];
        if (c === '"' || c === "'") key = string();
        else if (/[\d-]/.test(c)) key = String(number());
        else {
          key = p.ident();
          if (key === null) fail(`Expected a field name (or \`}\`), found \`${c}\`.`);
          if (src[p.i] === '.') fail(`A field name with a dot must be quoted: write '${key}${/^[.\w$]*/.exec(src.slice(p.i))[0]}' with quotes.`, kpos);
        }
        p.ws();
        if (src[p.i] === '=' ) fail(`Use \`:\` between a field and its value, not \`=\`: { ${key}: … }.`);
        if (src[p.i] !== ':') fail(`Expected \`:\` after the field name \`${key}\`.`);
        p.i++;
        if (Object.prototype.hasOwnProperty.call(out, key)) fail(`The field \`${key}\` appears twice in this object: the second one would silently replace the first. Combine the conditions (e.g. { ${key}: { $gte: 1, $lte: 5 } }) or use $and.`, kpos);
        out[key] = value();
        p.ws();
        if (src[p.i] === ',') { p.i++; continue; }
        if (src[p.i] === '}') { p.i++; return out; }
        if (p.i >= src.length) fail(`Expected \`}\` to close the object opened at ${where(open)}.`);
        fail(`Expected \`,\` or \`}\` after the value of \`${key}\`.`);
      }
    }

    function array() {
      const open = p.i;
      p.i++;
      const out = [];
      for (;;) {
        p.ws();
        if (src[p.i] === ']') { p.i++; return out; }
        if (p.i >= src.length) fail(`Expected \`]\` to close the array opened at ${where(open)}.`);
        out.push(value());
        p.ws();
        if (src[p.i] === ',') { p.i++; continue; }
        if (src[p.i] === ']') { p.i++; return out; }
        if (p.i >= src.length) fail(`Expected \`]\` to close the array opened at ${where(open)}.`);
        fail('Expected `,` or `]` in this array.');
      }
    }

    function value() {
      p.ws();
      const c = src[p.i];
      const start = p.i;
      if (c === undefined) fail('Expected a value, but the command ended.');
      if (c === '{') return object();
      if (c === '[') return array();
      if (c === '"' || c === "'") return string();
      if (c === '`') fail('Use single or double quotes for strings here (template literals are not supported).');
      if (c === '/') return regex();
      if (/[\d.-]/.test(c)) return number();
      const word = p.ident();
      if (word === null) fail(`Unexpected \`${c}\`: expected a value (a string in quotes, a number, true/false, null, { … } or [ … ]).`);
      if (Object.prototype.hasOwnProperty.call(WORDS, word)) return WORDS[word];
      if (word === 'new') {
        const name = p.ident();
        if (name === 'ObjectId' || name === 'Date') return helper(name, start);
        fail('Only `new ObjectId(…)` and `new Date(…)` are supported here.', start);
      }
      if (word === 'ObjectId' || word === 'ISODate') return helper(word, start);
      if (word === 'undefined') fail('`undefined` is not stored by MongoDB: use null.', start);
      if (word === 'True' || word === 'False') fail(`Booleans are written in lower case: ${word.toLowerCase()}.`, start);
      return fail(`Unknown value \`${word}\`. If it is text, put it in quotes: '${word}'.`, start);
    }

    p.value = value;
    return p;
  }

  function parseValue(text) {
    const p = parser(text);
    const v = p.value();
    p.ws();
    if (p.i < text.length) p.fail('Unexpected text after the value.');
    return v;
  }

  /* ---- Parsing: shell commands ------------------------------------------------------------ */

  const COLL_METHODS = ['find', 'findOne', 'countDocuments', 'distinct', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate', 'createIndex', 'getIndexes', 'dropIndex'];
  const CURSOR_METHODS = ['sort', 'skip', 'limit', 'explain', 'toArray', 'pretty'];

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1));
    return d[a.length][b.length];
  }
  const closest = (word, list) => {
    let best = null;
    let dist = 3;
    list.forEach((w) => { const x = lev(word, w); if (x < dist) { dist = x; best = w; } });
    return best;
  };

  function parseCall(p) {
    const pos = p.i;
    const name = p.ident();
    if (!name) p.fail('Expected a method name after the dot.');
    p.ws();
    if (p.peek() !== '(') p.fail(`\`${name}\` is a method: call it with parentheses, e.g. ${name}(…).`);
    const open = p.i;
    p.i++;
    const args = [];
    for (;;) {
      p.ws();
      if (p.peek() === ')') { p.i++; break; }
      if (p.i >= p.src.length) p.fail(`Expected \`)\` to close ${name}( opened at ${p.where(open)}.`);
      const apos = p.i;
      const c = p.peek();
      if (/[A-Za-z_]/.test(c)) {
        const save = p.i;
        const w = p.ident();
        p.ws();
        if (p.peek() === ':') p.fail(`A filter or document is an object: wrap it in braces, e.g. ${name}({ ${w}: … }).`, apos);
        p.i = save;
      }
      args.push(p.value());
      p.ws();
      if (p.peek() === ',') { p.i++; continue; }
      if (p.peek() === ')') { p.i++; break; }
      if (p.i >= p.src.length) p.fail(`Expected \`)\` to close ${name}( opened at ${p.where(open)}.`);
      p.fail(`Expected \`,\` or \`)\` in the arguments of ${name}(…).`);
    }
    return { name, args, pos };
  }

  function parseStatement(p) {
    const start = p.i;
    const first = p.ident();
    if (first === 'show') {
      const what = p.ident();
      if (what !== 'collections' && what !== 'tables') p.fail('Only `show collections` is supported here.');
      return { start, target: { kind: 'show' }, calls: [] };
    }
    if (first === 'use') p.fail('This playground has one database, `app`, already selected: start with db.', start);
    if (first !== 'db') p.fail(first ? `Commands start with \`db\`, e.g. db.tasks.find(). Found \`${first}\`.` : 'Commands start with `db`, e.g. db.tasks.find().', start);
    if (!p.eat('.')) p.fail('Expected `.` after db, e.g. db.tasks.find().');
    const namePos = p.i;
    const name = p.ident();
    if (!name) p.fail('Expected a collection name after db., e.g. db.tasks.');
    p.ws();
    let target;
    const calls = [];
    if (p.peek() === '(') {
      if (name === 'collection' || name === 'getCollection') {
        const call = parseCall(Object.assign(p, { i: namePos }));
        if (call.args.length !== 1 || typeof call.args[0] !== 'string') p.fail(`${name}() needs the collection name as a string: db.${name}('tasks').`, namePos);
        target = { kind: 'coll', name: call.args[0], pos: namePos };
      } else if (name === 'getCollectionNames') {
        parseCall(Object.assign(p, { i: namePos }));
        return { start, target: { kind: 'show' }, calls: [] };
      } else p.fail(`\`db.${name}()\` is not supported here. Use db.<collection>.<method>(…), e.g. db.tasks.find().`, namePos);
    } else target = { kind: 'coll', name, pos: namePos };
    while (p.eat('.')) calls.push(parseCall(p));
    if (!calls.length) p.fail(`\`db.${target.name}\` is a collection: call a method on it, e.g. db.${target.name}.find().`, namePos);
    return { start, target, calls };
  }

  function parseProgram(src) {
    const p = parser(src);
    const out = [];
    p.ws();
    if (p.i >= src.length) throw new MongoError('Type a command, e.g. db.tasks.find().', 0);
    while (p.i < src.length) {
      const st = parseStatement(p);
      st.src = src.slice(st.start, p.i).trim();
      out.push(st);
      p.ws();
      while (p.peek() === ';') { p.i++; p.ws(); }
      if (p.i < src.length && !/[A-Za-z]/.test(p.peek())) p.fail(`Unexpected \`${p.peek()}\` after the command.`);
    }
    return out;
  }

  /* ---- Paths ------------------------------------------------------------------------------ */

  /* Every value a dot path reaches, crossing arrays the way MongoDB does; undefined = missing. */
  function resolve(doc, path) {
    const parts = path.split('.');
    const out = [];
    const walk = (v, i) => {
      if (i === parts.length) { out.push(v); return; }
      const key = parts[i];
      if (Array.isArray(v)) {
        if (/^\d+$/.test(key) && +key < v.length) walk(v[+key], i + 1);
        v.forEach((el) => { if (isPlain(el) || Array.isArray(el)) walk(el, i); });
        return;
      }
      if (isPlain(v)) { walk(Object.prototype.hasOwnProperty.call(v, key) ? v[key] : undefined, i + 1); return; }
      out.push(undefined);
    };
    walk(doc, 0);
    return out;
  }
  const expand = (vals) => vals.flatMap((v) => (Array.isArray(v) ? [v, ...v] : [v]));

  /* The single value at a path, without crossing arrays (for updates). */
  function getPath(doc, path) {
    let v = doc;
    for (const k of path.split('.')) {
      if (Array.isArray(v) && /^\d+$/.test(k)) v = v[+k];
      else if (isPlain(v) && Object.prototype.hasOwnProperty.call(v, k)) v = v[k];
      else return undefined;
    }
    return v;
  }

  function setPath(doc, path, val) {
    const parts = path.split('.');
    let v = doc;
    parts.forEach((k, idx) => {
      const last = idx === parts.length - 1;
      if (Array.isArray(v)) {
        if (!/^\d+$/.test(k)) throw new MongoError(`Cannot create field '${k}' in an array: use a position such as '${parts.slice(0, idx).join('.')}.0', or $push.`);
        if (last) { while (v.length < +k) v.push(null); v[+k] = val; return; }
        if (v[+k] === undefined || v[+k] === null) v[+k] = {};
        v = v[+k];
      } else if (isPlain(v)) {
        if (last) { v[k] = val; return; }
        if (v[k] === undefined || v[k] === null) v[k] = {};
        else if (!isPlain(v[k]) && !Array.isArray(v[k])) throw new MongoError(`Cannot create field '${parts[idx + 1]}' in element {${k}: ${inline(v[k])}}: '${k}' is not a sub-document.`);
        v = v[k];
      }
    });
  }

  function unsetPath(doc, path) {
    const parts = path.split('.');
    const parent = parts.length > 1 ? getPath(doc, parts.slice(0, -1).join('.')) : doc;
    const k = parts[parts.length - 1];
    if (Array.isArray(parent) && /^\d+$/.test(k)) { if (+k < parent.length) parent[+k] = null; } else if (isPlain(parent)) delete parent[k];
  }

  /* ---- Query matching --------------------------------------------------------------------- */

  const FIELD_OPS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$regex', '$options', '$not', '$elemMatch', '$size', '$all'];

  function isOpObject(v) {
    if (!isPlain(v)) return false;
    const keys = Object.keys(v);
    if (!keys.length || !keys[0].startsWith('$')) return false;
    return true;
  }

  function eqMatch(vals, x) {
    if (x === null) return vals.length === 0 || expand(vals).some((v) => v === null || v === undefined);
    if (isRegex(x)) return expand(vals).some((v) => typeof v === 'string' && x.test(v));
    return expand(vals).some((v) => v !== undefined && equal(v, x));
  }

  function rangeMatch(vals, op, x) {
    if (x === null) return op === '$gte' || op === '$lte' ? eqMatch(vals, null) : false;
    return expand(vals).some((v) => {
      if (v === undefined || rank(v) !== rank(x)) return false;     // type bracketing: 3 vs '5' never compares
      const c = cmp(v, x);
      return op === '$gt' ? c > 0 : op === '$gte' ? c >= 0 : op === '$lt' ? c < 0 : c <= 0;
    });
  }

  function opsMatch(vals, ops, doc) {
    return Object.keys(ops).every((op) => {
      const x = ops[op];
      switch (op) {
        case '$eq': return eqMatch(vals, x);
        case '$ne': return !eqMatch(vals, x);
        case '$gt': case '$gte': case '$lt': case '$lte': return rangeMatch(vals, op, x);
        case '$in':
          if (!Array.isArray(x)) throw new MongoError('$in needs an array, e.g. { tags: { $in: [\'db\', \'api\'] } }.');
          return x.some((el) => eqMatch(vals, el));
        case '$nin':
          if (!Array.isArray(x)) throw new MongoError('$nin needs an array, e.g. { tags: { $nin: [\'home\'] } }.');
          return !x.some((el) => eqMatch(vals, el));
        case '$exists': return Boolean(x) === vals.some((v) => v !== undefined);
        case '$regex': {
          let re;
          const flags = typeof ops.$options === 'string' ? ops.$options : '';
          if (/[^ims]/.test(flags)) throw new MongoError(`Unsupported $options "${flags}": use i, m or s.`);
          try { re = isRegex(x) ? new RegExp(x.source, flags || x.flags) : new RegExp(String(x), flags); } catch (e) { throw new MongoError(`Invalid regular expression: ${e.message}`); }
          return expand(vals).some((v) => typeof v === 'string' && re.test(v));
        }
        case '$options':
          if (!('$regex' in ops)) throw new MongoError('$options needs a $regex in the same object.');
          return true;
        case '$not':
          if (!isRegex(x) && !isOpObject(x)) throw new MongoError('$not needs an operator object or a regex, e.g. { priority: { $not: { $gt: 3 } } }.');
          return !(isRegex(x) ? eqMatch(vals, x) : opsMatch(vals, x, doc));
        case '$elemMatch':
          if (!isPlain(x)) throw new MongoError('$elemMatch needs an object.');
          return vals.some((v) => Array.isArray(v) && v.some((el) => (isOpObject(x) && !Object.keys(x).some((k) => ['$and', '$or', '$nor'].includes(k)) ? opsMatch([el], x, el) : isPlain(el) && matchDoc(el, x))));
        case '$size':
          if (typeof x !== 'number') throw new MongoError('$size needs a number.');
          return vals.some((v) => Array.isArray(v) && v.length === x);
        case '$all':
          if (!Array.isArray(x)) throw new MongoError('$all needs an array.');
          return x.length > 0 && x.every((el) => eqMatch(vals, el));
        default:
          if (['$and', '$or', '$nor'].includes(op)) throw new MongoError(`${op} goes at the top level of the filter, e.g. { ${op}: [ { … }, { … } ] }, not inside a field.`);
          throw new MongoError(`unknown operator: ${op}${closest(op, FIELD_OPS) ? ` (did you mean ${closest(op, FIELD_OPS)}?)` : ''}`);
      }
    });
  }

  function matchField(doc, path, cond) {
    const vals = resolve(doc, path);
    if (isOpObject(cond)) {
      const bad = Object.keys(cond).find((k) => !k.startsWith('$'));
      if (bad) throw new MongoError(`unknown operator: ${bad} (an object that starts with an operator may only contain operators)`);
      return opsMatch(vals, cond, doc);
    }
    return eqMatch(vals, cond);
  }

  function matchDoc(doc, filter) {
    if (filter === undefined || filter === null) return true;
    if (!isPlain(filter)) throw new MongoError(`A filter must be an object such as { done: false }, not ${inline(filter)}.`);
    return Object.keys(filter).every((key) => {
      const cond = filter[key];
      if (key.startsWith('$')) {
        if (key === '$and' || key === '$or' || key === '$nor') {
          if (!Array.isArray(cond) || !cond.length) throw new MongoError(`${key} needs a non-empty array of filters, e.g. { ${key}: [ { done: true }, { priority: 5 } ] }.`);
          const r = (f) => matchDoc(doc, f);
          return key === '$and' ? cond.every(r) : key === '$or' ? cond.some(r) : !cond.some(r);
        }
        if (key === '$comment') return true;
        throw new MongoError(`unknown top level operator: ${key}${FIELD_OPS.includes(key) ? ` (${key} goes inside a field: { priority: { ${key}: … } })` : ''}`);
      }
      return matchField(doc, key, cond);
    });
  }

  /* ---- Projection --------------------------------------------------------------------------- */

  function pathTree(paths) {
    const tree = {};
    paths.forEach((path) => {
      const parts = path.split('.');
      let node = tree;
      parts.forEach((k, i) => {
        if (node[k] === true) throw new MongoError(`Path collision at ${path}: ${parts.slice(0, i + 1).join('.')} is already in the projection.`);
        if (i === parts.length - 1) {
          if (node[k] && node[k] !== true) throw new MongoError(`Path collision at ${path}: a sub-field of it is already in the projection.`);
          node[k] = true;
        } else node = (node[k] = node[k] || {});
      });
    });
    return tree;
  }

  function include(doc, tree) {
    const out = {};
    Object.keys(doc).forEach((k) => {
      if (!(k in tree)) return;
      const sub = tree[k];
      const v = doc[k];
      if (sub === true) out[k] = clone(v);
      else if (isPlain(v)) out[k] = include(v, sub);
      else if (Array.isArray(v)) out[k] = v.filter((el) => isPlain(el) || Array.isArray(el)).map((el) => (Array.isArray(el) ? el : include(el, sub)));
    });
    return out;
  }

  function exclude(doc, tree) {
    const out = {};
    Object.keys(doc).forEach((k) => {
      const sub = tree[k];
      const v = doc[k];
      if (sub === true) return;
      if (sub && isPlain(v)) out[k] = exclude(v, sub);
      else if (sub && Array.isArray(v)) out[k] = v.map((el) => (isPlain(el) ? exclude(el, sub) : clone(el)));
      else out[k] = clone(v);
    });
    return out;
  }

  /* { mode, tree, id, computed: [[path, expr]] }; agg: allow expressions (aggregation $project). */
  function compileProjection(spec, agg) {
    if (!isPlain(spec)) throw new MongoError('A projection must be an object such as { title: 1, _id: 0 }.');
    let mode = null;
    let id = true;
    const fields = [];
    const computed = [];
    Object.keys(spec).forEach((k) => {
      const v = spec[k];
      const flag = typeof v === 'number' || typeof v === 'boolean' ? Boolean(v) : null;
      if (k.startsWith('$')) throw new MongoError(`FieldPath field names may not start with '$': ${k}.`);
      if (flag === null) {
        if (!agg) throw new MongoError(`Use 1 (show) or 0 (hide) in a find projection; "${k}: ${inline(v)}" is an aggregation expression: use aggregate with $project for that.`);
        if (mode === 'exclude') throw new MongoError(`Cannot do inclusion on field ${k} in exclusion projection`);
        mode = 'include';
        computed.push([k, v]);
        return;
      }
      if (k === '_id') { id = flag; return; }
      const m = flag ? 'include' : 'exclude';
      if (mode && mode !== m) throw new MongoError(`Cannot do ${m === 'include' ? 'inclusion' : 'exclusion'} on field ${k} in ${mode === 'include' ? 'inclusion' : 'exclusion'} projection`);
      mode = m;
      fields.push(k);
    });
    if (!mode) mode = id ? 'none' : 'exclude';
    if (mode === 'include' && id) fields.unshift('_id');
    if (mode === 'exclude' && !id) fields.push('_id');
    return { mode, tree: pathTree(fields), computed };
  }

  function applyProjection(doc, proj) {
    if (proj.mode === 'none') return clone(doc);
    if (proj.mode === 'exclude') return exclude(doc, proj.tree);
    const out = include(doc, proj.tree);
    proj.computed.forEach(([path, expr]) => setPath(out, path, evalExpr(doc, expr)));
    return out;
  }

  /* ---- Sorting ------------------------------------------------------------------------------ */

  function checkSort(spec) {
    if (!isPlain(spec) || !Object.keys(spec).length) throw new MongoError('sort() needs an object such as { priority: -1 }.');
    Object.keys(spec).forEach((k) => {
      if (spec[k] !== 1 && spec[k] !== -1) throw new MongoError(`$sort key ordering must be 1 (for ascending) or -1 (for descending): got ${k}: ${inline(spec[k])}.`);
    });
  }

  function sortValue(doc, path, dir) {
    const cands = resolve(doc, path).flatMap((v) => (Array.isArray(v) ? (v.length ? v : [undefined]) : [v]));
    if (!cands.length) return undefined;
    return cands.reduce((best, v) => (dir > 0 ? (cmp(v, best) < 0 ? v : best) : (cmp(v, best) > 0 ? v : best)));
  }

  function sortDocs(docs, spec) {
    checkSort(spec);
    const keys = Object.keys(spec);
    return docs.map((d, i) => ({ d, i, k: keys.map((p) => sortValue(d, p, spec[p])) }))
      .sort((a, b) => {
        for (let j = 0; j < keys.length; j++) { const c = cmp(a.k[j], b.k[j]); if (c) return c * spec[keys[j]]; }
        return a.i - b.i;
      })
      .map((x) => x.d);
  }

  /* ---- Aggregation expressions --------------------------------------------------------------- */

  /* The value of "$a.b" in aggregation: arrays met on the way give an array of the values below. */
  function fieldValue(doc, path) {
    const parts = path.split('.');
    const walk = (v, i) => {
      if (i === parts.length) return v;
      if (Array.isArray(v)) return v.map((el) => walk(el, i)).filter((x) => x !== undefined);
      if (isPlain(v)) return walk(v[parts[i]], i + 1);
      return undefined;
    };
    return walk(doc, 0);
  }

  const num = (v) => typeof v === 'number';
  function evalExpr(doc, e) {
    if (typeof e === 'string' && e.startsWith('$$')) {
      if (e === '$$ROOT' || e === '$$CURRENT') return doc;
      if (e.startsWith('$$ROOT.') || e.startsWith('$$CURRENT.')) return fieldValue(doc, e.slice(e.indexOf('.') + 1));
      throw new MongoError(`Use of undefined variable: ${e.slice(2)}`);
    }
    if (typeof e === 'string' && e.startsWith('$')) {
      if (e.length === 1) throw new MongoError("'$' by itself is not a valid field path.");
      return fieldValue(doc, e.slice(1));
    }
    if (Array.isArray(e)) return e.map((x) => evalExpr(doc, x));
    if (!isPlain(e)) return e;
    const keys = Object.keys(e);
    if (keys.length === 1 && keys[0].startsWith('$')) {
      const op = keys[0];
      const raw = e[op];
      if (op === '$literal') return raw;
      const args = Array.isArray(raw) ? raw.map((x) => evalExpr(doc, x)) : [evalExpr(doc, raw)];
      const [a, b] = args;
      switch (op) {
        case '$size':
          if (!Array.isArray(a)) throw new MongoError(`The argument to $size must be an array, but was of type: ${a === undefined ? 'missing' : typeof a}`);
          return a.length;
        case '$concat':
          if (args.some((x) => x === null || x === undefined)) return null;
          if (!args.every((x) => typeof x === 'string')) throw new MongoError('$concat only supports strings.');
          return args.join('');
        case '$toUpper': return a == null ? '' : String(a).toUpperCase();
        case '$toLower': return a == null ? '' : String(a).toLowerCase();
        case '$add': return args.some((x) => x == null) ? null : args.reduce((s, x) => s + x, 0);
        case '$subtract': return a == null || b == null ? null : a - b;
        case '$multiply': return args.some((x) => x == null) ? null : args.reduce((s, x) => s * x, 1);
        case '$divide':
          if (a == null || b == null) return null;
          if (b === 0) throw new MongoError("can't $divide by zero");
          return a / b;
        case '$sum': case '$avg': case '$min': case '$max': {
          const list = (Array.isArray(raw) ? args : Array.isArray(a) ? a : [a]).filter((x) => x !== undefined && x !== null);
          if (op === '$sum') return list.filter(num).reduce((s, x) => s + x, 0);
          if (op === '$avg') { const ns = list.filter(num); return ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length : null; }
          if (!list.length) return null;
          return list.reduce((m, x) => ((op === '$min' ? cmp(x, m) < 0 : cmp(x, m) > 0) ? x : m));
        }
        case '$eq': return equal(a, b);
        case '$ne': return !equal(a, b);
        case '$gt': return cmp(a, b) > 0;
        case '$gte': return cmp(a, b) >= 0;
        case '$lt': return cmp(a, b) < 0;
        case '$lte': return cmp(a, b) <= 0;
        case '$ifNull': return a === null || a === undefined ? b : a;
        case '$cond': {
          const c = isPlain(raw) ? null : args;
          if (!c || c.length !== 3) throw new MongoError('$cond needs three values: [ condition, then, else ].');
          return c[0] ? c[1] : c[2];
        }
        default: throw new MongoError(`Unrecognized expression '${op}' (not supported in this playground)`);
      }
    }
    const out = {};
    keys.forEach((k) => { const v = evalExpr(doc, e[k]); if (v !== undefined) out[k] = v; });
    return out;
  }

  /* ---- Aggregation stages ---------------------------------------------------------------------- */

  const ACCS = ['$sum', '$avg', '$min', '$max', '$push', '$addToSet', '$first', '$last', '$count'];

  function group(docs, spec) {
    if (!isPlain(spec) || !('_id' in spec)) throw new MongoError('a group specification must include an _id (use _id: null for one group with every document)');
    const fields = Object.keys(spec).filter((k) => k !== '_id');
    fields.forEach((k) => {
      const acc = spec[k];
      if (!isPlain(acc) || Object.keys(acc).length !== 1) throw new MongoError(`The field '${k}' must be an accumulator object, e.g. ${k}: { $sum: 1 }.`);
      const op = Object.keys(acc)[0];
      if (!ACCS.includes(op)) throw new MongoError(`unknown group operator '${op}'${closest(op, ACCS) ? ` (did you mean ${closest(op, ACCS)}?)` : ''}`);
    });
    const groups = new Map();
    docs.forEach((d) => {
      let key = evalExpr(d, spec._id);
      if (key === undefined) key = null;
      const id = format(key, { ejson: true });
      if (!groups.has(id)) groups.set(id, { key, docs: [] });
      groups.get(id).docs.push(d);
    });
    return [...groups.values()].map((g) => {
      const out = { _id: g.key };
      fields.forEach((k) => {
        const op = Object.keys(spec[k])[0];
        const arg = spec[k][op];
        const vals = g.docs.map((d) => evalExpr(d, arg));
        const present = vals.filter((v) => v !== undefined && v !== null);
        switch (op) {
          case '$sum': out[k] = vals.reduce((sum, v) => sum + (num(v) ? v : 0), 0); break;   // non-numbers are ignored
          case '$avg': { const ns = vals.filter(num); out[k] = ns.length ? ns.reduce((s, v) => s + v, 0) / ns.length : null; break; }
          case '$min': out[k] = present.length ? present.reduce((m, v) => (cmp(v, m) < 0 ? v : m)) : null; break;
          case '$max': out[k] = present.length ? present.reduce((m, v) => (cmp(v, m) > 0 ? v : m)) : null; break;
          case '$push': out[k] = vals.filter((v) => v !== undefined).map(clone); break;
          case '$addToSet': out[k] = vals.filter((v) => v !== undefined).reduce((acc, v) => (acc.some((x) => equal(x, v)) ? acc : [...acc, clone(v)]), []); break;
          case '$first': out[k] = vals[0] === undefined ? null : clone(vals[0]); break;
          case '$last': out[k] = vals[vals.length - 1] === undefined ? null : clone(vals[vals.length - 1]); break;
          case '$count': out[k] = g.docs.length; break;
          default: break;
        }
      });
      return out;
    });
  }

  function unwind(docs, arg) {
    const opts = typeof arg === 'string' ? { path: arg } : arg;
    if (!isPlain(opts) || typeof opts.path !== 'string') throw new MongoError('$unwind needs a field path such as \'$tags\'.');
    if (!opts.path.startsWith('$')) throw new MongoError(`path option to $unwind stage should be prefixed with a '$': write '$${opts.path}'.`);
    const path = opts.path.slice(1);
    const out = [];
    docs.forEach((d) => {
      const v = getPath(d, path);
      if (Array.isArray(v) && v.length) {
        v.forEach((el, i) => {
          const c = clone(d);
          setPath(c, path, clone(el));
          if (opts.includeArrayIndex) c[opts.includeArrayIndex] = i;
          out.push(c);
        });
      } else if (v !== undefined && v !== null && !Array.isArray(v)) out.push(clone(d));
      else if (opts.preserveNullAndEmptyArrays) out.push(clone(d));
    });
    return out;
  }

  function lookup(db, docs, arg) {
    if (!isPlain(arg) || ['from', 'localField', 'foreignField', 'as'].some((k) => typeof arg[k] !== 'string')) {
      throw new MongoError('$lookup needs { from: \'users\', localField: \'owner.email\', foreignField: \'email\', as: \'ownerDoc\' } (all four as strings).');
    }
    const foreign = db.collections[arg.from] || [];
    return docs.map((d) => {
      const local = expand(resolve(d, arg.localField));
      const keys = local.some((v) => v !== undefined) ? local.filter((v) => v !== undefined) : [null];
      const hits = foreign.filter((f) => keys.some((k) => eqMatch(resolve(f, arg.foreignField), k)));
      const c = clone(d);
      setPath(c, arg.as, hits.map(clone));
      return c;
    });
  }

  function aggregate(db, collName, pipeline, notes) {
    if (!Array.isArray(pipeline)) throw new MongoError('aggregate() needs an array of stages: db.tasks.aggregate([ { $match: { … } }, … ]).');
    let docs = (db.collections[collName] || []).map(clone);
    pipeline.forEach((stage, n) => {
      if (!isPlain(stage) || Object.keys(stage).length !== 1) throw new MongoError(`Stage ${n + 1}: a pipeline stage specification object must contain exactly one field, e.g. { $match: { … } }.`);
      const name = Object.keys(stage)[0];
      const arg = stage[name];
      switch (name) {
        case '$match': docs = docs.filter((d) => matchDoc(d, arg)); if (n > 0 && !pipeline.slice(0, n).some((s) => '$group' in s || '$unwind' in s || '$lookup' in s || '$project' in s || '$addFields' in s || '$set' in s)) notes.push('Put $match first when you can: the stages before it work on every document, and only a leading $match can use an index.'); break;
        case '$project': { const pr = compileProjection(arg, true); docs = docs.map((d) => applyProjection(d, pr)); break; }
        case '$addFields': case '$set':
          if (!isPlain(arg)) throw new MongoError(`${name} needs an object of new fields.`);
          docs = docs.map((d) => { const c = clone(d); Object.keys(arg).forEach((k) => setPath(c, k, evalExpr(d, arg[k]))); return c; });
          break;
        case '$unset': { const list = Array.isArray(arg) ? arg : [arg]; const tree = pathTree(list); docs = docs.map((d) => exclude(d, tree)); break; }
        case '$group':
          if (isPlain(arg) && typeof arg._id === 'string' && !arg._id.startsWith('$')) notes.push(`_id: '${arg._id}' is a constant string, so every document fell into one group. To group by a field, prefix it with $: _id: '$${arg._id}'.`);
          docs = group(docs, arg);
          break;
        case '$sort': docs = sortDocs(docs, arg); break;
        case '$limit':
          if (!Number.isInteger(arg) || arg <= 0) throw new MongoError('the limit must be positive');
          docs = docs.slice(0, arg);
          break;
        case '$skip':
          if (!Number.isInteger(arg) || arg < 0) throw new MongoError('$skip needs a whole number of 0 or more.');
          docs = docs.slice(arg);
          break;
        case '$unwind': docs = unwind(docs, arg); break;
        case '$count':
          if (typeof arg !== 'string' || !arg || arg.startsWith('$') || arg.includes('.')) throw new MongoError('$count needs a field name such as { $count: \'total\' } (no $ and no dots).');
          if (!docs.length) notes.push('$count returns no document at all (not 0) when nothing reaches it.');
          docs = docs.length ? [{ [arg]: docs.length }] : [];
          break;
        case '$lookup': docs = lookup(db, docs, arg); break;
        default: {
          const all = ['$match', '$project', '$addFields', '$set', '$unset', '$group', '$sort', '$limit', '$skip', '$unwind', '$count', '$lookup'];
          const near = closest(name, all);
          throw new MongoError(`Unrecognized pipeline stage name: '${name}'${near ? ` (did you mean ${near}?)` : ''}`);
        }
      }
    });
    return docs;
  }

  /* ---- Updates ------------------------------------------------------------------------------- */

  const UPDATE_OPS = ['$set', '$unset', '$inc', '$push', '$addToSet', '$pull'];

  function pullMatch(el, cond) {
    if (isRegex(cond)) return typeof el === 'string' && cond.test(el);
    if (isOpObject(cond)) return opsMatch([el], cond, el);
    if (isPlain(cond) && isPlain(el)) return matchDoc(el, cond);
    return equal(el, cond);
  }

  function applyUpdate(doc, update) {
    if (Array.isArray(update)) throw new MongoError('Pipeline-style updates (an array) are not supported here: use an update document such as { $set: { done: true } }.');
    if (!isPlain(update) || !Object.keys(update).length) throw new MongoError('updateOne/updateMany need an update document such as { $set: { done: true } }.');
    const keys = Object.keys(update);
    if (!keys.every((k) => k.startsWith('$'))) throw new MongoError(`Update document requires atomic operators: wrap the fields in $set, e.g. { $set: ${inline(Object.fromEntries(keys.filter((k) => !k.startsWith('$')).map((k) => [k, update[k]])))} }.`);
    const out = clone(doc);
    const seen = [];
    keys.forEach((op) => {
      if (!UPDATE_OPS.includes(op)) {
        const near = closest(op, UPDATE_OPS);
        throw new MongoError(`Unknown modifier: ${op}. Expected a valid update modifier${near ? ` (did you mean ${near}?)` : ''}.`);
      }
      const arg = update[op];
      if (!isPlain(arg)) throw new MongoError(`Modifiers operate on fields but we found ${inline(arg)} instead: write { ${op}: { field: value } }.`);
      Object.keys(arg).forEach((path) => {
        if (path.includes('$')) throw new MongoError(`The positional operator in '${path}' is not supported in this playground.`);
        if (path === '_id' || path.startsWith('_id.')) throw new MongoError("Performing an update on the path '_id' would modify the immutable field '_id'");
        const clash = seen.find((s) => s === path || s.startsWith(`${path}.`) || path.startsWith(`${s}.`));
        if (clash) throw new MongoError(`Updating the path '${path}' would create a conflict at '${clash}'`);
        seen.push(path);
        const val = arg[path];
        const cur = getPath(out, path);
        switch (op) {
          case '$set': setPath(out, path, clone(val)); break;
          case '$unset': unsetPath(out, path); break;
          case '$inc':
            if (!num(val)) throw new MongoError(`Cannot increment with non-numeric argument: {${path}: ${inline(val)}}`);
            if (cur !== undefined && !num(cur)) throw new MongoError(`Cannot apply $inc to a value of non-numeric type. The field '${path}' holds ${inline(cur)}.`);
            setPath(out, path, (cur || 0) + val);
            break;
          case '$push': case '$addToSet': {
            if (cur !== undefined && !Array.isArray(cur)) throw new MongoError(`The field '${path}' must be an array but is of type ${typeof cur === 'object' ? 'object' : typeof cur}: ${op} only works on arrays.`);
            const items = isPlain(val) && '$each' in val ? val.$each : [val];
            if (!Array.isArray(items)) throw new MongoError('$each needs an array.');
            const arr = cur ? cur : [];
            items.forEach((x) => { if (op === '$push' || !arr.some((y) => equal(x, y))) arr.push(clone(x)); });
            if (!cur) setPath(out, path, arr);
            break;
          }
          case '$pull':
            if (cur === undefined) break;
            if (!Array.isArray(cur)) throw new MongoError(`Cannot apply $pull to a non-array value: '${path}' holds ${inline(cur)}.`);
            setPath(out, path, cur.filter((el) => !pullMatch(el, val)));
            break;
          default: break;
        }
      });
    });
    return out;
  }

  /* ---- The database -------------------------------------------------------------------------- */

  const SEED_HEX = 'a1b2c3d4e5';
  const oidAt = (iso, n) => new ObjectId(Math.floor(Date.parse(iso) / 1000).toString(16).padStart(8, '0') + SEED_HEX + n.toString(16).padStart(6, '0'));
  const D = (s) => new Date(`${s}T09:00:00Z`);

  function seed() {
    const owner = (name) => ({ name, email: `${name.toLowerCase()}@example.com` });
    const task = (n, title, who, done, priority, tags, day, extra = {}) => ({
      _id: oidAt(`2026-09-${String(day).padStart(2, '0')}T09:00:00Z`, 0x100 + n), title, done, priority, tags, owner: owner(who), createdAt: D(`2026-09-${String(day).padStart(2, '0')}`), ...extra,
    });
    return {
      users: [
        { _id: oidAt('2026-08-30T08:00:00Z', 1), name: 'Ana', email: 'ana@example.com', role: 'student', createdAt: new Date('2026-08-30T08:00:00Z') },
        { _id: oidAt('2026-08-30T08:30:00Z', 2), name: 'Ben', email: 'ben@example.com', role: 'student', createdAt: new Date('2026-08-30T08:30:00Z') },
        { _id: oidAt('2026-08-31T10:00:00Z', 3), name: 'Cleo', email: 'cleo@example.com', role: 'teacher', interests: ['databases', 'teaching'], createdAt: new Date('2026-08-31T10:00:00Z') },
      ],
      tasks: [
        task(1, 'Buy milk', 'Ana', false, 1, ['home'], 1),
        task(2, 'Write the SQL schema', 'Ana', true, 4, ['db', 'sql'], 2, { comments: [{ author: 'Ben', text: 'Add ON DELETE CASCADE' }] }),
        task(3, 'Read the pg docs', 'Ana', false, 2, ['db', 'reading'], 3),
        task(4, 'Set up CI', 'Ben', false, 5, ['devops', 'urgent'], 4, { due: D('2026-09-20') }),
        task(5, 'Add pagination', 'Ana', false, 3, ['api', 'urgent'], 5, { due: D('2026-09-25'), comments: [{ author: 'Cleo', text: 'Use skip and limit' }, { author: 'Ben', text: 'Sort first!' }] }),
        task(6, 'Review pull request', 'Ben', true, 3, ['git', 'urgent'], 6, { comments: [{ author: 'Ana', text: 'Looks good to me' }] }),
        task(7, 'Draft project plan', 'Cleo', false, 4, ['planning', 'urgent'], 7, { due: D('2026-09-30') }),
        task(8, 'Design the Mongo schema', 'Cleo', false, 3, ['db', 'mongo'], 8, { comments: [{ author: 'Ana', text: 'Embed the comments?' }] }),
        task(9, 'Write API tests', 'Ben', false, 3, ['api', 'testing'], 9, { comments: [] }),
        task(10, 'Book a room for the demo', 'Cleo', true, 1, [], 10),
      ],
    };
  }

  const defaultIndexes = () => [{ name: '_id_', key: { _id: 1 }, unique: true }];

  function createDb(opts = {}) {
    const collections = opts.empty ? {} : seed();
    const indexes = {};
    Object.keys(collections).forEach((c) => { indexes[c] = defaultIndexes(); });
    let counter = 0x500;
    const now = opts.now || (() => Date.now());
    return {
      collections, indexes,
      newId() { counter++; return new ObjectId(Math.floor(now() / 1000).toString(16).padStart(8, '0') + 'f0e1d2c3b4' + counter.toString(16).padStart(6, '0')); },
    };
  }

  function cloneDb(db) {
    const copy = createDb({ empty: true });
    Object.keys(db.collections).forEach((c) => { copy.collections[c] = db.collections[c].map(clone); });
    Object.keys(db.indexes).forEach((c) => { copy.indexes[c] = db.indexes[c].map((ix) => ({ ...ix, key: { ...ix.key } })); });
    copy.newId = db.newId;
    return copy;
  }

  const indexName = (key) => Object.keys(key).map((k) => `${k}_${key[k]}`).join('_');
  const indexKey = (doc, ix) => Object.keys(ix.key).map((k) => { const v = getPath(doc, k); return v === undefined ? null : v; });

  /* Unique indexes: throws E11000 when two documents share a key. */
  function checkUnique(db, coll, docs) {
    (db.indexes[coll] || []).filter((ix) => ix.unique).forEach((ix) => {
      const seen = new Map();
      docs.forEach((d) => {
        const k = format(indexKey(d, ix), { ejson: true });
        if (seen.has(k)) {
          const dup = Object.keys(ix.key).map((f) => `${f}: ${inline(getPath(d, f) === undefined ? null : getPath(d, f))}`).join(', ');
          throw new MongoError(`E11000 duplicate key error collection: ${DB_NAME}.${coll} index: ${ix.name} dup key: { ${dup} }`);
        }
        seen.set(k, true);
      });
    });
  }

  function ensureColl(db, name) {
    if (!db.collections[name]) { db.collections[name] = []; db.indexes[name] = defaultIndexes(); return true; }
    return false;
  }

  /* ---- Simplified query planner (for explain) ------------------------------------------------- */

  function plan(db, coll, filter, sort) {
    const docs = db.collections[coll] || [];
    const conds = {};
    if (isPlain(filter)) {
      Object.keys(filter).forEach((k) => { if (!k.startsWith('$')) conds[k] = filter[k]; });
      if (Array.isArray(filter.$and)) filter.$and.forEach((f) => { if (isPlain(f)) Object.keys(f).forEach((k) => { if (!k.startsWith('$')) conds[k] = f[k]; }); });
    }
    const usable = (c) => {
      if (!isOpObject(c)) return isRegex(c) ? (c.source.startsWith('^') ? 'range' : null) : 'eq';
      const ops = Object.keys(c);
      if (ops.includes('$eq') || ops.includes('$in')) return 'eq';
      if (ops.some((o) => ['$gt', '$gte', '$lt', '$lte'].includes(o))) return 'range';
      if (ops.includes('$regex') && String(c.$regex instanceof RegExp ? c.$regex.source : c.$regex).startsWith('^')) return 'range';
      return null;
    };
    let best = null;
    (db.indexes[coll] || []).forEach((ix) => {
      const fields = Object.keys(ix.key);
      const prefix = [];
      for (const f of fields) {
        if (!(f in conds)) break;
        const u = usable(conds[f]);
        if (!u) break;
        prefix.push(f);
        if (u === 'range') break;
      }
      const sortHit = !prefix.length && sort && Object.keys(sort)[0] === fields[0];
      if ((prefix.length || sortHit) && (!best || prefix.length > best.prefix.length)) best = { ix, prefix };
    });
    const nonId = best && best.ix.name === '_id_' && !('_id' in conds) ? null : best;
    if (!nonId) return { stage: 'COLLSCAN', keys: 0, docsExamined: docs.length };
    const sub = {};
    nonId.prefix.forEach((f) => { sub[f] = conds[f]; });
    const hits = docs.filter((d) => matchDoc(d, sub)).length;
    return { stage: 'IXSCAN', index: nonId.ix, keys: nonId.prefix.length ? hits : docs.length, docsExamined: nonId.prefix.length ? hits : docs.length };
  }

  function explainDoc(db, coll, filter, sort, nReturned) {
    const pl = plan(db, coll, filter, sort);
    const sortStage = sort && !(pl.stage === 'IXSCAN' && Object.keys(sort)[0] === Object.keys(pl.index.key)[0]);
    const scan = pl.stage === 'COLLSCAN'
      ? { stage: 'COLLSCAN', filter: filter || {} }
      : { stage: 'FETCH', inputStage: { stage: 'IXSCAN', indexName: pl.index.name, keyPattern: pl.index.key } };
    return {
      queryPlanner: { namespace: `${DB_NAME}.${coll}`, winningPlan: sortStage ? { stage: 'SORT', sortPattern: sort, inputStage: scan } : scan },
      executionStats: { nReturned, totalKeysExamined: pl.keys, totalDocsExamined: pl.docsExamined },
    };
  }

  /* ---- The SQL bridge ------------------------------------------------------------------------ */

  /* How the tasks collection maps onto the relational tasks/users schema: owner → users, arrays → child tables. */
  const SQL_JOINS = {
    tasks: {
      owner: { table: 'users', alias: 'u', on: 'u.id = t.user_id', many: false },
      tags: { table: 'task_tags', alias: 'tt', on: 'tt.task_id = t.id', many: true, scalar: 'tag' },
      comments: { table: 'comments', alias: 'c', on: 'c.task_id = t.id', many: true },
    },
  };

  class NoSql extends Error {}
  const SQL_OPS = { $eq: '=', $ne: '<>', $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' };

  function sqlValue(v) {
    if (v === null) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (isDate(v)) return `TIMESTAMP '${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (isOid(v)) return `'${v.hex}'`;
    throw new NoSql('this value has no plain SQL equivalent');
  }

  function fieldKind(db, coll, field) {
    const docs = db.collections[coll] || [];
    if (docs.some((d) => Array.isArray(d[field]))) return 'array';
    if (docs.some((d) => isPlain(d[field]))) return 'object';
    return 'scalar';
  }

  function sqlTranslator(db, coll, qualify) {
    const joins = new Map();
    const map = SQL_JOINS[coll] || {};
    const T = (c) => (qualify ? `t.${c}` : c);
    const col = (path) => {
      const [head, ...rest] = path.split('.');
      if (head === '_id' && !rest.length) return T('id');
      const kind = fieldKind(db, coll, head);
      if (kind === 'scalar' && !rest.length) return T(head);
      const j = map[head];
      if (!j) throw new NoSql(`\`${head}\` is ${kind === 'array' ? 'an array' : kind === 'object' ? 'an embedded document' : 'not a plain column'}; a table cell holds a single value, so SQL would need a separate table and a JOIN.`);
      joins.set(head, j);
      if (j.scalar && !rest.length) return `${j.alias}.${j.scalar}`;
      if (!rest.length) throw new NoSql(`\`${head}\` is ${kind === 'array' ? 'an array' : 'an embedded document'}: in SQL it lives in the \`${j.table}\` table, so you would JOIN it and list its columns.`);
      if (rest.length === 1) return `${j.alias}.${rest[0]}`;
      throw new NoSql(`\`${path}\` has no simple SQL column.`);
    };
    const like = (column, re) => {
      const m = /^(\^)?([\w ,.!?'-]*)(\$)?$/.exec(re.source);
      if (!m) throw new NoSql('this regular expression has no simple LIKE equivalent.');
      const pat = `${m[1] ? '' : '%'}${m[2]}${m[3] ? '' : '%'}`;
      return `${column} ${re.flags.includes('i') ? 'ILIKE' : 'LIKE'} ${sqlValue(pat)}`;
    };
    const cond = (path, c) => {
      const column = col(path);
      if (isRegex(c)) return like(column, c);
      if (!isOpObject(c)) {
        if (Array.isArray(c) || isPlain(c)) throw new NoSql('comparing a whole array or sub-document has no simple SQL equivalent.');
        return c === null ? `${column} IS NULL` : `${column} = ${sqlValue(c)}`;
      }
      return Object.keys(c).map((op) => {
        const x = c[op];
        if (SQL_OPS[op]) return x === null ? `${column} IS ${op === '$ne' ? 'NOT ' : ''}NULL` : `${column} ${SQL_OPS[op]} ${sqlValue(x)}`;
        if (op === '$in' || op === '$nin') return `${column} ${op === '$nin' ? 'NOT ' : ''}IN (${x.map(sqlValue).join(', ')})`;
        if (op === '$exists') return `${column} IS ${x ? 'NOT ' : ''}NULL`;
        if (op === '$regex') return like(column, isRegex(x) ? new RegExp(x.source, c.$options || x.flags) : new RegExp(x, c.$options || ''));
        if (op === '$options') return null;
        throw new NoSql(`${op} has no simple SQL equivalent.`);
      }).filter(Boolean).join(' AND ');
    };
    const where = (f) => {
      if (!f || !Object.keys(f).length) return '';
      const keys = Object.keys(f);
      return keys.map((k) => {
        if (k === '$and' || k === '$or') {
          const inner = f[k].map((g) => where(g)).map((s) => (f[k].length > 1 && / (AND|OR) /.test(s) ? `(${s})` : s));
          const joined = inner.join(k === '$and' ? ' AND ' : ' OR ');
          return k === '$or' && keys.length > 1 ? `(${joined})` : joined;
        }
        if (k.startsWith('$')) throw new NoSql(`${k} has no simple SQL equivalent.`);
        return cond(k, f[k]);
      }).join(' AND ');
    };
    const from = () => (joins.size ? `${coll} t${[...joins.values()].map((j) => `\n  JOIN ${j.table} ${j.alias} ON ${j.on}`).join('')}` : coll);
    const distinct = () => [...joins.values()].some((j) => j.many);
    return { col, where, from, distinct, joins, T };
  }

  /* Translates once to find the JOINs, then again with t.-qualified columns if there are any. */
  function withJoins(db, coll, build) {
    const first = sqlTranslator(db, coll, false);
    const out = build(first);
    return first.joins.size ? build(sqlTranslator(db, coll, true)) : out;
  }

  function sqlFind(db, coll, filter, proj, cursor) {
    return withJoins(db, coll, (tr) => {
      const w = tr.where(filter || {});
      let cols = null;
      if (proj && Object.keys(proj).length) {
        const pr = compileProjection(proj, false);
        if (pr.mode === 'exclude') throw new NoSql('SQL has no "every column except…": list the columns you want instead.');
        if (pr.mode === 'include') {
          const list = [];
          const walk = (node, pre) => Object.keys(node).forEach((k) => { if (node[k] === true) list.push(pre + k); else walk(node[k], `${pre}${k}.`); });
          walk(pr.tree, '');
          cols = list.map((p) => tr.col(p)).join(', ');
        }
      }
      const order = cursor.sort ? Object.keys(cursor.sort).map((k) => `${tr.col(k)}${cursor.sort[k] < 0 ? ' DESC' : ''}`).join(', ') : '';
      let sql = `SELECT ${tr.distinct() ? 'DISTINCT ' : ''}${cols || tr.T('*')}\nFROM ${tr.from()}`;
      if (w) sql += `\nWHERE ${w}`;
      if (order) sql += `\nORDER BY ${order}`;
      if (cursor.limit) sql += `\nLIMIT ${cursor.limit}`;
      if (cursor.skip) sql += `${cursor.limit ? ' ' : '\n'}OFFSET ${cursor.skip}`;
      return `${sql};`;
    });
  }

  function sqlCount(db, coll, filter) {
    return withJoins(db, coll, (tr) => {
      const w = tr.where(filter || {});
      return `SELECT COUNT(${tr.distinct() ? 'DISTINCT t.id' : '*'})\nFROM ${tr.from()}${w ? `\nWHERE ${w}` : ''};`;
    });
  }

  const STAGE_SQL = {
    $unwind: '$unwind turns one document into one per array element. In SQL the array would already be rows of a child table (such as `task_tags`), and a JOIN gives one row per element.',
    $lookup: '$lookup is a LEFT OUTER JOIN, e.g. `SELECT … FROM tasks t LEFT JOIN users u ON u.email = t.owner_email`, but SQL gives one row per match where $lookup embeds the matches as an array.',
    $project: '$project is the SELECT list (`SELECT title, priority …`), but a pipeline stage can reshape documents in ways a flat row cannot, so it is not translated here.',
    $addFields: '$addFields is like a computed column in SELECT (`SELECT *, priority + 1 AS next …`).',
    $set: '$set (as a stage) is like a computed column in SELECT.',
    $unset: '$unset (as a stage) is like leaving columns out of the SELECT list.',
  };

  function sqlAggregate(db, coll, pipeline) {
    let stage = 0;
    const take = (name) => (pipeline[stage] && name in pipeline[stage] ? pipeline[stage++][name] : undefined);
    const unsupported = pipeline.map((st) => Object.keys(st)[0]).find((n) => STAGE_SQL[n]);
    if (unsupported) throw new NoSql(STAGE_SQL[unsupported]);
    const match = take('$match');
    const count = take('$count');
    if (count && stage === pipeline.length) {
      return withJoins(db, coll, (tr) => {
        const w = tr.where(match || {});
        return `SELECT COUNT(${tr.distinct() ? 'DISTINCT t.id' : '*'}) AS ${count}\nFROM ${tr.from()}${w ? `\nWHERE ${w}` : ''};`;
      });
    }
    const grp = take('$group');
    if (!grp) {
      const cursor = { sort: take('$sort'), skip: take('$skip'), limit: take('$limit') };
      if (stage !== pipeline.length) throw new NoSql('only $match, $group, $sort, $skip, $limit and $count pipelines are translated here.');
      return sqlFind(db, coll, match, null, cursor);
    }
    const having = take('$match');
    const sort = take('$sort');
    const skip = take('$skip');
    const limit = take('$limit');
    if (stage !== pipeline.length) throw new NoSql(`a stage such as ${Object.keys(pipeline[stage])[0]} here has no simple SQL equivalent.`);
    return withJoins(db, coll, (tr) => {
      let key = null;
      if (grp._id !== null) {
        if (typeof grp._id !== 'string' || !grp._id.startsWith('$')) throw new NoSql('a computed or constant group key has no simple SQL equivalent here.');
        key = tr.col(grp._id.slice(1));
      }
      const aliases = {};
      const cols = Object.keys(grp).filter((k) => k !== '_id').map((k) => {
        const op = Object.keys(grp[k])[0];
        const arg = grp[k][op];
        let expr;
        if (op === '$count' || (op === '$sum' && arg === 1)) expr = tr.distinct() ? 'COUNT(DISTINCT t.id)' : 'COUNT(*)';
        else if (['$sum', '$avg', '$min', '$max'].includes(op) && typeof arg === 'string' && arg.startsWith('$')) expr = `${op.slice(1).toUpperCase()}(${tr.col(arg.slice(1))})`;
        else throw new NoSql(`${op} has no simple SQL aggregate here.`);
        aliases[k] = expr;
        return `${expr} AS ${k}`;
      });
      const w = tr.where(match || {});
      if (key) cols.unshift(`${key} AS _id`);
      let sql = `SELECT ${cols.join(', ') || 'COUNT(*)'}\nFROM ${tr.from()}`;
      if (w) sql += `\nWHERE ${w}`;
      if (key) sql += `\nGROUP BY ${key}`;
      if (having) {
        const hv = Object.keys(having).map((k) => {
          const target = k === '_id' ? key : aliases[k];
          if (!target) throw new NoSql('this $match after $group has no simple HAVING equivalent.');
          const c = having[k];
          if (!isOpObject(c)) return `${target} = ${sqlValue(c)}`;
          return Object.keys(c).map((op) => {
            if (!SQL_OPS[op]) throw new NoSql(`${op} after $group has no simple HAVING equivalent.`);
            return `${target} ${SQL_OPS[op]} ${sqlValue(c[op])}`;
          }).join(' AND ');
        });
        sql += `\nHAVING ${hv.join(' AND ')}`;
      }
      if (sort) sql += `\nORDER BY ${Object.keys(sort).map((k) => `${k}${sort[k] < 0 ? ' DESC' : ''}`).join(', ')}`;
      if (limit) sql += `\nLIMIT ${limit}`;
      if (skip) sql += `${limit ? ' ' : '\n'}OFFSET ${skip}`;
      return `${sql};`;
    });
  }

  function sqlWrite(db, coll, op, args) {
    if (op === 'insertOne' || op === 'insertMany') {
      const docs = op === 'insertOne' ? [args[0]] : args[0];
      const cols = [...new Set(docs.flatMap((d) => Object.keys(d)))];
      cols.forEach((c) => {
        if (docs.some((d) => Array.isArray(d[c]))) throw new NoSql(`\`${c}\` is an array: in SQL each value would be a row of another table, inserted separately.`);
        if (docs.some((d) => isPlain(d[c]))) throw new NoSql(`\`${c}\` is an embedded document: in SQL it would live in another table (or be split into columns).`);
      });
      return `INSERT INTO ${coll} (${cols.map((c) => (c === '_id' ? 'id' : c)).join(', ')})\nVALUES ${docs.map((d) => `(${cols.map((c) => (d[c] === undefined ? 'DEFAULT' : sqlValue(d[c]))).join(', ')})`).join(',\n       ')};`;
    }
    const tr = sqlTranslator(db, coll, false);
    const w = tr.where(args[0] || {});
    if (tr.joins.size) throw new NoSql('the filter uses an embedded field or an array, so SQL would need a sub-query on another table.');
    if (op === 'deleteOne' || op === 'deleteMany') return `DELETE FROM ${coll}${w ? `\nWHERE ${w}` : ''};${op === 'deleteOne' ? '\n-- deleteOne removes only the first match; SQL DELETE removes every match.' : ''}`;
    const upd = args[1];
    const sets = [];
    Object.keys(upd).forEach((o) => {
      Object.keys(upd[o]).forEach((f) => {
        const v = upd[o][f];
        if (['$push', '$pull', '$addToSet'].includes(o)) throw new NoSql(`${o} changes an array: in SQL that is an INSERT or DELETE of rows in a child table.`);
        if (f.includes('.') || fieldKind(db, coll, f) !== 'scalar') throw new NoSql(`\`${f}\` is ${f.includes('.') ? 'a field inside an embedded document' : 'not a plain column'}: in SQL it would be a column of another table.`);
        if (o === '$set') sets.push(`${f} = ${sqlValue(v)}`);
        else if (o === '$inc') sets.push(`${f} = ${f} + ${sqlValue(v)}`);
        else if (o === '$unset') sets.push(`${f} = NULL`);
        else throw new NoSql(`${o} changes an array: in SQL that is an INSERT or DELETE in a child table.`);
      });
    });
    return `UPDATE ${coll}\nSET ${sets.join(', ')}${w ? `\nWHERE ${w}` : ''};${op === 'updateOne' ? '\n-- updateOne changes only the first match; SQL UPDATE changes every match.' : ''}`;
  }

  const trySql = (fn) => {
    try { return { sql: fn() }; } catch (e) {
      if (e instanceof NoSql) return { why: e.message || 'no simple SQL equivalent.' };
      throw e;
    }
  };

  /* ---- Running statements ---------------------------------------------------------------------- */

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function argCheck(call, max, needs) {
    if (call.args.length > max) throw new MongoError(`${call.name}() takes at most ${max} argument${max === 1 ? '' : 's'}, you gave ${call.args.length}.`, call.pos);
    (needs || []).forEach((kind, i) => {
      if (!kind) return;
      const a = call.args[i];
      if (a === undefined) { if (kind.endsWith('!')) throw new MongoError(`${call.name}() needs ${kind.startsWith('array') ? 'an array' : 'a document'} as argument ${i + 1}.`, call.pos); return; }
      if (kind.startsWith('object') && !isPlain(a)) throw new MongoError(`${call.name}() expects ${i === 0 && /find|count|update|delete/.test(call.name) ? 'a filter document like { done: false }' : 'a document (an object in { })'} as argument ${i + 1}, not ${inline(a)}.`, call.pos);
      if (kind.startsWith('array') && !Array.isArray(a)) throw new MongoError(`${call.name}() expects an array [ … ] as argument ${i + 1}, not ${inline(a)}.`, call.pos);
    });
  }

  /* Notes that explain a surprising empty result. */
  function emptyHints(db, coll, filter, notes) {
    if (!isPlain(filter)) return;
    Object.keys(filter).forEach((k) => {
      const v = filter[k];
      if (k.startsWith('$') || typeof v !== 'string') return;
      const kinds = new Set((db.collections[coll] || []).map((d) => rank(getPath(d, k))).filter((r) => r !== 1));
      if (kinds.has(7) && (v === 'true' || v === 'false')) notes.push(`\`${k}\` holds booleans, but you compared it with the string '${v}'. Write ${v} without quotes.`);
      else if (kinds.has(2) && v.trim() !== '' && !Number.isNaN(Number(v))) notes.push(`\`${k}\` holds numbers, but you compared it with the string '${v}'. Write ${v} without quotes: MongoDB never treats '${v}' and ${v} as equal.`);
      else if (kinds.has(6) && /^[0-9a-f]{24}$/i.test(v)) notes.push(`\`${k}\` holds ObjectIds, and a string is never equal to an ObjectId. Write ${k}: ObjectId('${v}').`);
    });
    const missing = Object.keys(filter).filter((k) => !k.startsWith('$') && !(db.collections[coll] || []).some((d) => getPath(d, k) !== undefined || resolve(d, k).some((x) => x !== undefined)));
    missing.forEach((k) => {
      const fields = [...new Set((db.collections[coll] || []).flatMap((d) => Object.keys(d)))];
      const near = closest(k.split('.')[0], fields);
      notes.push(`No document in \`${coll}\` has a field \`${k}\`${near && near !== k.split('.')[0] ? ` (did you mean \`${near}\`?)` : ''}. A missing field never equals a value, so nothing matched.`);
    });
  }

  function collNotes(db, name, notes) {
    if (db.collections[name]) return;
    const names = Object.keys(db.collections).sort();
    const near = closest(name, names);
    notes.push(`There is no collection \`${name}\` in this database, so the result is empty: MongoDB does not report an error for an unknown collection.${near ? ` Did you mean \`${near}\`?` : ''} Collections: ${names.join(', ')}.`);
  }

  function runStatement(db, st) {
    const notes = [];
    const base = { ok: true, src: st.src, notes };
    if (st.target.kind === 'show') return { ...base, kind: 'info', op: 'show', value: Object.keys(db.collections).sort(), message: plural(Object.keys(db.collections).length, 'collection', 'collections') };
    const coll = st.target.name;
    const [call, ...chain] = st.calls;
    if (!COLL_METHODS.includes(call.name)) {
      const near = closest(call.name, COLL_METHODS);
      if (call.name === 'insert' || call.name === 'update' || call.name === 'remove' || call.name === 'count') throw new MongoError(`${call.name}() is the old, deprecated API: use ${{ insert: 'insertOne / insertMany', update: 'updateOne / updateMany', remove: 'deleteOne / deleteMany', count: 'countDocuments' }[call.name]}.`, call.pos);
      throw new MongoError(`Unknown collection method \`${call.name}\`${near ? `. Did you mean \`${near}\`?` : '.'}`, call.pos);
    }
    const docs = () => db.collections[coll] || [];
    const isRead = ['find', 'findOne', 'countDocuments', 'distinct', 'aggregate', 'getIndexes'].includes(call.name);
    if (isRead && call.name !== 'getIndexes') collNotes(db, coll, notes);
    if (chain.length && call.name !== 'find' && call.name !== 'aggregate') throw new MongoError(`.${chain[0].name}() can only follow find() or aggregate(): ${call.name}() does not return a cursor.`, chain[0].pos);

    switch (call.name) {
      case 'find': {
        argCheck(call, 2, ['object', 'object']);
        let [filter, proj] = call.args;
        if (isPlain(proj) && Object.keys(proj).length === 1 && isPlain(proj.projection)) {
          notes.push('`{ projection: { … } }` is how the Node.js driver passes a projection. In the shell the second argument is the projection itself; it was read as one here.');
          proj = proj.projection;
        }
        const cursor = {};
        let explain = false;
        const order = [];
        chain.forEach((c) => {
          if (!CURSOR_METHODS.includes(c.name)) {
            const near = closest(c.name, CURSOR_METHODS);
            if (c.name === 'count' || c.name === 'countDocuments') throw new MongoError(`Count with db.${coll}.countDocuments(filter) instead of a cursor method.`, c.pos);
            throw new MongoError(`Unknown cursor method \`${c.name}\`${near ? `. Did you mean \`${near}\`?` : '.'} A find() cursor supports sort, skip, limit and explain.`, c.pos);
          }
          if (c.name === 'sort') { if (c.args.length !== 1) throw new MongoError('sort() takes one object, e.g. sort({ priority: -1 }).', c.pos); checkSort(c.args[0]); cursor.sort = c.args[0]; order.push('sort'); }
          if (c.name === 'skip' || c.name === 'limit') {
            const n = c.args[0];
            if (c.args.length !== 1 || !Number.isInteger(n) || n < 0) throw new MongoError(`${c.name}() takes one whole number of 0 or more, e.g. ${c.name}(5).`, c.pos);
            cursor[c.name] = n;
            order.push(c.name);
          }
          if (c.name === 'explain') explain = true;
        });
        const sOrder = order.filter((x, i) => order.indexOf(x) === i);
        if (sOrder.join() !== ['sort', 'skip', 'limit'].filter((x) => sOrder.includes(x)).join()) notes.push('MongoDB always applies sort first, then skip, then limit, whatever order you chain them in.');
        const projection = proj ? compileProjection(proj, false) : null;
        let out = docs().filter((d) => matchDoc(d, filter));
        if (cursor.sort) out = sortDocs(out, cursor.sort);
        if (cursor.skip) out = out.slice(cursor.skip);
        if (cursor.limit) out = out.slice(0, cursor.limit);
        if (explain) return { ...base, kind: 'doc', op: 'explain', coll, value: explainDoc(db, coll, filter, cursor.sort, out.length), message: 'Query plan (simplified)' };
        if (!out.length && filter) emptyHints(db, coll, filter, notes);
        if (cursor.skip && !cursor.sort) notes.push('skip() without sort(): pages follow the natural (insertion) order, which MongoDB does not guarantee. Sort first for stable pages.');
        out = out.map((d) => (projection ? applyProjection(d, projection) : clone(d)));
        return { ...base, kind: 'docs', op: 'find', coll, docs: out, message: plural(out.length, 'document', 'documents'), sql: trySql(() => sqlFind(db, coll, filter, proj, cursor)) };
      }
      case 'findOne': {
        argCheck(call, 2, ['object', 'object']);
        const [filter, proj] = call.args;
        const projection = proj ? compileProjection(proj, false) : null;
        const hit = docs().find((d) => matchDoc(d, filter));
        if (!hit && filter) emptyHints(db, coll, filter, notes);
        return { ...base, kind: 'doc', op: 'findOne', coll, value: hit ? (projection ? applyProjection(hit, projection) : clone(hit)) : null, message: hit ? '1 document' : 'null: no document matched', sql: trySql(() => sqlFind(db, coll, filter, proj, { limit: 1 })) };
      }
      case 'countDocuments': {
        argCheck(call, 1, ['object']);
        const n = docs().filter((d) => matchDoc(d, call.args[0])).length;
        if (!n && call.args[0]) emptyHints(db, coll, call.args[0], notes);
        return { ...base, kind: 'value', op: 'count', coll, value: n, message: `Count: ${n}`, sql: trySql(() => sqlCount(db, coll, call.args[0])) };
      }
      case 'distinct': {
        argCheck(call, 2, [null, 'object']);
        if (typeof call.args[0] !== 'string') throw new MongoError('distinct() needs a field name as a string, e.g. distinct(\'tags\').', call.pos);
        const vals = [];
        docs().filter((d) => matchDoc(d, call.args[1])).forEach((d) => {
          resolve(d, call.args[0]).flatMap((v) => (Array.isArray(v) ? v : [v])).forEach((v) => { if (v !== undefined && !vals.some((x) => equal(x, v))) vals.push(v); });
        });
        vals.sort(cmp);
        return { ...base, kind: 'value', op: 'distinct', coll, value: vals, message: plural(vals.length, 'distinct value', 'distinct values') };
      }
      case 'aggregate': {
        argCheck(call, 1, ['array!']);
        chain.forEach((c) => { if (!['toArray', 'pretty'].includes(c.name)) throw new MongoError(`.${c.name}() is not supported after aggregate(): put it in the pipeline as a stage, e.g. { $${c.name}: … }.`, c.pos); });
        const out = aggregate(db, coll, call.args[0], notes);
        return { ...base, kind: 'docs', op: 'aggregate', coll, docs: out, message: plural(out.length, 'document', 'documents'), sql: trySql(() => sqlAggregate(db, coll, call.args[0])) };
      }
      case 'insertOne': {
        if (Array.isArray(call.args[0])) throw new MongoError('insertOne() inserts one document: use insertMany([ … ]) for an array.', call.pos);
        argCheck(call, 2, ['object!']);
        const created = ensureColl(db, coll);
        const doc = prepareInsert(db, call.args[0]);
        const next = [...db.collections[coll], doc];
        checkUnique(db, coll, next);
        db.collections[coll] = next;
        if (created) notes.push(`The collection \`${coll}\` did not exist, so MongoDB created it on this first insert. (A typo in a collection name silently creates a new one.)`);
        return { ...base, kind: 'write', op: 'insertOne', coll, value: { acknowledged: true, insertedId: doc._id }, message: '1 document inserted', sql: trySql(() => sqlWrite(db, coll, 'insertOne', call.args)) };
      }
      case 'insertMany': {
        argCheck(call, 2, ['array!']);
        if (!call.args[0].length) throw new MongoError('insertMany() needs a non-empty array of documents.', call.pos);
        call.args[0].forEach((d, i) => { if (!isPlain(d)) throw new MongoError(`insertMany(): item ${i + 1} is not a document (an object in { }).`, call.pos); });
        const created = ensureColl(db, coll);
        const ids = {};
        let n = 0;
        for (const raw of call.args[0]) {
          const doc = prepareInsert(db, raw);
          const next = [...db.collections[coll], doc];
          try { checkUnique(db, coll, next); } catch (e) {
            throw new MongoError(`${e.message}. insertMany stops at the first error (ordered insert): ${plural(n, 'document was', 'documents were')} inserted before it.`, call.pos);
          }
          db.collections[coll] = next;
          ids[String(n)] = doc._id;
          n++;
        }
        if (created) notes.push(`The collection \`${coll}\` did not exist, so MongoDB created it on this first insert.`);
        return { ...base, kind: 'write', op: 'insertMany', coll, value: { acknowledged: true, insertedIds: ids }, message: `${plural(n, 'document', 'documents')} inserted`, sql: trySql(() => sqlWrite(db, coll, 'insertMany', call.args)) };
      }
      case 'updateOne': case 'updateMany': {
        argCheck(call, 3, ['object!', 'object!', 'object']);
        const [filter, update, options = {}] = call.args;
        if (Object.keys(options).some((k) => k !== 'upsert')) throw new MongoError('Only the { upsert: true } option is supported here.', call.pos);
        const all = docs();
        const hits = all.map((d, i) => (matchDoc(d, filter) ? i : -1)).filter((i) => i >= 0);
        const targets = call.name === 'updateOne' ? hits.slice(0, 1) : hits;
        if (!Object.keys(filter).length) notes.push(call.name === 'updateMany' ? `The empty filter {} matches every document: all ${all.length} were updated.` : 'The empty filter {} matches every document: updateOne changed the first one in natural order.');
        else if (call.name === 'updateOne' && hits.length > 1) notes.push(`${hits.length} documents match this filter, but updateOne changes only the first one. Use updateMany to change all of them.`);
        const next = all.slice();
        let modified = 0;
        targets.forEach((i) => {
          const after = applyUpdate(all[i], update);
          if (!equal(after, all[i])) modified++;
          next[i] = after;
        });
        let upsertedId;
        if (!targets.length && options.upsert) {
          applyUpdate({}, update);
          const baseDoc = {};
          Object.keys(filter).forEach((k) => { if (!k.startsWith('$') && !isOpObject(filter[k])) setPath(baseDoc, k, clone(filter[k])); });
          const doc = prepareInsert(db, applyUpdate(baseDoc, update));
          upsertedId = doc._id;
          ensureColl(db, coll);
          next.push(doc);
        }
        checkUnique(db, coll, next);
        if (db.collections[coll] || next.length) db.collections[coll] = next;
        if (!hits.length && !upsertedId) { notes.push('No document matched the filter, so nothing changed.'); emptyHints(db, coll, filter, notes); }
        else if (targets.length && !modified) notes.push('The matching document already had these values, so modifiedCount is 0.');
        const value = { acknowledged: true, matchedCount: targets.length, modifiedCount: modified, upsertedCount: upsertedId ? 1 : 0 };
        if (upsertedId) value.upsertedId = upsertedId;
        return { ...base, kind: 'write', op: call.name, coll, value, message: upsertedId ? '1 document upserted (inserted)' : `${targets.length} matched, ${modified} modified`, sql: trySql(() => sqlWrite(db, coll, call.name, call.args)) };
      }
      case 'deleteOne': case 'deleteMany': {
        argCheck(call, 1, ['object!']);
        const [filter] = call.args;
        const all = docs();
        const hits = all.map((d, i) => (matchDoc(d, filter) ? i : -1)).filter((i) => i >= 0);
        const gone = new Set(call.name === 'deleteOne' ? hits.slice(0, 1) : hits);
        if (!Object.keys(filter).length) notes.push(call.name === 'deleteMany' ? `The empty filter {} matches every document: all ${all.length} were deleted. (Press Reset data to bring them back.)` : 'The empty filter {} matches every document: deleteOne removed the first one in natural order.');
        else if (call.name === 'deleteOne' && hits.length > 1) notes.push(`${hits.length} documents match this filter, but deleteOne removes only the first one.`);
        if (!hits.length) { notes.push('No document matched the filter, so nothing was deleted.'); emptyHints(db, coll, filter, notes); }
        if (db.collections[coll]) db.collections[coll] = all.filter((_, i) => !gone.has(i));
        return { ...base, kind: 'write', op: call.name, coll, value: { acknowledged: true, deletedCount: gone.size }, message: `${plural(gone.size, 'document', 'documents')} deleted`, sql: trySql(() => sqlWrite(db, coll, call.name, call.args)) };
      }
      case 'createIndex': {
        argCheck(call, 2, ['object!', 'object']);
        const [key, options = {}] = call.args;
        if (!Object.keys(key).length) throw new MongoError('createIndex() needs at least one field, e.g. createIndex({ priority: 1 }).', call.pos);
        Object.keys(key).forEach((k) => { if (key[k] !== 1 && key[k] !== -1) throw new MongoError(`Index directions are 1 (ascending) or -1 (descending): got ${k}: ${inline(key[k])}.`, call.pos); });
        ensureColl(db, coll);
        const name = options.name || indexName(key);
        const existing = db.indexes[coll].find((ix) => ix.name === name || format(ix.key, { ejson: true }) === format(key, { ejson: true }));
        if (existing) { notes.push('This index already exists, so nothing changed.'); return { ...base, kind: 'value', op: 'createIndex', coll, value: existing.name, message: 'Index already exists' }; }
        const ix = { name, key: { ...key }, unique: !!options.unique };
        const trial = [...db.indexes[coll], ix];
        checkUnique({ indexes: { [coll]: [ix] } }, coll, db.collections[coll]);
        db.indexes[coll] = trial;
        if (ix.unique) notes.push(`From now on, inserting or updating a document so that two share the same ${Object.keys(key).join(' + ')} fails with a duplicate key error (E11000).`);
        return { ...base, kind: 'value', op: 'createIndex', coll, value: name, message: `Index ${name} created`, sql: { sql: `CREATE ${ix.unique ? 'UNIQUE ' : ''}INDEX ${name.replace(/\W/g, '_')} ON ${coll} (${Object.keys(key).map((k) => `${k}${key[k] < 0 ? ' DESC' : ''}`).join(', ')});` } };
      }
      case 'getIndexes':
        argCheck(call, 0);
        return { ...base, kind: 'value', op: 'getIndexes', coll, value: (db.indexes[coll] || []).map((ix) => ({ v: 2, key: ix.key, name: ix.name, ...(ix.unique && ix.name !== '_id_' ? { unique: true } : {}) })), message: plural((db.indexes[coll] || []).length, 'index', 'indexes') };
      case 'dropIndex': {
        argCheck(call, 1);
        const a = call.args[0];
        const list = db.indexes[coll] || [];
        const ix = list.find((x) => (typeof a === 'string' ? x.name === a : isPlain(a) && format(x.key, { ejson: true }) === format(a, { ejson: true })));
        if (!ix) throw new MongoError(`index not found with name [${typeof a === 'string' ? a : inline(a)}]`, call.pos);
        if (ix.name === '_id_') throw new MongoError('cannot drop _id index', call.pos);
        db.indexes[coll] = list.filter((x) => x !== ix);
        return { ...base, kind: 'value', op: 'dropIndex', coll, value: { nIndexesWas: list.length, ok: 1 }, message: `Index ${ix.name} dropped` };
      }
      default: throw new MongoError(`Unsupported method ${call.name}.`, call.pos);
    }
  }

  function prepareInsert(db, raw) {
    Object.keys(raw).forEach((k) => { if (k.startsWith('$')) throw new MongoError(`Document can't have $ prefixed field names: ${k}. (Update operators such as $set belong in updateOne, not in insertOne.)`); });
    const doc = clone(raw);
    if (doc._id === undefined) return { _id: db.newId(), ...doc };
    if (Array.isArray(doc._id)) throw new MongoError('The _id field cannot be an array.');
    return doc;
  }

  function errorInfo(src, e, offset = 0) {
    const pos = typeof e.pos === 'number' ? e.pos + offset : null;
    if (pos === null) return { message: e.message };
    const { line, col } = lineCol(src, pos);
    const text = src.split('\n')[line - 1];
    return { message: e.message, line, col, excerpt: `${text}\n${' '.repeat(Math.max(0, col - 1))}^` };
  }

  /* Runs every statement of the source in order; stops at the first error. */
  function run(db, src) {
    let program;
    try { program = parseProgram(src); } catch (e) {
      if (!(e instanceof MongoError)) throw e;
      return { results: [{ ok: false, src, kind: 'error', error: { ...errorInfo(src, e), kind: 'syntax' } }] };
    }
    const results = [];
    for (const st of program) {
      try {
        const r = runStatement(db, st);
        if (r.coll && !db.collections[r.coll]) delete r.sql;   // unknown collection: nothing to translate
        results.push(r);
      } catch (e) {
        if (!(e instanceof MongoError)) throw e;
        if (typeof e.pos !== 'number') e.pos = st.calls.length ? st.calls[0].pos : st.start;   // point at the method
        results.push({ ok: false, src: st.src, kind: 'error', error: { ...errorInfo(src, e), kind: 'server' } });
        break;
      }
    }
    return { results };
  }

  /* ---- Comparing results (challenges) --------------------------------------------------------- */

  const canon = (v) => format(v, { ejson: true });

  function compare(actual, expected, opts = {}) {
    if (!actual || !actual.ok) return { same: false, reason: 'Your command did not run: fix the error first.' };
    if (expected.kind === 'value') {
      if (actual.kind !== 'value') return { same: false, reason: `The answer is a single value (here a number), but your command returned ${actual.kind === 'docs' ? 'documents' : 'something else'}.` };
      return equal(actual.value, expected.value) ? { same: true } : { same: false, reason: `You got ${inline(actual.value)}; that is not the expected value.` };
    }
    const a = actual.kind === 'docs' ? actual.docs : actual.kind === 'doc' && actual.value ? [actual.value] : null;
    if (!a) return { same: false, reason: 'This challenge expects documents: use find() or aggregate().' };
    const e = expected.docs;
    if (a.length !== e.length) return { same: false, reason: `You got ${plural(a.length, 'document', 'documents')}; the expected result has ${e.length}.` };
    const ca = a.map(canon);
    const ce = e.map(canon);
    if (ca.every((x, i) => x === ce[i])) return { same: true };
    const sa = ca.slice().sort();
    const se = ce.slice().sort();
    if (sa.every((x, i) => x === se[i])) return opts.ordered ? { same: false, reason: 'The right documents, but in the wrong order: check the sort.' } : { same: true };
    const ka = [...new Set(a.flatMap((d) => Object.keys(d)))].join(', ');
    const ke = [...new Set(e.flatMap((d) => Object.keys(d)))].join(', ');
    const shapes = new Set(e.map((d) => Object.keys(d).join()));
    if (ka !== ke && !a.some((d) => shapes.has(Object.keys(d).join()))) return { same: false, reason: `Your documents have the fields ${ka || '(none)'}; the expected ones have ${ke || '(none)'}.` };
    const extra = a.find((d) => !ce.includes(canon(d)));
    const title = extra && (extra.title || extra._id);
    return { same: false, reason: `Same number of documents, but not the same ones${title ? `: for example ${inline(title)} should not be there` : ''}.` };
  }

  /* ---- Challenges ------------------------------------------------------------------------------ */

  const CHALLENGES = [
    { id: 'open', title: 'Unfinished tasks', goal: 'Find every task that is **not done** yet.',
      hint: 'A filter is an object of conditions: `{ field: value }`. Booleans are written without quotes.', ref: 'db.tasks.find({ done: false })' },
    { id: 'urgent', title: 'Tagged urgent', goal: 'Find the tasks whose `tags` array contains `\'urgent\'`.',
      hint: 'On an array field, `{ tags: \'urgent\' }` matches every array that **contains** that value. No operator needed.', ref: "db.tasks.find({ tags: 'urgent' })" },
    { id: 'titles', title: 'Only the titles', goal: 'List **every** task, showing only its `title` (no `_id`).',
      hint: 'The second argument of `find` is the projection. An empty filter `{}` matches everything; `_id` is shown unless you hide it with `_id: 0`.', ref: 'db.tasks.find({}, { title: 1, _id: 0 })' },
    { id: 'owner', title: 'Ben\'s tasks', goal: 'Find the tasks whose embedded `owner` sub-document has the `name` `\'Ben\'`.',
      hint: 'Reach inside a sub-document with dot notation, and quote the path: `\'owner.name\'`.', ref: "db.tasks.find({ 'owner.name': 'Ben' })" },
    { id: 'count', title: 'How many?', goal: 'Return **the number** of tasks that are not done **and** tagged `\'urgent\'`: one number, not the documents.',
      hint: '`countDocuments(filter)` returns a number. Two conditions in the same filter object are combined with AND.', ref: "db.tasks.countDocuments({ done: false, tags: 'urgent' })" },
    { id: 'priority', title: 'Important first', goal: 'Find the tasks with `priority` **3 or more**, the most recently created first (field `createdAt`).',
      hint: '`{ priority: { $gte: 3 } }`, then chain `.sort({ createdAt: -1 })`: -1 means descending (newest first).', ref: 'db.tasks.find({ priority: { $gte: 3 } }).sort({ createdAt: -1 })', ordered: true },
    { id: 'page2', title: 'Page 2 of 3', goal: 'Sort all the tasks by `createdAt`, oldest first, and return **page 2** with **4 tasks per page**.',
      hint: 'Page n skips the (n − 1) × size documents before it: `.sort({ createdAt: 1 }).skip(4).limit(4)`.', ref: 'db.tasks.find().sort({ createdAt: 1 }).skip(4).limit(4)', ordered: true },
    { id: 'comments', title: 'Ben\'s comments', goal: 'Find the tasks that have at least one comment whose `author` is `\'Ben\'` (`comments` is an array of sub-documents).',
      hint: 'Dot notation also works through arrays: `\'comments.author\'` looks at the `author` of every comment.', ref: "db.tasks.find({ 'comments.author': 'Ben' })" },
    { id: 'per-owner', title: 'Tasks per owner', goal: 'With `aggregate` and `$group`, count the tasks of each owner: one document per owner name, shaped `{ _id: <name>, count: <number> }`.',
      hint: '`{ $group: { _id: \'$owner.name\', count: { $sum: 1 } } }`: the `$` in `\'$owner.name\'` means "the value of this field".', ref: "db.tasks.aggregate([{ $group: { _id: '$owner.name', count: { $sum: 1 } } }])" },
    { id: 'avg', title: 'Average priority', goal: 'For the **open** tasks only (not done), compute the average `priority` of each owner, shaped `{ _id: <name>, avgPriority: <number> }`, highest average first.',
      hint: 'Three stages: `$match` (keep open tasks), `$group` with `{ $avg: \'$priority\' }`, then `$sort: { avgPriority: -1 }`.', ref: "db.tasks.aggregate([{ $match: { done: false } }, { $group: { _id: '$owner.name', avgPriority: { $avg: '$priority' } } }, { $sort: { avgPriority: -1 } }])", ordered: true },
    { id: 'set-done', title: 'Finish a task', write: true, goal: 'Mark the task `\'Buy milk\'` as done using `updateOne` and `$set`. Nothing else may change.',
      hint: '`updateOne(filter, { $set: { field: value } })`. Without `$set` the update is rejected.', ref: "db.tasks.updateOne({ title: 'Buy milk' }, { $set: { done: true } })", verify: 'db.tasks.find()' },
    { id: 'push-tag', title: 'Add a tag', write: true, goal: 'Add the tag `\'urgent\'` to the task `\'Read the pg docs\'`, keeping its other tags.',
      hint: '`$push` appends one value to an array; `$set: { tags: [\'urgent\'] }` would replace the whole array.', ref: "db.tasks.updateOne({ title: 'Read the pg docs' }, { $push: { tags: 'urgent' } })", verify: 'db.tasks.find()' },
    { id: 'delete-done', title: 'Clean up', write: true, goal: 'Delete **every** finished task, and only those.',
      hint: '`deleteMany(filter)` removes every match; `deleteOne` only the first. Check the filter with `find` before you delete.', ref: 'db.tasks.deleteMany({ done: true })', verify: 'db.tasks.find()' },
  ];

  const lastRead = (results) => results.filter((r) => r.ok && ['docs', 'doc', 'value'].includes(r.kind) && r.op !== 'explain' && r.op !== 'createIndex').pop();

  /* db: the challenge's database after the student's program ran; results: what run() returned. */
  function checkChallenge(id, db, results) {
    const ch = CHALLENGES.find((c) => c.id === id);
    if (!ch) return { ok: false, reason: 'Unknown challenge.' };
    if (results.some((r) => !r.ok)) return { ok: false, reason: 'Fix the error first.' };
    if (ch.write) {
      const expected = createDb();
      run(expected, ch.ref);
      const mine = run(cloneDb(db), ch.verify).results[0];
      const want = run(expected, ch.verify).results[0];
      const c = compare(mine, want, { ordered: true });
      if (c.same) return { ok: true };
      const wrote = results.some((r) => r.kind === 'write');
      return { ok: false, reason: wrote ? `The data does not match yet. ${c.reason} If you ran other writes before, press Reset data and try again.` : 'This challenge changes the data: run a write command (updateOne, deleteMany…).' };
    }
    const mine = lastRead(results);
    if (!mine) return { ok: false, reason: 'Run a query that returns a result (find, countDocuments or aggregate).' };
    const want = run(cloneDb(db), ch.ref).results[0];
    const c = compare(mine, want, { ordered: !!ch.ordered });
    return c.same ? { ok: true } : { ok: false, reason: c.reason };
  }

  /* ---- Examples ------------------------------------------------------------------------------- */

  const EXAMPLES = [
    { title: 'Every task', code: 'db.tasks.find()' },
    { title: 'Filter and projection', code: 'db.tasks.find({ done: false }, { title: 1, _id: 0 })' },
    { title: 'Comparison: $gt', code: 'db.tasks.find({ priority: { $gt: 3 } }, { title: 1, priority: 1 })' },
    { title: 'Any of a list: $in', code: "db.tasks.find(\n  { tags: { $in: ['db', 'api'] } },\n  { title: 1, tags: 1, _id: 0 }\n)" },
    { title: 'Either condition: $or', code: 'db.tasks.find({ $or: [{ priority: 5 }, { done: true }] }, { title: 1, priority: 1, done: 1 })' },
    { title: 'Field present: $exists', code: 'db.tasks.find({ due: { $exists: true } }, { title: 1, due: 1, _id: 0 })' },
    { title: 'Text pattern: regex', code: 'db.tasks.find({ title: /write/i }, { title: 1 })' },
    { title: 'Dot notation', code: "db.tasks.find({ 'owner.email': 'cleo@example.com' })" },
    { title: 'Sort, skip, limit', code: 'db.tasks.find({}, { title: 1, priority: 1, _id: 0 })\n  .sort({ priority: -1, title: 1 })\n  .limit(3)' },
    { title: 'Count', code: 'db.tasks.countDocuments({ done: true })' },
    { title: 'Distinct values', code: "db.tasks.distinct('tags')" },
    { title: 'Find one by _id', code: "db.users.findOne({ _id: ObjectId('6a93ea08a1b2c3d4e5000002') })" },
    { title: 'Insert a task', code: "db.tasks.insertOne({\n  title: 'Prepare the slides',\n  done: false,\n  priority: 2,\n  tags: ['teaching'],\n  owner: { name: 'Cleo', email: 'cleo@example.com' },\n  createdAt: ISODate('2026-09-11')\n})" },
    { title: 'Update: $set', code: "db.tasks.updateOne({ title: 'Set up CI' }, { $set: { done: true } })\ndb.tasks.find({ title: 'Set up CI' }, { title: 1, done: 1 })" },
    { title: 'Update many: $inc', code: "db.tasks.updateMany({ tags: 'urgent' }, { $inc: { priority: 1 } })" },
    { title: 'Arrays: $push / $pull', code: "db.tasks.updateOne(\n  { title: 'Add pagination' },\n  { $push: { comments: { author: 'Ana', text: 'Done by Friday' } }, $pull: { tags: 'urgent' } }\n)" },
    { title: 'Delete (empty filter!)', code: '// Careful: {} matches EVERY document. Press "Reset data" afterwards.\ndb.tasks.deleteMany({})' },
    { title: 'Aggregate: count per tag', code: "db.tasks.aggregate([\n  { $unwind: '$tags' },\n  { $group: { _id: '$tags', n: { $sum: 1 } } },\n  { $sort: { n: -1, _id: 1 } }\n])" },
    { title: 'Aggregate: $project', code: "db.tasks.aggregate([\n  { $match: { done: false } },\n  { $project: { _id: 0, title: 1, owner: '$owner.name', tagCount: { $size: '$tags' } } }\n])" },
    { title: 'Aggregate: $lookup', code: "db.tasks.aggregate([\n  { $match: { title: 'Set up CI' } },\n  { $lookup: { from: 'users', localField: 'owner.email', foreignField: 'email', as: 'ownerDoc' } },\n  { $project: { title: 1, 'ownerDoc.name': 1, 'ownerDoc.role': 1 } }\n])" },
    { title: 'Aggregate: $count', code: "db.tasks.aggregate([{ $match: { done: false } }, { $count: 'open' }])" },
    { title: 'Index + explain', code: "db.tasks.find({ priority: 5 }).explain()\ndb.tasks.createIndex({ priority: 1 })\ndb.tasks.find({ priority: 5 }).explain()" },
    { title: 'Unique index', code: "db.users.createIndex({ email: 1 }, { unique: true })\ndb.users.insertOne({ name: 'Ana 2', email: 'ana@example.com' })" },
    { title: 'Collections', code: 'show collections' },
  ];

  return {
    ObjectId, MongoError, createDb, cloneDb, run, parseValue, parseProgram, match: matchDoc, format, compare, checkChallenge,
    sortDocs, applyUpdate, aggregate, compileProjection, applyProjection, resolve, CHALLENGES, EXAMPLES, DB_NAME,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MongoEngine;
