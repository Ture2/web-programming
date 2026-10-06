'use strict';

/* ==========================================================================
   semantic-outline (HTML): edit a page and see it the way a
   screen reader or a search engine does — the landmark map, the heading
   outline and a list of semantic checks — next to the rendered preview.
   The HTML is parsed with DOMParser (scripts never run); the preview iframe
   has an empty sandbox (no scripts either).
   ========================================================================== */

(() => {
  const SOUP = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div class="top">
    <div class="logo">Riverside Café</div>
    <div class="menu">
      <span onclick="go('/')">Home</span>
      <span onclick="go('/menu')">Menu</span>
    </div>
  </div>
  <div class="content">
    <div class="big">Fresh coffee every morning</div>
    <img src="coffee.jpg">
    <h3>Opening hours</h3>
    <p>Monday to Friday, 8:00–18:00.</p>
    <p>To book a table <a href="/book">click here</a>.</p>
    <input type="email" placeholder="Your email">
    <div class="btn" onclick="send()">Subscribe</div>
  </div>
  <div class="bottom">© 2026 Riverside Café</div>
</body>
</html>`;

  const SEMANTIC = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Riverside Café</title></head>
<body>
  <header>
    <p class="logo">Riverside Café</p>
    <nav aria-label="Main">
      <a href="/">Home</a>
      <a href="/menu">Menu</a>
    </nav>
  </header>
  <main>
    <h1>Fresh coffee every morning</h1>
    <img src="coffee.jpg" alt="A latte with leaf art on a wooden table">
    <section>
      <h2>Opening hours</h2>
      <p>Monday to Friday, 8:00–18:00.</p>
      <p><a href="/book">Book a table</a></p>
    </section>
    <form>
      <label for="email">Your email</label>
      <input id="email" type="email">
      <button type="submit">Subscribe</button>
    </form>
  </main>
  <footer>
    <p>© 2026 Riverside Café</p>
  </footer>
</body>
</html>`;

  const so = { preset: 'soup', html: SOUP };

  const LANDMARK = {
    header: 'header (banner)', nav: 'nav (navigation)', main: 'main', aside: 'aside (complementary)', footer: 'footer (contentinfo)',
    section: 'section (region)', article: 'article', form: 'form',
  };
  const SEMANTIC_TAGS = ['header', 'nav', 'main', 'aside', 'footer', 'section', 'article', 'figure', 'figcaption', 'form', 'button', 'label', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'time', 'address', 'table'];
  const VAGUE = /^(click here|here|read more|more|link|this|go)$/i;

  /* The preview shows how the page looks: scripts and on* handlers are removed
     (the frame could not run them anyway, and Chrome logs an error for each). */
  const previewHtml = (source) => `<!doctype html>${inertHtml(source.cloneNode(true)).documentElement.outerHTML}`;

  function landmarkLabel(el) {
    const role = el.getAttribute('role');
    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('aria-label');
    let label = role ? `${tag} [role=${role}]` : LANDMARK[tag];
    if (!label) return null;
    if (tag === 'section' && !role) {
      const h = el.querySelector('h1,h2,h3,h4,h5,h6');
      label = h ? `section: “${h.textContent.trim().slice(0, 40)}”` : 'section (no heading)';
    }
    return name ? `${label} “${name}”` : label;
  }

  /* Nested boxes for landmark elements; other elements are see-through. */
  function mapHtml(el) {
    let out = '';
    for (const child of el.children) {
      const label = landmarkLabel(child);
      const inner = mapHtml(child);
      if (label) out += `<div class="so-box so-${esc(child.tagName.toLowerCase())}"><span class="so-name">${esc(label)}</span>${inner}</div>`;
      else out += inner;
    }
    return out;
  }

  function outlineHtml(doc) {
    const hs = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    if (!hs.length) return `<p class="muted small">${esc(t('No headings: the page has no outline to navigate by.'))}</p>`;
    let prev = 0;
    return `<ol class="so-outline">${hs.map((h) => {
      const lvl = +h.tagName[1];
      const skip = prev && lvl > prev + 1;
      prev = lvl;
      return `<li class="so-h so-l${lvl}${skip ? ' is-skip' : ''}"><code>h${lvl}</code> ${esc(h.textContent.trim() || t('(empty)'))}${skip ? ` <span class="tl-bad small">${esc(t('skipped a level'))}</span>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  function checks(doc) {
    const out = [];
    const add = (status, text) => out.push({ status, text });
    const lang = doc.documentElement.getAttribute('lang');
    add(lang ? 'ok' : 'bad', lang ? t('`<html lang="{lang}">` tells screen readers which language to speak.', { lang }) : t('No `lang` on `<html>`: screen readers may read the page with the wrong voice. Add `lang="en"`.'));
    const title = doc.querySelector('title');
    add(title && title.textContent.trim() ? 'ok' : 'bad', title && title.textContent.trim() ? t('Has a `<title>` (the tab name and the search result headline).') : t('No `<title>`: the tab and search results show the file name.'));
    const mains = doc.querySelectorAll('main, [role="main"]').length;
    add(mains === 1 ? 'ok' : 'bad', mains === 1 ? t('Exactly one `<main>`: “skip to content” has a target.') : mains ? t('{n} `<main>` elements: a page has exactly one.', { n: mains }) : t('No `<main>`: wrap the unique content of the page in `<main>`.'));
    const h1 = doc.querySelectorAll('h1').length;
    add(h1 === 1 ? 'ok' : h1 ? 'note' : 'bad', h1 === 1 ? t('One `<h1>`: the page has a clear main heading.') : h1 ? t('{n} `<h1>` elements: usually one per page is clearer.', { n: h1 }) : t('No `<h1>`: the page has no main heading. Big text in a `<div>` is not a heading.'));
    let prev = 0;
    let skipped = 0;
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => { const l = +h.tagName[1]; if (prev && l > prev + 1) skipped++; if (!prev && l > 1 && !h1) skipped++; prev = l; });
    if (prev) add(skipped ? 'bad' : 'ok', skipped ? t('Heading levels are skipped ({n}×). Go down one level at a time (h1 → h2 → h3); choose headings by structure, not by size.', { n: skipped }) : t('Heading levels go down one at a time.'));
    const imgs = [...doc.querySelectorAll('img')];
    const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).length;
    const emptyAlt = imgs.filter((i) => i.getAttribute('alt') === '').length;
    if (imgs.length) add(noAlt ? 'bad' : 'ok', noAlt ? t('{n} `<img>` without `alt`: a screen reader may read the file name. Describe what the image shows.', { n: noAlt }) : t('Every image has an `alt` text.'));
    if (emptyAlt) add('note', t('{n} image(s) with `alt=""`: correct only for decorative images, which screen readers then skip.', { n: emptyAlt }));
    const vague = [...doc.querySelectorAll('a')].filter((a) => VAGUE.test(a.textContent.trim()));
    if (vague.length) add('bad', t('Link text like “{text}” says nothing out of context (screen-reader users often list all links). Make the link text describe the destination.', { text: vague[0].textContent.trim() }));
    const fields = [...doc.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')];
    const unlabeled = fields.filter((f) => !(f.closest('label') || (f.id && doc.querySelector(`label[for="${CSS.escape(f.id)}"]`)) || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby'))).length;
    if (fields.length) add(unlabeled ? 'bad' : 'ok', unlabeled ? t('{n} form field(s) without a `<label>`. A placeholder is not a label: it disappears when you type.', { n: unlabeled }) : t('Every form field has a label.'));
    const clicky = doc.querySelectorAll('div[onclick], span[onclick]').length;
    if (clicky) add('bad', t('{n} clickable `<div>`/`<span>`: they cannot be reached with Tab or pressed with Enter. Use `<button>` for actions and `<a href>` for navigation.', { n: clicky }));
    const generic = doc.body.querySelectorAll('div, span').length;
    const semantic = doc.body.querySelectorAll(SEMANTIC_TAGS.join(',')).length;
    add(generic > semantic ? 'bad' : 'note', t('{g} generic elements (`div`, `span`) and {s} meaningful ones. {verdict}', { g: generic, s: semantic, verdict: generic > semantic ? t('This is “div soup”: the browser knows nothing about what each part is.') : t('`div` and `span` are fine for styling-only wrappers.') }));
    return out;
  }

  function outHtml(doc, list, bad) {
    const map = mapHtml(doc.body);
    return `<div class="tl-cols">
        <div>
          <h4 class="tl-sub">${esc(t('Landmarks'))}</h4>
          ${map ? `<div class="so-map">${map}</div>` : `<p class="tl-bad">${esc(t('No landmarks at all: assistive technology cannot jump to the menu or the content.'))}</p>`}
          <h4 class="tl-sub">${esc(t('Heading outline'))}</h4>
          ${outlineHtml(doc)}
        </div>
        <div>
          <h4 class="tl-sub">${esc(t('Checks'))} <span class="${bad ? 'tl-bad' : 'tl-ok'} small">${esc(bad ? t('{n} problems', { n: bad }) : t('no problems'))}</span></h4>
          <ul class="checks">${list.map(checkItem).join('')}</ul>
        </div>
      </div>`;
  }

  /* Everything shown for the current HTML: parsed and checked once per text (body, mount and say share it). */
  let memo = { html: null };
  function analysis() {
    if (memo.html === so.html) return memo;
    const doc = parseHtml(so.html);
    const list = checks(doc);
    const bad = list.filter((c) => c.status === 'bad').length;
    memo = {
      html: so.html,
      out: outHtml(doc, list, bad),
      preview: previewHtml(doc),
      summary: bad ? t('{n} problems found', { n: bad }) : t('No problems found'),
    };
    return memo;
  }

  function updateOut(root) {
    const a = analysis();
    Tools.paint(root, { out: () => a.out });
    const frame = root.querySelector('[data-so-frame]');
    if (frame) frame.srcdoc = a.preview;
    Tools.say(root, a.summary);
  }
  const updateSoon = debounce(updateOut, 300);

  Tools.register('semantic-outline', {
    title: 'Semantic outline',
    intro: 'Browsers, screen readers and search engines read your tags, not your styling. Edit the page and watch the landmarks, the heading outline and the checks change.',
    body() {
      return `
        <div class="tl-row">
          ${Tools.seg({ label: t('Example page'), action: 'so-preset', prop: 'preset', values: [['soup', t('Div soup')], ['semantic', t('Semantic')]], current: so.preset, fid: 'so-preset', mono: false })}
          <span class="muted small">${esc(t('Same page, same look; very different meaning.'))}</span>
        </div>
        <div class="tl-cols">
          <div class="tl-field">
            <label for="so-html">${esc(t('HTML'))}</label>
            <textarea id="so-html" class="tl-code" rows="18" data-so="html" data-fid="so-html" spellcheck="false" autocapitalize="off">${esc(so.html)}</textarea>
          </div>
          <div class="tl-field">
            <span>${esc(t('Preview (scripts disabled)'))}</span>
            <iframe class="tl-frame so-frame" sandbox="" title="${esc(t('Preview of the page'))}" data-so-frame></iframe>
          </div>
        </div>
        <div class="so-out" data-part="out">${analysis().out}</div>`;
    },
    mount(root) {
      const frame = root.querySelector('[data-so-frame]');
      if (frame) frame.srcdoc = analysis().preview;
    },
    onClick(el, root) {
      if (el.dataset.action !== 'so-preset') return;
      so.preset = el.dataset.v;
      so.html = so.preset === 'soup' ? SOUP : SEMANTIC;
      Tools.refresh('semantic-outline');
      Tools.say(root, analysis().summary);
    },
    onInput(e, root) {
      if (e.target.dataset.so !== 'html') return;
      so.html = e.target.value;
      updateSoon(root);
    },
  });
})();
