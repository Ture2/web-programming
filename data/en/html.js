'use strict';
/* HTML: concept cards, rail groups and self-check quiz (document structure, elements and
   attributes, headings and text, semantic landmarks, links, images, tables and forms). See
   site/README.md for the data contract. `hub` and `topic` keys match HTML_QUIZ_TOPICS and
   HTML_GROUPS. */

DATA.en.HTML_QUIZ_TOPICS = {
  document: 'Document structure',
  syntax: 'Elements, attributes and nesting',
  text: 'Headings, text and lists',
  semantic: 'Semantic landmarks',
  layout: 'Block, inline, div and span',
  links: 'Links, paths and images',
  tables: 'Tables',
  forms: 'Forms',
  tools: 'Validation and DevTools',
};

DATA.en.HTML_GROUPS = [
  { key: 'document', label: 'The document', icon: 'files' },
  { key: 'syntax', label: 'Elements and attributes', icon: 'code' },
  { key: 'text', label: 'Headings, text and lists', icon: 'levels' },
  { key: 'semantic', label: 'Semantic HTML', icon: 'index' },
  { key: 'layout', label: 'Block, inline, div, span', icon: 'split' },
  { key: 'links', label: 'Links and images', icon: 'link' },
  { key: 'tables', label: 'Tables', icon: 'table' },
  { key: 'forms', label: 'Forms', icon: 'forms' },
  { key: 'tools', label: 'Validate and inspect', icon: 'special' },
];

