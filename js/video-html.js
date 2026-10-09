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

  /* One video, shown at the top of the group page it explains. */
  function figure(v, { t, watched } = {}) {
    const captions = v.captions
      ? `<track kind="captions" src="${esc(v.captions)}" srclang="en" label="English" default>`
      : '';
    const transcript = v.transcript && v.transcript.length
      ? `<details class="tv-transcript" data-fid="video-transcript-${esc(v.id)}"><summary>${esc(tr(t, 'Transcript'))}</summary>${v.transcript.map((p) => `<p>${esc(p)}</p>`).join('')}</details>`
      : '';
    const label = tr(t, 'Video: {title}', { title: v.title });
    return `<figure class="topic-video" data-video="${esc(v.id)}">
        <video controls preload="none" playsinline poster="${esc(v.poster)}" aria-label="${esc(label)}"><source src="${esc(v.mp4)}" type="video/mp4">${captions}</video>
        <figcaption class="tv-cap"><span class="tv-title">${esc(v.title)}</span>${v.duration ? ` <span class="tv-dur">${esc(v.duration)}</span>` : ''}</figcaption>
        <div class="tv-actions">
          <label class="tv-watch"><input type="checkbox" data-action="video-watched" data-id="${esc(v.id)}" data-fid="video-watched-${esc(v.id)}"${watched ? ' checked' : ''}> ${esc(tr(t, 'Mark as watched'))}</label>
          ${transcript}
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

  /* The home page grid: one card per entry { video, href, section }, already in learning order. */
  function grid(entries, { t, watched } = {}) {
    if (!entries || !entries.length) return '';
    const cards = entries.map(({ video: v, href, section }) => {
      const done = watched && watched(v.id);
      return `<li class="hv-card"><a href="${esc(href)}"><img class="hv-thumb" src="${esc(v.poster)}" alt="" loading="lazy" width="320" height="180"><span class="hv-body"><span class="hv-sec">${esc(section)}</span><span class="hv-title">${esc(v.title)}</span><span class="hv-meta">${v.duration ? `<span class="hv-dur">${esc(v.duration)}</span>` : ''}${done ? `<span class="hv-done">${esc(tr(t, 'Watched'))}</span>` : ''}</span></span></a></li>`;
    }).join('');
    return `<ul class="hv-grid">${cards}</ul>`;
  }

  return { figure, list, hrefOf, grid };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VideoHtml;
