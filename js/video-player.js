'use strict';

/* ==========================================================================
   Playback of the topic videos: remembers where you stopped (video-progress-v1, this device only),
   marks a video watched at 90 %, adds keyboard shortcuts, and offers the next video when one ends.
   Used by the home page stage (inline: onPlay given) and by group pages (a link to the next topic).
   The HTML comes from js/video-html.js; the pure rules (resume point, what comes next) are tested there.
   ========================================================================== */

const VideoPlayer = (() => {
  const progressStore = makeStore('video-progress-v1');
  const watchedStore = makeStore('video-watched-v2');
  const SAVE_EVERY = 5000;         // ms between saves while playing
  const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
  const COUNTDOWN = 5;             // seconds before the next video starts (home page stage only)

  /* A snapshot of what is watched and where each video stopped, in the shape js/video-html.js expects. */
  function state() {
    const w = watchedStore.load();
    const p = progressStore.load();
    return { watched: (id) => !!w[id], rec: (id) => p[id] };
  }

  /* Every video of the course in learning order (SECTIONS, then the order inside a section). */
  function entries() {
    return SECTIONS.flatMap((s) => (s.data.videos || []).map((v) => ({
      video: v,
      href: VideoHtml.hrefOf(v, { base: s.base, concepts: s.data.concepts, groups: s.data.groups }),
      section: t(s.title),
      area: t(AREAS[s.area].title),
    })));
  }

  function save(id, time, duration, finished) {
    const p = progressStore.load();
    p[id] = { t: finished ? 0 : Math.floor(time), d: Math.round(duration), at: Date.now() };
    progressStore.save(p);
  }

  function markWatched(id) {
    const w = watchedStore.load();
    if (w[id]) return;
    w[id] = true;
    watchedStore.save(w);
    const box = document.querySelector(`input[data-action="video-watched"][data-id="${CSS.escape(id)}"]`);
    if (box) box.checked = true;
  }

  /* What happens when a video ends: on the home page the next one starts after a short countdown
     (Cancel stops it); on a group page there is a link to the page of the next one. */
  function showNext(holder, id, onPlay) {
    const next = VideoHtml.upNext(entries(), id, state(), 1)[0];
    if (!next) { holder.innerHTML = `<p class="tv-next-text">${esc(t('You have watched every video.'))}</p>`; return; }
    const v = next.video;
    if (!onPlay) {
      holder.innerHTML = `<p class="tv-next-text">${esc(t('Next: {title}', { title: v.title }))}</p><a class="btn" href="${esc(next.href)}">${esc(t('Watch next'))}</a>`;
      return;
    }
    let left = COUNTDOWN;
    holder.innerHTML = `<p class="tv-next-text">${esc(t('The next video starts soon: {title}', { title: v.title }))} <span class="tv-count" aria-hidden="true">${left}</span></p>
      <div class="tv-next-btns"><button type="button" class="btn" data-action="video-play" data-id="${esc(v.id)}">${esc(t('Play now'))}</button> <button type="button" class="btn ghost" data-cancel>${esc(t('Cancel'))}</button></div>`;
    const count = holder.querySelector('.tv-count');
    const timer = setInterval(() => {
      if (!holder.isConnected || !holder.querySelector('[data-cancel]')) { clearInterval(timer); return; }
      left -= 1;
      if (left > 0) { count.textContent = left; return; }
      clearInterval(timer);
      onPlay(v.id);
    }, 1000);
    holder.querySelector('[data-cancel]').addEventListener('click', () => {
      clearInterval(timer);
      holder.innerHTML = `<p class="tv-next-text">${esc(t('Next: {title}', { title: v.title }))}</p><button type="button" class="btn" data-action="video-play" data-id="${esc(v.id)}">${esc(t('Play now'))}</button>`;
    });
  }

  function onShortcut(video, e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'k': video.paused ? video.play() : video.pause(); break;
      case 'j': video.currentTime = Math.max(0, video.currentTime - 10); break;
      case 'l': video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10); break;
      case '<': case '>': {
        const k = RATES.indexOf(video.playbackRate);
        const at = k < 0 ? RATES.indexOf(1) : k;
        video.playbackRate = RATES[Math.max(0, Math.min(RATES.length - 1, at + (e.key === '>' ? 1 : -1)))];
        break;
      }
      case 'c': {
        const track = video.textTracks && video.textTracks[0];
        if (track) track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
        break;
      }
      case 'f':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (video.requestFullscreen) video.requestFullscreen();
        break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();           // the page module must not read these keys
  }

  function attach(video, id, { onPlay } = {}) {
    if (video.dataset.vp) return;
    video.dataset.vp = '1';
    const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
    let lastSave = 0;

    video.addEventListener('loadedmetadata', () => {
      const w = watchedStore.load();
      const at = VideoHtml.resumeAt(progressStore.load()[id], !!w[id]);
      if (at && duration() && at < duration() - 3 && !video.currentTime) video.currentTime = at;
    });
    video.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSave < SAVE_EVERY || !duration()) return;
      lastSave = now;
      save(id, video.currentTime, duration(), false);
      if (video.currentTime / duration() >= VideoHtml.FINISHED) markWatched(id);
    });
    video.addEventListener('pause', () => {
      if (!video.ended && duration() && video.currentTime > 0) save(id, video.currentTime, duration(), false);
    });
    video.addEventListener('ended', () => {
      save(id, 0, duration(), true);
      markWatched(id);
      const holder = video.closest('.topic-video').querySelector('.tv-next');
      if (holder) showNext(holder, id, onPlay);
    });
    video.addEventListener('keydown', (e) => onShortcut(video, e));
  }

  /* Wire every topic video inside root. Call again with options (the home page stage) after adding one. */
  function mountAll(root, opts) {
    root.querySelectorAll('.topic-video[data-video]').forEach((fig) => {
      const video = fig.querySelector('video');
      if (video) attach(video, fig.dataset.video, opts);
    });
  }

  return { state, entries, mountAll };
})();
