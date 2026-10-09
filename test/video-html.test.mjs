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
  assert.match(h, /<video controls preload="none" playsinline poster="assets\/video\/request-life\/request-life-poster\.jpg" aria-label="Video: The life of a &lt;request&gt;">/);
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
