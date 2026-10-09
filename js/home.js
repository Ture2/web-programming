'use strict';

/* ==========================================================================
   Home page (#/): headline, the next step and the quiz topics to review, then
   the topic map (js/course-map.js): every section where its code runs in a
   web app, with version control underneath. The topic videos are play marks
   on the map, shown with a switch; one opens the stage in place, under the zones.
   ========================================================================== */

const HomePage = (() => {
  /* The next step: the first section started but not finished, in learning order; else the first one.
     { ring, heading, body (html), href, label }; href is '' once every section is complete. */
  function nextStep() {
    const sum = ProgressPage.summary();
    const open = sum.secs.find((s) => s.pct > 0 && s.pct < 100);
    // A started course never shows 0%.
    const ring = ProgressPage.ring(sum.pct, 88, sum.done && !sum.pct ? '<1%' : `${sum.pct}%`);
    if (!open) {
      const start = sum.done ? sum.secs.find((s) => s.pct < 100) : sum.secs[0];
      if (!start) {
        return { ring, heading: t('Every section complete'), body: esc(t('Use the quizzes and summaries to review before an exam.')), href: '', label: '' };
      }
      return {
        ring,
        heading: sum.done ? t('Next section') : t('New here?'),
        body: esc(sum.done ? t('{section} comes next.', { section: start.title }) : t('Start with {section}, then follow a request from the browser to the database.', { section: start.title })),
        href: start.base,
        label: t('Open {section}', { section: start.title }),
      };
    }
    const part = open.parts.find((p) => p.done < p.total && p.next);
    return {
      ring,
      heading: t('Your next step'),
      body: `<strong>${esc(open.title)}</strong>${part ? `<br>${esc(t('Next: {what}', { what: part.next.label }))}` : ''}`,
      href: part ? part.next.href : open.base,
      label: t('Continue'),
    };
  }

  /* The video left part-way most recently, as a line that plays it on the map; nothing otherwise. */
  function resumeLine() {
    const state = VideoPlayer.state();
    const pick = VideoHtml.pickContinue(VideoPlayer.entries(), state);
    if (!pick || pick.kind !== 'resume') return '';
    const v = pick.entry.video;
    return `<p class="home-resume"><button type="button" data-action="video-play" data-id="${esc(v.id)}">${esc(t('Resume the video “{title}” at {time}', { title: v.title, time: VideoHtml.fmtTime(state.rec(v.id).t) }))}</button></p>`;
  }

  /* The progress card beside the headline: the ring and where you are (the button is under the headline). */
  function continuePanel(step) {
    return `<aside class="home-next" aria-labelledby="next-h">${step.ring}<div>
        <h2 id="next-h">${esc(step.heading)}</h2>
        <p>${step.body}</p>
        ${resumeLine()}
      </div></aside>`;
  }

  /* The quiz topics with the lowest best score, across every section. Nothing before a first quiz. */
  function reviewPanel() {
    const weak = ProgressPage.weakTopics(3);
    if (!weak.length) return '';
    return `<aside class="home-review" aria-labelledby="review-h">
        <h2 id="review-h">${esc(t('Topics to review'))}</h2>
        <ol>${weak.map((w) => `<li><a href="${w.href}">
            <span class="hr-topic">${esc(w.label)}</span>
            <span class="hr-sec">${esc(w.section)}</span>
            <span class="hr-score" title="${esc(t('Best: {score} of {total}', { score: w.best, total: w.total }))}">${w.best}/${w.total}</span>
          </a></li>`).join('')}</ol>
      </aside>`;
  }

  /* ---- Topic videos: play marks on the map open one stage, in place ---- */

  const markOf = (id) => document.querySelector(`.home-map .hv-mark[data-id="${CSS.escape(id)}"]`);

  /* Each play mark shows what is saved (watched, part-way) and whether its video is on the stage. */
  function refreshMarks(playingId) {
    const state = { t, ...VideoPlayer.state() };
    const byId = new Map(VideoPlayer.entries().map((e) => [e.video.id, e.video]));
    document.querySelectorAll('.home-map .hv-mark').forEach((btn) => {
      const v = byId.get(btn.dataset.id);
      if (v) btn.innerHTML = VideoHtml.markInner(v, state);
      btn.setAttribute('aria-expanded', String(btn.dataset.id === playingId));
    });
  }

  /* The stage opens under the row of zones (or under version control) on a wide screen and under the
     zone of the mark on a narrow one, so the map stays in view; a notch points at the mark. */
  function placeStage(stageEl, mark) {
    const wide = matchMedia('(min-width: 901px)').matches;
    const anchor = (mark && (wide ? mark.closest('.cm-git') || mark.closest('.cm-zones') : mark.closest('.cm-zone, .cm-wire, .cm-git')))
      || $('.home-map .cm-zones');
    anchor.after(stageEl);
    stageEl.hidden = false;
    if (!mark) { stageEl.style.removeProperty('--notch'); return; }
    const m = mark.querySelector('.hv-mark-glyph').getBoundingClientRect();
    const s = stageEl.getBoundingClientRect();
    stageEl.style.setProperty('--notch', `${Math.round(m.left + m.width / 2 - s.left)}px`);
  }

  /* Opening, switching and closing the stage move smoothly (not at all under reduced motion). */
  const EASE = 'cubic-bezier(.2, .7, .2, 1)';
  const animate = (el, frames, ms) => (reduceMotion || !el.animate ? null : el.animate(frames, { duration: ms, easing: EASE }));
  const OPEN = [
    { opacity: 0, transform: 'translateY(-8px)', clipPath: 'inset(0 0 100% 0)' },
    { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
  ];

  let lastPlayId = null;

  function playVideo(id) {
    const stageEl = $('#hv-stage');
    const entries = VideoPlayer.entries();
    const entry = entries.find((e) => e.video.id === id);
    if (!stageEl || !entry) return;
    if (!videosShown()) showVideos(true);          // the resume line can open a video while the marks are hidden
    if (stageEl.getAnimations) stageEl.getAnimations().forEach((a) => a.cancel());   // a close still running
    const wasOpen = !stageEl.hidden;
    lastPlayId = id;
    refreshMarks(id);                              // the one just left shows its new progress
    const state = { t, entries, ...VideoPlayer.state() };
    stageEl.innerHTML = `<p class="hv-where"><span>${esc(entry.area)} › ${esc(entry.section)}</span><a class="hv-topic" href="${esc(entry.href)}">${esc(t('Open the topic'))}<span class="sr-only">: ${esc(entry.video.title)}</span></a></p>${VideoHtml.stage(entry, state)}`;
    placeStage(stageEl, markOf(id));
    if (wasOpen) animate(stageEl.querySelector('.hv-stage-grid'), [{ opacity: 0 }, { opacity: 1 }], 260);
    else animate(stageEl, OPEN, 380);
    VideoPlayer.mountAll(stageEl, { onPlay: playVideo });
    stageEl.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    const video = stageEl.querySelector('video');
    video.focus({ preventScroll: true });
    const started = video.play();
    if (started && started.catch) started.catch(() => { /* the viewer can press play */ });
  }

  function closeVideo(focusBack = true) {
    const stageEl = $('#hv-stage');
    if (!stageEl || stageEl.hidden) return;
    const video = stageEl.querySelector('video');
    if (video) video.pause();
    refreshMarks(null);
    const done = () => {
      if (stageEl.querySelector('video') !== video) return;   // another video opened meanwhile
      stageEl.hidden = true;
      stageEl.innerHTML = '';
    };
    const run = animate(stageEl, [...OPEN].reverse(), 220);
    if (run) run.onfinish = done; else done();
    if (!focusBack) return;
    // Back to what opened it (the resume line or a mark), or to the mark of the video that last played.
    const back = opener && opener.isConnected && opener.dataset.id === lastPlayId ? opener : lastPlayId && markOf(lastPlayId);
    if (back) back.focus();
  }

  /* ---- Showing the videos on the map: off by default so the map reads first; remembered on this device ---- */

  const prefs = makeStore('home-prefs-v1');
  const videosShown = () => !!prefs.load().videos;

  function showVideos(on) {
    prefs.save({ ...prefs.load(), videos: on });
    const map = $('.home-map');
    if (!map) return;
    map.classList.toggle('hide-videos', !on);
    const sw = $('#hv-toggle');
    if (sw) sw.setAttribute('aria-checked', String(on));
    if (!on) closeVideo(false);
    else document.querySelectorAll('.home-map .hv-marks').forEach((ul) => animate(ul, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], 240));
  }

  let opener = null;

  function onClick(el) {
    if (el.dataset.action === 'video-play') { opener = el; playVideo(el.dataset.id); }
    else if (el.dataset.action === 'video-close') closeVideo();
    else if (el.dataset.action === 'videos-toggle') showVideos(!videosShown());
  }

  function render() {
    const tools = SECTIONS.reduce((n, s) => n + s.tools.length, 0);
    const step = nextStep();
    const videos = VideoPlayer.entries().length;
    $('#view').innerHTML = `
      <div class="home">
        <header class="home-hero">
          <div class="home-intro">
            <h1 id="home-h" tabindex="-1">${esc(t('Learn the web by building and breaking it'))}</h1>
            <p class="home-lead">${esc(t('Concept cards, live editors, {n} interactive tools and self-check quizzes for building web applications, from HTML to the database. Everything runs in your browser, and your progress stays on this device.', { n: tools }))}</p>
            ${step.href ? `<p class="home-cta"><a class="btn" href="${step.href}">${esc(step.label)}</a></p>` : ''}
          </div>
          <div class="home-side">${continuePanel(step)}${reviewPanel()}</div>
        </header>
        <section class="home-map${videos && !videosShown() ? ' hide-videos' : ''}" aria-labelledby="map-h">
          <h2 id="map-h">${esc(t('Follow a request from the browser to the database and back'))}</h2>
          <p class="home-map-lead">${esc(t('Each section sits where its code runs.'))}${videos ? ` ${esc(t('{n} short videos sit where their topic happens; show them to watch one here, beside what it explains.', { n: videos }))}` : ''}</p>
          ${videos ? `<button type="button" class="hv-toggle" id="hv-toggle" role="switch" aria-checked="${videosShown()}" data-action="videos-toggle"><span class="hv-toggle-track" aria-hidden="true"></span>${esc(t('Show the videos on the map'))}</button>` : ''}
          ${CourseMap.html({ idp: 'hm', videos: VideoPlayer.state() })}
          <div class="hv-stage" id="hv-stage" hidden></div>
        </section>
      </div>`;
    return '';
  }

  return { render, onClick };
})();