DATA.en.HTML_CONCEPTS = [
  /* ---- 1. The document ------------------------------------------------------------ */
  { id: 'what-is-html', hub: 'document', topic: 'document', 
    title: 'What HTML is for',
    summary: '**HTML** (HyperText Markup Language) describes the **structure and meaning** of a page: it marks each piece of content as a heading, a paragraph, a list, a link, a form and so on.',
    body: [
      'HTML labels content; it does not paint it. Think of the labels on moving boxes: "kitchen", "books", "fragile". They say what is inside, not what colour the box is. In the same way `<h1>` says "this is the main heading of the page", and [CSS](#/browser/css) later decides its font and colour. Because the meaning is explicit, browsers, screen readers, search engines and your teammates can all understand the page.',
      'An HTML file is plain text with **markup**: tags in angle brackets around the content. The browser downloads it, parses it into the DOM tree (see [how the browser renders](#/http/web/rendering-pipeline)) and shows it with its built-in default styles. **Hypertext** means text with links to other documents: the `<a>` element is what turns separate pages into a web.',
      'HTML is a markup language, not a programming language: it has no variables, conditions or loops. Behaviour comes from [JavaScript](#/browser/js).',
    ],
    live: { kind: 'html',
      html: `<h1>Riverside FC</h1>
<p>Our next match is on <strong>Saturday</strong>.</p>
<h2>Opening hours</h2>
<ul>
  <li>Monday to Friday: 9:00-18:00</li>
  <li>Match days: from 10:00</li>
</ul>
<p>More on the <a href="#">tickets page</a>.</p>`,
      css: '' },
    example: 'The words "Opening hours" can be a heading (`<h2>Opening hours</h2>`), a paragraph or a list item. Only as a heading does a screen reader announce "heading level 2, Opening hours" and let the user jump to it with one key. Same words, different meaning, and the markup is what carries it.',
    mistake: 'Choosing tags by how they look: `<h3>` because "the text should be smaller", `<blockquote>` to indent a paragraph. The look is CSS\'s job and can be changed in one line; the tag must say what the content **is**.' },

  { id: 'document-skeleton', hub: 'document', topic: 'document', 
    title: 'The document skeleton',
    summary: 'Every HTML page starts with `<!DOCTYPE html>` and has one `<html>` element that contains a `<head>` (information about the page) and a `<body>` (the content shown in the window).',
    body: [
      'A page is like a book. The `<head>` is the cover and the copyright page: title, language, character set, information **about** the book. The `<body>` is the text you actually read. Only what is inside `<body>` appears in the window.',
      '`<!DOCTYPE html>` is not an element but a declaration: "this is modern HTML, use **standards mode**". Without it, browsers switch to **quirks mode**, imitating the bugs of 1990s browsers, and some CSS later behaves differently. It goes at the very top of the file; only comments and blank lines may come before it. It is not case-sensitive, but write it exactly like this.',
      '`<html lang="en">` declares the language of the content. Screen readers choose their pronunciation from it, browsers offer translation and hyphenate correctly, and search engines show the page to the right audience. Use `lang="es"` for a page in Spanish.',
    ],
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Home · Riverside FC</title>
  </head>
  <body>
    <h1>Riverside FC</h1>
    <p>Welcome to the official club website.</p>
  </body>
</html>`,
    dialect: 'HTML',
    example: 'Open the skeleton above in a browser: the tab shows "Home · Riverside FC" (from `<title>`, in the head), and the window shows only the heading and the paragraph (from the body). The indentation is for people; the browser ignores it.',
    mistake: 'Leaving out `<!DOCTYPE html>` because "the page looks fine without it". The difference shows up later: in quirks mode some CSS sizing rules behave like in very old browsers, and the validator reports an error. Start every file with it.' },

  { id: 'head-metadata', hub: 'document', topic: 'document', 
    title: 'What goes in the head',
    summary: 'The `<head>` holds **metadata**, data about the page: the character encoding, the viewport settings, the title, a description, and links to stylesheets and scripts; none of it is displayed as page content.',
    body: [
      'The `<head>` is the instruction sheet you hand to the browser before the show starts: "the text uses this alphabet, this is the name of the page, these are the costumes (CSS) and the script (JavaScript)". The audience never sees it, but everything goes wrong without it.',
      'Order matters for one of them: put `<meta charset="utf-8">` **first**, because the browser needs to know the encoding before it reads any text, including the title.',
    ],
    points: [
      '`<meta charset="utf-8">`: the file is encoded in **UTF-8**, which covers every alphabet, accents and emoji. Without it, "España" can appear as "EspaÃ±a".',
      '`<meta name="viewport" content="width=device-width, initial-scale=1">`: on phones, lay the page out at the real screen width. Without it mobile browsers pretend the screen is about 980 px wide and shrink everything, so [responsive CSS](#/browser/css/media-queries) seems not to work.',
      '`<title>`: the text of the browser tab, of bookmarks and of the link in search results; screen readers read it first. It is **required**: the validator reports an error if it is missing.',
      '`<meta name="description" content="...">`: a one-sentence summary that search engines may show under the title.',
      '`<link rel="stylesheet" href="styles.css">`: connects an external CSS file (see [Writing CSS](#/browser/css/writing-css)).',
      '`<script src="app.js" defer></script>`: loads a JavaScript file; `defer` runs it after the HTML has been parsed, so the script can find every element (see [Loading scripts](#/browser/dom/script-loading)).',
    ],
    example: 'The fixtures page of a club site: `<title>Fixtures · Riverside FC</title>` in the head names the tab, while `<h1>Fixtures and results</h1>` in the body is the visible heading. A good title puts the specific part first, so it still reads well when many tabs are open and truncated.',
    mistake: 'Mixing up three different "titles": the `<title>` element (in the head, names the document in the tab), the `<h1>` element (in the body, the visible main heading) and the `title` attribute (a tooltip on one element). They have different places and different jobs.' },

  /* ---- 2. Elements and attributes ------------------------------------------------- */
  { id: 'elements-tags', hub: 'syntax', topic: 'syntax', 
    title: 'Elements, tags and comments',
    summary: 'An **element** is a start tag, its content and an end tag (`<p>Hello</p>`); the **tags** are only the markers in angle brackets. **Void elements** such as `<br>`, `<img>` and `<input>` have no content and no end tag.',
    body: [
      'Tags work like brackets in a sentence: the start tag opens a region, the end tag (with a `/`) closes it, and everything in between is the content the element describes. The element is the whole thing; a tag is just one end of it, even though people often say "tag" for both.',
      '**Void** (or empty) elements cannot have content, so they have no end tag: `<br>`, `<img>`, `<input>`, `<meta>`, `<link>`, `<hr>`. You will see them written `<br />` in older code and in JSX, the HTML-like syntax of front-end frameworks such as React; in HTML that final slash is allowed but ignored.',
      'Tag names are not case-sensitive (`<P>` works like `<p>`), but always write lowercase. **Comments** `<!-- ... -->` are notes for people: the browser does not display them, but anyone can read them with View source, so never put passwords or private notes in them.',
    ],
    live: { kind: 'html',
      html: `<!-- Club website, by Ana Ruiz and Luis Gil -->
<h1>Match report</h1>
<p>Riverside FC won <strong>2-1</strong> at home.</p>
<p>Riverside Park<br>River Road 12<br>Madrid</p>
<hr>
<p>Comments are not shown: look at the code above.</p>`,
      css: '' },
    example: 'In `<a href="squad.html">See the squad</a>`: the **start tag** is `<a href="squad.html">` (it carries an attribute), the **content** is "See the squad", the **end tag** is `</a>`, and all three together are the `a` **element**.',
    mistake: 'Relying on the browser to close your tags. Browsers repair missing end tags silently, so the page often looks right, but the repaired tree may not be what you meant (text ending up inside the wrong element), the validator reports errors, and CSS and JavaScript later target the wrong elements.' },

  { id: 'attributes', hub: 'syntax', topic: 'syntax', 
    title: 'Attributes',
    summary: '**Attributes** add information or settings to an element; they are written as `name="value"` pairs inside the start tag, separated by spaces.',
    body: [
      'If an element is a noun, its attributes are its adjectives and settings. `<a>` means "a link" and `href="squad.html"` says where it goes; `<img>` means "an image", `src` says which file and `alt` what it shows. Many elements do nothing useful without their attributes: an `<a>` without `href` is not a working link.',
      'Always put values in double quotes: unquoted values break as soon as they contain a space. Some attributes are **boolean**: their mere presence means "true". `<input required>` is required, and so is `<input required="false">`. To switch a boolean attribute off, remove it.',
      '**Global attributes** work on any element: `id` (a name that must be **unique in the page**, used by fragment links `#id`, by `<label for>` and by JavaScript), `class` (a reusable group name for CSS and JavaScript; one element can have several, separated by spaces), `lang` (language of that content), `title` (advisory text shown as a tooltip when the mouse hovers; keyboard and touch users usually never see it, so do not put essential information there) and `style` (inline CSS; avoid it, see [the cascade](#/browser/css/cascade) for why).',
    ],
    table: {
      caption: 'Attributes you will use on your first pages',
      head: ['Attribute', 'On', 'Purpose'],
      rows: [
        ['`href`', '`<a>`, `<link>`', 'Where the link points'],
        ['`src`', '`<img>`, `<script>`', 'Which file to load'],
        ['`alt`', '`<img>`', 'Text alternative for the image'],
        ['`width` / `height`', '`<img>`', 'Display size in pixels, reserves space'],
        ['`lang`', '`<html>` and any element', 'Language of the content'],
        ['`id` / `class`', 'Any element', 'Unique name / reusable group name'],
        ['`title`', 'Any element', 'Advisory tooltip text'],
        ['`for`', '`<label>`', 'The `id` of the control it labels'],
        ['`type`, `name`', '`<input>`, `<button>`', 'Kind of control; key of the submitted value'],
      ],
    },
    live: { kind: 'html',
      html: `<p id="intro" class="lead highlight" title="Advisory text: hover to see it">
  Hover over this paragraph with the mouse.
</p>
<p lang="es">Hola, bienvenidos al club.</p>
<p><a href="#intro">Back to the intro</a></p>`,
      css: `.highlight { background: #fff3e0; }
.lead { font-size: 1.2em; }` },
    example: '`<img src="crest.png" alt="Riverside FC crest" width="120" height="120">` has four attributes: the file to load, the text alternative, and the size the browser reserves for it. Their order does not matter.',
    mistake: 'Giving the same `id` to several elements (`id="card"` on every card). An `id` must be unique: a fragment link, a `<label for>` or JavaScript expects exactly one match. For a group of similar elements use a class: `class="card"`.' },

  { id: 'nesting-rules', hub: 'syntax', topic: 'syntax', 
    title: 'Nesting and the document tree',
    summary: 'Elements nest inside each other and form a tree; each element must be **closed inside the element that contains it** (never overlapping), and some elements accept only certain children.',
    body: [
      'Nesting works like brackets in maths: `( [ ] )` is fine, `( [ ) ]` is nonsense. In HTML, `<p><strong>Hi</strong></p>` closes the inner element first; `<p><strong>Hi</p></strong>` overlaps and is an error.',
      'The nesting is the **tree** the browser builds (the DOM): `<html>` is the root, `<head>` and `<body>` are its children, and so on. The family words come from this tree: **parent**, **child**, **sibling** (same parent), **descendant** (anywhere inside). [CSS selectors](#/browser/css/combinators) and the [DOM](#/browser/dom) use them constantly.',
      'Some content rules: a `<p>` may contain only text-level (inline) content, never a list, a heading or a `<div>`; `<ul>` and `<ol>` accept only `<li>` children; an `<li>` can contain almost anything, including another list; an `<a>` may wrap block content, but never another link or a button.',
    ],
    live: { kind: 'html',
      html: `<p>This paragraph tries to contain a list:
  <ul>
    <li>The browser closes the paragraph before the list.</li>
  </ul>
</p>
<p>Every real paragraph has an orange border. Count them.</p>`,
      css: `p { border: 2px solid #ff5700; padding: 4px; }` },
    example: 'In `<body><header><h1>Blog</h1><nav>...</nav></header><main>...</main></body>`, `<body>` is the parent of `<header>` and `<main>`, which are siblings; `<h1>` and `<nav>` are children of `<header>` and descendants of `<body>`.',
    mistake: 'Putting a list or a heading inside a `<p>`. The browser ends the paragraph as soon as it meets the `<ul>`, so the list is not inside the paragraph, and the leftover `</p>` creates an extra empty paragraph. The Try-it box shows three bordered paragraphs where the code seems to have two.' },

  /* ---- 3. Headings, text and lists ------------------------------------------------ */
  { id: 'headings', hub: 'text', topic: 'text', 
    title: 'Headings and the outline',
    summary: '`<h1>` to `<h6>` mark headings of six levels; together they form the **outline** (the table of contents) of the page, so the level must follow the structure, not the font size you want.',
    body: [
      'Headings are the table of contents of the page: `<h1>` is the title of the whole page, each `<h2>` a chapter, each `<h3>` a section of the chapter above it. Screen-reader users jump from heading to heading (in most screen readers with the H key) to skim a page, just as sighted users scan the bold titles. Search engines use them to understand the topics.',
      'Two rules of good practice: **one `<h1>` per page** (the page title), and **never skip a level going down**: after an `<h2>` comes an `<h3>`, not an `<h4>`. Going back up is fine (an `<h4>` followed by a new `<h2>`). The validator does not enforce either rule; they are accessibility best practices that keep the outline readable. (The HTML standard itself allows several `<h1>`s; one per page is the common, safest convention, and the one this site follows.)',
      'The size of a heading is only the browser\'s default style, and CSS can change it. So never choose a level because of its size.',
    ],
    live: { kind: 'html',
      html: `<h1>Riverside FC</h1>
<h2>Latest news</h2>
<h3>Match report: Riverside 2-1 Northside</h3>
<h3>New signing announced</h3>
<h2>Upcoming fixtures</h2>
<h3>Home matches</h3>
<h3>Away matches</h3>`,
      css: `h1, h2, h3 { margin: 0.2em 0; }
h2 { margin-left: 1em; }
h3 { margin-left: 2em; font-weight: normal; }` },
    example: 'The outline in the Try-it box reads like a table of contents: page title, two chapters, two sections in each. If "New signing announced" were an `<h4>`, the outline would have a level-4 heading directly under a level-2 one, and a screen-reader user would wonder what was missing.',
    mistake: 'Picking `<h4>` for a subtitle because "it has the right size", or using a bold paragraph as a fake heading. The first breaks the outline; the second is invisible to heading navigation. Choose the level by structure and adjust the size with CSS.',
    practice: { href: '#/browser/html/practice/semantic-outline', label: 'Check an outline in the semantic outline tool' } },

  { id: 'text-elements', hub: 'text', topic: 'text', 
    title: 'Paragraphs and text-level elements',
    summary: 'Running text goes in **paragraphs** (`<p>`); inside a line, text-level elements add meaning: `<strong>` (importance), `<em>` (stress emphasis), `<a>` (link), `<br>` (a line break that belongs to the content).',
    body: [
      'HTML **collapses whitespace**: any run of spaces, tabs and line breaks in your source becomes a single space on screen. The way you lay out the source does not matter; only elements create structure. That is why each paragraph needs its own `<p>` instead of a blank line.',
      '`<strong>` means "this is important" (a warning, a key fact); `<em>` means "stress this word", which can change the meaning of a sentence. Both carry meaning that assistive technology and search engines can use. `<b>` and `<i>` only set text apart without extra importance (a product name, a word in another language) and are rarely what you need.',
      '`<br>` is a line break that is **part of the content**, such as the lines of a postal address or a poem; it is not a spacing tool. `<hr>` marks a change of topic between paragraphs, and `<blockquote>` a quotation from another source.',
    ],
    live: { kind: 'html',
      html: `<p>These     words     are
   far      apart in the source.</p>
<p><strong>Warning:</strong> Saturday's match starts at 18:00,
<em>not</em> at 20:00.</p>
<p>Riverside FC<br>River Road 12<br>28001 Madrid</p>`,
      css: '' },
    example: '"I did **not** say that" and "I did not say **that**" mean different things when spoken; `<em>` marks where the stress goes: `<p>I did not say <em>that</em>.</p>`. A warning that must not be missed is `<strong>`.',
    mistake: 'Using `<br><br><br>` or empty `<p></p>` to create vertical space. They add meaningless empty lines to the content, and the spacing cannot adapt to the screen. Separate the content into proper elements and add space with CSS `margin` (see [the box model](#/browser/css/box-model)).' },

  { id: 'lists', hub: 'text', topic: 'text', 
    title: 'Lists',
    summary: '`<ul>` makes an unordered (bulleted) list and `<ol>` an ordered (numbered) list; each item is an `<li>`. A nested list goes **inside** the `<li>` it belongs to.',
    body: [
      'Choose by asking "would reordering the items change the meaning?". The ingredients of a recipe: no, so `<ul>`. The steps of the recipe or a league table: yes, so `<ol>`. Screen readers announce "list, 5 items", so users know how much is coming.',
      '`<ul>` and `<ol>` accept only `<li>` as direct children; any sub-list goes inside an `<li>`. `<ol>` has two handy attributes: `start="4"` begins counting at 4, and `reversed` counts down.',
      'Navigation menus are lists of links: `<nav><ul><li><a href="...">...</a></li>...</ul></nav>`. CSS later removes the bullets and lays the items in a row, but the meaning ("a list of 5 links") remains. For pairs of terms and descriptions (a glossary, the details of a match) there is the description list: `<dl>` with `<dt>` (term) and `<dd>` (description).',
    ],
    live: { kind: 'html',
      html: `<h2>Squad</h2>
<ul>
  <li>Goalkeepers
    <ul>
      <li>Elena Ruiz</li>
      <li>Marta Gil</li>
    </ul>
  </li>
  <li>Defenders</li>
</ul>
<h2>Countdown to kick-off</h2>
<ol reversed>
  <li>Warm-up</li>
  <li>Team talk</li>
  <li>Kick-off</li>
</ol>`,
      css: '' },
    example: 'A recipe page: the ingredients are a `<ul>` (the order you buy them in does not matter), the method is an `<ol>` (step 3 cannot come before step 1), and the site menu at the top is a `<ul>` of links inside a `<nav>`.',
    mistake: 'Placing a sub-list next to the items instead of inside one: `<ul><li>Goalkeepers</li><ul>...</ul></ul>`. A list may only contain `<li>` children, so the validator reports an error; move the inner `<ul>` inside the `<li>`, before its `</li>`.' },

  /* ---- 4. Semantic HTML ----------------------------------------------------------- */
  { id: 'semantic-why', hub: 'semantic', topic: 'semantic', 
    title: 'Why semantic HTML',
    summary: '**Semantic HTML** means choosing elements whose name says what the content **is** (`<nav>`, `<article>`, `<button>`) instead of generic boxes (`<div>`, `<span>`); it makes pages accessible, understandable to search engines and easier to maintain.',
    body: [
      'Compare a city with street signs to one without. Residents find their way either way, but visitors are lost without the signs. A page built only from `<div class="nav">` looks right to a sighted mouse user, but the meaning lives in a class name that only humans can guess. With `<nav>` the meaning is in the element itself, so every program that reads the page understands it.',
      'Semantics is about meaning, not looks. Browsers give the landmark elements (`<header>`, `<nav>`, `<main>`, `<section>`...) almost no visible style: they are simply block boxes. An unstyled semantic page looks much like an unstyled `<div>` page; the difference is in what machines and people can understand from it.',
    ],
    points: [
      '**Accessibility**: screen readers list landmarks ("navigation", "main") and headings, so users jump straight to what they need. A real `<button>` works with the keyboard for free; a `<div>` made clickable does not.',
      '**SEO** (search engine optimisation): search engines read the title, headings and main content to understand what the page is about. Clear structure helps them; it is not a magic ranking boost.',
      '**Maintainability**: `</article>` tells a teammate what is closing; `</div></div></div>` does not.',
    ],
    code: `<!-- "div soup": works, but means nothing -->
<div class="top">
  <div class="title">Riverside FC</div>
  <div class="menu">...</div>
</div>

<!-- semantic: the same page, with meaning -->
<header>
  <h1>Riverside FC</h1>
  <nav>...</nav>
</header>`,
    dialect: 'HTML',
    example: 'A screen-reader user opens both versions above. On the semantic one they hear "banner landmark, heading level 1, Riverside FC, navigation landmark" and can press a key to jump to the navigation. On the `<div>` version they hear only "Riverside FC" followed by the menu text, with no way to know it is a title or a menu.',
    mistake: 'Using semantic elements as decoration: wrapping every block in `<section>` or every image in `<article>`. Each element is a claim about the content, and a wrong claim misleads as much as none. When no element fits, a `<div>` is the honest choice.' },

  { id: 'landmarks', hub: 'semantic', topic: 'semantic', 
    title: 'The landmark elements',
    summary: 'Landmark elements divide a page into regions: `<header>` (introduction, logo, site navigation), `<nav>` (major navigation links), `<main>` (the unique main content), `<section>` (a themed group with a heading), `<article>` (a self-contained piece), `<aside>` (related but secondary content) and `<footer>` (closing information).',
    body: [
      'Think of a newspaper page: the masthead at the top (`<header>`), the list of sections (`<nav>`), the news area (`<main>`), groups such as "Sport" (`<section>`), each individual story (`<article>`), the "Most read" box at the side (`<aside>`) and the small print at the bottom (`<footer>`).',
      'Rules of thumb. **One** `<main>` per page, never inside `<header>`, `<nav>`, `<article>`, `<aside>` or `<footer>`. A `<section>` should have a heading: if you cannot name it, it is probably a `<div>`. The **article test**: would it still make sense on its own, copied to another site or a news feed? `<header>` and `<footer>` can also appear inside an `<article>` or `<section>` (a post\'s title and date, its author line), not only at page level. `<nav>` is for **major** blocks of navigation, not every group of links.',
    ],
    table: {
      caption: 'Which landmark?',
      head: ['Element', 'Question to ask', 'Example'],
      rows: [
        ['`<header>`', 'Is it the introduction of the page (or of an article)?', 'Logo, site name, main menu'],
        ['`<nav>`', 'Is it a major set of navigation links?', 'Main menu, table of contents'],
        ['`<main>`', 'Is it the content this page exists for?', 'Everything between header and footer'],
        ['`<section>`', 'Is it a themed group I can give a heading to?', '"Upcoming fixtures"'],
        ['`<article>`', 'Would it make sense on its own elsewhere?', 'A match report, a product card, a comment'],
        ['`<aside>`', 'Is it related but could be removed without loss?', 'League table widget, related links'],
        ['`<footer>`', 'Is it closing information?', 'Copyright, contact, legal links'],
      ],
    },
    code: `<body>
  <header>
    <h1>Riverside FC</h1>
    <nav><!-- main menu --></nav>
  </header>
  <main>
    <section>
      <h2>Latest news</h2>
      <article>
        <h3>Riverside 2-1 Northside</h3>
        <p>A late goal sealed the win...</p>
      </article>
    </section>
    <aside>
      <h2>League table</h2>
    </aside>
  </main>
  <footer>© 2026 Riverside FC</footer>
</body>`,
    dialect: 'HTML',
    example: 'In the code above, the match report is an `<article>` (it makes sense on its own, shared on social media), "Latest news" is a `<section>` (a group of reports with a heading), and the league table is an `<aside>` (useful, but the page still works without it). The tool below draws the outline of any page you paste.',
    mistake: 'Choosing between `<section>` and `<article>` by size or position. The question is independence: a match report stands alone, so it is an `<article>`; "Upcoming fixtures" is a themed group with a heading, so it is a `<section>`. An article can contain sections and a section can contain articles.',
    widget: 'semantic-outline',
    practice: { href: '#/browser/html/practice/semantic-outline', label: 'Open the semantic outline tool' } },

  /* ---- 5. Block, inline, div and span --------------------------------------------- */
  { id: 'block-inline', hub: 'layout', topic: 'layout', 
    title: 'Block and inline elements',
    summary: 'By default, **block** elements (`<p>`, `<h1>`, `<ul>`, `<div>`, the landmarks) start on a new line and take the full available width; **inline** elements (`<a>`, `<strong>`, `<em>`, `<span>`, `<img>`) flow inside a line of text and take only the width of their content.',
    body: [
      'Blocks are the paragraphs of a document, stacked one under another; inline elements are the words inside a paragraph. That is why two `<p>` elements always sit on separate lines, while two `<a>` elements sit side by side in a sentence.',
      'This is only the **default display** of each element, and CSS can change it with the `display` property (`block`, `inline`, `inline-block`, and later `flex` and `grid`; see [display and normal flow](#/browser/css/display-flow)). So you still choose elements by meaning: you do not use a `<span>` instead of a `<p>` "to stay on one line"; you change the display with CSS.',
      'Inline elements go inside blocks, not the other way round: `<p>Read the <a href="news.html">latest news</a>.</p>` is right; a `<p>` inside a `<span>` is invalid.',
    ],
    live: { kind: 'html',
      html: `<h2>A block heading</h2>
<p>A block paragraph with an <a href="#">inline link</a>,
<strong>inline strong text</strong> and an <em>inline em</em>.</p>
<p>Another block paragraph: it starts on a new line.</p>
<span>Two spans</span> <span>share one line.</span>`,
      css: `h2, p { outline: 2px solid #1a1f6c; }
a, strong, em, span { outline: 2px dashed #ff5700; }` },
    example: 'In the Try-it box, the solid navy outlines (blocks) stretch across the whole width even when the text is short; the dashed orange outlines (inline) hug their words. Add `display: block;` to the `span` rule and watch the two spans move onto separate lines.',
    mistake: 'Putting a block element inside an inline one, e.g. wrapping a whole card `<div>` in a `<span>`, or an `<h2>` in an `<em>`. Inline elements may contain only text-level content; the browser has to repair the tree and the validator reports an error. (`<a>` is the exception: it may wrap blocks.)' },

  { id: 'div-span', hub: 'layout', topic: 'layout', 
    title: 'div and span: generic containers',
    summary: '`<div>` (block) and `<span>` (inline) are **generic containers with no meaning**: use them to group content for styling or scripting only when no semantic element fits.',
    body: [
      '`<div>` and `<span>` are unlabelled boxes: handy for packing, but they tell nobody what is inside. Reach for them **last**: first ask whether a meaningful element exists (`<nav>`, `<article>`, `<figure>`, `<strong>`, `<time>`...).',
      'Good reasons to use them: a `<div>` wrapper so CSS can arrange cards in a grid (`<div class="card-grid">`); a `<span>` to style or mark part of a sentence that has no special meaning, such as a price `<span class="price">25 €</span>`, or to mark a phrase in another language `<span lang="es">¡Vamos!</span>`. The `class` says what the box is for.',
    ],
    live: { kind: 'html',
      html: `<div class="card-grid">
  <article class="card"><h3>Adult</h3><p>Season ticket: <span class="price">250 €</span></p></article>
  <article class="card"><h3>Junior</h3><p>Season ticket: <span class="price">90 €</span></p></article>
</div>
<p>Our chant: <span lang="es">¡Vamos, Riverside!</span></p>`,
      css: `.card-grid { display: flex; gap: 12px; }
.card { border: 1px solid #ccc; padding: 8px; }
.price { color: #ff5700; font-weight: bold; }` },
    example: 'In the Try-it box each ticket is an `<article>` (it stands on its own), but the wrapper that places them side by side is a `<div>`: it exists only for layout and has no meaning. The prices are `<span>`s because a price is not more important than the text around it; the class is just a styling hook.',
    mistake: '"Divitis": building the whole page from nested `<div>`s with class names such as `header`, `nav` and `main`. It looks identical, but screen readers and search engines see one big anonymous box. Use the landmark elements, and keep `<div>` for pure styling wrappers.' },

  /* ---- 6. Links and images -------------------------------------------------------- */
  { id: 'links-paths', hub: 'links', topic: 'links', 
    title: 'Links and paths',
    summary: 'The `<a>` element makes a link; its `href` is an **absolute URL** (another site), a **relative path** (a file of your own site, found from the current page) or a **fragment** `#id` (a place on a page).',
    body: [
      'A relative path is like directions given from where you stand: "the next door" only makes sense if you know where you are. The browser resolves a relative `href` from the **folder of the current page**. An absolute URL is a full postal address and works from anywhere.',
      'The **link text** should say where the link goes ("See all fixtures"), not "click here": screen-reader users often pull up a list of all the links on a page, out of context. `target="_blank"` opens the link in a new tab; use it sparingly, for example for external documents.',
    ],
    table: {
      caption: 'Kinds of `href`, seen from `index.html` in the site folder',
      head: ['`href`', 'Kind', 'Goes to'],
      rows: [
        ['`https://www.w3.org/`', 'Absolute URL', 'Another site; the scheme `https://` is required'],
        ['`squad.html`', 'Relative, same folder', 'The sibling file `squad.html`'],
        ['`pages/tickets.html`', 'Relative, subfolder', 'Into the `pages` folder first'],
        ['`../index.html`', 'Relative, parent folder', '`..` means one folder up'],
        ['`/index.html`', 'Root-relative', 'From the root of the **server**, not of your folder'],
        ['`#results`', 'Fragment', 'The element with `id="results"` on this page'],
        ['`fixtures.html#results`', 'File + fragment', 'Opens `fixtures.html`, scrolls to `id="results"`'],
        ['`mailto:info@example.com`', 'Another scheme', 'Opens the email program'],
      ],
    },
    points: [
      'File names in paths are **case-sensitive** on most web servers, GitHub Pages included: `Squad.html` and `squad.html` are different files there, even though Windows treats them as the same. Use lowercase names without spaces.',
      'A fragment link needs a target: some element with a matching `id`.',
    ],
    live: { kind: 'html',
      html: `<nav>
  <a href="#news">News</a> ·
  <a href="#fixtures">Fixtures</a>
</nav>
<section id="news"><h2>News</h2><p>Scroll down or use the links.</p></section>
<section id="fixtures"><h2>Fixtures</h2><p>Saturday: Riverside vs Northside.</p></section>`,
      css: `section { min-height: 220px; border-top: 2px solid #1a1f6c; }` },
    example: 'A site with `index.html`, `fixtures.html` and a folder `pages/` containing `tickets.html`. From `index.html`: `href="pages/tickets.html"`. From `pages/tickets.html` back home: `href="../index.html"`. From `index.html` to the results section of the fixtures page: `href="fixtures.html#results"`.',
    mistake: 'Using root-relative paths (`/squad.html`) when opening the files straight from your disk. With `file://`, `/` means the root of the **drive** (e.g. `C:/`), not your project folder, so every link breaks; they only work once the site is served. While you work from local files, use plain relative paths such as `squad.html`.' },

  { id: 'images', hub: 'links', topic: 'links', 
    title: 'Images and alt text',
    summary: '`<img>` embeds an image: `src` is the path of the file, `alt` a text alternative, and `width` and `height` the display size in pixels so the browser can reserve its space before the file arrives.',
    body: [
      'Write the `alt` as if you were describing the page to someone over the phone: say what the image **communicates**, briefly. The alt text is read by screen readers, shown when the image fails to load and used by search engines. For a purely decorative image use an empty `alt=""`, and screen readers skip it. Leaving the attribute out is different, and wrong: some screen readers then read the file name aloud.',
      '`width` and `height` are plain numbers of pixels (`width="320"`, without `px`). They let the browser reserve the right box before the image has downloaded, so the text below does not jump when it arrives. CSS can still resize the image later, keeping its proportions.',
      '`<img>` is a void element (no end tag) and it is inline: it sits in the line of text unless CSS changes it. `src` follows the same path rules as `href`. For an image with a visible caption, wrap it in `<figure>` with a `<figcaption>`.',
    ],
    live: { kind: 'html',
      html: `<p>These files do not exist, so the browser shows the alt text:</p>
<img src="missing-crest.png" alt="Riverside FC crest: a blue shield with a white river" width="220" height="90">
<figure>
  <img src="missing-stadium.jpg" alt="Riverside Park full of fans on match day" width="220" height="90">
  <figcaption>Riverside Park, opened in 1974.</figcaption>
</figure>`,
      css: `img { border: 1px dashed #888; }` },
    example: 'For the club crest, `alt="Riverside FC crest: a blue shield with a white river"` gives the information. If the crest is also the link to the homepage, describe the destination instead: `alt="Riverside FC home"`. A decorative wave graphic between sections gets `alt=""`.',
    mistake: 'Writing `alt="image"`, `alt="photo of..."` or the file name. Screen readers already say "image"; the alt must carry the information the picture gives. For a chart, that may be its conclusion: "Season ticket sales doubled between 2023 and 2025".' },

  /* ---- 7. Tables ------------------------------------------------------------------ */
  { id: 'tables', hub: 'tables', topic: 'tables', 
    title: 'Tables for tabular data',
    summary: 'A **table** shows data organised in rows and columns: `<table>` contains rows (`<tr>`) of header cells (`<th>`) and data cells (`<td>`), with an optional `<caption>` and the groups `<thead>` and `<tbody>`.',
    body: [
      'Use a table only when the data really has two dimensions: each row is one record (a match, a product) and each column one property (date, opponent, result). The test: would it make sense in a spreadsheet? Tables were once used to lay out whole pages, before CSS could; that is now wrong, because screen readers announce "table, 3 columns, 4 rows" and read the layout cell by cell.',
      '`<th>` cells are headers; `scope="col"` or `scope="row"` says whether a header belongs to a column or a row, so a screen reader can say "Opponent: Northside United" instead of reading a bare cell. `<caption>` is the title of the table. `<thead>` groups the header rows and `<tbody>` the data rows. `colspan="2"` and `rowspan="2"` make a cell span several columns or rows.',
    ],
    live: { kind: 'html',
      html: `<table>
  <caption>Upcoming fixtures</caption>
  <thead>
    <tr><th scope="col">Date</th><th scope="col">Opponent</th><th scope="col">Venue</th></tr>
  </thead>
  <tbody>
    <tr><td>12 Oct</td><td>Northside United</td><td>Home</td></tr>
    <tr><td>19 Oct</td><td>Eastfield Town</td><td>Away</td></tr>
  </tbody>
</table>`,
      css: `table { border-collapse: collapse; }
th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; }
caption { font-weight: bold; margin-bottom: 4px; }` },
    example: 'A fixtures list has a date, an opponent and a venue for each match: a table. A squad list with only names is a list (`<ul>`), not a one-column table. A "logo on the left, menu on the right" header is layout, which is CSS.',
    mistake: 'Making header cells with bold `<td>`s, or using a table to put things side by side. Bold data cells look like headers but are not headers for assistive technology; side-by-side placement is layout, done with CSS [Flexbox](#/browser/css/flex-axes) and [Grid](#/browser/css/grid-tracks).' },

  /* ---- 8. Forms ------------------------------------------------------------------- */
  { id: 'forms-basics', hub: 'forms', topic: 'forms', 
    title: 'Forms: labels, inputs, names and buttons',
    summary: 'A `<form>` groups controls whose values are sent together: each `<input>` needs a `<label>` (linked by `for` = the input\'s `id`) and a `name` (the key its value is sent under), and a `<button type="submit">` sends the form.',
    body: [
      'A web form is a paper form turned digital. Each **label** is the printed question, each **input** the box you write in, the **name** is the field code the office uses when it types your answers into its system, and the **submit button** is handing the form in. On submit the browser sends `name=value` pairs, e.g. `email=ana%40example.com&remember=on`.',
      'The `<label>` matters for everyone: clicking it focuses its input (a bigger target on a phone), and screen readers read it when the input gets focus. Link them with `for` and `id` (`<label for="email">` + `<input id="email">`) or put the input inside the label. A `placeholder` is not a label: it disappears as soon as the user types.',
      'The `type` of an input changes its behaviour and the phone keyboard: `text`, `email` (checks the format, shows an @ key), `password` (hides the characters), `number`, `date`, `checkbox`, `radio`. A `<button>` inside a form is a **submit** button by default, so always write `type="submit"` or `type="button"`.',
      'Submitting sends an HTTP **request** (see [Inside an HTTP request](#/http/web/http-request)) to the URL in `action`, which by default is **the current page**, using the method in `method`: `get` by default (the values go in the query string of the URL) or `post` (the values go in the request body). Inputs without a `name` are not sent at all. On a real site, `action` points to a server route (for example an Express route) that checks the data.',
    ],
    live: { kind: 'html',
      html: `<form method="post">
  <p>
    <label for="email">Email</label>
    <input type="email" id="email" name="email" autocomplete="email">
  </p>
  <p>
    <label for="password">Password</label>
    <input type="password" id="password" name="password">
  </p>
  <p>
    <input type="checkbox" id="remember" name="remember">
    <label for="remember">Remember me</label>
  </p>
  <button type="submit">Sign in</button>
</form>`,
      css: `label { display: inline-block; min-width: 6em; }` },
    example: 'Click the word "Password" in the Try-it box: the cursor jumps into the password field, because the label is linked to it. If this form used the default `get` method and was submitted, the browser would load `login.html?email=ana%40example.com&password=s3cret%21`: the password would be visible in the address bar and saved in the history. That is why a login form uses `method="post"`.',
    mistake: 'Believing a form without `action` "does nothing" when submitted. It **reloads the current page**, and with the default `get` method every named field, the password included, is appended to the URL. Before there is a server, give login forms `method="post"` and expect the page to reload.' },

  { id: 'form-validation', hub: 'forms', topic: 'forms', 
    title: 'Built-in form validation',
    summary: 'HTML can check values before a form is sent: `required`, `minlength`/`maxlength`, `min`/`max`, `pattern` and typed inputs such as `type="email"` make the browser block the submission and show a message.',
    body: [
      'Built-in validation is a spell-checker for forms: it catches obvious slips (an empty field, a malformed email, a short password) immediately, without JavaScript and without a round trip to the server.',
      'When the user submits, the browser checks every control. If one fails, nothing is sent, the first invalid field gets the focus and a message appears next to it. CSS can style fields with the `:valid` and `:invalid` pseudo-classes, and `novalidate` on the `<form>` switches the checks off.',
      'Client-side validation is for **convenience, not security**. Anyone can delete `required` in DevTools or send the request without using your form at all, so the server must validate everything again (see [Front end and back end](#/http/web/frontend-backend)).',
    ],
    points: [
      '`required`: the field cannot be empty (a boolean attribute).',
      '`minlength="8"` / `maxlength="64"`: limits on the number of characters of text.',
      '`min="1"` / `max="10"`: limits on numbers and dates.',
      '`pattern="[0-9]{5}"`: the value must match this regular expression (here, exactly five digits).',
      '`type="email"`, `type="url"`, `type="number"`: the value must have that format.',
    ],
    live: { kind: 'html',
      html: `<form>
  <p><label for="em">Email</label>
     <input type="email" id="em" name="email" required></p>
  <p><label for="pw">Password (8+ characters)</label>
     <input type="password" id="pw" name="password" required minlength="8"></p>
  <p><label for="pc">Postcode (5 digits)</label>
     <input id="pc" name="postcode" pattern="[0-9]{5}"></p>
  <button type="submit">Send</button>
</form>`,
      css: `input:invalid { border: 2px solid #b94100; }
input:valid { border: 2px solid #1f6b58; }` },
    example: 'In the Try-it box the empty required fields start red. Type `abc` as the password: it stays red because of `minlength="8"`; at the eighth character it turns green. The postcode is green while empty (it is not required) and red as soon as you type a letter.',
    mistake: 'Treating `required` and `type="email"` as protection. They improve the experience, but a user can remove them in DevTools in seconds and a tool like `curl` ignores them completely. Real validation always happens on the server.' },

  /* ---- 9. Validate and inspect ---------------------------------------------------- */
  { id: 'validate-inspect', hub: 'tools', topic: 'tools', 
    title: 'Validate and inspect',
    summary: 'The **W3C Markup Validator** checks your HTML against the rules of the standard and lists its errors; the browser **DevTools** (Elements tab) show the DOM the browser actually built from it.',
    body: [
      'Browsers are forgiving: they repair broken HTML silently, so "it displays fine" proves very little. The validator is the strict proofreader; DevTools show the result of the browser\'s repairs. Use both: validate to find mistakes, inspect to see their effect.',
      'Validator: open `validator.w3.org`, choose **Validate by Direct Input** (or upload the file), paste the whole document and check it. **Errors** break the rules (overlapping tags, an `<li>` outside a list, a missing `<title>`, a duplicate `id`, an `<img>` without `alt`) and must be fixed. **Warnings** are advice (e.g. a `<section>` without a heading) worth reading. Fix the **first** error first: one missing end tag can cause a cascade of follow-up errors.',
      'DevTools: right-click an element and choose **Inspect**, or press F12 (Ctrl+Shift+I, Cmd+Opt+I on macOS). The **Elements** tab shows the live DOM tree; hovering a node highlights it on the page; double-clicking edits it temporarily (a reload restores the file). **View source** (Ctrl+U) shows the file exactly as it arrived.',
    ],
    example: 'A page has `<p>Intro <ul><li>One</li></ul></p>`. The validator reports "No p element in scope but a p end tag seen". In the Elements tab you see why: the browser closed the paragraph before the list and turned the stray `</p>` into an extra empty `<p></p>`.',
    mistake: 'Taking the Elements tab as a copy of your file. It shows the **repaired, live** DOM: missing end tags appear "fixed", and a `<tbody>` appears in every table even if you never wrote one. To see what you really wrote, use View source or your editor, and run the validator.' },
];

