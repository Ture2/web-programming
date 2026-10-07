'use strict';
/* HTML: concept cards, rail groups and self-check quiz (elements and attributes, the document,
   headings and text, semantic landmarks, links, images, tables and forms). Cards explain with
   `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js). `hub` and `topic`
   keys match HTML_QUIZ_TOPICS and HTML_GROUPS. */

DATA.en.HTML_QUIZ_TOPICS = {
  syntax: 'Elements, attributes and nesting',
  document: 'Document structure',
  text: 'Headings, text and lists',
  semantic: 'Semantic landmarks',
  layout: 'Block, inline, div and span',
  links: 'Links, paths and images',
  tables: 'Tables',
  forms: 'Forms',
  tools: 'Validation and DevTools',
};

DATA.en.HTML_GROUPS = [
  { key: 'syntax', label: 'Elements and attributes', icon: 'code' },
  { key: 'document', label: 'The document', icon: 'files' },
  { key: 'text', label: 'Headings, text and lists', icon: 'levels' },
  { key: 'semantic', label: 'Semantic HTML', icon: 'index' },
  { key: 'layout', label: 'Block, inline, div, span', icon: 'split' },
  { key: 'links', label: 'Links and images', icon: 'link' },
  { key: 'tables', label: 'Tables', icon: 'table' },
  { key: 'forms', label: 'Forms', icon: 'forms' },
  { key: 'tools', label: 'Validate and inspect', icon: 'special' },
];

