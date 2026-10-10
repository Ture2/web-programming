// The HTML of a topic video and of the overview "Videos" list (js/video-html.js, no DOM),
// tested with a fixture entry so the render code is covered before real videos exist.
//   node --test site/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const VideoHtml = createRequire(import.meta.url)('../js/video-html.js');

const v = {
  id: 'request-life', group: 'structure', title: 'The life of a <request>',
  mp4: 'assets/video/request-life/request-life.mp4', poster: 'assets/video/request-life/request-life-poster.jpg',
  captions: 'assets/video/request-life/request-life.vtt', duration: '3:12', transcript: ['First & second.', 'Third.'],
};

test('figure: video, captions, caption, watched checkbox and transcript', () => {
  const h = VideoHtml.figure(v, { watched: false });
  assert.match(h, /^<figure class="topic-video"/);
  assert.match(h, /<video controls preload="none" playsinline poster="assets\/video\/request-life\/request-life-poster\.jpg" aria-label="Video: The life of a &lt;request&gt;" hidden>/);
  assert.match(h, /<source src="assets\/video\/request-life\/request-life\.mp4" type="video\/mp4">/);
  assert.match(h, /<track kind="captions" src="assets\/video\/request-life\/request-life\.vtt" srclang="en" label="English" default>/);
  assert.match(h, /<figcaption[^>]*>.*The life of a &lt;request&gt;.*3:12/);
  assert.match(h, /type="checkbox" data-action="video-watched" data-id="request-life"[^>]*> Mark as watched/);
  assert.doesNotMatch(h, / checked>/);
  assert.match(h, /<details class="tv-transcript"[^>]*><summary>Transcript<\/summary><p>First &amp; second\.<\/p><p>Third\.<\/p><\/details>/);
});

test('figure: watched state and translation hook', () => {
  const h = VideoHtml.figure(v, { watched: true, t: (k) => `[${k}]` });
  assert.match(h, /data-fid="video-watched-request-life" checked>/);
  assert.match(h, /\[Mark as watched\]/);
});

test('list: one link per video to its group page, empty when no videos', () => {
  assert.equal(VideoHtml.list([], { hrefFor: () => '#' }), '');
  const h = VideoHtml.list([v], { hrefFor: (x) => `#/server/routes/${x.group}`, watched: (id) => id === 'request-life' });
  assert.match(h, /<h2 id="vl-h">Videos<\/h2>/);
  assert.match(h, /<a href="#\/server\/routes\/structure"><img class="vl-thumb" src="assets\/video\/request-life\/request-life-poster\.jpg" alt=""/);
  assert.match(h, /3:12 · Watched/);
});

test('hrefOf: first concept of the video group, same hub rule as the section', () => {
  const sec = {
    base: '#/server/runtime',
    concepts: [{ id: 'a', hub: 'one' }, { id: 'b', hub: 'two' }, { id: 'c', hub: 'two' }, { id: 'd', hub: 'gone' }],
    groups: [{ key: 'one' }, { key: 'two' }, { key: 'three' }],
  };
  assert.equal(VideoHtml.hrefOf({ group: 'two' }, sec), '#/server/runtime/b');
  assert.equal(VideoHtml.hrefOf({ group: 'three' }, sec), '#/server/runtime/d');   // unknown hub joins the last group
  assert.equal(VideoHtml.hrefOf({ group: 'nope' }, sec), '#/server/runtime');
  assert.equal(VideoHtml.hrefOf({ group: 'all' }, { base: '#/x', concepts: [{ id: 'q' }] }), '#/x/q');
});

const mk = (id, extra = {}) => ({ video: { ...v, id, title: `T ${id}` }, href: `#/${id}`, section: `S ${id}`, area: extra.area || 'Area A' });

test('parseDuration, fmtTime and resumeAt', () => {
  assert.equal(VideoHtml.parseDuration('2:48'), 168);
  assert.equal(VideoHtml.parseDuration('1:02:03'), 3723);
  assert.equal(VideoHtml.parseDuration('x'), 0);
  assert.equal(VideoHtml.fmtTime(72), '1:12');
  assert.equal(VideoHtml.fmtTime(5), '0:05');
  assert.equal(VideoHtml.resumeAt({ t: 72, d: 192 }, false), 72);
  assert.equal(VideoHtml.resumeAt({ t: 180, d: 192 }, false), 0);   // 90 % or more counts as finished
  assert.equal(VideoHtml.resumeAt({ t: 0, d: 192 }, false), 0);
  assert.equal(VideoHtml.resumeAt({ t: 72, d: 192 }, true), 0);     // watched: start from the top
  assert.equal(VideoHtml.resumeAt(undefined, false), 0);
});