DATA.en.HTML_QUIZ = [
  /* document */
  { type: 'mc', topic: 'document',
    q: 'A page has no `<!DOCTYPE html>` line. What is the main consequence?',
    choices: ['The browser renders it in quirks mode, imitating old browser behaviour', 'The page does not load at all', 'JavaScript is disabled', 'The `<head>` is ignored'],
    answer: 0,
    why: 'The doctype switches on **standards mode**; without it browsers fall back to quirks mode and some CSS behaves like in very old browsers.' },
  { type: 'mc', topic: 'document',
    q: 'Accented letters on your page appear as "EspaÃ±a". Which line most likely fixes it?',
    choices: ['`<html lang="es">`', '`<meta name="description" content="España">`', '`<title>España</title>`', '`<meta charset="utf-8">` at the start of the `<head>`'],
    answer: 3,
    why: 'The browser needs the character encoding before reading the text; UTF-8 covers accents and every alphabet.' },
  { type: 'mc', topic: 'document',
    q: 'On a phone, your page appears tiny and zoomed out, as if it were a desktop page. What is missing?',
    choices: ['`<meta name="viewport" content="width=device-width, initial-scale=1">`', '`<html lang="en">`', 'A `<main>` element', 'The `width` attribute on `<body>`'],
    answer: 0,
    why: 'Without the viewport meta, mobile browsers lay the page out at about 980 px and shrink it.' },
  { type: 'tf', topic: 'document',
    q: 'Only the content of the `<body>` is displayed in the browser window; the `<head>` holds information about the page.',
    answer: true,
    why: 'The head holds metadata: encoding, viewport, title, links to CSS and scripts.' },

  /* syntax */
  { type: 'mc', topic: 'syntax',
    q: 'In `<a href="news.html">Latest news</a>`, what is the **element**?',
    choices: ['Only `<a href="news.html">`', 'Only `Latest news`', 'Only `href="news.html"`', 'The start tag, the content and the end tag together'],
    answer: 3,
    why: 'Tags are the markers; the element is everything from the start tag to the end tag.' },
  { type: 'fib', topic: 'syntax',
    q: 'Elements such as `<br>`, `<img>` and `<input>`, which cannot have content and have no end tag, are called ___ elements.',
    accept: ['void', 'empty'],
    why: 'They are called **void** (or empty) elements.' },
  { type: 'mc', topic: 'syntax',
    q: 'A developer writes `<input type="text" required="false">`. What happens?',
    choices: ['The field is still required, because `required` is a boolean attribute', 'The field is optional', 'The browser shows an error message on load', 'The input is disabled'],
    answer: 0,
    why: 'For boolean attributes, **presence** means true, whatever the value. To make the field optional, remove the attribute.' },
  { type: 'mc', topic: 'syntax',
    q: 'Six product cards must share the same style. Which attribute should they share?',
    choices: ['`id="card"` on each one', '`name="card"` on each one', '`title="card"` on each one', '`class="card"` on each one'],
    answer: 3,
    why: 'An `id` must be unique in the page; a `class` is a reusable group name.' },
  { type: 'mc', topic: 'syntax',
    q: 'Which snippet is correctly nested?',
    choices: ['`<p><em>Hello</p></em>`', '`<em><p>Hello</p></em>`', '`<p><em>Hello</em></p>`', '`<ul><p>Hello</p></ul>`'],
    answer: 2,
    why: 'The inner element closes first, inline goes inside block, and a list accepts only `<li>` children.' },
  { type: 'mc', topic: 'syntax',
    q: 'You write `<p>Our services: <ul><li>Coaching</li></ul></p>`. What does the browser build?',
    choices: ['A paragraph that contains the list', 'A paragraph that ends before the list, the list, and an extra empty paragraph', 'Nothing: the page fails to load', 'The list only; the paragraph text is deleted'],
    answer: 1,
    why: 'A `<p>` cannot contain a list, so the browser closes it at `<ul>`; the stray `</p>` becomes an empty paragraph.' },
  { type: 'tf', topic: 'syntax',
    q: 'Text inside an HTML comment `<!-- ... -->` is hidden from everybody, so it is a safe place for a password.',
    answer: false,
    why: 'Comments are not displayed, but anyone can read them with View source.' },

  /* text */
  { type: 'tf', topic: 'text',
    q: 'Going from an `<h4>` back up to a new `<h2>` breaks the heading rules.',
    answer: false,
    why: 'Only skipping levels **downwards** breaks the outline; returning to a higher level starts a new chapter.' },
  { type: 'mc', topic: 'text',
    q: 'Under the page title you want a short tagline in smaller text: "Founded 1974". What is the best markup?',
    choices: ['`<h4>` because it is small', '`<h6>` because it is the smallest', 'A `<p>`, made smaller with CSS if needed', 'A second `<h1>`'],
    answer: 2,
    why: 'A tagline is not the heading of a section, so it is not a heading at all. The size is CSS.' },
  { type: 'mc', topic: 'text',
    q: 'In the source, two words are separated by five spaces and a line break. What does the browser show between them?',
    choices: ['Five spaces and a line break', 'Nothing: the words touch', 'One space', 'A line break only'],
    answer: 2,
    why: 'HTML collapses any run of whitespace into a single space.' },
  { type: 'mc', topic: 'text',
    q: 'Which element marks "Payment is non-refundable" as **important** content?',
    choices: ['`<b>`', '`<i>`', '`<em>`', '`<strong>`'],
    answer: 3,
    why: '`<strong>` = importance; `<em>` = stress emphasis; `<b>` and `<i>` add no meaning of importance.' },
  { type: 'mc', topic: 'text',
    q: 'Which content should be an **ordered** list (`<ol>`)?',
    choices: ['The steps to install a program', 'The ingredients of a salad', 'The links of a footer', 'The tags of a blog post'],
    answer: 0,
    why: 'Use `<ol>` when changing the order would change the meaning.' },
  { type: 'mc', topic: 'text',
    q: 'Where does a nested sub-list go?',
    choices: ['Directly inside the outer `<ul>`, between two `<li>`s', 'Inside the `<li>` it belongs to', 'After the closing `</ul>`', 'Inside a `<p>` within the `<ul>`'],
    answer: 1,
    why: '`<ul>` and `<ol>` accept only `<li>` children; the sub-list goes inside an item.' },

  /* semantic */
  { type: 'mc', topic: 'semantic',
    q: 'Which is a real benefit of semantic landmarks?',
    choices: ['They make the page download faster', 'They replace the need for CSS', 'They give the page a modern visual design automatically', 'Screen-reader users can jump directly to regions such as navigation and main content'],
    answer: 3,
    why: 'Landmarks carry meaning for assistive technology; browsers give them almost no visual style.' },
  { type: 'tf', topic: 'semantic',
    q: 'A `<header>` element can only be used once per page, at the very top.',
    answer: false,
    why: '`<header>` (and `<footer>`) can also introduce or close an `<article>` or `<section>`, e.g. a post title and its date.' },
  { type: 'mc', topic: 'semantic',
    q: 'You need a wrapper only so CSS can centre the content and limit its width. Which element?',
    choices: ['`<section>`', '`<article>`', '`<div>`', '`<main>` inside each section'],
    answer: 2,
    why: 'A box with no meaning, used only for styling, is a `<div>`. A `<section>` claims a themed group with a heading.' },
  { type: 'mc', topic: 'semantic',
    q: 'A product page lists "Customer reviews"; each review has an author, a date and a text. Which structure fits best?',
    choices: ['A `<section>` with a heading, containing one `<article>` per review', 'One `<article>` containing `<section>`s for author, date and text', 'An `<aside>` for each review', 'A `<nav>` containing the reviews'],
    answer: 0,
    why: 'Each review stands on its own (article test); the group with a heading is a section.' },
  { type: 'fib', topic: 'semantic',
    q: 'The landmark element for a block of major navigation links is `<___>`.',
    accept: ['nav', '<nav>'],
    why: '`<nav>` is for **major** navigation blocks, not for every group of links.' },

  /* layout */
  { type: 'mc', topic: 'layout',
    q: 'Which pair contains **two block** elements by default?',
    choices: ['`<p>` and `<ul>`', '`<a>` and `<span>`', '`<strong>` and `<img>`', '`<em>` and `<p>`'],
    answer: 0,
    why: '`<p>` and `<ul>` start on a new line and take the full width; `<a>`, `<span>`, `<strong>`, `<em>` and `<img>` are inline.' },
  { type: 'tf', topic: 'layout',
    q: 'To keep two paragraphs on the same line you should write them as `<span>`s instead of `<p>`s.',
    answer: false,
    why: 'Choose elements by meaning; change how they are displayed with CSS (`display`).' },
  { type: 'mc', topic: 'layout',
    q: 'In "Tickets from **25 €**" the price must be orange, but it is not more important than the surrounding text. Which markup fits?',
    choices: ['`<strong class="price">25 €</strong>`', '`<div class="price">25 €</div>`', '`<span class="price">25 €</span>`', '`<h3 class="price">25 €</h3>`'],
    answer: 2,
    why: 'A `<span>` is a meaningless inline hook for styling; `<div>` would break the line and `<strong>` would claim importance.' },

  /* links */
  { type: 'mc', topic: 'links',
    q: 'The current page is `pages/tickets.html`. Which `href` reaches `index.html`, which is in the folder **above** `pages`?',
    choices: ['`index.html`', '`pages/index.html`', '`../index.html`', '`#index`'],
    answer: 2,
    why: '`..` means "one folder up" from the folder of the current page.' },
  { type: 'tf', topic: 'links',
    q: 'When you open your files directly from the disk (`file://`), `href="/squad.html"` works exactly like `href="squad.html"`.',
    answer: false,
    why: 'A leading `/` starts at the root of the drive (or server), not at your project folder.' },
  { type: 'mc', topic: 'links',
    q: 'Which link text is best for accessibility?',
    choices: ['`Click here`', '`Read more`', '`See all fixtures for October`', '`Link`'],
    answer: 2,
    why: 'Screen-reader users often list links out of context; the text must say where the link goes.' },
  { type: 'mc', topic: 'links',
    q: 'A decorative wave graphic separates two sections and carries no information. Which `alt` is correct?',
    choices: ['No `alt` attribute at all', '`alt=""`', '`alt="image"`', '`alt="wave.svg"`'],
    answer: 1,
    why: 'An empty `alt` tells screen readers to skip the image; a missing `alt` may make them read the file name.' },
  { type: 'mc', topic: 'links',
    q: 'Which `<img>` attribute value is written correctly?',
    choices: ['`width="320px"`', '`width=320 px`', '`width="320"`', '`width: 320`'],
    answer: 2,
    why: 'In HTML, `width` and `height` are plain numbers of pixels, without a unit.' },
  { type: 'tf', topic: 'links',
    q: 'On GitHub Pages, `href="Squad.html"` and a file named `squad.html` match, because file names are not case-sensitive.',
    answer: false,
    why: 'Most web servers, GitHub Pages included, treat file names as case-sensitive, even though Windows does not.' },

  /* tables */
  { type: 'mc', topic: 'tables',
    q: 'Which content should be marked up as a `<table>`?',
    choices: ['A logo on the left and a menu on the right', 'Three cards placed side by side', 'A list of player names', 'The results of each match: date, opponent and score'],
    answer: 3,
    why: 'Tables are for data with rows (records) and columns (properties); placement is CSS layout.' },
  { type: 'fib', topic: 'tables',
    q: 'A header cell of a table is written with the element `<___>`.',
    accept: ['th', '<th>'],
    why: '`<th>` is a header cell (add `scope="col"` or `scope="row"`); `<td>` is a data cell.' },

  /* forms */
  { type: 'mc', topic: 'forms',
    q: 'A form has `<input type="email" id="email">` with no `name` attribute. What happens to its value on submit?',
    choices: ['It is sent under the key `email` (taken from the `id`)', 'It is sent under the key `input`', 'It is not sent at all', 'The form refuses to submit'],
    answer: 2,
    why: 'Only controls with a `name` are submitted; the `name` is the key of the value.' },
  { type: 'mc', topic: 'forms',
    q: 'A form has no `action` and no `method`. The user fills in "ana" in a field named `user` and submits. What happens?',
    choices: ['Nothing happens', 'The browser shows an error because `action` is missing', 'The value is saved in the HTML file', 'The current page reloads with `?user=ana` added to its URL'],
    answer: 3,
    why: 'The default `action` is the current page and the default `method` is `get`, which puts the values in the query string.' },
  { type: 'tf', topic: 'forms',
    q: 'A `placeholder` text can replace the `<label>` of an input.',
    answer: false,
    why: 'The placeholder disappears when the user types and is not a reliable label for screen readers.' },
  { type: 'mc', topic: 'forms',
    q: 'A "Show password" `<button>` inside a login form unexpectedly submits the form. What is the fix?',
    choices: ['Add `type="button"` to it', 'Move it into the `<head>`', 'Add `required` to it', 'Change it to `<input type="submit">`'],
    answer: 0,
    why: 'Inside a form, a `<button>` is a submit button by default; `type="button"` makes it an ordinary button.' },
  { type: 'fib', topic: 'forms',
    q: 'To accept only values that match a regular expression, such as exactly five digits, add the ___ attribute to the input.',
    accept: ['pattern'],
    why: '`pattern="[0-9]{5}"` makes the browser reject anything that is not five digits.' },
  { type: 'tf', topic: 'forms',
    q: 'If the email input has `required` and `type="email"`, the server no longer needs to check the email.',
    answer: false,
    why: 'Browser validation is a convenience: it can be removed in DevTools or bypassed with tools like `curl`. The server must validate again.' },

  /* tools */
  { type: 'tf', topic: 'tools',
    q: 'If a page displays correctly in the browser, its HTML has no errors.',
    answer: false,
    why: 'Browsers repair broken markup silently; only a validator tells you whether the HTML follows the rules.' },
  { type: 'mc', topic: 'tools',
    q: 'The Elements tab shows a `<tbody>` in your table, but your file has none. Why?',
    choices: ['DevTools adds random elements', 'Your editor saved it secretly', 'The Elements tab shows the DOM the browser built, which adds `<tbody>` automatically', 'The validator inserted it'],
    answer: 2,
    why: 'Elements shows the live, repaired DOM; View source shows your file as it arrived.' },
  { type: 'mc', topic: 'tools',
    q: 'The validator lists 14 errors, starting with a missing end tag on line 20. What is the best strategy?',
    choices: ['Fix the first error and validate again', 'Fix the last error first', 'Ignore them: the page looks fine', 'Delete line 20'],
    answer: 0,
    why: 'One structural error often causes many follow-up errors; fixing the first may make the rest disappear.' },
];
