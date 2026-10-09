'use strict';

/* ==========================================================================
   Topic videos (no DOM): the HTML of one video on its group page and of the
   "Videos" list on a section overview. Entries come from PREFIX_VIDEOS in
   data/en/<file>.js (see site-notes/SITE_README.md). Used by js/concept-section.js;
   unit-tested in test/video-html.test.mjs.
   ========================================================================== */
const VideoHtml = (() => {
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = (t, key, vars) => (t ? t(key, vars) : key.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m)));

  /* ---- Playback state (pure) ----
     A saved position is { t: seconds, d: duration, at: timestamp }; t is 0 once a video has been finished.
     state = { watched(id) -> boolean, rec(id) -> position | undefined }. */
  const FINISHED = 0.9;
  const SHORTCUTS = [['k', 'play or pause'], ['j / l', 'back or forward 10 seconds'], ['< / >', 'slower or faster'], ['c', 'captions'], ['f', 'full screen']];

  /* "2:48" -> 168 */
  function parseDuration(s) {
    const parts = String(s || '').split(':').map(Number);
    return parts.length && parts.every((n) => Number.isFinite(n)) ? parts.reduce((a, n) => a * 60 + n, 0) : 0;
  }
  /* 168 -> "2:48" */
  function fmtTime(sec) {
    const s = Math.max(0, Math.round(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  /* Seconds from the start, 0 unless the video is part-way through. */
  function resumeAt(r, watched) {
    return !watched && r && r.t > 1 && r.d && r.t / r.d < FINISHED ? r.t : 0;
  }

  /* The video to offer first (the home page offers only 'resume'): the one most recently left part-way, else the first one not watched.
     kind: 'resume' | 'start' (nothing watched yet) | 'next'. null when everything is watched. */
  function pickContinue(entries, state = {}) {
    const watched = state.watched || (() => false);
    const rec = state.rec || (() => undefined);
    const started = entries.filter((e) => resumeAt(rec(e.video.id), watched(e.video.id)))
      .sort((a, b) => rec(b.video.id).at - rec(a.video.id).at);
    if (started.length) return { entry: started[0], kind: 'resume' };
    const fresh = entries.find((e) => !watched(e.video.id));
    if (!fresh) return null;
    return { entry: fresh, kind: entries.some((e) => watched(e.video.id)) ? 'next' : 'start' };
  }

  /* Up to n videos not yet watched, in learning order after the current one (wrapping round). */
  function upNext(entries, currentId, state = {}, n = 3) {
    const watched = state.watched || (() => false);
    const at = entries.findIndex((e) => e.video.id === currentId);
    const ordered = at < 0 ? entries : [...entries.slice(at + 1), ...entries.slice(0, at)];
    return ordered.filter((e) => e.video.id !== currentId && !watched(e.video.id)).slice(0, n);
  }

  /* One video, shown at the top of the group page it explains (or in the stage on the home page). */
  function figure(v, { t, watched, stage } = {}) {
    const captions = v.captions
      ? `<track kind="captions" src="${esc(v.captions)}" srclang="en" label="English" default>`
      : '';
    const transcript = v.transcript && v.transcript.length
      ? `<details class="tv-transcript" data-fid="video-transcript-${esc(v.id)}"><summary>${esc(tr(t, 'Transcript'))}</summary>${v.transcript.map((p) => `<p>${esc(p)}</p>`).join('')}</details>`
      : '';
    const keys = `<details class="tv-keys"><summary>${esc(tr(t, 'Keyboard shortcuts'))}</summary><dl>${SHORTCUTS.map(([k, what]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(tr(t, what))}</dd>`).join('')}</dl></details>`;
    const label = tr(t, 'Video: {title}', { title: v.title });
    return `<figure class="topic-video" data-video="${esc(v.id)}">
        <video controls preload="${stage ? 'metadata' : 'none'}" playsinline poster="${esc(v.poster)}" aria-label="${esc(label)}"><source src="${esc(v.mp4)}" type="video/mp4">${captions}</video>
        <figcaption class="tv-cap"><span class="tv-title">${esc(v.title)}</span>${v.duration ? ` <span class="tv-dur">${esc(v.duration)}</span>` : ''}</figcaption>
        <div class="tv-next" aria-live="polite"></div>
        <div class="tv-actions">
          <label class="tv-watch"><input type="checkbox" data-action="video-watched" data-id="${esc(v.id)}" data-fid="video-watched-${esc(v.id)}"${watched ? ' checked' : ''}> ${esc(tr(t, 'Mark as watched'))}</label>
          ${transcript}
          ${keys}
        </div>
      </figure>`;
  }

  /* The compact list on the section overview: poster, title and duration, linking to the group page. */
  function list(videos, { t, hrefFor, watched } = {}) {
    if (!videos || !videos.length) return '';
    const items = videos.map((v) => {
      const done = watched && watched(v.id);
      return `<li class="vl-item"><a href="${esc(hrefFor(v))}"><img class="vl-thumb" src="${esc(v.poster)}" alt="" loading="lazy" width="160" height="90"><span class="vl-text"><span class="vl-title">${esc(v.title)}</span><span class="vl-meta">${esc([v.duration, done ? tr(t, 'Watched') : ''].filter(Boolean).join(' · '))}</span></span></a></li>`;
    }).join('');
    return `<section class="video-list" aria-labelledby="vl-h"><h2 id="vl-h">${esc(tr(t, 'Videos'))}</h2><ul class="vl-items">${items}</ul></section>`;
  }

  /* The page of a video: the first concept of the rail group named by its `group`, the same hub rule as
     js/concept-section.js (a card with an unknown hub joins the last group; empty groups are dropped).
     sec = { base, concepts, groups }. Falls back to the section overview. */
  function hrefOf(v, sec) {
    const groups = sec.groups && sec.groups.length ? sec.groups : [{ key: 'all' }];
    const concepts = sec.concepts || [];
    const items = groups.map(() => []);
    concepts.forEach((c, k) => {
      const i = groups.findIndex((g) => g.key === c.hub);
      items[i < 0 ? groups.length - 1 : i].push(k);
    });
    const g = groups.findIndex((x, i) => x.key === v.group && items[i].length);
    return g < 0 ? sec.base : `${sec.base}/${concepts[items[g][0]].id}`;
  }

  const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 10.5l3.3 3.3L15 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 3.8v12.4L16.4 10z" fill="currentColor"/></svg>';

  /* Inside a play mark of the topic map: the play glyph (a tick once watched), the title and the duration,
     and a bar when part-way. The words for a screen reader go in .sr-only; the bar and the glyph are decoration. */
  function markInner(v, { t, watched, rec } = {}) {
    const done = watched && watched(v.id);
    const r = rec && rec(v.id);
    const at = resumeAt(r, done);
    const pct = at ? Math.max(3, Math.round((at / r.d) * 100)) : 0;
    const said = [done ? tr(t, 'Watched') : '', at ? tr(t, 'Resume at {time}', { time: fmtTime(at) }) : ''].filter(Boolean);
    return `<span class="hv-mark-glyph${done ? ' is-done' : ''}">${done ? CHECK : PLAY}</span><span class="hv-mark-text"><span class="sr-only">${esc(tr(t, 'Video'))}: </span><span class="hv-mark-title">${esc(v.title)}</span>${v.duration ? ` <span class="hv-mark-dur">${esc(v.duration)}</span>` : ''}${said.length ? `<span class="sr-only">, ${esc(said.join(', '))}</span>` : ''}</span>${pct ? `<span class="hv-mark-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>` : ''}`;
  }

  /* The play marks of some videos, as a list; each opens the home page stage (#hv-stage). Empty when none. */
  function marks(videos, state = {}) {
    if (!videos || !videos.length) return '';
    return `<ul class="hv-marks">${videos.map((v) => `<li><button type="button" class="hv-mark" data-action="video-play" data-id="${esc(v.id)}" data-fid="video-play-${esc(v.id)}" aria-controls="hv-stage" aria-expanded="false">${markInner(v, state)}</button></li>`).join('')}</ul>`;
  }

  /* The stage on the home page, opened from a play mark of the topic map: the video, and the next ones to watch beside it. */
  function stage(entry, state = {}) {
    const { t } = state;
    const next = upNext(state.entries || [], entry.video.id, state, 3);
    const items = next.map(({ video: v, section }) => `<li><button type="button" class="hv-next-item" data-action="video-play" data-id="${esc(v.id)}"><img class="hv-next-thumb" src="${esc(v.poster)}" alt="" loading="lazy" width="128" height="72"><span class="hv-next-text"><span class="hv-title">${esc(v.title)}</span><span class="hv-sec">${esc(section)}${v.duration ? `, ${esc(v.duration)}` : ''}</span></span></button></li>`).join('');
    return `<div class="hv-stage-grid"><div class="hv-stage-main">${figure(entry.video, { t, watched: state.watched && state.watched(entry.video.id), stage: true })}<button type="button" class="btn ghost hv-close" data-action="video-close" data-fid="video-close">${esc(tr(t, 'Close video'))}</button></div>${items ? `<aside class="hv-next" aria-labelledby="hvn-h"><h3 id="hvn-h">${esc(tr(t, 'Up next'))}</h3><ul>${items}</ul></aside>` : ''}</div>`;
  }

  return { figure, list, hrefOf, markInner, marks, stage, pickContinue, upNext, parseDuration, fmtTime, resumeAt, FINISHED };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VideoHtml;
