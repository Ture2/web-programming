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

  /* ---- Chapters (pure) ---- chapters = [{ t: seconds, title }], content scenes only (title and outro excluded). */
  /* Index of the chapter playing at `time` (the last one that has started), -1 before the first. */
  function chapterAt(chapters, time) {
    let at = -1;
    (chapters || []).forEach((c, i) => { if (time + 0.25 >= c.t) at = i; });
    return at;
  }
  /* One segment per chapter: the first also covers the title scene, the last the outro. [{ start, end }] in seconds. */
  function segments(chapters, duration) {
    const n = (chapters || []).length;
    return (chapters || []).map((c, i) => ({
      start: i === 0 ? 0 : c.t,
      end: i + 1 < n ? chapters[i + 1].t : Math.max(duration, c.t + 1),
    }));
  }
  /* How much of a segment has been played at `time`, 0 to 1. */
  function segFill(seg, time) {
    return Math.max(0, Math.min(1, (time - seg.start) / Math.max(1e-6, seg.end - seg.start)));
  }

  /* The one-line hook of a video: the transcript's title line is "Topic: what it answers", so the part after
     the colon (capitalised); with no colon, its first sentence. '' when there is no transcript. */
  function hook(v) {
    const line = String((v.transcript && v.transcript[0]) || '').trim();
    const colon = line.indexOf(':');
    const m = line.match(/^.*?[.!?](?=\s|$)/);
    const out = (colon >= 0 && line.slice(colon + 1).trim() ? line.slice(colon + 1) : m ? m[0] : line).trim();
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  /* The duration and where you are, for the briefing card: { text: '3:31, Resume at 1:12', pct: 34 }.
     pct is the share already watched (0 unless part-way), drawn as the bar along the thumbnail. */
  function briefStatus(v, { t, watched, rec } = {}) {
    const r = rec && rec(v.id);
    const at = resumeAt(r, watched);
    const parts = [v.duration || '', watched ? tr(t, 'Watched') : '', at ? tr(t, 'Resume at {time}', { time: fmtTime(at) }) : ''].filter(Boolean);
    return { text: parts.join(', '), at, pct: at ? Math.max(3, Math.round((at / r.d) * 100)) : 0 };
  }

  /* The inside of .tv-meta: duration, then the state. Rewritten by js/video-player.js when the state changes. */
  function metaHtml(v, state = {}) {
    const { t } = state;
    const done = state.watched;
    const { at } = briefStatus(v, state);
    return `${v.duration ? `<span class="tv-dur">${esc(v.duration)}</span>` : ''}${at ? `<span class="tv-state is-resume">${esc(tr(t, 'Resume at {time}', { time: fmtTime(at) }))}</span>` : ''}${done ? `<span class="tv-state is-done">${esc(tr(t, 'Watched'))}</span>` : ''}`;
  }

  const PLAY_GLYPH = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 3.8v12.4L16.4 10z" fill="currentColor"/></svg>';

  /* One video, shown at the top of the group page it explains (or in the stage on the home page).
     On a group page it starts as a briefing card (data-state="card"): the poster as a play thumbnail, the hook and the
     chapter titles; Play expands it in place into the player (data-state="open"). In the stage (stage: true) it is
     the open player with no way back. js/video-player.js does the switching. */
  function figure(v, { t, watched, stage, rec } = {}) {
    const captions = v.captions
      ? `<track kind="captions" src="${esc(v.captions)}" srclang="en" label="English" default>`
      : '';
    const transcript = v.transcript && v.transcript.length
      ? `<details class="tv-transcript" data-fid="video-transcript-${esc(v.id)}"><summary>${esc(tr(t, 'Transcript'))}</summary>${v.transcript.map((p) => `<p>${esc(p)}</p>`).join('')}</details>`
      : '';
    const keys = `<details class="tv-keys"><summary>${esc(tr(t, 'Keyboard shortcuts'))}</summary><dl>${SHORTCUTS.map(([k, what]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(tr(t, what))}</dd>`).join('')}</dl></details>`;
    const label = tr(t, 'Video: {title}', { title: v.title });
    const chapters = v.chapters && v.chapters.length ? v.chapters : [];
    /* The chapter line under the open player: one segment per chapter, as long as the chapter, filled as it plays
       (js/video-player.js); each one is a button that jumps there. On a narrow player only the current title shows. */
    const segs = segments(chapters, parseDuration(v.duration));
    const jumps = chapters.length
      ? `<nav class="tv-chline" aria-label="${esc(tr(t, 'Chapters'))}"><ol>${chapters.map((c, i) => `<li style="flex-grow:${Math.max(1, Math.round(segs[i].end - segs[i].start))}"><button type="button" data-tv="chapter" data-t="${esc(c.t)}" data-fid="video-chapter-${esc(v.id)}-${i}"><span class="tv-seg" aria-hidden="true"><i></i></span><span class="tv-seg-t"><span class="tv-jump-t">${esc(fmtTime(c.t))}</span> ${esc(c.title)}</span></button></li>`).join('')}</ol><p class="tv-chnow" aria-hidden="true"></p></nav>`
      : '';
    const shows = chapters.length
      ? `<div class="tv-shows"><p class="tv-shows-h" id="tvs-${esc(v.id)}">${esc(tr(t, 'What it shows'))}</p><ul aria-labelledby="tvs-${esc(v.id)}">${chapters.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ul></div>`
      : '';
    const h = hook(v);
    const { pct } = briefStatus(v, { watched, rec });
    const state = { t, watched, rec };
    const thumb = stage ? '' : `<button type="button" class="tv-thumb" data-tv="play" data-fid="video-expand-${esc(v.id)}" aria-label="${esc(tr(t, 'Play video: {title}', { title: v.title }))}"><img src="${esc(v.poster)}" alt="" loading="lazy" width="640" height="360"><span class="tv-glyph">${PLAY_GLYPH}</span><span class="tv-bar" aria-hidden="true"${pct ? '' : ' hidden'}><span style="width:${pct}%"></span></span></button>`;
    return `<figure class="topic-video" data-video="${esc(v.id)}" data-state="${stage ? 'open' : 'card'}"${stage ? '' : ' data-collapsible'}>
        <div class="tv-frame">${thumb}<video controls preload="${stage ? 'metadata' : 'none'}" playsinline poster="${esc(v.poster)}" aria-label="${esc(label)}"${stage ? '' : ' hidden'}><source src="${esc(v.mp4)}" type="video/mp4">${captions}</video>${jumps}</div>
        <div class="tv-info">
          <figcaption class="tv-cap"><span class="tv-title">${esc(v.title)}</span><span class="tv-meta">${metaHtml(v, state)}</span></figcaption>
          ${h ? `<p class="tv-hook">${esc(h)}</p>` : ''}
          ${shows}
          <div class="tv-actions">
            ${stage ? '' : `<button type="button" class="btn tv-play" data-tv="play" data-fid="video-play-here-${esc(v.id)}">${PLAY_GLYPH}<span>${esc(tr(t, 'Play'))}</span></button><button type="button" class="btn ghost tv-collapse" data-tv="collapse" data-fid="video-collapse-${esc(v.id)}">${esc(tr(t, 'Collapse'))}</button>`}
            <label class="tv-watch"><input type="checkbox" data-action="video-watched" data-id="${esc(v.id)}" data-fid="video-watched-${esc(v.id)}"${watched ? ' checked' : ''}> ${esc(tr(t, 'Mark as watched'))}</label>
          </div>
          <div class="tv-next" aria-live="polite"></div>
          <div class="tv-more">${transcript}${keys}</div>
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

  return { figure, chapterAt, segments, segFill, hook, briefStatus, metaHtml, list, hrefOf, markInner, marks, stage, pickContinue, upNext, parseDuration, fmtTime, resumeAt, FINISHED };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VideoHtml;
