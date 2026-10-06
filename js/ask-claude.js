'use strict';

/* ==========================================================================
   "Ask Claude": the app-bar button that hands the current page to Claude.
   The site has no backend and no API key: the student uses their own
   claude.ai account in a new tab. The button builds a tutoring prompt from
   what #view shows (with the student's own answers in [brackets]), copies it
   to the clipboard and opens claude.ai. The prompt also travels in ?q=,
   which pre-fills the chat where claude.ai honours it; elsewhere the student
   pastes it. Nothing is sent anywhere by this page.
   ========================================================================== */

const AskClaude = (() => {
  const CLAUDE_URL = 'https://claude.ai/new';
  const MAX_PAGE_CHARS = 6000;   // page text in the prompt: enough for one card or tool and its output
  const MAX_URL_CHARS = 8000;    // longer links risk being refused; the clipboard still has the prompt

  const btn = $('#ask-btn');
  const label = btn.querySelector('.ask-label');
  const note = $('#ask-note');

  /* Marks a form control's current value in the copy: [value], [ ] when empty, [x] / [ ] for ticks. */
  function controlText(live) {
    if (live.tagName === 'SELECT') {
      const opt = live.options[live.selectedIndex];
      return `[${opt ? opt.text.trim() : ''}]`;
    }
    if (live.type === 'checkbox' || live.type === 'radio') return live.checked ? '[x]' : '[ ]';
    if (live.tagName === 'TEXTAREA') return `\n[\n${live.value.trim()}\n]\n`;
    return `[${live.value.trim() || ' '}]`;
  }

  /* Visible text of the current view, laid out by the browser (innerText needs a rendered element,
     so the cleaned copy is placed off screen for a moment). Buttons and decorative glyphs are
     dropped; inputs and editors become their current values. */
  function pageText() {
    const view = $('#view');
    const copy = view.cloneNode(true);
    const live = view.querySelectorAll('input, textarea, select');
    copy.querySelectorAll('input, textarea, select').forEach((el, i) => {
      const src = live[i];
      if (!src || src.type === 'hidden' || src.type === 'search') { el.remove(); return; }
      el.replaceWith(document.createTextNode(controlText(src)));
    });
    copy.querySelectorAll('nav, script, style, iframe, [aria-hidden="true"]').forEach((el) => el.remove());
    // Buttons carry content too (quiz options, toggles): keep their text, mark toggles, drop bare glyphs (×, ‹, +).
    copy.querySelectorAll('button').forEach((el) => {
      if (el.textContent.trim().length <= 1) { el.remove(); return; }
      const pressed = el.getAttribute('aria-pressed');
      if (pressed) el.prepend(pressed === 'true' ? '[x] ' : '[ ] ');
    });
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.inert = true;
    box.style.cssText = `position:fixed;left:-10000px;top:0;width:${view.clientWidth || 800}px;pointer-events:none`;
    box.appendChild(copy);
    document.body.appendChild(box);
    const text = copy.innerText;
    box.remove();
    const tidy = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return tidy.length > MAX_PAGE_CHARS ? `${tidy.slice(0, MAX_PAGE_CHARS)}\n[…]` : tidy;
  }

  function buildPrompt() {
    const link = /^https?:$/.test(location.protocol) ? `\n${t('Link: {url}', { url: location.href })}` : '';
    return [
      t('You are my tutor for web application programming. I am working on a page of a study website. Help me understand and get unstuck: explain the concepts and guide me with questions and hints, but do not give me the full solution unless I ask for it. Reply in English.'),
      '',
      `${t('Page: {title}', { title: document.title })}${link}`,
      '',
      t('What I see on the page (my answers and code are in [brackets]):'),
      '"""',
      pageText(),
      '"""',
      '',
      t('My question: '),
    ].join('\n');
  }

  /* Clipboard API first; the old execCommand route covers browsers that block it. */
  function copyText(text) {
    const legacy = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-10000px;top:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* not supported */ }
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacy());
    }
    return Promise.resolve(legacy());
  }

  /* The note is for sight only; screen readers hear the same text through announce(). */
  let resetTimer = null;
  function feedback(text) {
    note.textContent = text;
    note.hidden = false;
    btn.classList.add('is-busy');
    announce(text);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { note.hidden = true; btn.classList.remove('is-busy'); }, 4000);
  }

  function ask() {
    const prompt = buildPrompt();
    const withQuery = `${CLAUDE_URL}?q=${encodeURIComponent(prompt)}`;
    // Copy before opening: the new tab takes focus, and a page without focus cannot write the clipboard.
    copyText(prompt).then((ok) => {
      window.open(withQuery.length <= MAX_URL_CHARS ? withQuery : CLAUDE_URL, '_blank', 'noopener');
      feedback(ok ? t('Copied: paste it in Claude') : t('Could not copy: describe the page to Claude'));
    });
  }

  label.textContent = t('Ask Claude');
  btn.setAttribute('aria-label', t('Ask Claude'));   // the label is hidden on narrower screens
  btn.title = t('Ask Claude about this page: the page is copied and claude.ai opens with your account');
  btn.addEventListener('click', ask);

  return { buildPrompt };
})();