test('marks: one play button per video, opening the stage, empty when no videos', () => {
  assert.equal(VideoHtml.marks([]), '');
  const h = VideoHtml.marks([v], {});
  assert.match(h, /^<ul class="hv-marks"><li><button type="button" class="hv-mark" data-action="video-play" data-id="request-life"[^>]* aria-controls="hv-stage" aria-expanded="false">/);
  assert.match(h, /<span class="sr-only">Video: <\/span><span class="hv-mark-title">The life of a &lt;request&gt;<\/span> <span class="hv-mark-dur">3:12<\/span>/);
  assert.doesNotMatch(h, /hv-mark-bar|is-done/);
});

test('markInner: a bar when part-way, a tick when watched', () => {
  const part = VideoHtml.markInner(v, { rec: () => ({ t: 96, d: 192 }), watched: () => false });
  assert.match(part, /hv-mark-bar" aria-hidden="true"><span style="width:50%">/);
  assert.match(part, /sr-only">, Resume at 1:36</);
  const done = VideoHtml.markInner(v, { rec: () => ({ t: 96, d: 192 }), watched: () => true });
  assert.match(done, /hv-mark-glyph is-done/);
  assert.match(done, /sr-only">, Watched</);
  assert.doesNotMatch(done, /hv-mark-bar/);
});

test('pickContinue: latest part-way video, else first unwatched, else nothing', () => {
  const es = [mk('a'), mk('b'), mk('c')];
  const recs = { a: { t: 50, d: 100, at: 1 }, c: { t: 20, d: 100, at: 2 } };
  const resumed = VideoHtml.pickContinue(es, { rec: (id) => recs[id], watched: () => false });
  assert.equal(resumed.entry.video.id, 'c');
  assert.equal(resumed.kind, 'resume');
  const fresh = VideoHtml.pickContinue(es, {});
  assert.equal(fresh.entry.video.id, 'a');
  assert.equal(fresh.kind, 'start');
  const some = VideoHtml.pickContinue(es, { watched: (id) => id === 'a' });
  assert.equal(some.entry.video.id, 'b');
  assert.equal(some.kind, 'next');
  assert.equal(VideoHtml.pickContinue(es, { watched: () => true }), null);
});

test('upNext: after the current one, wrapping round, skipping watched ones', () => {
  const es = ['a', 'b', 'c', 'd'].map((id) => mk(id));
  const ids = (list) => list.map((e) => e.video.id);
  assert.deepEqual(ids(VideoHtml.upNext(es, 'b', {}, 3)), ['c', 'd', 'a']);
  assert.deepEqual(ids(VideoHtml.upNext(es, 'd', {}, 2)), ['a', 'b']);
  assert.deepEqual(ids(VideoHtml.upNext(es, 'b', { watched: (id) => id === 'c' }, 3)), ['d', 'a']);
  assert.deepEqual(VideoHtml.upNext(es, 'a', { watched: () => true }), []);
});

test('stage: the video, a close button and the next videos', () => {
  const es = [mk('a'), mk('b'), mk('c')];
  const h = VideoHtml.stage(es[0], { entries: es });
  assert.match(h, /<figure class="topic-video" data-video="a" data-state="open">/);
  assert.match(h, /<video controls preload="metadata"/);
  assert.match(h, /data-action="video-close"[^>]*>Close video</);
  assert.match(h, /<aside class="hv-next"[^>]*><h3 id="hvn-h">Up next<\/h3><ul>.*data-id="b".*data-id="c"/);
  assert.doesNotMatch(VideoHtml.stage(es[0], { entries: [es[0]] }), /hv-next"/);
});

test('figure: keyboard shortcuts and the place for the next video', () => {
  const h = VideoHtml.figure(v, {});
  assert.match(h, /<div class="tv-next" aria-live="polite"><\/div>/);
  assert.match(h, /<details class="tv-keys"><summary>Keyboard shortcuts<\/summary><dl><dt><kbd>k<\/kbd><\/dt><dd>play or pause<\/dd>/);
  assert.match(h, /<kbd>&lt; \/ &gt;<\/kbd>/);
  assert.match(h, /<video controls preload="none"/);
});

test('hook: the sentence after the colon, else the first sentence', () => {
  assert.equal(VideoHtml.hook({ transcript: ['The life of a request: from the moment it arrives to the answer.', 'x'] }), 'From the moment it arrives to the answer.');
  assert.equal(VideoHtml.hook({ transcript: ['Where your changes live. Saving a file is not saving it.'] }), 'Where your changes live.');
  assert.equal(VideoHtml.hook({ transcript: ['No punctuation here'] }), 'No punctuation here');
  assert.equal(VideoHtml.hook({}), '');
});

test('briefStatus and metaHtml: resume time, watched, bar', () => {
  const part = VideoHtml.briefStatus(v, { rec: () => ({ t: 72, d: 192 }), watched: false });
  assert.equal(part.at, 72);
  assert.equal(part.pct, 38);
  assert.match(part.text, /3:12, Resume at 1:12/);
  assert.match(VideoHtml.metaHtml(v, { rec: () => ({ t: 72, d: 192 }), watched: false }), /Resume at 1:12/);
  const done = VideoHtml.briefStatus(v, { rec: () => ({ t: 72, d: 192 }), watched: true });
  assert.equal(done.pct, 0);
  assert.match(VideoHtml.metaHtml(v, { watched: true }), /is-done">Watched/);
  assert.doesNotMatch(VideoHtml.metaHtml(v, {}), /tv-state/);
});

test('figure on a group page is a collapsed briefing card with chapters and a play thumbnail', () => {
  const withCh = { ...v, chapters: [{ t: 6, title: 'A corridor' }, { t: 72, title: 'The guard' }] };
  const h = VideoHtml.figure(withCh, { rec: () => ({ t: 72, d: 192 }) });
  assert.match(h, /data-state="card" data-collapsible/);
  assert.match(h, /<video controls preload="none"[^>]* hidden>/);
  assert.match(h, /class="tv-thumb" data-tv="play"[^>]*aria-label="Play video: The life of a &lt;request&gt;"/);
  assert.match(h, /<p class="tv-hook">First &amp; second\.<\/p>/);
  assert.match(h, /<li>A corridor<\/li><li>The guard<\/li>/);
  assert.match(h, /data-tv="collapse"/);
  assert.match(h, /style="width:38%"/);
  const st = VideoHtml.figure(withCh, { stage: true });
  assert.doesNotMatch(st, /data-collapsible|tv-thumb|data-tv="collapse"|data-tv="play"/);
  assert.match(st, /class="tv-chline"/);
});

test('figure: the chapter line under the player, one segment per chapter, as long as the chapter', () => {
  const withCh = { ...v, chapters: [{ t: 6, title: 'A corridor' }, { t: 72, title: 'The guard' }] };
  const h = VideoHtml.figure(withCh, {});
  assert.match(h, /<\/video><nav class="tv-chline" aria-label="Chapters"><ol>/);
  assert.match(h, /<li style="flex-grow:72"><button type="button" data-tv="chapter" data-t="6" data-fid="video-chapter-request-life-0"><span class="tv-seg" aria-hidden="true"><i><\/i><\/span><span class="tv-seg-t"><span class="tv-jump-t">0:06<\/span> A corridor<\/span><\/button><\/li>/);
  assert.match(h, /<li style="flex-grow:120"><button[^>]*data-t="72"/);
  assert.match(h, /<p class="tv-chnow" aria-hidden="true"><\/p><\/nav>/);
  assert.doesNotMatch(VideoHtml.figure(v, {}), /tv-chline/);
});

test('chapterAt: the chapter that has started, -1 before the first', () => {
  const ch = [{ t: 5 }, { t: 20 }, { t: 40 }];
  assert.equal(VideoHtml.chapterAt(ch, 0), -1);
  assert.equal(VideoHtml.chapterAt(ch, 5), 0);
  assert.equal(VideoHtml.chapterAt(ch, 19.9), 1);
  assert.equal(VideoHtml.chapterAt(ch, 59), 2);
  assert.equal(VideoHtml.chapterAt([], 3), -1);
});

test('segments and segFill: one per chapter, first from 0, last to the end', () => {
  const s = VideoHtml.segments([{ t: 5 }, { t: 20 }, { t: 40 }], 60);
  assert.deepEqual(s, [{ start: 0, end: 20 }, { start: 20, end: 40 }, { start: 40, end: 60 }]);
  assert.equal(VideoHtml.segFill(s[1], 30), 0.5);
  assert.equal(VideoHtml.segFill(s[1], 10), 0);
  assert.equal(VideoHtml.segFill(s[1], 50), 1);
});
