// Topic videos: every `PREFIX_VIDEOS` entry is complete, points at a group of its own section and
// its rendered files exist under site/assets/video/<id>/. The files are produced by the Remotion
// project in the authoring repo (video/); this test fails if the site points at a missing asset.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'en');

const ctx = { DATA: { en: {} } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of readdirSync(DATA).filter((n) => n.endsWith('.js'))) {
  vm.runInContext(readFileSync(join(DATA, f), 'utf8'), ctx, { filename: f });
}

const entries = Object.entries(ctx.DATA.en)
  .filter(([k]) => k.endsWith('_VIDEOS'))
  .flatMap(([key, list]) => list.map((v) => ({ key, prefix: key.replace(/_VIDEOS$/, ''), v })));
const none = entries.length === 0 && 'no PREFIX_VIDEOS entry yet (videos are being rendered)';

test('the old single-video key is gone', () => {
  assert.deepEqual(Object.keys(ctx.DATA.en).filter((k) => k.endsWith('_VIDEO')), []);
});

test('topic video ids are unique site-wide', { skip: none }, () => {
  const ids = entries.map((e) => e.v.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
});

for (const { key, prefix, v } of entries) {
  const where = `data/en ${key}/${v.id}`;
  test(`${where}: required fields`, () => {
    assert.match(v.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be a lowercase slug');
    assert.ok(typeof v.title === 'string' && v.title.trim(), 'needs a title');
    for (const f of ['mp4', 'poster', 'captions']) assert.ok(typeof v[f] === 'string' && v[f], `needs ${f}`);
    assert.match(v.duration, /^\d+:\d\d$/, 'duration looks like 3:12');
    assert.ok(Array.isArray(v.transcript) && v.transcript.length > 0, 'needs a transcript');
    assert.ok(v.transcript.every((p) => typeof p === 'string' && p.trim().length > 0), 'transcript paragraphs must be non-empty');
  });

  test(`${where}: group exists in its section`, () => {
    const groups = (ctx.DATA.en[`${prefix}_GROUPS`] || []).map((g) => g.key);
    assert.ok(groups.includes(v.group), `unknown group "${v.group}" (have: ${groups.join(', ')})`);
    assert.ok((ctx.DATA.en[`${prefix}_CONCEPTS`] || []).some((c) => c.hub === v.group), `no card belongs to group "${v.group}"`);
  });

  test(`${where}: rendered files exist`, () => {
    for (const field of ['mp4', 'poster', 'captions']) {
      assert.ok(!/^https?:/.test(v[field]), `${field} must be a local site path`);
      assert.ok(existsSync(join(ROOT, v[field])), `${field} missing on disk: ${v[field]}`);
    }
  });

  test(`${where}: captions parse as WebVTT`, () => {
    const vtt = readFileSync(join(ROOT, v.captions), 'utf8').replace(/^﻿/, '');
    assert.match(vtt, /^WEBVTT\b/, 'must start with WEBVTT');
    assert.ok(vtt.split('\n').some((l) => l.includes('-->')), 'must contain at least one cue');
  });
}
