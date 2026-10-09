'use strict';

/* ==========================================================================
   Home page (#/): headline, the next step and the quiz topics to review, then
   the topic map (js/course-map.js): every section where its code runs in a
   web app, with version control underneath.
   ========================================================================== */

const HomePage = (() => {
  /* The first section started but not finished, in learning order; else the first one. */
  function continuePanel() {
    const sum = ProgressPage.summary();
    const open = sum.secs.find((s) => s.pct > 0 && s.pct < 100);
    // A started course never shows 0%.
    const ring = ProgressPage.ring(sum.pct, 88, sum.done && !sum.pct ? '<1%' : `${sum.pct}%`);
    if (!open) {
      const start = sum.done ? sum.secs.find((s) => s.pct < 100) : sum.secs[0];
      if (!start) {
        return `<aside class="home-next" aria-labelledby="next-h">${ring}<div>
            <h2 id="next-h">${esc(t('Every section complete'))}</h2>
            <p>${esc(t('Use the quizzes and summaries to review before an exam.'))}</p>
          </div></aside>`;
      }
      return `<aside class="home-next" aria-labelledby="next-h">${ring}<div>
          <h2 id="next-h">${esc(sum.done ? t('Next section') : t('New here?'))}</h2>
          <p>${esc(sum.done ? t('{section} comes next.', { section: start.title }) : t('Start with {section}, then follow a request from the browser to the database.', { section: start.title }))}</p>
          <a class="btn" href="${start.base}">${esc(t('Open {section}', { section: start.title }))}</a>
        </div></aside>`;
    }
    const part = open.parts.find((p) => p.done < p.total && p.next);
    return `<aside class="home-next" aria-labelledby="next-h">${ring}<div>
        <h2 id="next-h">${esc(t('Your next step'))}</h2>
        <p><strong>${esc(open.title)}</strong>${part ? `<br>${esc(t('Next: {what}', { what: part.next.label }))}` : ''}</p>
        <a class="btn" href="${part ? part.next.href : open.base}">${esc(t('Continue'))}</a>
      </div></aside>`;
  }

  /* The quiz topics with the lowest best score, across every section; before any quiz, where to start. */
  function reviewPanel() {
    const weak = ProgressPage.weakTopics(3);
    if (!weak.length) {
      const open = ProgressPage.summary().secs.find((s) => s.pct > 0 && s.pct < 100);
      return `<aside class="home-review" aria-labelledby="review-h">
          <h2 id="review-h">${esc(t('Topics to review'))}</h2>
          <p>${esc(t('After a topic quiz, the topics with your lowest scores show up here so you can retry them.'))}</p>
          ${open ? `<p><a href="${open.base}/quiz">${esc(t('Take the {section} quiz', { section: open.title }))}</a></p>` : ''}
        </aside>`;
    }
    return `<aside class="home-review" aria-labelledby="review-h">
        <h2 id="review-h">${esc(t('Topics to review'))}</h2>
        <ol>${weak.map((w) => `<li><a href="${w.href}">
            <span class="hr-topic">${esc(w.label)}</span>
            <span class="hr-sec">${esc(w.section)}</span>
            <span class="hr-score" title="${esc(t('Best: {score} of {total}', { score: w.best, total: w.total }))}">${w.best}/${w.total}</span>
          </a></li>`).join('')}</ol>
      </aside>`;
  }

  /* Every topic video, in learning order (SECTIONS, then the order within a section), each linking to its group page. */
  function videosSection() {
    const watched = makeStore('video-watched-v2').load();
    const entries = SECTIONS.flatMap((s) => (s.data.videos || []).map((v) => ({
      video: v, href: VideoHtml.hrefOf(v, { base: s.base, concepts: s.data.concepts, groups: s.data.groups }), section: t(s.title),
    })));
    if (!entries.length) return '';
    return `<section class="home-videos" aria-labelledby="hv-h">
          <h2 id="hv-h">${esc(t('Short videos'))}</h2>
          <p class="home-videos-lead">${esc(t('{n} short explainers for the topics that move: requests, Git, the event loop, CSS layout and more. Each one opens on the page of the topic it explains.', { n: entries.length }))}</p>
          ${VideoHtml.grid(entries, { t, watched: (id) => !!watched[id] })}
        </section>`;
  }

  function render() {
    const tools = SECTIONS.reduce((n, s) => n + s.tools.length, 0);
    $('#view').innerHTML = `
      <div class="home">
        <header class="home-hero">
          <div class="home-intro">
            <h1 id="home-h" tabindex="-1">${esc(t('Learn the web by building and breaking it'))}</h1>
            <p class="home-lead">${esc(t('Concept cards, live editors, {n} interactive tools and self-check quizzes for building web applications, from HTML to the database. Everything runs in your browser, and your progress stays on this device.', { n: tools }))}</p>
          </div>
          <div class="home-side">${continuePanel()}${reviewPanel()}</div>
        </header>
        ${videosSection()}
        <section class="home-map" aria-labelledby="map-h">
          <h2 id="map-h">${esc(t('How it all fits together'))}</h2>
          <p class="home-map-lead">${esc(t('Each section sits where its code runs. Follow a request from the browser to the database and back.'))}</p>
          ${CourseMap.html({ idp: 'hm' })}
        </section>
      </div>`;
    return '';
  }

  return { render };
})();