DATA.en.HTML_CONCEPTS = [
  /* ---- 1. Elements and attributes ------------------------------------------------------ */
  { id: 'what-is-html', hub: 'syntax', topic: 'syntax',
    title: 'What HTML is for',
    summary: '**HTML** (HyperText Markup Language) describes the **structure and meaning** of a page: it marks each piece of content as a heading, a paragraph, a list, a link and so on.',
    html: [
      '<p>HTML labels content; it does not paint it. <code>&lt;h1&gt;</code> says "this is the main heading of the page", and CSS later decides its font and colour. Because the meaning is explicit, browsers, search engines, your teammates and <strong>screen readers</strong> (programs that read the page aloud for people who cannot see the screen) all understand the page.</p>',
      '<ul><li><strong>Markup:</strong> plain text with <strong>tags</strong> in angle brackets around the content (see <a href="#/browser/html/elements-tags">Elements, tags and comments</a>).</li>'
        + '<li><strong>Hypertext:</strong> text with links to other documents. The <code>&lt;a&gt;</code> element is what turns separate pages into a web.</li>'
        + '<li><strong>Not a programming language:</strong> no variables, conditions or loops. Looks come from <a href="#/browser/css">CSS</a> and behaviour from <a href="#/browser/js">JavaScript</a> (see <a href="#/http/web/course-map">How it all fits together</a>).</li>'
        + '<li><strong>What the browser does with it:</strong> downloads the file, builds a tree of elements from it and shows it with built-in default styles (see <a href="#/http/web/rendering-pipeline">how the browser renders</a>).</li></ul>',
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

  { id: 'elements-tags', hub: 'syntax', topic: 'syntax',
    title: 'Elements, tags and comments',
    summary: 'An **element** is a start tag, its content and an end tag (`<p>Hello</p>`); the **tags** are only the markers in angle brackets.',
    html: [
      '<p>Tags work like brackets: the start tag opens a region, the end tag (with a <code>/</code>) closes it, and everything in between is the content the element describes. The element is the whole thing, even though people often say "tag" for both.</p>',
      '<dl><dt>Void elements</dt><dd>No content and no end tag: <code>&lt;br&gt;</code>, <code>&lt;img&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;meta&gt;</code>, <code>&lt;link&gt;</code>, <code>&lt;hr&gt;</code>. Older code writes <code>&lt;br /&gt;</code>; in HTML that final slash is allowed but ignored.</dd>'
        + '<dt>Comments</dt><dd><code>&lt;!-- … --&gt;</code> are notes for people. The browser does not display them, but anyone can read them with View source, so never put passwords or private notes there.</dd>'
        + '<dt>Letter case</dt><dd>Tag names are not case-sensitive (<code>&lt;P&gt;</code> works like <code>&lt;p&gt;</code>), but always write lowercase.</dd></dl>',
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
    html: [
      '<p>Attributes are the settings of an element: <code>&lt;a&gt;</code> means "a link" and <code>href</code> says where it goes. Many elements do nothing useful without theirs: an <code>&lt;a&gt;</code> without <code>href</code> is not a working link. Always put values in double quotes, because an unquoted value breaks at its first space.</p>',
      '<table><caption>Attributes you will use on your first pages</caption><thead><tr><th scope="col">Attribute</th><th scope="col">On</th><th scope="col">Purpose</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>href</code></th><td><code>&lt;a&gt;</code>, <code>&lt;link&gt;</code></td><td>Where the link points (see <a href="#/browser/html/links-paths">Links and paths</a>)</td></tr>'
        + '<tr><th scope="row"><code>src</code></th><td><code>&lt;img&gt;</code>, <code>&lt;script&gt;</code></td><td>Which file to load</td></tr>'
        + '<tr><th scope="row"><code>alt</code></th><td><code>&lt;img&gt;</code></td><td>Text alternative for the image</td></tr>'
        + '<tr><th scope="row"><code>width</code>, <code>height</code></th><td><code>&lt;img&gt;</code></td><td>Display size in pixels; reserves the space</td></tr>'
        + '<tr><th scope="row"><code>lang</code></th><td>Any element</td><td>Language of the content</td></tr>'
        + '<tr><th scope="row"><code>title</code></th><td>Any element</td><td>Advisory tooltip text</td></tr>'
        + '</tbody></table>',
      '<h3>id or class</h3>',
      '<ul><li><strong><code>id</code> is unique:</strong> exactly one element per page has it. Fragment links (<code>href="#intro"</code>), form labels (see <a href="#/browser/html/form-controls">Form controls</a>) and JavaScript all expect one match.</li>'
        + '<li><strong><code>class</code> is a group:</strong> any number of elements share it, and one element can have several, separated by spaces (<code>class="lead highlight"</code>). CSS selects groups by it (see <a href="#/browser/css/basic-selectors">CSS selectors</a>).</li></ul>',
      '<p><strong>Boolean attributes</strong> mean "true" by their mere presence: <code>&lt;input required&gt;</code> is required, and so is <code>&lt;input required="false"&gt;</code>; to switch one off, remove it. The <code>title</code> tooltip appears only on mouse hover, so keyboard and touch users never see it: keep essential information out of it. Avoid inline <code>style</code> (see <a href="#/browser/css/cascade">the cascade</a> for why).</p>',
    ],
    live: { kind: 'html',
      html: `<p id="intro" class="lead highlight" title="Advisory text: hover to see it">
  Hover over this paragraph with the mouse.
</p>
<p lang="es">Hola, bienvenidos al club.</p>
<p><a href="#intro">Back to the intro</a></p>`,
      css: `.highlight { background: #fff3e0; }
.lead { font-size: 1.2em; }` },
    example: '`<img src="crest.png" alt="Riverside FC crest" width="120" height="120">` has four attributes: the file to load, the text alternative, and the size the browser reserves for it. Their order does not matter.',
    mistake: 'Giving the same `id` to several elements (`id="card"` on every card). An `id` must be unique: a fragment link, a form label or JavaScript expects exactly one match. For a group of similar elements use a class: `class="card"`.' },

  { id: 'nesting-rules', hub: 'syntax', topic: 'syntax',
    title: 'Nesting and the document tree',
    summary: 'Elements nest inside each other and form a **tree**; each element must be closed inside the element that contains it, never overlapping.',
    html: [
      '<p>Nesting works like brackets in maths: <code>( [ ] )</code> is fine, <code>( [ ) ]</code> is nonsense. <code>&lt;p&gt;&lt;strong&gt;Hi&lt;/strong&gt;&lt;/p&gt;</code> closes the inner element first; <code>&lt;p&gt;&lt;strong&gt;Hi&lt;/p&gt;&lt;/strong&gt;</code> overlaps and is an error.</p>',
      '<dl><dt>Parent</dt><dd>The element that directly contains another: the <code>&lt;ul&gt;</code> is the parent of each <code>&lt;li&gt;</code>.</dd>'
        + '<dt>Child</dt><dd>An element directly inside another.</dd>'
        + '<dt>Siblings</dt><dd>Children of the same parent: the two <code>&lt;li&gt;</code> elements.</dd>'
        + '<dt>Descendant</dt><dd>Anything inside, at any depth: each <code>&lt;a&gt;</code> is a descendant of the <code>&lt;ul&gt;</code>.</dd></dl>',
      '<p>The browser builds this tree, the <strong>DOM</strong>, and CSS (<a href="#/browser/css/combinators">combinators</a>) and JavaScript (<a href="#/browser/dom">DOM and events</a>) use these family words constantly. Some elements accept only certain children: <code>&lt;ul&gt;</code> and <code>&lt;ol&gt;</code> only <code>&lt;li&gt;</code>, and a <code>&lt;p&gt;</code> cannot contain a list or a heading (the full rule is in <a href="#/browser/html/block-inline">Block and inline elements</a>).</p>',
    ],
    diagram: {
      kind: 'tree',
      title: 'Every element has exactly one parent: the nesting is a tree.',
      desc: 'A ul element is the parent of two li elements, which are siblings. Each li contains an a element, which is its child and a descendant of the ul.',
      nodes: [
        { id: 'ul', label: '`<ul>`', note: 'the parent', key: true },
        { id: 'li1', label: '`<li>`', note: 'child, sibling' },
        { id: 'li2', label: '`<li>`', note: 'child, sibling' },
        { id: 'a1', label: '`<a>`', note: 'a descendant' },
        { id: 'a2', label: '`<a>`', note: 'a descendant' },
      ],
      edges: [['ul', 'li1'], ['ul', 'li2'], ['li1', 'a1'], ['li2', 'a2']],
    },
    live: { kind: 'html',
      html: `<p>This paragraph tries to contain a list:
  <ul>
    <li>The browser closes the paragraph before the list.</li>
  </ul>
</p>
<p>Every real paragraph has an orange border. Count them.</p>`,
      css: `p { border: 2px solid #ff5700; padding: 4px; }` },
    example: 'In `<p>Read the <a href="news.html"><strong>latest</strong> news</a>.</p>`, the `<p>` is the parent of the `<a>`, the `<a>` is the parent of the `<strong>`, and the `<strong>` is a descendant of the `<p>` two levels down.',
    mistake: 'Putting a list or a heading inside a `<p>`. The browser ends the paragraph as soon as it meets the `<ul>`, so the list is not inside the paragraph, and the leftover `</p>` creates an extra empty paragraph. The Try-it box shows three bordered paragraphs where the code seems to have two.' },

  /* ---- 2. The document ----------------------------------------------------------------- */
  { id: 'document-skeleton', hub: 'document', topic: 'document',
    title: 'The document skeleton',
    summary: 'Every HTML page starts with `<!DOCTYPE html>` and has one `<html>` element containing a `<head>` (information about the page) and a `<body>` (the content shown in the window).',
    html: [
      '<p>Only what is inside <code>&lt;body&gt;</code> appears in the window. The <code>&lt;head&gt;</code> holds information <strong>about</strong> the page: its title, its character set, the files it needs (see <a href="#/browser/html/head-metadata">What goes in the head</a>).</p>',
      '<dl><dt><code>&lt;!DOCTYPE html&gt;</code></dt><dd>A declaration, not an element: "this is modern HTML, use <strong>standards mode</strong>". Without it, browsers switch to <strong>quirks mode</strong>, imitating the bugs of 1990s browsers, and some CSS behaves differently. It comes first in the file; only comments and blank lines may precede it.</dd>'
        + '<dt><code>&lt;html lang="en"&gt;</code></dt><dd>The language of the content. Screen readers pick their pronunciation from it, browsers offer translation, and search engines show the page to the right audience. Use <code>lang="es"</code> for a page in Spanish.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'One root, two children: information about the page, and the page itself.',
      desc: 'The html element is the root of every page. It has two children: head, which holds information about the page and is not displayed, and body, which holds the content shown in the window.',
      nodes: [
        { id: 'html', label: '`<html lang="en">`', note: 'the root' },
        { id: 'head', label: '`<head>`', note: 'about the page, not shown' },
        { id: 'body', label: '`<body>`', note: 'shown in the window', key: true },
      ],
      edges: [['html', 'head'], ['html', 'body']],
    },
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
    example: 'Open this skeleton in a browser: the tab shows "Home · Riverside FC" (from `<title>`, in the head), and the window shows only the heading and the paragraph (from the body). The indentation is for people; the browser ignores it.',
    mistake: 'Leaving out `<!DOCTYPE html>` because "the page looks fine without it". The difference shows up later: in quirks mode some CSS sizing rules behave like in very old browsers, and the validator reports an error. Start every file with it.' },

  { id: 'head-metadata', hub: 'document', topic: 'document',
    title: 'What goes in the head',
    summary: 'The `<head>` holds **metadata**, data about the page: the character encoding, the viewport settings, the title, a description, and links to stylesheets and scripts; none of it is displayed as page content.',
    html: [
      '<p>Nothing in the head is shown as content, yet a page without it breaks in many small ways. Order matters for one line: <code>&lt;meta charset="utf-8"&gt;</code> goes <strong>first</strong>, because the browser needs the encoding before it reads any text, the title included.</p>',
      '<dl><dt><code>&lt;meta charset="utf-8"&gt;</code></dt><dd>The file is encoded in <strong>UTF-8</strong>, which covers every alphabet, accents and emoji. Without it, "España" can appear as "EspaÃ±a".</dd>'
        + '<dt><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code></dt><dd>On phones, lay the page out at the real screen width instead of a shrunken desktop page (see <a href="#/browser/css/responsive-foundations">responsive foundations</a>).</dd>'
        + '<dt><code>&lt;title&gt;</code></dt><dd>The text of the browser tab, of bookmarks and of the link in search results; screen readers read it first. <strong>Required</strong>: the validator reports an error without it.</dd>'
        + '<dt><code>&lt;meta name="description" content="…"&gt;</code></dt><dd>A one-sentence summary that search engines may show under the title.</dd>'
        + '<dt><code>&lt;link rel="stylesheet" href="styles.css"&gt;</code></dt><dd>Connects an external CSS file (see <a href="#/browser/css/writing-css">Writing CSS</a>).</dd>'
        + '<dt><code>&lt;script src="app.js" defer&gt;&lt;/script&gt;</code></dt><dd>Loads a JavaScript file and runs it after the HTML has been read (see <a href="#/browser/dom/script-loading">Loading scripts</a>).</dd></dl>',
    ],
    example: 'The fixtures page of a club site: `<title>Fixtures · Riverside FC</title>` in the head names the tab, while `<h1>Fixtures and results</h1>` in the body is the visible heading. A good title puts the specific part first, so it still reads well when many tabs are open and truncated.',
    mistake: 'Mixing up three different "titles": the `<title>` element (in the head, names the document in the tab), the `<h1>` element (in the body, the visible main heading) and the `title` attribute (a tooltip on one element). They have different places and different jobs.' },

  /* ---- 3. Headings, text and lists ----------------------------------------------------- */
  { id: 'headings', hub: 'text', topic: 'text',
    title: 'Headings and the outline',
    summary: '`<h1>` to `<h6>` mark headings of six levels; together they form the **outline** (the table of contents) of the page, so the level must follow the structure, not the font size you want.',
    html: [
      '<p><code>&lt;h1&gt;</code> is the title of the whole page, each <code>&lt;h2&gt;</code> a chapter, each <code>&lt;h3&gt;</code> a section of the chapter above it. Screen-reader users jump from heading to heading (with the H key in most screen readers) to skim a page, just as sighted users scan the bold titles, and search engines read them to understand the topics.</p>',
      '<ul><li><strong>One <code>&lt;h1&gt;</code> per page:</strong> the page title. The standard allows more, but one is the common, safest convention, and the one this site follows.</li>'
        + '<li><strong>Never skip a level going down:</strong> after an <code>&lt;h2&gt;</code> comes an <code>&lt;h3&gt;</code>, not an <code>&lt;h4&gt;</code>. Going back up (an <code>&lt;h4&gt;</code>, then a new <code>&lt;h2&gt;</code>) is fine.</li>'
        + '<li><strong>Size is only a default style:</strong> CSS can change it, so never choose a level because of its size.</li></ul>',
      '<p>The validator does not enforce the first two rules; they are accessibility practice that keeps the outline readable.</p>',
    ],
    diagram: {
      kind: 'tree',
      title: 'The headings are the page\'s table of contents.',
      desc: 'The outline of the Try it box: the h1 Riverside FC contains two h2 chapters. Latest news has two h3 sections, Match report and New signing; Upcoming fixtures has two h3 sections, Home matches and Away matches.',
      nodes: [
        { id: 'h1', label: 'Riverside FC', note: '`<h1>`', key: true },
        { id: 'news', label: 'Latest news', note: '`<h2>`' },
        { id: 'report', label: 'Match report', note: '`<h3>`' },
        { id: 'signing', label: 'New signing', note: '`<h3>`' },
        { id: 'fixtures', label: 'Upcoming fixtures', note: '`<h2>`' },
        { id: 'home', label: 'Home matches', note: '`<h3>`' },
        { id: 'away', label: 'Away matches', note: '`<h3>`' },
      ],
      edges: [['h1', 'news'], ['news', 'report'], ['news', 'signing'], ['h1', 'fixtures'], ['fixtures', 'home'], ['fixtures', 'away']],
    },
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
    html: [
      '<p>HTML <strong>collapses whitespace</strong>: any run of spaces, tabs and line breaks in your source becomes a single space on screen. The layout of the source does not matter; only elements create structure, which is why each paragraph needs its own <code>&lt;p&gt;</code> instead of a blank line.</p>',
      '<dl><dt><code>&lt;strong&gt;</code></dt><dd>"This is important": a warning, a key fact.</dd>'
        + '<dt><code>&lt;em&gt;</code></dt><dd>"Stress this word", which can change the meaning of a sentence.</dd>'
        + '<dt><code>&lt;b&gt;</code>, <code>&lt;i&gt;</code></dt><dd>Set text apart without extra importance (a product name, a word in another language). Rarely what you need.</dd>'
        + '<dt><code>&lt;br&gt;</code></dt><dd>A line break that is <strong>part of the content</strong>, as in a postal address or a poem; never a spacing tool.</dd>'
        + '<dt><code>&lt;hr&gt;</code>, <code>&lt;blockquote&gt;</code></dt><dd>A change of topic between paragraphs; a quotation from another source.</dd></dl>',
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
    html: [
      '<p>Choose by asking "would reordering the items change the meaning?". The ingredients of a recipe: no, so <code>&lt;ul&gt;</code>. The steps of the recipe or a league table: yes, so <code>&lt;ol&gt;</code>. Screen readers announce "list, 5 items", so users know how much is coming.</p>',
      '<ul><li><strong>Only <code>&lt;li&gt;</code> children:</strong> <code>&lt;ul&gt;</code> and <code>&lt;ol&gt;</code> accept nothing else directly; a sub-list goes inside an <code>&lt;li&gt;</code>.</li>'
        + '<li><strong>Counting:</strong> <code>&lt;ol start="4"&gt;</code> begins at 4, and <code>reversed</code> counts down.</li>'
        + '<li><strong>Menus are lists of links:</strong> CSS later removes the bullets and lines the items up, but the meaning ("a list of 5 links") stays.</li>'
        + '<li><strong>Terms and descriptions</strong> (a glossary, the details of a match) use a description list: <code>&lt;dl&gt;</code> with <code>&lt;dt&gt;</code> (term) and <code>&lt;dd&gt;</code> (description).</li></ul>',
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
    example: 'A recipe page: the ingredients are a `<ul>` (the order you buy them in does not matter), the method is an `<ol>` (step 3 cannot come before step 1), and the site menu at the top is a `<ul>` of links inside a `<nav>` (see [The landmark elements](#/browser/html/landmarks)).',
    mistake: 'Placing a sub-list next to the items instead of inside one: `<ul><li>Goalkeepers</li><ul>...</ul></ul>`. A list may only contain `<li>` children, so the validator reports an error; move the inner `<ul>` inside the `<li>`, before its `</li>`.' },

  /* ---- 4. Semantic HTML ---------------------------------------------------------------- */
  { id: 'semantic-why', hub: 'semantic', topic: 'semantic',
    title: 'Why semantic HTML',
    summary: '**Semantic HTML** means choosing elements whose name says what the content **is** (`<nav>`, `<article>`, `<button>`) instead of generic boxes (`<div>`, `<span>`); it makes pages accessible, understandable to search engines and easier to maintain.',
    html: [
      '<p>A page built only from <code>&lt;div class="nav"&gt;</code> looks right to a sighted mouse user, but the meaning lives in a class name that only humans can guess. With <code>&lt;nav&gt;</code> the meaning is in the element itself, so every program that reads the page understands it. Semantics is about meaning, not looks: browsers give these elements almost no visible style.</p>',
      '<ul><li><strong>Accessibility:</strong> screen readers list the regions ("navigation", "main") and the headings, so users jump straight to what they need. A real <code>&lt;button&gt;</code> works with the keyboard for free; a clickable <code>&lt;div&gt;</code> does not (see <a href="#/browser/dom/aria-focus">ARIA and keyboard focus</a>).</li>'
        + '<li><strong>Search engines</strong> read the title, the headings and the main content to understand what the page is about. Clear structure helps them; it is not a magic ranking boost.</li>'
        + '<li><strong>Maintainability:</strong> <code>&lt;/article&gt;</code> tells a teammate what is closing; <code>&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;</code> does not.</li></ul>',
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
    example: 'A screen-reader user opens both versions of this code. On the semantic one they hear "banner landmark, heading level 1, Riverside FC, navigation landmark" and can press a key to jump to the navigation. On the `<div>` version they hear only "Riverside FC" followed by the menu text, with no way to know it is a title or a menu.',
    mistake: 'Using semantic elements as decoration: wrapping every block in `<section>` or every image in `<article>`. Each element is a claim about the content, and a wrong claim misleads as much as none. When no element fits, a `<div>` is the honest choice.' },

  { id: 'landmarks', hub: 'semantic', topic: 'semantic',
    title: 'The landmark elements',
    summary: 'Landmark elements divide a page into regions: `<header>` (introduction, logo, site navigation), `<nav>` (major navigation links), `<main>` (the unique main content), `<section>` (a themed group with a heading), `<article>` (a self-contained piece), `<aside>` (related but secondary content) and `<footer>` (closing information).',
    html: [
      '<p>Each landmark answers one question about a region of the page. Screen readers list them, so a user can jump straight to the navigation or the main content.</p>',
      '<table><caption>Which landmark?</caption><thead><tr><th scope="col">Element</th><th scope="col">Question to ask</th><th scope="col">Example</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>&lt;header&gt;</code></th><td>Is it the introduction of the page, or of an article?</td><td>Logo, site name, main menu</td></tr>'
        + '<tr><th scope="row"><code>&lt;nav&gt;</code></th><td>Is it a major set of navigation links?</td><td>Main menu, table of contents</td></tr>'
        + '<tr><th scope="row"><code>&lt;main&gt;</code></th><td>Is it the content this page exists for?</td><td>Everything between header and footer</td></tr>'
        + '<tr><th scope="row"><code>&lt;section&gt;</code></th><td>Is it a themed group I can give a heading to?</td><td>"Upcoming fixtures"</td></tr>'
        + '<tr><th scope="row"><code>&lt;article&gt;</code></th><td>Would it make sense on its own elsewhere?</td><td>A match report, a product card, a comment</td></tr>'
        + '<tr><th scope="row"><code>&lt;aside&gt;</code></th><td>Is it related, but removable without loss?</td><td>League table widget, related links</td></tr>'
        + '<tr><th scope="row"><code>&lt;footer&gt;</code></th><td>Is it closing information?</td><td>Copyright, contact, legal links</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>One <code>&lt;main&gt;</code></strong> per page, never inside <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;aside&gt;</code> or <code>&lt;footer&gt;</code>.</li>'
        + '<li><strong>A <code>&lt;section&gt;</code> has a heading:</strong> if you cannot name it, it is probably a <code>&lt;div&gt;</code>.</li>'
        + '<li><strong>The article test:</strong> would it still make sense on its own, copied to another site or a news feed?</li>'
        + '<li><strong><code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> also work inside</strong> an <code>&lt;article&gt;</code> or <code>&lt;section&gt;</code>: a post\'s title and date, its author line.</li>'
        + '<li><strong><code>&lt;nav&gt;</code> is for major navigation</strong>, not every group of links.</li></ul>',
    ],
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
    example: 'In this layout the match report is an `<article>` (it makes sense on its own, shared on social media), "Latest news" is a `<section>` (a group of reports with a heading), and the league table is an `<aside>` (useful, but the page still works without it). The semantic outline tool on this card draws the outline of any page you paste.',
    mistake: 'Choosing between `<section>` and `<article>` by size or position. The question is independence: a match report stands alone, so it is an `<article>`; "Upcoming fixtures" is a themed group with a heading, so it is a `<section>`. An article can contain sections and a section can contain articles.',
    widget: 'semantic-outline',
    practice: { href: '#/browser/html/practice/semantic-outline', label: 'Open the semantic outline tool' } },

  /* ---- 5. Block, inline, div and span -------------------------------------------------- */
  { id: 'block-inline', hub: 'layout', topic: 'layout',
    title: 'Block and inline elements',
    summary: 'By default, **block** elements (`<p>`, `<h1>`, `<ul>`, `<div>`, the landmarks) start on a new line and take the full available width; **inline** elements (`<a>`, `<strong>`, `<em>`, `<span>`, `<img>`) flow inside a line of text and take only the width of their content.',
    html: [
      '<p>Blocks are the paragraphs of a document, stacked one under another; inline elements are the words inside a paragraph. That is why two <code>&lt;p&gt;</code> elements always sit on separate lines, while two <code>&lt;a&gt;</code> elements sit side by side. This is only each element\'s <strong>default display</strong>, which CSS can change (see <a href="#/browser/css/display-flow">display and normal flow</a>), so you still choose elements by meaning.</p>',
      '<h3>What may go inside what</h3>',
      '<ul><li><strong>Inline goes inside blocks:</strong> <code>&lt;p&gt;Read the &lt;a href="news.html"&gt;latest news&lt;/a&gt;.&lt;/p&gt;</code> is right; a <code>&lt;p&gt;</code> inside a <code>&lt;span&gt;</code> is invalid.</li>'
        + '<li><strong>A <code>&lt;p&gt;</code> holds only text-level (inline) content:</strong> never a list, a heading or a <code>&lt;div&gt;</code>.</li>'
        + '<li><strong>Lists:</strong> <code>&lt;ul&gt;</code> and <code>&lt;ol&gt;</code> take only <code>&lt;li&gt;</code> children; an <code>&lt;li&gt;</code> can contain almost anything, another list included.</li>'
        + '<li><strong>The exception, <code>&lt;a&gt;</code>:</strong> it may wrap block content (a whole card), but never another link or a button.</li></ul>',
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
    mistake: 'Putting a block element inside an inline one, e.g. wrapping a whole card `<div>` in a `<span>`, or an `<h2>` in an `<em>`. Inline elements may contain only text-level content; the browser has to repair the tree and the validator reports an error.' },

  { id: 'div-span', hub: 'layout', topic: 'layout',
    title: 'div and span: generic containers',
    summary: '`<div>` (block) and `<span>` (inline) are **generic containers with no meaning**: use them to group content for styling or scripting only when no semantic element fits.',
    html: [
      '<p>Reach for them <strong>last</strong>: first ask whether a meaningful element exists (<code>&lt;nav&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;figure&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;time&gt;</code>…). The <code>class</code> then says what the box is for.</p>',
      '<dl><dt><code>&lt;div&gt;</code></dt><dd>A wrapper that exists only for layout: <code>&lt;div class="card-grid"&gt;</code> so CSS can place cards side by side.</dd>'
        + '<dt><code>&lt;span&gt;</code></dt><dd>A hook for part of a sentence that has no special meaning: a price to colour, <code>&lt;span class="price"&gt;25 €&lt;/span&gt;</code>, or a phrase in another language, <code>&lt;span lang="es"&gt;¡Vamos!&lt;/span&gt;</code>.</dd></dl>',
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
    mistake: 'Writing text in a bare `<div>` instead of a `<p>`. Once styled it looks the same, but it is no longer a paragraph for screen readers, reader modes and translation tools. Text in paragraphs goes in `<p>`; a `<div>` is for wrappers (whole pages built from `<div>`s are in [Why semantic HTML](#/browser/html/semantic-why)).' },

  /* ---- 6. Links and images ------------------------------------------------------------- */
  { id: 'links-paths', hub: 'links', topic: 'links',
    title: 'Links and paths',
    summary: 'The `<a>` element makes a link; its `href` is an **absolute URL** (another site), a **relative path** (a file of your own site, found from the current page) or a **fragment** `#id` (a place on a page).',
    html: [
      '<p>The browser resolves a relative <code>href</code> from the <strong>folder of the current page</strong>, so the same path means different files from different pages. An absolute URL is a full address and works from anywhere (see <a href="#/http/web/url-anatomy">the parts of a URL</a>).</p>',
      '<table><caption>Kinds of <code>href</code>, seen from <code>index.html</code> in the site folder</caption><thead><tr><th scope="col"><code>href</code></th><th scope="col">Kind</th><th scope="col">Goes to</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>https://www.w3.org/</code></th><td>Absolute URL</td><td>Another site; the scheme <code>https://</code> is required</td></tr>'
        + '<tr><th scope="row"><code>squad.html</code></th><td>Relative, same folder</td><td>The sibling file <code>squad.html</code></td></tr>'
        + '<tr><th scope="row"><code>pages/tickets.html</code></th><td>Relative, subfolder</td><td>Into the <code>pages</code> folder first</td></tr>'
        + '<tr><th scope="row"><code>../index.html</code></th><td>Relative, parent folder</td><td><code>..</code> means one folder up</td></tr>'
        + '<tr><th scope="row"><code>/index.html</code></th><td>Root-relative</td><td>From the root of the <strong>server</strong>, not of your folder</td></tr>'
        + '<tr><th scope="row"><code>#results</code></th><td>Fragment</td><td>The element with <code>id="results"</code> on this page</td></tr>'
        + '<tr><th scope="row"><code>fixtures.html#results</code></th><td>File + fragment</td><td>Opens <code>fixtures.html</code>, scrolls to <code>id="results"</code></td></tr>'
        + '<tr><th scope="row"><code>mailto:info@example.com</code></th><td>Another scheme</td><td>Opens the email program</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>Link text says where it goes</strong> ("See all fixtures"), never "click here": screen-reader users often pull up a list of all the links on a page, out of context.</li>'
        + '<li><strong>File names are case-sensitive</strong> on most web servers, including GitHub Pages (a free host for static sites): <code>Squad.html</code> and <code>squad.html</code> are different files there, although Windows treats them as one. Use lowercase names without spaces.</li>'
        + '<li><strong>A fragment needs a target:</strong> some element with a matching <code>id</code>.</li>'
        + '<li><strong><code>target="_blank"</code></strong> opens the link in a new tab; use it sparingly, for example for external documents.</li></ul>',
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
    html: [
      '<p>The alt text is read by screen readers, shown when the image fails to load and used by search engines, so it says what the image <strong>communicates</strong>, briefly, as you would describe it over the phone.</p>',
      '<dl><dt><code>alt="…"</code></dt><dd>The information the picture gives. For a chart, that may be its conclusion.</dd>'
        + '<dt><code>alt=""</code></dt><dd>A purely decorative image: screen readers skip it. Leaving the attribute out is different, and wrong: some screen readers then read the file name aloud.</dd>'
        + '<dt><code>width</code>, <code>height</code></dt><dd>Plain numbers of pixels (<code>width="320"</code>, no <code>px</code>). They reserve the box before the file arrives, so the text below does not jump; CSS can still resize the image.</dd>'
        + '<dt><code>&lt;figure&gt;</code>, <code>&lt;figcaption&gt;</code></dt><dd>An image with a visible caption.</dd></dl>',
      '<p><code>&lt;img&gt;</code> is a void element (no end tag) and inline: it sits in the line of text unless CSS changes it. Its <code>src</code> follows the same path rules as <code>href</code> (see <a href="#/browser/html/links-paths">Links and paths</a>).</p>',
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

  /* ---- 7. Tables ----------------------------------------------------------------------- */
  { id: 'tables', hub: 'tables', topic: 'tables',
    title: 'Tables for tabular data',
    summary: 'A **table** shows data organised in rows and columns: `<table>` contains rows (`<tr>`) of header cells (`<th>`) and data cells (`<td>`), with an optional `<caption>` and the groups `<thead>` and `<tbody>`.',
    html: [
      '<p>Use a table only when the data has two dimensions: each row is one record (a match, a product) and each column one property (date, opponent, result). The test: would it make sense in a spreadsheet? Layout tables are wrong, because screen readers announce "table, 3 columns, 4 rows" and read the layout cell by cell.</p>',
      '<dl><dt><code>&lt;th scope="col"&gt;</code>, <code>scope="row"</code></dt><dd>A header cell for its column or its row, so a screen reader says "Opponent: Northside United" instead of reading a bare cell.</dd>'
        + '<dt><code>&lt;caption&gt;</code></dt><dd>The title of the table.</dd>'
        + '<dt><code>&lt;thead&gt;</code>, <code>&lt;tbody&gt;</code></dt><dd>Group the header rows and the data rows.</dd>'
        + '<dt><code>colspan="2"</code>, <code>rowspan="2"</code></dt><dd>A cell that spans several columns or rows.</dd></dl>',
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

  /* ---- 8. Forms ------------------------------------------------------------------------ */
  { id: 'forms-basics', hub: 'forms', topic: 'forms',
    title: 'Forms: names, buttons and submitting',
    summary: 'A `<form>` groups controls whose values are sent together: each control\'s `name` is the key of its value, a submit button sends them, and `action` and `method` say where and how.',
    html: [
      '<p>On submit the browser collects every named control into <code>name=value</code> pairs, such as <code>email=ana%40example.com&amp;remember=on</code>, and sends them in an HTTP <strong>request</strong> (see <a href="#/http/web/http-request">Inside an HTTP request</a>). Controls without a <code>name</code> are not sent at all.</p>',
      '<dl><dt><code>action</code></dt><dd>The URL the request goes to. By default, <strong>the current page</strong>; on a real site, a server route that checks the data.</dd>'
        + '<dt><code>method</code></dt><dd><code>get</code> (the default) puts the values in the query string of the URL: fine for a search or a filter. <code>post</code> puts them in the request body: for log-ins and anything private or that changes data.</dd>'
        + '<dt><code>&lt;button type="submit"&gt;</code></dt><dd>Sends the form, and so does Enter in a text field. A <code>&lt;button&gt;</code> inside a form is a submit button by default, so always write <code>type="submit"</code> or <code>type="button"</code>.</dd></dl>',
      '<p>Labels and the kinds of control are in <a href="#/browser/html/form-controls">Form controls</a>; handling the submit in JavaScript, without a reload, is in <a href="#/browser/dom/prevent-default">preventDefault</a>.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'The same values travel in the URL with GET and in the request body with POST.',
      desc: 'Submitting the form, with the submit button or Enter, sends the named values. With method get they are added to the URL as a query string; with method post they travel in the body of the request.',
      nodes: [
        { id: 'submit', label: 'Submit', note: 'button or Enter', key: true },
        { id: 'get', label: '`method="get"`', note: 'values in the URL' },
        { id: 'post', label: '`method="post"`', note: 'values in the body' },
      ],
      edges: [['submit', 'get'], ['submit', 'post']],
    },
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
    example: 'If this sign-in form used the default `get` method, submitting it would load `login.html?email=ana%40example.com&password=s3cret%21`: the password visible in the address bar and saved in the history. That is why a login form uses `method="post"`.',
    mistake: 'Believing a form without `action` "does nothing" when submitted. It **reloads the current page**, and with the default `get` method every named field, the password included, is appended to the URL. Before there is a server, give login forms `method="post"` and expect the page to reload.' },

  { id: 'form-controls', hub: 'forms', topic: 'forms',
    title: 'Form controls: labels, choices and text areas',
    summary: 'Every **form control** (a text box, a set of radio buttons, a drop-down list, a text area) needs a `<label>`, and its kind decides how the user answers and what is sent.',
    html: [
      '<p>The <code>&lt;label&gt;</code> is the question next to the box: clicking it focuses its control (a bigger target on a phone), and screen readers read it when the control gets the focus. Link them with <code>for</code> = the control\'s <code>id</code>, or put the control inside the label. A <code>placeholder</code> is not a label: it disappears as soon as the user types.</p>',
      '<table><caption>Which control?</caption><thead><tr><th scope="col">You need</th><th scope="col">Use</th><th scope="col">Sent as</th></tr></thead><tbody>'
        + '<tr><th scope="row">Short text</th><td><code>&lt;input type="text"&gt;</code>, or <code>email</code>, <code>password</code>, <code>number</code>, <code>date</code></td><td><code>name=value</code></td></tr>'
        + '<tr><th scope="row">One choice of a few</th><td>Radio buttons sharing one <code>name</code></td><td>The <code>value</code> of the checked one</td></tr>'
        + '<tr><th scope="row">Yes or no</th><td><code>&lt;input type="checkbox"&gt;</code></td><td><code>name=on</code> when ticked; nothing when not</td></tr>'
        + '<tr><th scope="row">One choice of many</th><td><code>&lt;select&gt;</code> with <code>&lt;option value="…"&gt;</code></td><td>The chosen option\'s <code>value</code></td></tr>'
        + '<tr><th scope="row">Long text</th><td><code>&lt;textarea&gt;</code></td><td><code>name=</code> the text</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>The input <code>type</code></strong> changes the checks and the phone keyboard: <code>email</code> shows an @ key, <code>password</code> hides the characters, <code>number</code> brings a numeric keypad.</li>'
        + '<li><strong>Radio groups:</strong> the shared <code>name</code> makes them one group, so choosing one unchecks the others. Wrap the group in <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code>, the question for the whole group.</li></ul>',
      '<h3>Writing &lt; and &amp; as text</h3>',
      '<p>In HTML text, <code>&lt;</code> starts a tag and <code>&amp;</code> starts a <strong>character reference</strong>. To show them, write <code>&amp;lt;</code> and <code>&amp;amp;</code>: <code>5 &amp;lt; 10</code> displays as "5 &lt; 10". <code>&amp;gt;</code>, <code>&amp;quot;</code> and <code>&amp;nbsp;</code> (a space that never breaks a line) work the same way.</p>',
    ],
    live: { kind: 'html',
      html: `<form>
  <fieldset>
    <legend>Ticket type</legend>
    <label><input type="radio" name="ticket" value="adult" checked> Adult</label>
    <label><input type="radio" name="ticket" value="junior"> Junior</label>
  </fieldset>
  <p>
    <label for="match">Match</label>
    <select id="match" name="match">
      <option value="12-oct">12 Oct: Northside United</option>
      <option value="19-oct">19 Oct: Eastfield Town</option>
    </select>
  </p>
  <p>
    <label for="notes">Notes</label><br>
    <textarea id="notes" name="notes" rows="3" cols="30"></textarea>
  </p>
  <p><label><input type="checkbox" name="newsletter"> Send me the newsletter</label></p>
</form>
<p>Juniors &amp; students: tickets &lt; 30 €.</p>`,
      css: `fieldset { border: 1px solid #999; }
fieldset label { margin-right: 12px; }` },
    example: 'Pick "Junior" in the Try-it box: "Adult" unchecks itself, because both radios share `name="ticket"`. Submitted, this form would send `ticket=junior&match=12-oct&notes=`, plus `newsletter=on` only if the box is ticked. The last line is written with `&amp;` and `&lt;` in the source.',
    mistake: 'Giving each radio button its own `name` (`name="adult"`, `name="junior"`). They no longer form a group: the user can tick both, and the server receives two unrelated keys instead of one answer. Radios that answer one question share one `name` and differ in `value`.' },

  { id: 'form-validation', hub: 'forms', topic: 'forms',
    title: 'Built-in form validation',
    summary: 'HTML can check values before a form is sent: `required`, `minlength`/`maxlength`, `min`/`max`, `pattern` and typed inputs such as `type="email"` make the browser block the submission and show a message.',
    html: [
      '<p>When the user submits, the browser checks every control first. If one fails, nothing is sent, the first invalid field gets the focus and a message appears next to it: obvious slips are caught at once, without JavaScript and without a round trip to the server.</p>',
      '<dl><dt><code>required</code></dt><dd>The field cannot be empty (a boolean attribute).</dd>'
        + '<dt><code>minlength="8"</code>, <code>maxlength="64"</code></dt><dd>Limits on the number of characters of text.</dd>'
        + '<dt><code>min="1"</code>, <code>max="10"</code></dt><dd>Limits on numbers and dates.</dd>'
        + '<dt><code>pattern="[0-9]{5}"</code></dt><dd>The value must match this <strong>regular expression</strong>, a text pattern: here, exactly five digits.</dd>'
        + '<dt><code>type="email"</code>, <code>url</code>, <code>number</code></dt><dd>The value must have that format.</dd></dl>',
      '<p>CSS can style fields with the <code>:valid</code> and <code>:invalid</code> pseudo-classes (see <a href="#/browser/css/pseudo-classes">pseudo-classes</a>), and <code>novalidate</code> on the <code>&lt;form&gt;</code> switches the checks off.</p>',
      '<h3>Convenience, not security</h3>',
      '<p>Anyone can delete <code>required</code> in DevTools, or send the request without your form at all, with a tool such as <code>curl</code>. So the <strong>server must validate everything again</strong>: every server section of this site builds on this rule.</p>',
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

  /* ---- 9. Validate and inspect --------------------------------------------------------- */
  { id: 'validate-inspect', hub: 'tools', topic: 'tools',
    title: 'Validate and inspect',
    summary: 'The **W3C Markup Validator** checks your HTML against the rules of the standard and lists its errors; the browser **DevTools** (Elements tab) show the tree the browser actually built from it.',
    html: [
      '<p>Browsers repair broken HTML silently, so "it displays fine" proves very little. Use both tools: validate to find the mistakes, inspect to see what the browser made of them.</p>',
      '<dl><dt>The validator</dt><dd>At <code>validator.w3.org</code>, choose <strong>Validate by Direct Input</strong> (or upload the file) and paste the whole document. <strong>Errors</strong> break the rules (overlapping tags, an <code>&lt;li&gt;</code> outside a list, a missing <code>&lt;title&gt;</code>, a duplicate <code>id</code>, an <code>&lt;img&gt;</code> without <code>alt</code>) and must be fixed. <strong>Warnings</strong> are advice worth reading. Fix the <strong>first</strong> error first: one missing end tag can cause a cascade of follow-up errors.</dd>'
        + '<dt>The Elements tab</dt><dd>Right-click an element and choose <strong>Inspect</strong>, or press F12. It shows the live tree (see <a href="#/browser/dom/what-is-dom">What the DOM is</a>); hovering a node highlights it on the page, and double-clicking edits it until the next reload.</dd>'
        + '<dt>View source</dt><dd>Ctrl+U (Cmd+Opt+U on macOS) shows the file exactly as it arrived.</dd></dl>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Three views of one page: the rules, the file, and what the browser built.',
      desc: 'The same HTML file seen three ways. The validator lists where it breaks the rules. View source shows the file as it arrived. The Elements tab shows the repaired, live tree the browser built from it.',
      nodes: [
        { id: 'file', label: 'Your `.html` file' },
        { id: 'validator', label: 'The validator', note: 'lists the errors', key: true },
        { id: 'source', label: 'View source', note: 'the file as it arrived' },
        { id: 'elements', label: 'Elements tab', note: 'the repaired, live tree' },
      ],
      edges: [['file', 'validator'], ['file', 'source'], ['file', 'elements']],
    },
    example: 'A page has `<img src="crest.png">` with no `alt`. The image displays, and the Elements tab shows it as a normal `<img>`: nothing looks wrong. Only the validator reports "An img element must have an alt attribute", which a screen-reader user would have noticed at once.',
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
  { type: 'mc', topic: 'forms',
    q: 'Three radio buttons let the user pick a ticket type. What makes them one group, so that only one can be chosen?',
    choices: ['The same `id` on all three', 'The same `name` on all three', 'The same `value` on all three', 'Being inside the same `<p>`'],
    answer: 1,
    why: 'Radios that share a `name` form one group; each has its own `value`, and the checked one\'s value is what is sent.' },
  { type: 'tf', topic: 'forms',
    q: 'When the user leaves a checkbox named `newsletter` unticked, the form sends `newsletter=off`.',
    answer: false,
    why: 'An unticked checkbox is not sent at all; a ticked one sends `newsletter=on` (or its `value`).' },
  { type: 'fib', topic: 'forms',
    q: 'To show the character `<` as text inside HTML, write the character reference ___.',
    accept: ['&lt;', '&lt'],
    why: 'A bare `<` would start a tag; `&lt;` displays it. `&amp;` does the same for `&`.' },

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
