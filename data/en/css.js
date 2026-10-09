'use strict';
/* CSS: concept cards, rail groups and self-check quiz (selectors, cascade and specificity,
   units, flow and the box model, position, Flexbox, Grid and responsive design). Cards explain
   with `html` blocks and `diagram` specs (js/concept-section.js, js/diagram.js). */

DATA.en.CSS_QUIZ_TOPICS = {
  apply: 'Writing and linking CSS',
  selectors: 'Selectors and pseudo-classes',
  cascade: 'Cascade, specificity and inheritance',
  units: 'Units and visual styling',
  display: 'Display, flow and position',
  box: 'Box model and sizing',
  flex: 'Flexbox',
  grid: 'Grid',
  layout: 'Choosing Flexbox or Grid',
  responsive: 'Responsive design',
};

DATA.en.CSS_GROUPS = [
  { key: 'selectors', label: 'Rules and selectors', icon: 'code' },
  { key: 'cascade', label: 'Cascade and specificity', icon: 'pyramid' },
  { key: 'styling', label: 'Units and styling', icon: 'speed' },
  { key: 'box', label: 'Flow, box model and position', icon: 'levels' },
  { key: 'flex', label: 'Flexbox', icon: 'arrow' },
  { key: 'grid', label: 'Grid', icon: 'table' },
  { key: 'responsive', label: 'Responsive design', icon: 'split' },
];

DATA.en.CSS_CONCEPTS = [
  /* ---- 1. Rules and selectors -------------------------------------------------------------- */
  { id: 'writing-css', hub: 'selectors', topic: 'apply',
    title: 'Writing and linking CSS',
    summary: 'A CSS **rule** pairs a selector (which elements) with declarations (how they look); rules reach the page inline, in a `<style>` element, or from a `.css` file linked with `<link rel="stylesheet">`.',
    html: [
      '<p>HTML says what each piece of the page <strong>is</strong>; CSS says how it <strong>looks</strong> (see <a href="#/http/web/course-map">From static pages to a full-stack app</a>). The browser joins the two by testing every rule\'s selector against every element. One stylesheet in its own file restyles the whole site without touching the content, and the browser downloads it once and reuses it from its cache.</p>',
      '<dl><dt><code>p</code></dt><dd>The <strong>selector</strong>: which elements the rule styles.</dd><dt><code>{ … }</code></dt><dd>The <strong>declaration block</strong>.</dd><dt><code>color: navy;</code></dt><dd>One <strong>declaration</strong>: a property, a colon, a value and a semicolon.</dd><dt><code>/* … */</code></dt><dd>A comment. The HTML form <code>&lt;!-- --&gt;</code> and the JavaScript form <code>//</code> do not work in CSS.</dd></dl>',
      '<table><caption>Three ways to attach CSS</caption><thead><tr><th scope="col">Where</th><th scope="col">How</th><th scope="col">Reaches</th></tr></thead><tbody><tr><th scope="row">Inline</th><td><code>style="color: red"</code> on one element</td><td>That element only; it beats every selector, so avoid it outside quick tests</td></tr><tr><th scope="row">Internal</th><td>A <code>&lt;style&gt;</code> element in the <code>&lt;head&gt;</code></td><td>One page</td></tr><tr><th scope="row">External</th><td><code>&lt;link rel="stylesheet" href="styles.css"&gt;</code> in the <code>&lt;head&gt;</code></td><td>Every page that links it: the standard way</td></tr></tbody></table>',
      '<p><strong>Errors are silent.</strong> A declaration the browser does not understand (<code>colr: red</code>, <code>width: big</code>) is ignored on its own and the rest of the rule still applies. The DevTools Styles pane shows it struck through, with a warning icon.</p>',
    ],
    code: `<!-- index.html, fixtures.html, login.html: the same line in every <head> -->
<head>
  <meta charset="UTF-8">
  <title>Riverside FC</title>
  <link rel="stylesheet" href="styles.css">
</head>

/* styles.css: one file, every page */
nav a {
  /* text colour */
  color: #1A1F6C;
  text-decoration: none; /* no underline */
}`,
    example: 'A club site has `index.html`, `fixtures.html` and `login.html`, each with the same `<link rel="stylesheet" href="styles.css">`. Changing `nav a { color: … }` once in `styles.css` recolours the navigation on all three pages, and the browser reuses its cached copy of the file on the next page.',
    mistake: 'Writing `<style src="styles.css">` or putting the `<link>` in `<body>`. `<style>` has no `src` attribute: external CSS only loads through `<link rel="stylesheet">` in the `<head>`. Check the path too: `href="css/styles.css"` is relative to the HTML file, and a wrong path fails silently (the Network tab in DevTools shows a 404).',
    live: { kind: 'html',
      html: `<h1>Hello, CSS</h1>
<p class="note">This paragraph has a class.</p>
<p>Plain paragraph. Fix the typo in the first rule and watch it turn navy.</p>`,
      css: `/* "colr" is not a property: this one declaration is ignored, the rest applies */
p { colr: navy; font-size: 18px; }

.note {
  background: #FFE9DC;
  padding: 8px;
}` } },

  { id: 'basic-selectors', hub: 'selectors', topic: 'selectors',
    title: 'Basic selectors: type, class, id, attribute',
    summary: 'A selector picks the elements a rule applies to: by tag (`p`), class (`.card`), id (`#hero`), attribute (`a[target]`) or all of them (`*`).',
    html: [
      '<p>A selector is a <strong>query</strong> over the HTML: the browser tests each element against it and styles the ones that match. The more precisely it describes an element, the fewer elements it matches and the stronger it is when rules conflict (see <a href="#/browser/css/specificity">Specificity</a>).</p>',
      '<table><caption>The basic selectors</caption><thead><tr><th scope="col">Selector</th><th scope="col">Matches</th><th scope="col">Example</th></tr></thead><tbody><tr><th scope="row">Type</th><td>every element with that tag</td><td><code>p</code>, <code>nav</code>, <code>button</code></td></tr><tr><th scope="row">Class</th><td>every element whose <code>class</code> list contains the name</td><td><code>.card</code>, <code>.btn-primary</code></td></tr><tr><th scope="row">Id</th><td>the one element with that <code>id</code></td><td><code>#hero</code></td></tr><tr><th scope="row">Attribute</th><td>elements that have an attribute, or a given value</td><td><code>a[target]</code>, <code>input[type="email"]</code></td></tr><tr><th scope="row">Universal</th><td>every element</td><td><code>*</code></td></tr><tr><th scope="row">Compound</th><td>one element meeting all the parts</td><td><code>a.btn</code>, <code>.card.featured</code></td></tr><tr><th scope="row">Group (comma)</th><td>elements matching any of the selectors</td><td><code>h1, h2, h3</code></td></tr></tbody></table>',
      '<ul><li><strong>Classes</strong> are the workhorse: one element can carry several (<code>class="card featured"</code>) and a class can be reused on any number of elements.</li><li><strong>Ids</strong> are unique in the page and score high in specificity, so styles hung on them are hard to override. Keep ids for link targets and scripts (see <a href="#/browser/html/attributes">Attributes</a>).</li><li><strong>No space compounds:</strong> <code>article.card</code> is an <code>&lt;article&gt;</code> that also has class <code>card</code>; <code>.card.featured</code> is one element with both classes.</li><li><strong>A comma groups</strong> independent selectors that share declarations: <code>h1, h2, h3 { … }</code>.</li></ul>',
    ],
    widget: 'selector-tester',
    example: 'For `<a href="/tickets" target="_blank" class="btn primary">Buy</a>`, all of these match: `a`, `.btn`, `.primary`, `a.btn`, `.btn.primary`, `a[target]`, `a[target="_blank"]`. The selector `.btn .primary` does **not** match it: the space asks for a `.primary` element **inside** a `.btn`.',
    mistake: 'Confusing `.card.featured` (no space: one element with both classes) with `.card .featured` (space: a `.featured` element somewhere inside a `.card`). One space changes the meaning completely, and the wrong one simply matches nothing, with no error.',
    live: { kind: 'html',
      html: `<article class="card">Plain card</article>
<article class="card featured">Featured card</article>
<p>Visit <a href="#" target="_blank">an external site</a> or <a href="#">this page</a>.</p>`,
      css: `.card { border: 2px solid #999; padding: 8px; margin: 6px 0; }

/* one element with BOTH classes (no space) */
.card.featured { border-color: #FF5700; background: #FFF3EB; }

/* attribute selector: only links that have a target */
a[target] { color: #FF5700; font-weight: bold; }` } },

  { id: 'combinators', hub: 'selectors', topic: 'selectors',
    title: 'Combinators: descendant, child and siblings',
    summary: 'A combinator joins two selectors by how the elements are related in the HTML tree: anywhere inside (a space), direct child (`>`), next sibling (`+`) or any later sibling (`~`).',
    html: [
      '<p>The HTML is a family tree (see <a href="#/browser/html/nesting-rules">Nesting and the document tree</a>). A combinator makes a rule depend on <strong>where</strong> an element sits in it, so links in the nav can look different from links in an article without a class on every link.</p>',
      '<table><caption>The four combinators</caption><thead><tr><th scope="col">Combinator</th><th scope="col">Written</th><th scope="col">Matches the B that is…</th></tr></thead><tbody><tr><th scope="row">Descendant</th><td><code>A B</code> (space)</td><td>anywhere inside an A, at any depth</td></tr><tr><th scope="row">Child</th><td><code>A &gt; B</code></td><td>a direct child of an A (one level down)</td></tr><tr><th scope="row">Next sibling</th><td><code>A + B</code></td><td>immediately after an A, with the same parent</td></tr><tr><th scope="row">Later sibling</th><td><code>A ~ B</code></td><td>after an A (not necessarily right after), with the same parent</td></tr></tbody></table>',
      '<ul><li><strong>Read it right to left:</strong> in <code>nav a</code>, the rightmost part (<code>a</code>) is the element being styled; everything to its left is context.</li><li><strong>No specificity:</strong> combinators add nothing to the score; only the selectors around them count (see <a href="#/browser/css/specificity">Specificity</a>).</li></ul>',
    ],
    diagram: {
      kind: 'tree',
      title: 'A space reaches any depth; > reaches only one level down.',
      desc: 'A nav with class menu has two children: a link and a ul. The ul contains an li, which contains a second link. The first link is a direct child, so both .menu > a and .menu a match it. The second link is deeper, so only .menu a matches it.',
      nodes: [
        { id: 'menu', label: '`nav.menu`', key: true },
        { id: 'a1', label: '`a`', note: '`.menu > a` matches' },
        { id: 'ul', label: '`ul`' },
        { id: 'li', label: '`li`' },
        { id: 'a2', label: '`a`', note: 'only `.menu a`' },
      ],
      edges: [['menu', 'a1'], ['menu', 'ul'], ['ul', 'li'], ['li', 'a2']],
    },
    example: '`.card + .card { margin-top: 1rem; }` puts space **between** consecutive cards but not above the first one: the first card has no `.card` right before it, so it is not matched. `nav > ul` styles the menu list directly inside `<nav>` but not a sub-menu `<ul>` nested deeper.',
    mistake: 'Writing `.menu > a` for `<nav class="menu"><ul><li><a>…</a></li></ul></nav>`. The link is a great-grandchild of `.menu`, not a direct child, so nothing matches. Use the descendant combinator `.menu a`, or spell out the whole path `.menu > ul > li > a`.',
    live: { kind: 'html',
      html: `<nav class="menu">
  <a href="#">Direct child link</a>
  <ul><li><a href="#">Nested link</a></li></ul>
</nav>
<div class="card">Card 1</div>
<div class="card">Card 2</div>
<div class="card">Card 3</div>`,
      css: `/* every link inside .menu */
.menu a   { color: #1A1F6C; }
/* only the direct child */
.menu > a { background: #FFE9DC; }

.card { border: 1px solid #999; padding: 6px; }
.card + .card { border-top: 4px solid #FF5700; } /* every card that follows a card */` } },

  { id: 'pseudo-classes', hub: 'selectors', topic: 'selectors',
    title: 'Pseudo-classes: state and position',
    summary: 'A pseudo-class such as `:hover`, `:focus`, `:first-child` or `:nth-child(odd)` matches an element by its current **state** or its **position** among its siblings: information that is not written in the HTML.',
    html: [
      '<p>Classes are labels <strong>you</strong> write in the HTML; pseudo-classes are labels the <strong>browser</strong> adds and removes as things happen. The pointer moves over a button, a field receives the keyboard focus, a list gets a new last item: each moment can be styled without JavaScript.</p>',
      '<table><caption>Pseudo-classes you will use constantly</caption><thead><tr><th scope="col">Pseudo-class</th><th scope="col">Matches</th></tr></thead><tbody><tr><th scope="row"><code>:hover</code></th><td>while the mouse pointer is over the element</td></tr><tr><th scope="row"><code>:focus</code></th><td>while the element has keyboard focus (a clicked or tabbed-to input, button or link)</td></tr><tr><th scope="row"><code>:focus-visible</code></th><td>focus that the browser judges should be visible (typically keyboard navigation, not mouse clicks)</td></tr><tr><th scope="row"><code>:active</code></th><td>while the element is being pressed</td></tr><tr><th scope="row"><code>:visited</code></th><td>a link to a page already visited</td></tr><tr><th scope="row"><code>:first-child</code> / <code>:last-child</code></th><td>the first / last child of its parent</td></tr><tr><th scope="row"><code>:nth-child(odd)</code>, <code>:nth-child(3n)</code></th><td>children by position: odd ones, every third…</td></tr><tr><th scope="row"><code>:not(.done)</code></th><td>elements that do not match the selector inside</td></tr></tbody></table>',
      '<ul><li><strong>One colon, no space:</strong> <code>button:hover</code>, <code>input:focus</code>, <code>li:first-child</code>.</li><li><strong>Pseudo-elements</strong> use two colons and style a <em>part</em> of an element instead of a state: <code>p::first-line</code>, or <code>::before</code> and <code>::after</code>, which insert generated content.</li><li><strong>Link states in this order:</strong> <code>:link</code>, <code>:visited</code>, <code>:hover</code>, <code>:active</code>. They have the same specificity, so the later one wins when two apply at once, such as a visited link that is hovered (see <a href="#/browser/css/specificity">Specificity</a>).</li></ul>',
    ],
    example: 'A sign-in form: `input:focus { border-color: #FF5700; outline: 3px solid #FFD2B8; }` shows clearly which field is being typed in; `button:hover { background: #1A1F6C; }` gives visual feedback; `tr:nth-child(even) { background: #F4F4F8; }` stripes a fixtures table so rows are easy to follow.',
    mistake: 'Removing the focus ring with `outline: none` and putting nothing in its place: keyboard users can no longer see where they are. If the default ring clashes with your design, **replace** it (`:focus-visible { outline: 3px solid #FF5700; }`). Also watch the space: `button :hover` (with a space) means "a hovered element **inside** a button", not a hovered button.',
    live: { kind: 'html',
      html: `<button>Hover or press me</button>
<p><input placeholder="Click or Tab into me"></p>
<ul>
  <li>Item 1</li><li>Item 2</li><li>Item 3</li><li>Item 4</li>
</ul>`,
      css: `button { background: #FF5700; color: white; border: 0; padding: 8px 14px; cursor: pointer; }
button:hover  { background: #1A1F6C; }
button:active { transform: scale(0.95); }

input { padding: 6px; border: 2px solid #999; }
input:focus { border-color: #FF5700; outline: 3px solid #FFD2B8; }

li:nth-child(odd) { background: #EEF0FA; }
li:first-child   { font-weight: bold; }` } },

  /* ---- 2. Cascade and specificity ---------------------------------------------------------- */
  { id: 'cascade', hub: 'cascade', topic: 'cascade',
    title: 'The cascade: which declaration wins',
    summary: 'When several declarations set the **same property** on the **same element**, the cascade chooses one by asking four questions in order: origin and `!important`, inline style, specificity, and source order.',
    html: [
      '<p>Every element receives declarations from several places: the browser\'s own stylesheet (the <strong>user-agent stylesheet</strong>: a large bold <code>&lt;h1&gt;</code>, an 8px margin on <code>&lt;body&gt;</code>, bullets on <code>&lt;ul&gt;</code>), your stylesheets, maybe a <code>style</code> attribute. The cascade keeps exactly <strong>one value per property</strong>, property by property, so <code>color</code> can come from one rule and <code>margin</code> from another.</p>',
      '<h3>The four questions, in order</h3>',
      '<ol><li><strong>Origin and importance:</strong> your styles beat the browser\'s defaults; any <code>!important</code> declaration beats every normal one.</li><li><strong>Inline style:</strong> a <code>style=""</code> attribute beats any selector.</li><li><strong>Specificity:</strong> the selector with the higher (a, b, c) score wins (see <a href="#/browser/css/specificity">Specificity</a>).</li><li><strong>Source order:</strong> the declaration that appears last wins.</li></ol>',
      '<p>The first question that separates the candidates decides. <strong>Source order</strong> settles every specificity tie, the most common conflict: "later" means further down the file, or in a stylesheet linked further down the <code>&lt;head&gt;</code>. The order of the class names inside <code>class="…"</code> never matters.</p>',
    ],
    example: 'With `.btn { background: grey; }` followed by `.primary { background: orange; }`, the element `<a class="primary btn">` is **orange**: both selectors score (0,1,0), so the later rule wins. Swap the two rules in the file and it turns grey; swapping the class names in the HTML changes nothing.',
    mistake: 'Fixing a conflict with `!important`. It wins today, but the next time you need an override you need another `!important`, and soon nothing can be changed without one. Look at the Styles pane in DevTools instead: the losing declaration is struck through, so you can see which rule beat it and fix the selector or the order.',
    live: { kind: 'html',
      html: `<a class="primary btn" href="#">Which colour am I?</a>
<p>Swap the two rules on the right. Then try swapping the class names in the HTML: nothing changes.</p>`,
      css: `.btn     { background: grey;    color: white; padding: 8px 12px; }
/* same specificity (0,1,0): the later rule wins */
.primary { background: #FF5700; }` } },

  { id: 'specificity', hub: 'cascade', topic: 'cascade',
    title: 'Specificity: the (a, b, c) score',
    summary: 'Specificity is a three-number score **(a, b, c)** for every selector, compared column by column from the left; the higher score wins.',
    html: [
      '<p>Specificity measures how <strong>precisely</strong> a selector aims at an element. "Every paragraph" is a general default; "the paragraph inside <code>#hero</code>" is a deliberate exception, so the exception should win. Counting the parts of the selector is how the browser measures that precision.</p>',
      '<dl><dt>a</dt><dd>Id selectors: <code>#hero</code>.</dd><dt>b</dt><dd>Class selectors (<code>.card</code>), attribute selectors (<code>[type="email"]</code>) and pseudo-classes (<code>:hover</code>).</dd><dt>c</dt><dd>Type selectors (<code>p</code>, <code>li</code>) and pseudo-elements (<code>::before</code>).</dd><dt>Nothing</dt><dd>The universal selector <code>*</code> and the combinators (space, <code>&gt;</code>, <code>+</code>, <code>~</code>).</dd></dl>',
      '<p>Compare <strong>a</strong> first; only if equal, <strong>b</strong>; only if equal, <strong>c</strong>. The columns never carry: (0,11,0) still loses to (1,0,0). An inline <code>style=""</code> is outside the score and beats every selector, and <code>!important</code> beats both. Equal scores: source order decides.</p>',
      '<table><caption>Worked scores</caption><thead><tr><th scope="col">Selector</th><th scope="col">(a, b, c)</th><th scope="col">Why</th></tr></thead><tbody><tr><th scope="row"><code>*</code></th><td>(0,0,0)</td><td>universal counts nothing</td></tr><tr><th scope="row"><code>p</code></th><td>(0,0,1)</td><td>one type</td></tr><tr><th scope="row"><code>nav ul li a</code></th><td>(0,0,4)</td><td>four types; the spaces count nothing</td></tr><tr><th scope="row"><code>.intro</code></th><td>(0,1,0)</td><td>one class</td></tr><tr><th scope="row"><code>li:first-child</code></th><td>(0,1,1)</td><td>a pseudo-class counts like a class</td></tr><tr><th scope="row"><code>a[target]</code></th><td>(0,1,1)</td><td>an attribute selector counts like a class</td></tr><tr><th scope="row"><code>.card &gt; p</code></th><td>(0,1,1)</td><td>the <code>&gt;</code> counts nothing</td></tr><tr><th scope="row"><code>.nav .link:hover</code></th><td>(0,3,0)</td><td>two classes plus one pseudo-class</td></tr><tr><th scope="row"><code>#hero p</code></th><td>(1,0,1)</td><td>one id, one type</td></tr><tr><th scope="row"><code>#hero .intro</code></th><td>(1,1,0)</td><td>beats <code>#hero p</code>: equal a, higher b</td></tr></tbody></table>',
    ],
    widget: 'specificity',
    practice: { href: '#/browser/css/practice/specificity', label: 'Practise scoring selectors' },
    example: 'Three rules colour the same link: `nav a { color: black; }` scores (0,0,2); `.link { color: navy; }` scores (0,1,0); `#main-nav a { color: orange; }` scores (1,0,1). The link is **orange**, wherever the rules appear in the file. Remove the id rule and it is **navy**: one class beats any number of type selectors.',
    mistake: 'Treating the score as one decimal number ("`#hero p` is worth 101 points, so eleven classes, worth 110, beat it"). The columns are compared separately and never carry: one id beats any number of classes. The practical lesson is to keep selectors **short and flat** (mostly single classes) so that any rule can be overridden by another single class placed later.',
    live: { kind: 'html',
      html: `<nav id="main-nav"><a class="link" href="#">Which colour wins?</a></nav>
<p>Delete rules one by one, starting with the id rule.</p>`,
      css: `#main-nav a { color: #FF5700; } /* (1,0,1) */
/* (0,1,0) */
.link       { color: navy; }
/* (0,0,2) */
nav a       { color: black; }
a { font-size: 20px; font-weight: bold; }` } },

  { id: 'inheritance', hub: 'cascade', topic: 'cascade',
    title: 'Inheritance: values that flow down the tree',
    summary: 'Text properties such as `color`, `font-family`, `font-size` and `line-height` are **inherited**: an element with no value of its own takes its parent\'s. Box properties such as `margin`, `border` and `background` are not.',
    html: [
      '<p>That is why <code>body { font-family: Arial, sans-serif; color: #222; }</code> restyles a whole page with one rule: every descendant without a font or colour of its own borrows its parent\'s, all the way up to <code>body</code>. Text inside a box should look like the rest of the box\'s text; a border on an <code>&lt;article&gt;</code> should not repeat around every paragraph inside it.</p>',
      '<dl><dt>Inherited</dt><dd><code>color</code>, <code>font-family</code>, <code>font-size</code>, <code>font-weight</code>, <code>line-height</code>, <code>text-align</code>, <code>list-style</code>, <code>cursor</code>, <code>visibility</code>.</dd><dt>Not inherited</dt><dd><code>margin</code>, <code>padding</code>, <code>border</code>, <code>width</code>, <code>height</code>, <code>background</code>, <code>display</code>, <code>box-shadow</code>, <code>border-radius</code>.</dd></dl>',
      '<ul><li><strong>The weakest value:</strong> any rule that targets the element itself, even <code>p { }</code> or a browser default, beats an inherited value. That is why links stay blue inside a red paragraph.</li><li><strong>Form controls</strong> get their own font from the browser: write <code>button, input, select, textarea { font: inherit; }</code> to make them follow the page.</li><li><strong>Keywords:</strong> <code>inherit</code> takes the parent\'s value, even for a non-inherited property; <code>initial</code> the property\'s starting value; <code>unset</code> inherits if the property normally inherits, else <code>initial</code>.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Values flow down until an element has a rule of its own.',
      desc: 'body sets the font and the colour. The card inherits both, and so does the paragraph inside it. The link inside the paragraph does not: the browser has a rule that targets links directly, so the link stays blue.',
      nodes: [
        { id: 'body', label: '`body`', note: 'sets font and colour' },
        { id: 'card', label: '`.card`', note: 'inherits both' },
        { id: 'p', label: '`p`', note: 'inherits both' },
        { id: 'a', label: '`a`', note: 'own browser rule: blue', key: true },
      ],
      edges: [['body', 'card'], ['card', 'p'], ['p', 'a']],
    },
    example: 'In `<article class="card"><p>Text with <a href="#">a link</a></p></article>`, the rule `.card { color: darkred; border: 1px solid; }` makes the paragraph text dark red (inherited) but draws **one** border, around the card only (not inherited). The link keeps the browser\'s blue until you write `.card a { color: inherit; }`.',
    mistake: 'Expecting `.card { color: red; }` to colour the links inside the card, or the login button to use the page font. Both have browser defaults that target them directly, and a direct rule always beats an inherited value. Target them yourself, or use `inherit`.',
    live: { kind: 'html',
      html: `<article class="card">
  <h2>Card title</h2>
  <p>Text inherits the card's colour and font, with <a href="#">a link</a> that does not.</p>
  <button>A button</button>
</article>`,
      css: `.card {
  /* inherited */
  font-family: Georgia, serif;
  /* inherited */
  color: darkred;
  /* NOT inherited: one border only */
  border: 2px solid #1A1F6C;
  padding: 12px;
}
/* Uncomment to make the link and the button follow the card: */
/* .card a { color: inherit; }
   button  { font: inherit; } */` } },

  /* ---- 3. Units and styling ---------------------------------------------------------------- */
  { id: 'css-units', hub: 'styling', topic: 'units',
    title: 'Units: px, %, em, rem, vw/vh and fr',
    summary: 'Lengths are either absolute (`px`) or relative to something: the containing block (`%`), a font size (`em`, `rem`), the viewport (`vw`, `vh`) or, in grid tracks only, the free space (`fr`).',
    html: [
      '<p>Choosing a unit means choosing <strong>what the size should follow</strong>. A hairline border should stay 1px whatever happens: <code>px</code>. A column should follow its container: <code>%</code> or <code>fr</code>. Text and the space around it should follow the reader\'s font-size setting: <code>rem</code>, so a reader who sets a larger default font gets larger text and spacing.</p>',
      '<table><caption>Assuming the browser default root font size of 16px</caption><thead><tr><th scope="col">Unit</th><th scope="col">Relative to</th><th scope="col">Example</th><th scope="col">Typical use</th></tr></thead><tbody><tr><th scope="row"><code>px</code></th><td>nothing (a CSS pixel)</td><td><code>border: 1px solid</code></td><td>borders, shadows, small fixed details</td></tr><tr><th scope="row"><code>%</code></th><td>the containing block</td><td><code>max-width: 100%</code></td><td>fluid widths, images</td></tr><tr><th scope="row"><code>em</code></th><td>the element\'s own font size</td><td><code>padding: 0.5em 1em</code></td><td>spacing that should scale with that element\'s text</td></tr><tr><th scope="row"><code>rem</code></th><td>the root (<code>&lt;html&gt;</code>) font size</td><td><code>font-size: 1.25rem</code> = 20px</td><td>font sizes, consistent spacing</td></tr><tr><th scope="row"><code>vw</code> / <code>vh</code></th><td>1% of the viewport width / height</td><td><code>height: 100vh</code></td><td>full-screen sections</td></tr><tr><th scope="row"><code>fr</code></th><td>a share of the free space in a grid container</td><td><code>grid-template-columns: 2fr 1fr</code></td><td>grid tracks only</td></tr></tbody></table>',
      '<ul><li><strong><code>rem</code> or <code>em</code>:</strong> <code>rem</code> refers to the font size of <code>&lt;html&gt;</code> (16px by default); <code>em</code> to the element\'s own font size, or to the parent\'s inside <code>font-size</code>, which is why nested <code>em</code> font sizes compound.</li><li><strong>Percentages:</strong> a <code>%</code> width is a share of the parent\'s content width; a <code>%</code> padding or margin is a share of the parent\'s <strong>width</strong>, even at the top and bottom.</li><li><strong>Zero needs no unit:</strong> <code>margin: 0</code>.</li></ul>',
    ],
    example: 'With the default 16px root: `h1 { font-size: 2rem; }` is 32px. A button with `font-size: 0.875rem; padding: 0.5em 1em;` has 14px text and padding of 7px (top/bottom) by 14px (left/right): the `em` padding is computed from the button\'s own 14px font size, so a bigger button gets proportionally bigger padding automatically.',
    mistake: 'Nesting `em` font sizes: with `li { font-size: 0.8em; }`, a list inside a list item is 0.8 × 0.8 = 0.64 of the original size, and a third level 0.51. `em` compounds through the tree; `rem` always goes back to the root, which is why `rem` is the safer default for font sizes. Also, `fr` is not a general length: `width: 1fr` is invalid and ignored.',
    live: { kind: 'html',
      html: `<ul class="em"><li>em level 1<ul><li>em level 2<ul><li>em level 3</li></ul></li></ul></li></ul>
<ul class="rem"><li>rem level 1<ul><li>rem level 2<ul><li>rem level 3</li></ul></li></ul></li></ul>
<div class="vw">This bar is 50vw wide: half of the preview's width.</div>`,
      css: `/* shrinks at every level */
.em li  { font-size: 0.8em; }
.rem li { font-size: 0.8rem; } /* always 0.8 x 16px = 12.8px */
.vw { width: 50vw; background: #FFE9DC; padding: 0.5rem; }` } },

  { id: 'visual-styling', hub: 'styling', topic: 'units',
    title: 'Colour, text and decoration',
    summary: 'The everyday styling properties: colours, fonts, text, lists and decoration such as rounded corners and shadows.',
    html: [
      '<p>Layout decides <strong>where</strong> boxes go; these properties decide what they <strong>look like</strong>. Text properties inherit, so set them once on <code>body</code> and override them only where a component differs (see <a href="#/browser/css/inheritance">Inheritance</a>); decoration does not inherit, so it belongs on the component itself, such as the card or the button.</p>',
      '<table><caption>Properties and typical values</caption><thead><tr><th scope="col">Property</th><th scope="col">What it does</th><th scope="col">Example</th></tr></thead><tbody><tr><th scope="row"><code>color</code></th><td>text colour (inherited)</td><td><code>color: #222;</code></td></tr><tr><th scope="row"><code>background-color</code></th><td>fills content and padding</td><td><code>background-color: #F4F4F8;</code></td></tr><tr><th scope="row"><code>font-family</code></th><td>font stack (inherited)</td><td><code>font-family: Arial, sans-serif;</code></td></tr><tr><th scope="row"><code>font-size</code> / <code>font-weight</code></th><td>size / boldness</td><td><code>font-size: 1.125rem; font-weight: 700;</code></td></tr><tr><th scope="row"><code>line-height</code></th><td>space between lines; unitless = × font size</td><td><code>line-height: 1.5;</code></td></tr><tr><th scope="row"><code>text-align</code></th><td>aligns inline content inside the box</td><td><code>text-align: center;</code></td></tr><tr><th scope="row"><code>text-decoration</code></th><td>underline (or not) on text, e.g. links</td><td><code>text-decoration: none;</code></td></tr><tr><th scope="row"><code>list-style</code></th><td>list markers (bullets, numbers)</td><td><code>list-style: none;</code></td></tr><tr><th scope="row"><code>border-radius</code></th><td>rounds the corners</td><td><code>border-radius: 8px;</code></td></tr><tr><th scope="row"><code>box-shadow</code></th><td>x-offset y-offset blur colour</td><td><code>box-shadow: 0 2px 8px rgb(0 0 0 / 0.15);</code></td></tr><tr><th scope="row"><code>cursor</code></th><td>mouse pointer shape over the element</td><td><code>cursor: pointer;</code></td></tr></tbody></table>',
      '<ul><li><strong>Colours:</strong> a name (<code>navy</code>), hexadecimal <code>#RRGGBB</code> with two digits each for red, green and blue (<code>#1A1F6C</code>), or <code>rgb(26 31 108)</code>. A fourth value adds transparency: <code>rgb(0 0 0 / 0.15)</code> is black at 15%, ideal for shadows. Keep enough contrast between text and background.</li><li><strong>Font stacks</strong> list fallbacks: in <code>font-family: "Segoe UI", Arial, sans-serif;</code> the browser uses the first font installed on the device. End with a generic family (<code>serif</code>, <code>sans-serif</code>, <code>monospace</code>) and quote names with spaces.</li></ul>',
    ],
    example: 'A nav without bullets: `nav ul { list-style: none; margin: 0; padding: 0; }` and `nav a { text-decoration: none; color: white; }`. A card: `.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgb(0 0 0 / 0.15); padding: 1rem; }`.',
    mistake: 'Writing `text-decoration: none` on a list to remove the bullets: that property removes the **underline** of links. The bullets belong to the list, so it is `list-style: none` on the `<ul>`, usually together with `padding: 0; margin: 0;` to remove the indentation the browser added to make room for them.',
    live: { kind: 'html',
      html: `<nav><ul><li><a href="#">Home</a></li><li><a href="#">Fixtures</a></li><li><a href="#">Tickets</a></li></ul></nav>
<article class="card"><h3>Match report</h3><p>Rounded corners, a soft shadow and readable line height.</p><button>Read more</button></article>`,
      css: `body { font-family: "Segoe UI", Arial, sans-serif; color: #222; line-height: 1.5; background: #F4F4F8; }
nav ul { list-style: none; margin: 0; padding: 0; background: #1A1F6C; }
nav li { display: inline-block; }
nav a  { color: white; text-decoration: none; display: inline-block; padding: 8px 12px; }
.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgb(0 0 0 / 0.15); padding: 1rem; margin-top: 1rem; }
button { background: #FF5700; color: white; border: 0; border-radius: 4px; padding: 6px 12px; cursor: pointer; }` } },

  /* ---- 4. Flow, box model and position ----------------------------------------------------- */
  { id: 'display-flow', hub: 'box', topic: 'display',
    title: 'Normal flow and display: block, inline, inline-block, none',
    summary: '`display` sets how a box takes part in layout: `block` boxes stack and fill the width, `inline` boxes flow inside lines of text, `inline-block` flows in a line but accepts a size, and `none` removes the element.',
    html: [
      '<p>With no layout CSS at all, the browser uses <strong>normal flow</strong>: block boxes are laid out top to bottom like paragraphs; inline boxes run left to right inside them like words in a sentence, wrapping at the edge. Every element has a default <code>display</code>, and CSS can change it without changing what the element means.</p>',
      '<dl><dt>Block by default</dt><dd><code>&lt;p&gt;</code>, <code>&lt;div&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;form&gt;</code>, <code>&lt;h1&gt;</code>…</dd><dt>Inline-level by default</dt><dd><code>&lt;a&gt;</code>, <code>&lt;span&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;label&gt;</code>, <code>&lt;img&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;button&gt;</code>…</dd></dl>',
      '<table><caption>How each value behaves</caption><thead><tr><th scope="col">Value</th><th scope="col">Starts a new line?</th><th scope="col">Default width</th><th scope="col">width / height</th><th scope="col">Vertical margin</th></tr></thead><tbody><tr><th scope="row"><code>block</code></th><td>yes</td><td>fills the container</td><td>applied</td><td>applied (and may collapse)</td></tr><tr><th scope="row"><code>inline</code></th><td>no</td><td>its content</td><td><strong>ignored</strong></td><td><strong>ignored</strong> (padding paints but does not push lines apart)</td></tr><tr><th scope="row"><code>inline-block</code></th><td>no</td><td>its content</td><td>applied</td><td>applied</td></tr><tr><th scope="row"><code>none</code></th><td>—</td><td>removed from layout and from screen readers</td><td>—</td><td>—</td></tr></tbody></table>',
      '<p><code>display: flex</code> and <code>display: grid</code> are values of the same property: the element still behaves as a block on the outside, but lays out its <strong>children</strong> with Flexbox or Grid instead of normal flow (see <a href="#/browser/css/flex-axes">Flexbox</a>).</p>',
    ],
    example: 'A form where each `<label>` sits on its own line above its field: `label { display: block; margin-bottom: 4px; }` and `input { display: block; width: 100%; }`. Nav links that need padding and a clickable area larger than the text: `nav a { display: inline-block; padding: 8px 12px; }`.',
    mistake: 'Setting `width`, `height` or `margin-top` on an `<a>` or a `<span>` and seeing nothing happen: inline boxes size to their text and ignore those properties. Switch to `inline-block` or `block` (or lay out the parent with Flexbox). Also, `visibility: hidden` is not the same as `display: none`: hidden elements are invisible but **keep their space**.',
    live: { kind: 'html',
      html: `<p>Inline: <span class="i">span</span> <span class="i">span</span></p>
<p>Inline-block: <span class="ib">span</span> <span class="ib">span</span></p>
<p>Block: <span class="b">span</span> <span class="b">span</span></p>`,
      css: `span { width: 120px; height: 40px; padding: 6px; margin: 8px; background: #FFE9DC; border: 1px solid #FF5700; }
/* width, height, vertical margin ignored */
.i  { display: inline; }
.ib { display: inline-block; } /* in the line, but sized */
/* own line each */
.b  { display: block; }` } },

  { id: 'box-model', hub: 'box', topic: 'box',
    title: 'The box model: content, padding, border, margin',
    summary: 'Every element is drawn as a rectangle of four layers, inside out: **content**, **padding**, **border** and **margin**.',
    html: [
      '<p>The background fills the content and the padding, up to the outer edge of the border, but never the margin. Most spacing bugs put space in the wrong layer: padding makes the box itself bigger and coloured; margin pushes other boxes away. The box model tool on this card draws the four layers nested inside each other, with their sizes.</p>',
      '<dl><dt><code>padding: 10px</code></dt><dd>All four sides.</dd><dt><code>padding: 10px 20px</code></dt><dd>Top and bottom 10px, left and right 20px.</dd><dt><code>padding: 10px 20px 5px</code></dt><dd>Top 10px, left and right 20px, bottom 5px.</dd><dt><code>padding: 10px 20px 5px 0</code></dt><dd>Top, right, bottom, left: clockwise from the top. <code>margin</code> takes the same 1 to 4 values.</dd></dl>',
      '<ul><li><strong><code>border: 2px solid #ccc</code></strong> sets width, style and colour; without a style (<code>solid</code>, <code>dashed</code>, <code>dotted</code>…) no border is drawn at all.</li><li><strong>To see the layers</strong> of any element, select it in DevTools and open the <strong>Computed</strong> tab: its box diagram shows the exact sizes.</li></ul>',
    ],
    widget: 'box-model',
    practice: { href: '#/browser/css/practice/box-model', label: 'Practise with the box model' },
    example: '`.card { padding: 16px; border: 1px solid #ddd; margin-bottom: 12px; background: white; }` gives each card 16px of white breathing room around its text, a thin grey frame, and 12px of empty space before the card that follows it.',
    mistake: 'Using padding to separate two cards. Padding is **inside** the card: each card grows and its background grows with it, but the cards still touch. Space **between** boxes is margin, or `gap` when the parent is a flex or grid container.',
    live: { kind: 'html',
      html: `<div class="box">content</div>
<div class="box">second box</div>`,
      css: `body { background: #EEF0FA; }
.box {
  /* fills content + padding */
  background: #FFE9DC;
  /* inside the border */
  padding: 20px;
  border: 6px solid #FF5700;
  /* outside: shows the page background */
  margin: 24px;
}` } },

  { id: 'box-sizing', hub: 'box', topic: 'box',
    title: 'box-sizing: what width really measures',
    summary: '`box-sizing` decides which layers `width` and `height` measure: `content-box` (the default) sizes only the content, so padding and border are **added on top**; `border-box` makes padding and border fit **inside** the declared size.',
    html: [
      '<p>With the default <code>content-box</code>, <code>width: 300px</code> means "the <strong>content</strong> is 300px wide", so every pixel of padding or border makes the visible box wider than you asked for. <code>border-box</code> means "the <strong>box</strong>, border included, is 300px wide", and the content shrinks to make room. That matches how people think about layout, so most stylesheets start with <code>*, *::before, *::after { box-sizing: border-box; }</code>.</p>',
      '<table><caption><code>width: 300px; padding: 20px; border: 5px solid;</code></caption><thead><tr><th scope="col"></th><th scope="col">content-box (default)</th><th scope="col">border-box</th></tr></thead><tbody><tr><th scope="row">Content width</th><td>300px</td><td>300 − 2×20 − 2×5 = <strong>250px</strong></td></tr><tr><th scope="row">Visible width (border to border)</th><td>300 + 2×20 + 2×5 = <strong>350px</strong></td><td><strong>300px</strong></td></tr><tr><th scope="row">Margin</th><td>added outside</td><td>added outside</td></tr></tbody></table>',
      '<p>Margin is never part of the declared size, in either mode: it always sits outside.</p>',
    ],
    code: `*,
*::before,
*::after {
  box-sizing: border-box;
}`,
    example: 'Two columns with `width: 50%; padding: 20px;` side by side. With `content-box` each one is 50% + 40px wide, the pair is wider than the container and the second column wraps below the first. With `border-box` each is exactly 50% and they fit.',
    mistake: 'Thinking `border-box` also includes the margin. It does not: `width: 100%; margin: 0 16px;` still overflows its parent by 32px. A block box already fills the available width on its own, so the fix is to remove the `width` (or use `max-width`).',
    live: { kind: 'html',
      html: `<div class="box content">content-box</div>
<div class="box border">border-box</div>`,
      css: `.box {
  width: 300px;
  padding: 20px;
  border: 5px solid #1A1F6C;
  margin-bottom: 10px;
  background: #FFE9DC;
}
.content { box-sizing: content-box; } /* 350px wide on screen */
/* 300px wide on screen */
.border  { box-sizing: border-box; }` } },

  { id: 'margins-centering', hub: 'box', topic: 'box',
    title: 'Margins: centring with auto, and collapsing',
    summary: '`margin: 0 auto` centres a block that is narrower than its container (it needs a `width` or `max-width`); vertical margins between stacked blocks **collapse**, so the gap is the larger margin, not the sum.',
    html: [
      '<p>Margins do two jobs beyond spacing. <code>auto</code> margins <strong>share out the leftover space</strong>, which centres a narrow block; and in normal flow, vertical margins that touch <strong>collapse</strong> into one.</p>',
      '<h3>Centring with auto margins</h3>',
      '<p>A block with <code>max-width: 420px</code> inside an 800px container has 380px to spare, and <code>auto</code> on the left and the right splits it equally. The box needs a <code>width</code> or <code>max-width</code>, or there is no leftover space to share. <code>text-align: center</code> is a different tool: it centres the inline content <strong>inside</strong> a box, not the box itself.</p>',
      '<h3>Collapsing margins</h3>',
      '<ul><li><strong>Stacked blocks:</strong> when the bottom margin of one block meets the top margin of the next, only the larger is kept. <code>h2 { margin-bottom: 24px; }</code> above <code>p { margin-top: 16px; }</code> leaves 24px, not 40px.</li><li><strong>Through a parent:</strong> a child\'s top margin can collapse through a parent with no border, padding or content above it, so the space appears outside the parent. Padding on the parent, or making it a flex or grid container, stops it.</li><li><strong>Never</strong> horizontally, and never between the items of a flex or grid container.</li></ul>',
    ],
    example: 'A sign-in card: `.login { max-width: 420px; margin: 2rem auto; padding: 2rem; border: 1px solid #ddd; }`. On a wide screen it is 420px wide with equal space on both sides; on a 360px phone it simply takes the full width, because `max-width` is a ceiling, not a fixed size.',
    mistake: 'Using `margin: 0 auto` on a box without a width (a block already fills its container, so there is no leftover space to share) or on an inline element such as `<a>` or `<span>` (horizontal `auto` margins do nothing on inline boxes). Give the box a `max-width`, or centre it from the parent with Flexbox.',
    live: { kind: 'html',
      html: `<form class="login">
  <h2>Sign in</h2>
  <p>Centred with margin: auto.</p>
</form>
<h3 class="a">Margin-bottom 30px</h3>
<h3 class="b">Margin-top 20px: the gap is 30px, not 50px</h3>`,
      css: `body { background: #EEF0FA; }
.login {
  max-width: 260px;
  /* try text-align: center instead: the box stays left */
  margin: 0 auto;
  padding: 1rem;
  background: white;
  border: 1px solid #ccc;
}
.a { margin-bottom: 30px; background: #FFE9DC; }
.b { margin-top: 20px;    background: #FFE9DC; }` } },

  { id: 'position-overflow', hub: 'box', topic: 'display',
    title: 'Position and overflow: leaving the flow, and content that does not fit',
    summary: '`position` lets a box leave normal flow or shift from its place, and `overflow` decides what happens to content that does not fit its box.',
    html: [
      '<p>In normal flow every box takes its turn. <code>position</code> lets one box step out of that order: nudge itself, pin itself to a corner of another box, or stay on screen while the page scrolls. The offsets <code>top</code>, <code>right</code>, <code>bottom</code> and <code>left</code> say where.</p>',
      '<table><caption>The values of position</caption><thead><tr><th scope="col">Value</th><th scope="col">Keeps its space in the flow?</th><th scope="col">Offsets measured from</th><th scope="col">Typical use</th></tr></thead><tbody>'
        + '<tr><th scope="row"><code>static</code> (default)</th><td>Yes</td><td>Offsets are ignored</td><td>Normal flow</td></tr>'
        + '<tr><th scope="row"><code>relative</code></th><td>Yes, its original place</td><td>Its own normal position</td><td>Small nudges; a reference box for absolute children</td></tr>'
        + '<tr><th scope="row"><code>absolute</code></th><td>No</td><td>The nearest <strong>positioned</strong> ancestor (any value but <code>static</code>), else the page</td><td>A badge or a close button on a card corner</td></tr>'
        + '<tr><th scope="row"><code>fixed</code></th><td>No</td><td>The viewport: it stays put while the page scrolls</td><td>A back-to-top button, a cookie bar</td></tr>'
        + '<tr><th scope="row"><code>sticky</code></th><td>Yes</td><td>Scrolls normally, then sticks at its offset inside its container</td><td>A table header, a section title bar</td></tr>'
        + '</tbody></table>',
      '<ul><li><strong>The usual pair:</strong> <code>position: relative</code> on the card, with no offsets so it stays in place, and <code>position: absolute; top: 8px; right: 8px;</code> on the badge inside it.</li>'
        + '<li><strong><code>z-index</code></strong> orders overlapping boxes: a higher value is drawn in front. It works on positioned elements and on flex and grid items.</li></ul>',
      '<h3>Content that does not fit: overflow</h3>',
      '<dl><dt><code>visible</code> (default)</dt><dd>The content spills out of the box and overlaps whatever follows.</dd>'
        + '<dt><code>hidden</code></dt><dd>The content is cut off at the box edge.</dd>'
        + '<dt><code>auto</code></dt><dd>A scrollbar appears only when the content is too big.</dd>'
        + '<dt><code>scroll</code></dt><dd>Scrollbars always show.</dd></dl>',
      '<p>Vertical overflow only happens when the box has a limited height, such as <code>height</code> or <code>max-height</code>; otherwise the box simply grows with its content.</p>',
    ],
    example: 'A product card with a "Sale" badge: `.card { position: relative; }` and `.badge { position: absolute; top: 8px; right: 8px; }`. The badge sits on the card\'s corner whatever the card\'s size, and the card\'s text flows as if the badge were not there. In the Try it box, remove `position: relative` from `.card` and the badge jumps to the corner of the preview.',
    mistake: 'Giving the badge `position: absolute` but forgetting `position: relative` on the card. With no positioned ancestor the offsets are measured from the page, so every badge piles up in the page\'s top-right corner. A similar trap: `position: sticky` inside a parent with `overflow: hidden` sticks to that parent, which never scrolls, so it seems to do nothing.',
    live: { kind: 'html',
      html: `<div class="scroller">
  <h3 class="bar">Sticky title bar</h3>
  <div class="card">
    <span class="badge">Sale</span>
    <p>A card with a badge pinned to its corner.</p>
  </div>
  <p>Scroll this box: the title bar sticks to its top.</p>
  <p>More text to make the box overflow.</p>
  <p>And more.</p>
  <p>The end.</p>
</div>`,
      css: `.scroller {
  height: 170px;
  /* try hidden or visible */
  overflow: auto;
  border: 2px solid #1A1F6C;
}
.bar {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 6px;
  background: #1A1F6C;
  color: white;
}
.card {
  /* remove it: the badge jumps away */
  position: relative;
  margin: 16px 12px;
  padding: 8px 12px;
  border: 1px solid #999;
}
.badge {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #FF5700;
  color: white;
  padding: 2px 8px;
  border-radius: 999px;
}
p { margin: 8px 12px; }` } },

  /* ---- 5. Flexbox -------------------------------------------------------------------------- */
  { id: 'flex-axes', hub: 'flex', topic: 'flex',
    title: 'Flexbox: container, items and the two axes',
    summary: '`display: flex` makes an element a **flex container** and its direct children **flex items**, laid out along a **main axis** chosen with `flex-direction`; the **cross axis** is perpendicular to it.',
    html: [
      '<p>Flexbox is <strong>one-dimensional</strong>: it puts the items in a line, then distributes the space along that line. The alignment properties are named after the <strong>axes</strong>, not after left and right, so the same <code>justify-content: center</code> centres horizontally in a row and vertically in a column.</p>',
      '<table><caption>What each flex-direction does to the axes</caption><thead><tr><th scope="col">flex-direction</th><th scope="col">Main axis</th><th scope="col">Cross axis</th><th scope="col"><code>justify-content</code> moves items</th><th scope="col"><code>align-items</code> moves items</th></tr></thead><tbody><tr><th scope="row"><code>row</code> (default)</th><td>left → right</td><td>top → bottom</td><td>horizontally</td><td>vertically</td></tr><tr><th scope="row"><code>row-reverse</code></th><td>right → left</td><td>top → bottom</td><td>horizontally</td><td>vertically</td></tr><tr><th scope="row"><code>column</code></th><td>top → bottom</td><td>left → right</td><td>vertically</td><td>horizontally</td></tr><tr><th scope="row"><code>column-reverse</code></th><td>bottom → top</td><td>left → right</td><td>vertically</td><td>horizontally</td></tr></tbody></table>',
      '<ul><li><strong>Direct children only:</strong> in <code>&lt;nav&gt;&lt;ul&gt;&lt;li&gt;</code>, <code>display: flex</code> on <code>&lt;nav&gt;</code> makes the <code>&lt;ul&gt;</code> the only flex item, and the <code>&lt;li&gt;</code>s stay stacked. Make the <code>&lt;ul&gt;</code> the container to put the links in a row.</li><li><strong><code>row-reverse</code> and <code>column-reverse</code></strong> flip the visual order only. Screen readers and the Tab key still follow the HTML order, so never use them to fix content that is in the wrong order.</li></ul>',
    ],
    widget: 'flexbox',
    practice: { href: '#/browser/css/practice/flexbox', label: 'Open the Flexbox playground' },
    example: 'A site header: `header { display: flex; justify-content: space-between; align-items: center; }` puts the `<h1>` on the left and the `<nav>` on the right (main axis), both vertically centred (cross axis). Inside it, `nav ul { display: flex; gap: 1rem; list-style: none; }` turns the links into a row.',
    mistake: 'Believing `justify-content` is always horizontal. It works along the **main** axis: after `flex-direction: column` it moves items vertically and `align-items` moves them horizontally. And vertical centring in a column only shows if the container is taller than its content (give it a `height` or `min-height`).',
    live: { kind: 'html',
      html: `<header>
  <h1>Newsroom</h1>
  <nav><ul><li><a href="#">Home</a></li><li><a href="#">Articles</a></li><li><a href="#">About</a></li></ul></nav>
</header>`,
      css: `header {
  display: flex;
  /* try column */
  flex-direction: row;
  justify-content: space-between; /* main axis */
  /* cross axis */
  align-items: center;
  padding: 0 1rem;
  background: #1A1F6C;
  color: white;
}
nav ul { display: flex; gap: 1rem; list-style: none; padding: 0; } /* the ul is the flex container of the li */
nav a  { color: white; }` } },

  { id: 'flex-alignment', hub: 'flex', topic: 'flex',
    title: 'Flexbox alignment: justify-content, align-items, gap, wrap',
    summary: '`justify-content` distributes the items along the main axis, `align-items` positions them on the cross axis, `gap` sets the space between them, and `flex-wrap: wrap` lets them flow onto new lines.',
    html: [
      '<p>Once the items are on the line, two separate questions remain. <strong>Along</strong> the line: pack the items at the start, centre them, or spread them out? That is <code>justify-content</code>. <strong>Across</strong> the line: top, middle, bottom, or stretched to the full height? That is <code>align-items</code>. One property per axis.</p>',
      '<table><caption><code>justify-content</code> values (main axis)</caption><thead><tr><th scope="col">Value</th><th scope="col">Leftover space goes…</th></tr></thead><tbody><tr><th scope="row"><code>flex-start</code> (default)</th><td>all at the end; items packed at the start</td></tr><tr><th scope="row"><code>center</code></th><td>half before the first item, half after the last</td></tr><tr><th scope="row"><code>flex-end</code></th><td>all at the start; items packed at the end</td></tr><tr><th scope="row"><code>space-between</code></th><td>between items only; first and last touch the edges</td></tr><tr><th scope="row"><code>space-around</code></th><td>equal space on both sides of every item, so edges get half a gap</td></tr><tr><th scope="row"><code>space-evenly</code></th><td>equal gaps everywhere, edges included</td></tr></tbody></table>',
      '<ul><li><strong><code>align-items: stretch</code></strong>, the default, makes items without a set height as tall as the line: that is why cards in a flex row come out equal-height for free. <code>align-self</code> overrides it for one item.</li><li><strong>No wrapping by default:</strong> with <code>flex-wrap: nowrap</code> items shrink to fit and may overflow; <code>flex-wrap: wrap</code> starts a new line instead. With several lines, <code>align-content</code> positions the lines.</li><li><strong><code>gap</code></strong> on the container puts space only between items, in both directions.</li></ul>',
    ],
    widget: 'flexbox',
    practice: { href: '#/browser/css/practice/flexbox', label: 'Try the alignment challenges' },
    example: 'A tag cloud of `#javascript`, `#css`, `#webdev`, `#accessibility`, `#performance`: `.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }` keeps each tag at its natural width and moves to a new line whenever the next tag no longer fits, with the same 0.5rem gap horizontally and vertically.',
    mistake: 'Spacing items with `margin-right` on each one: the last item gets a useless margin, and wrapped lines get no vertical space. `gap` on the container puts space **only between** items, in both directions. Another one: adding `align-items: center` to a row of cards "to tidy it up" and losing their equal heights, which came from the default `stretch`.',
    live: { kind: 'html',
      html: `<div class="row">
  <div class="item">1</div><div class="item tall">2<br>taller</div><div class="item">3</div>
</div>
<div class="tags"><span>#javascript</span><span>#css</span><span>#webdev</span><span>#accessibility</span><span>#performance</span><span>#a11y</span></div>`,
      css: `.row {
  display: flex;
  justify-content: space-between; /* try center, space-around, space-evenly */
  /* try flex-start, center, flex-end */
  align-items: stretch;
  height: 120px;
  background: #EEF0FA;
}
.item { width: 60px; background: #FF5700; color: white; text-align: center; }

.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; max-width: 280px; }
.tags span { background: #1A1F6C; color: white; padding: 2px 10px; border-radius: 999px; }` } },

  { id: 'flex-sizing', hub: 'flex', topic: 'flex',
    title: 'Flexible sizes: flex-grow, flex-shrink, flex-basis',
    summary: 'Each flex item starts from a size (`flex-basis`), takes a share of any leftover space (`flex-grow`) and gives back a share of any overflow (`flex-shrink`); the shorthand `flex` sets all three.',
    html: [
      '<p>Flexbox sizes items in two steps. First each item gets its <strong>basis</strong>: its <code>width</code>, or its content size when the basis is <code>auto</code>. Then the container compares the total with its own size and shares out the difference.</p>',
      '<table><caption>Common <code>flex</code> shorthands</caption><thead><tr><th scope="col">Shorthand</th><th scope="col">Expands to</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">(default)</th><td><code>0 1 auto</code></td><td>content size, may shrink, never grows</td></tr><tr><th scope="row"><code>flex: 1</code></th><td><code>1 1 0%</code></td><td>equal shares of all the space</td></tr><tr><th scope="row"><code>flex: 2</code></th><td><code>2 1 0%</code></td><td>twice the share of a <code>flex: 1</code> sibling</td></tr><tr><th scope="row"><code>flex: auto</code></th><td><code>1 1 auto</code></td><td>content size plus a share of the leftover</td></tr><tr><th scope="row"><code>flex: none</code></th><td><code>0 0 auto</code></td><td>exactly its content size; never grows or shrinks</td></tr></tbody></table>',
      '<p>The default is <code>flex: 0 1 auto</code>: content size, may shrink, never grows. <code>flex: 1</code> means <code>1 1 0%</code>: start from zero and take an equal share, so all <code>flex: 1</code> items end up the same width, and <code>flex: 2</code> next to <code>flex: 1</code> gives a 2:1 split.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Start from the basis, then share out the difference.',
      desc: 'Each item starts from its flex-basis. If the items leave room to spare, the leftover space is shared in proportion to flex-grow. If they overflow, the excess is taken back in proportion to flex-shrink.',
      nodes: [
        { id: 'basis', label: 'Each `flex-basis`', note: 'the starting sizes', key: true },
        { id: 'grow', label: 'Space left', note: 'shared by `flex-grow`' },
        { id: 'shrink', label: 'Too wide', note: 'taken back by `flex-shrink`' },
      ],
      edges: [['basis', 'grow', 'room to spare'], ['basis', 'shrink', 'overflow']],
    },
    widget: 'flexbox',
    example: 'A search bar: `.search { display: flex; gap: 8px; }`, `.search input { flex: 1; }`, `.search button { flex: none; }`. The button keeps its natural width and the input takes **all** the rest, on any screen width. In a 600px container with no gap, two items with `flex: 1` and `flex: 2` become 200px and 400px.',
    mistake: 'Expecting `flex: 1` items to be equal when one contains a long unbreakable word, a URL or a wide image. A flex item will not shrink below its content\'s minimum width (`min-width: auto` by default), so it pushes its siblings narrower or overflows. Add `min-width: 0` (and, for text, `overflow-wrap: anywhere`) to the item.',
    live: { kind: 'html',
      html: `<form class="search"><input placeholder="Search articles"><button>Search</button></form>
<div class="split"><div class="one">flex: 1</div><div class="two">flex: 2</div></div>`,
      css: `.search { display: flex; gap: 8px; }
/* takes all the leftover space */
.search input  { flex: 1; padding: 6px; }
/* keeps its natural width */
.search button { flex: none; }

.split { display: flex; margin-top: 1rem; }
.split div { padding: 8px; color: white; }
.one { flex: 1; background: #1A1F6C; }
/* twice the share */
.two { flex: 2; background: #FF5700; }` } },

  /* ---- 6. Grid ----------------------------------------------------------------------------- */
  { id: 'grid-tracks', hub: 'grid', topic: 'grid',
    title: 'Grid: tracks, fr and auto-placement',
    summary: '`display: grid` turns an element\'s children into **grid items** placed in cells formed by column and row **tracks**, sized with `grid-template-columns` / `grid-template-rows` in px, %, `auto` or `fr` (a share of the free space).',
    html: [
      '<p>Flexbox starts from the <strong>items</strong> and lets them find room on a line; Grid starts from the <strong>container</strong>: you draw the columns (and, if you need them, the rows) first, and the items drop into the cells. That suits page skeletons and card galleries, where things must line up both across and down.</p>',
      '<p><strong><code>fr</code> is computed last.</strong> In <code>grid-template-columns: 200px 1fr 2fr; gap: 10px;</code> on a 920px container, 920 − 200 − 2 × 10 = 700px are free, so <code>1fr</code> = 233.3px and <code>2fr</code> = 466.7px.</p>',
      '<p><strong>Auto-placement:</strong> items you do not place yourself fill the cells in HTML order, left to right and then onto new rows, sized by their content unless <code>grid-auto-rows</code> says otherwise. So usually you only define the columns.</p>',
      '<dl><dt><code>repeat(3, 1fr)</code></dt><dd>Short for <code>1fr 1fr 1fr</code>.</dd><dt><code>minmax(200px, 1fr)</code></dt><dd>A track never narrower than 200px, growing up to <code>1fr</code>.</dd><dt><code>repeat(auto-fit, minmax(220px, 1fr))</code></dt><dd>As many 220px-or-wider columns as fit: a card gallery goes from 4 columns to 1 without any media query.</dd><dt><code>gap</code></dt><dd>Space between tracks (or <code>row-gap</code> / <code>column-gap</code>), never at the outer edges.</dd></dl>',
    ],
    diagram: {
      kind: 'flow',
      numbered: true,
      title: 'fr is computed last, from whatever space is left.',
      desc: 'For grid-template-columns: 200px 1fr 2fr with a 10px gap on a 920px container: start from the container width, subtract the fixed track and the two gaps, which leaves 700px of free space, then share that space out by fr: 1fr is about 233px and 2fr about 467px.',
      nodes: [
        { id: 'container', label: 'Container', note: '920px wide' },
        { id: 'fixed', label: 'Fixed and gaps', note: '200px, two 10px gaps' },
        { id: 'free', label: 'Free space', note: '700px', key: true },
        { id: 'fr', label: 'Shared by `fr`', note: '`1fr` = 233px' },
      ],
      edges: [['container', 'fixed'], ['fixed', 'free'], ['free', 'fr']],
    },
    widget: 'grid',
    practice: { href: '#/browser/css/practice/grid', label: 'Open the Grid playground' },
    example: 'The Newsroom `<main>` with `display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;` on a 930px container: 930 − 32 = 898px free, so the article column is 598.7px and the sidebar 299.3px, and both keep that 2:1 ratio at any width.',
    mistake: 'Putting `grid-template-columns: 2fr 1fr` on a `<main>` that has **three** children and expecting "articles left, sidebar right". Auto-placement fills the cells in order: the first child takes the left cell, the second the right cell, and the third wraps to the left cell of row 2. Make the extra child span both columns or place the items explicitly (see [Placing grid items](#/browser/css/grid-placement)).',
    live: { kind: 'html',
      html: `<main>
  <section class="featured">#featured (1st child)</section>
  <section class="articles">#articles (2nd child)</section>
  <aside>aside (3rd child)</aside>
</main>
<p>Uncomment the last rule: #featured spans both columns, so #articles and aside end up side by side.</p>`,
      css: `main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}
main > * { padding: 12px; color: white; }
.featured { background: #FF5700; }
.articles { background: #1A1F6C; }
aside     { background: #3E7C6B; }

/* .featured { grid-column: 1 / -1; } */` } },

  { id: 'grid-placement', hub: 'grid', topic: 'grid',
    title: 'Placing grid items: lines, spans and alignment',
    summary: 'Grid **lines** are numbered from 1 at the start edge (and from −1 at the end edge). `grid-column` / `grid-row` place an item between two lines (`1 / 3`) or make it `span` several tracks; `justify-items` / `align-items` position the content inside each cell.',
    html: [
      '<p>A grid with 3 columns has <strong>4 vertical lines</strong>: line 1 before the first column, line 4 after the last. Placement is written in lines, not cells: <code>grid-column: 1 / 3</code> covers the first two columns. Negative numbers count from the end, so <code>1 / -1</code> always means the full width.</p>',
      '<table><caption>Placement in a 3-column grid</caption><thead><tr><th scope="col">Declaration</th><th scope="col">Covers</th></tr></thead><tbody><tr><th scope="row"><code>grid-column: 1 / 2</code></th><td>column 1 only (line 1 to line 2)</td></tr><tr><th scope="row"><code>grid-column: 1 / 3</code></th><td>columns 1 and 2</td></tr><tr><th scope="row"><code>grid-column: 1 / -1</code></th><td>all three columns (first line to last line)</td></tr><tr><th scope="row"><code>grid-column: span 2</code></th><td>two columns, starting wherever auto-placement puts it</td></tr><tr><th scope="row"><code>grid-column: 2 / span 2</code></th><td>columns 2 and 3</td></tr><tr><th scope="row"><code>grid-row: span 2</code></th><td>two rows tall</td></tr></tbody></table>',
      '<ul><li><strong><code>span n</code></strong> covers n tracks from wherever the item would start: <code>grid-column: span 2</code>. The forms mix: <code>2 / span 2</code> starts at line 2 and covers two columns. <code>grid-row</code> works the same way vertically.</li><li><strong>Inside its cell</strong> an item is positioned by <code>justify-items</code> (horizontally) and <code>align-items</code> (vertically), set on the container and both <code>stretch</code> by default. <code>justify-self</code> and <code>align-self</code> override them for one item; <code>justify-items</code> has no effect in a flex container.</li></ul>',
    ],
    widget: 'grid',
    practice: { href: '#/browser/css/practice/grid', label: 'Practise spans and placement' },
    example: 'A gallery of six cards in `repeat(3, 1fr)`: give the first card `grid-column: span 2; grid-row: span 2;` and it becomes a featured tile covering a 2×2 block, while the remaining cards auto-place around it with no extra HTML.',
    mistake: 'Counting columns instead of lines: `grid-column: 1 / 2` covers just **one** column. To cover columns 1 and 2 write `1 / 3` (or `1 / span 2`). Another one: using `1 / -1` with only implicit columns: `-1` refers to the last line of the **explicit** grid (the one defined by `grid-template-columns`).',
    live: { kind: 'html',
      html: `<div class="gallery">
  <div class="big">1 (span 2 × 2)</div><div>2</div><div>3</div><div>4</div><div>5</div>
  <div class="wide">6 (1 / -1)</div>
</div>`,
      css: `.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.gallery div { background: #1A1F6C; color: white; padding: 12px; }
.gallery .big  { grid-column: span 2; grid-row: span 2; background: #FF5700; }
.gallery .wide { grid-column: 1 / -1; background: #3E7C6B; }` } },

  { id: 'grid-areas', hub: 'grid', topic: 'grid',
    title: 'Named areas: grid-template-areas',
    summary: '`grid-template-areas` draws the layout as text, one quoted string per row and one name per cell; each item is then placed with `grid-area: name`.',
    html: [
      '<p><code>grid-template-areas</code> lets you sketch a page skeleton as text, the way you would on paper: header across the top, sidebar beside the content, footer at the bottom. Each item is then placed by name.</p>',
      '<ul><li><strong>The same number of cells</strong> in every string, matching the columns.</li><li><strong>Rectangles only:</strong> each named area must form a rectangle, never an L shape. A <code>.</code> marks an empty cell; a name repeated across neighbouring cells spans them.</li><li><strong>A broken template</strong> makes the whole declaration invalid, so it is ignored.</li><li><strong>Names without quotes</strong> on the items: <code>.site-header { grid-area: header; }</code>. Every child needs one: a child without <code>grid-area</code> is auto-placed into a free cell.</li></ul>',
      '<p>To rearrange the regions on a narrow screen, redraw the sketch inside a media query (see <a href="#/browser/css/media-queries">Media queries and breakpoints</a>).</p>',
    ],
    code: `.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
  gap: 1.5rem;
}
.site-header { grid-area: header; }
.sidebar     { grid-area: sidebar; }
.content     { grid-area: content; }
.site-footer { grid-area: footer; }`,
    widget: 'grid',
    example: 'In this layout the header and the footer span both columns because their names repeat across their row, and the sidebar and the content share the middle row. Redrawing the sketch as one column (`"header" "content" "sidebar" "footer"`, with `grid-template-columns: 1fr`) moves the sidebar below the content without touching the HTML.',
    mistake: 'Defining the areas on the container but forgetting `grid-area` on one item (typically the header or footer). That item is auto-placed into the first free cell, often squeezed into the sidebar column, and the named area stays empty. Every region in the sketch needs a matching `grid-area` on exactly one element.',
    live: { kind: 'html',
      html: `<div class="page">
  <header class="site-header">header</header>
  <nav class="sidebar">sidebar</nav>
  <main class="content">content</main>
  <footer class="site-footer">footer</footer>
</div>`,
      css: `.page {
  display: grid;
  grid-template-columns: 120px 1fr;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
  gap: 8px;
}
.page > * { padding: 12px; color: white; }
.site-header { grid-area: header;  background: #1A1F6C; }
.sidebar     { grid-area: sidebar; background: #3E7C6B; }
.content     { grid-area: content; background: #FF5700; min-height: 80px; }
.site-footer { grid-area: footer;  background: #555; }` } },

  { id: 'flex-vs-grid', hub: 'grid', topic: 'layout',
    title: 'Flexbox or Grid?',
    summary: 'Use **Flexbox** when items flow along one line and their content should decide their size; use **Grid** when rows and columns must line up and the container should decide the sizes. Most pages use both: Grid for the page skeleton, Flexbox inside the regions.',
    html: [
      '<p>Ask <strong>"content out or layout in?"</strong> Flexbox is content-out: give it items and it fits them into a line, each line independent of the others. Grid is layout-in: you define the tracks first and the items obey them. If the items on the second line of a wrapped flex container should line up with the first line, you wanted Grid.</p>',
      '<table><caption>Typical choices</caption><thead><tr><th scope="col">Situation</th><th scope="col">Tool</th><th scope="col">Why</th></tr></thead><tbody><tr><th scope="row">Logo on the left, nav on the right</th><td>Flexbox</td><td>one row; <code>justify-content: space-between</code></td></tr><tr><th scope="row">Links in a nav bar, buttons in a toolbar</th><td>Flexbox</td><td>one row of content-sized items with <code>gap</code></td></tr><tr><th scope="row">Tags or chips of different lengths</th><td>Flexbox + <code>flex-wrap</code></td><td>each item keeps its natural width</td></tr><tr><th scope="row">Input stretching next to a button</th><td>Flexbox</td><td><code>flex: 1</code> on the input</td></tr><tr><th scope="row">Page skeleton: header / sidebar / main / footer</th><td>Grid</td><td>two dimensions, named areas</td></tr><tr><th scope="row">Card gallery whose columns line up</th><td>Grid</td><td>columns shared by every row</td></tr><tr><th scope="row">Content + sidebar with a fixed ratio</th><td>Grid</td><td><code>grid-template-columns: 2fr 1fr</code></td></tr></tbody></table>',
      '<p>They nest freely: a grid cell can be a flex container and a flex item can be a grid container. In a typical news-style page, <code>&lt;main&gt;</code> is a grid, the header and the nav list are flex rows, and each card uses Flexbox for its own contents.</p>',
    ],
    diagram: {
      kind: 'branch',
      title: 'Choose by the shape of the problem.',
      desc: 'Start from the shape of the problem. Content out, one line of items sized by their content: Flexbox. Layout in, rows and columns that must line up: Grid.',
      nodes: [
        { id: 'shape', label: 'Your layout problem', key: true },
        { id: 'flex', label: 'Flexbox', note: 'one line, content sizes' },
        { id: 'grid', label: 'Grid', note: 'rows and columns align' },
      ],
      edges: [['shape', 'flex', 'content out'], ['shape', 'grid', 'layout in']],
    },
    example: 'A club homepage: `body` (or a wrapper) is a grid with areas header / main / footer; the header is a flex row (crest left, nav right); the fixtures list on the main area is a grid of match cards; each match card is a flex row (home team, score, away team) with `justify-content: space-between`.',
    mistake: 'Believing one replaced the other ("Grid is the new Flexbox" or "just use Flexbox for everything"). Building a card gallery with wrapped Flexbox gives a last row whose cards stretch wider than the rest; building a nav bar with Grid forces you to count columns every time a link is added. Choose by the shape of the problem.',
    live: { kind: 'html',
      html: `<div class="flex"><span>Short</span><span>A much longer item</span><span>Mid item</span><span>Tiny</span><span>Another long one</span></div>
<div class="grid"><span>Short</span><span>A much longer item</span><span>Mid item</span><span>Tiny</span><span>Another long one</span></div>`,
      css: `span { background: #1A1F6C; color: white; padding: 6px; }
/* Flexbox: content-out, each line on its own */
.flex { display: flex; flex-wrap: wrap; gap: 6px; max-width: 320px; margin-bottom: 1rem; }
.flex span { flex: 1 1 auto; }
/* Grid: layout-in, columns line up on every row */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 320px; }
.grid span { background: #FF5700; }` } },

  /* ---- 7. Responsive design ---------------------------------------------------------------- */
  { id: 'responsive-foundations', hub: 'responsive', topic: 'responsive',
    title: 'Responsive foundations: viewport tag, fluid widths, fluid images',
    summary: 'A responsive page adapts to any screen width. It needs the viewport `<meta>` tag, widths that are relative instead of fixed (`%`, `fr`, `max-width`), and images capped with `img { max-width: 100%; height: auto; }`.',
    html: [
      '<p>Phones were designed to show pages built for desktops. Unless a page says otherwise, a mobile browser lays it out on a virtual canvas about <strong>980px wide</strong> and zooms out until it fits: the text becomes tiny and no narrow-screen breakpoint ever matches. Three pieces make a page adapt instead.</p>',
      '<dl><dt>The viewport tag</dt><dd><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code> in the <code>&lt;head&gt;</code> of every page: "this page is designed for your real width".</dd><dt>Fluid widths</dt><dd>Blocks fill their container, grids share space with <code>fr</code>, and a content wrapper is capped with <code>max-width</code> and centred with <code>margin: 0 auto</code>.</dd><dt>Fluid images</dt><dd><code>max-width: 100%</code> lets an image shrink with its container but never grow beyond its natural size; <code>height: auto</code> recalculates the height so the proportions are kept.</dd></dl>',
      '<p>With those in place the layout stretches and shrinks on its own. Media queries are only needed for what fluid sizing cannot do, such as moving the sidebar below the content (see <a href="#/browser/css/media-queries">Media queries and breakpoints</a>).</p>',
    ],
    code: `<!-- in the <head> of EVERY page -->
<meta name="viewport" content="width=device-width, initial-scale=1">

/* styles.css */
img {
  /* shrink with the container, never stretch */
  max-width: 100%;
  /* keep the aspect ratio */
  height: auto;
}
.container {
  max-width: 1100px; /* a ceiling, not a fixed width */
  margin: 0 auto;
  padding: 0 1rem;
}`,
    example: 'An `<img src="featured.jpg" width="800" height="400">` in a 360px-wide phone column: with `max-width: 100%; height: auto;` it is drawn 360 × 180, keeping its 2:1 shape. To test, open DevTools and toggle the device toolbar (Ctrl+Shift+M / Cmd+Shift+M) to emulate a phone; without the viewport tag, the emulated phone shows the zoomed-out desktop layout.',
    mistake: 'Writing `max-width: 100%` but forgetting `height: auto` on an image that has `width` and `height` attributes: the width shrinks but the height stays at the attribute value, so the picture is squashed. And using `width: 100%` instead of `max-width: 100%`: small images such as logos and icons are stretched up and blurred.',
    live: { kind: 'html',
      html: `<div class="column">
  <p>An 800 × 400 image inside a 240px column:</p>
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%231A1F6C'/%3E%3Ccircle cx='400' cy='200' r='150' fill='%23FF5700'/%3E%3C/svg%3E" width="800" height="400" alt="Orange circle on a navy background">
</div>`,
      css: `.column { width: 240px; border: 2px dashed #999; padding: 8px; }
img {
  max-width: 100%;
  /* delete this line: the circle is squashed */
  height: auto;
}` } },

  { id: 'media-queries', hub: 'responsive', topic: 'responsive',
    title: 'Media queries and breakpoints',
    summary: 'A media query such as `@media (max-width: 768px) { … }` wraps rules that apply only while a condition about the device is true, most often the viewport width. The width at which the layout changes is called a **breakpoint**.',
    html: [
      '<p>A media query is an <strong>if</strong> for CSS: the rules inside are ignored until the condition becomes true, and switch off again when it stops being true, live, as the window is resized. The width at which the layout changes is a <strong>breakpoint</strong>.</p>',
      '<dl><dt><code>max-width: 768px</code></dt><dd>A viewport 768px wide or less. <strong>Desktop-first</strong> stylesheets write the wide layout as the base and override it with these.</dd><dt><code>min-width: 600px</code></dt><dd>600px or wider. <strong>Mobile-first</strong> stylesheets write the one-column layout as the base and add columns with these; the narrow layout is the simplest, so there is less to override.</dd></dl>',
      '<ul><li><strong>No extra specificity:</strong> a rule inside a query competes like any other, so the <code>@media</code> block must come <strong>after</strong> the base rules it overrides.</li><li><strong>More conditions:</strong> <code>and</code> combines them, as in <code>(min-width: 600px) and (max-width: 900px)</code>; <code>@media print</code> and <code>(prefers-color-scheme: dark)</code> test more than width.</li><li><strong>Named areas:</strong> a new <code>grid-template-areas</code> sketch inside a query moves whole regions at once (see <a href="#/browser/css/grid-areas">Named areas</a>).</li><li><strong>Breakpoints</strong> belong where <em>your</em> layout starts to look wrong, not at specific phone models.</li></ul>',
    ],
    diagram: {
      kind: 'flow',
      title: 'Mobile-first: a narrow base, enhanced as the screen gets wider.',
      desc: 'The base rules give one column at any width. From 600px wide, a min-width query switches to two columns. From 1000px wide, a second query switches to three columns.',
      nodes: [
        { id: 'base', label: 'Base rules', note: 'one column, any width', key: true },
        { id: 'mid', label: 'From 600px', note: 'two columns' },
        { id: 'wide', label: 'From 1000px', note: 'three columns' },
      ],
      edges: [['base', 'mid', '`min-width: 600px`'], ['mid', 'wide', '`min-width: 1000px`']],
    },
    code: `/* Desktop-first: wide layout is the base */
main { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* 768px or narrower */
@media (max-width: 768px) {
  main { grid-template-columns: 1fr; }
}

/* Mobile-first: one column is the base */
.cards { display: grid; gap: 1rem; }

/* 600px or wider */
@media (min-width: 600px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1000px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
}`,
    widget: 'responsive',
    practice: { href: '#/browser/css/practice/responsive', label: 'Practise with breakpoints' },
    example: 'A typical news-style page: `main` is a two-column grid (`2fr 1fr`); at 768px or less, `@media (max-width: 768px) { main { grid-template-columns: 1fr; } }` turns it into one column, so the `<aside>` drops below the articles. Resize the window (or use the DevTools device toolbar) to check that the switch really happens.',
    mistake: 'Putting the `@media` block at the **top** of the stylesheet. The base rule `main { grid-template-columns: 2fr 1fr; }` further down has the same specificity and comes later, so it wins at every width and the breakpoint seems broken. Media queries go after the rules they modify. The other classic cause is a missing viewport `<meta>` tag (see [Responsive foundations](#/browser/css/responsive-foundations)).',
    live: { kind: 'html',
      html: `<div class="banner">Resize your window: this preview changes colour and layout at 480px.</div>
<div class="cards"><div>A</div><div>B</div><div>C</div></div>`,
      css: `/* mobile-first base */
.banner { background: #FF5700; color: white; padding: 8px; }
.cards  { display: grid; gap: 8px; margin-top: 8px; }
.cards div { background: #1A1F6C; color: white; padding: 16px; }

/* 480px or wider */
@media (min-width: 480px) {
  .banner { background: #1A1F6C; }
  .cards  { grid-template-columns: repeat(3, 1fr); }
}` } },
];

DATA.en.CSS_QUIZ = [
  /* ---- apply ---- */
  { type: 'mc', topic: 'apply',
    q: 'A stylesheet contains `p { colr: navy; font-size: 18px; }`. What does the browser do?',
    choices: ['Refuses to load the whole stylesheet', 'Ignores the whole `p` rule', 'Ignores only `colr: navy` and applies `font-size: 18px`', 'Shows an error message at the top of the page'],
    answer: 2,
    why: 'CSS fails per declaration and silently: an unknown property or invalid value drops that one declaration; the rest of the rule and the stylesheet still apply. DevTools shows it struck through.' },
  { type: 'tf', topic: 'apply',
    q: 'When five pages link the same external stylesheet, the browser can download it once and reuse the cached copy on the other pages.',
    answer: true,
    why: 'That is one of the two big wins of external CSS: one place to edit, and one file to download and cache for the whole site.' },
  { type: 'fib', topic: 'apply',
    q: 'An external stylesheet is linked with `<link rel="___" href="styles.css">` inside the `<head>`.',
    accept: ['stylesheet'],
    why: '`rel="stylesheet"` tells the browser what the linked file is for. `<style>` has no `src` attribute, so `<link>` is the only HTML way to load an external CSS file.' },

  /* ---- selectors ---- */
  { type: 'mc', topic: 'selectors',
    q: 'Which selector matches `<button class="btn primary">` but **not** `<button class="btn">`?',
    choices: ['`.btn.primary`', '`.btn .primary`', '`.btn, .primary`', '`button > .primary`'],
    answer: 0,
    why: 'No space = one element with both classes. `.btn .primary` looks for a `.primary` inside a `.btn`; the comma version matches either class, so it also matches the plain `.btn` button.' },
  { type: 'mc', topic: 'selectors',
    q: 'Given `<nav class="menu"><ul><li><a href="#">Home</a></li></ul></nav>`, which selector does **not** match the link?',
    choices: ['`.menu a`', '`li > a`', '`.menu > a`', '`nav ul a`'],
    answer: 2,
    why: '`>` means direct child, and the link is a great-grandchild of `.menu` (nav → ul → li → a). The descendant combinator (space) matches at any depth.' },
  { type: 'tf', topic: 'selectors',
    q: '`button :hover` (with a space before the colon) means the same as `button:hover`.',
    answer: false,
    why: 'The space is the descendant combinator: `button :hover` targets a hovered element **inside** a button. A pseudo-class must be glued to its selector: `button:hover`.' },
  { type: 'fib', topic: 'selectors',
    q: 'The pseudo-class that matches a text field while the user is typing in it (it has keyboard focus) is `:___`.',
    accept: ['focus', 'focus-visible'],
    why: '`:focus` (or `:focus-visible`, which only shows when the browser judges the focus should be visible) lets you highlight the active field, an accessibility requirement for keyboard users.' },

  /* ---- cascade ---- */
  { type: 'mc', topic: 'cascade',
    q: 'Which selector has the **highest** specificity?',
    choices: ['`nav ul li a`', '`.menu .link`', '`#main a`', '`a:hover`'],
    answer: 2,
    why: 'Scores: (0,0,4), (0,2,0), (1,0,1) and (0,1,1). The id gives `#main a` a 1 in the first column, which beats any number of classes or types.' },
  { type: 'mc', topic: 'cascade',
    q: 'What is the specificity of `.card > h3:first-child`?',
    choices: ['(0,1,1)', '(0,2,2)', '(1,1,1)', '(0,2,1)'],
    answer: 3,
    why: 'One class (`.card`) plus one pseudo-class (`:first-child`) = 2 in the b column; one type (`h3`) = 1 in the c column; the `>` counts nothing.' },
  { type: 'mc', topic: 'cascade',
    q: 'The stylesheet has `.btn { background: grey; }` followed by `.cta { background: orange; }`. What colour is `<a class="cta btn">`?',
    choices: ['Grey, because `btn` is written last in the HTML', 'Orange, because `.cta` comes later in the stylesheet and both selectors have equal specificity', 'Grey, because the first matching rule always wins', 'Neither: conflicting rules cancel each other'],
    answer: 1,
    why: 'Both selectors score (0,1,0), so source order decides and the later declaration wins. The order of class names inside the HTML `class` attribute never matters.' },
  { type: 'tf', topic: 'cascade',
    q: 'A selector made of eleven classes beats a selector made of a single id.',
    answer: false,
    why: 'Specificity is compared column by column with no carrying: (0,11,0) loses to (1,0,0), because the first column (ids) is compared first.' },
  { type: 'mc', topic: 'cascade',
    q: 'You write `.card { color: darkred; border: 1px solid; }`. A `<p>` inside the card has no rules of its own. What does the paragraph get?',
    choices: ['The colour but no border of its own', 'Both the colour and its own border', 'Its own border but not the colour', 'Neither'],
    answer: 0,
    why: '`color` is inherited, `border` is not: text properties flow down the tree, box properties stay on the element that declares them.' },
  { type: 'mc', topic: 'cascade',
    q: 'You set `body { color: #333; }`, yet the links inside paragraphs stay blue. Why?',
    choices: ['Links cannot be recoloured with CSS', '`color` is not an inherited property', 'Inline elements never inherit anything', 'The browser\'s default stylesheet has a rule that targets `a` directly, and any direct rule beats an inherited value'],
    answer: 3,
    why: 'Inheritance only applies when no rule targets the element itself. The user-agent rule for `a` does, so the link keeps the default colour until you target it (`a { color: inherit; }`).' },
  { type: 'fib', topic: 'cascade',
    q: 'Buttons and inputs do not use the page font by default. To make them take their parent\'s font, write `button, input { font: ___; }`.',
    accept: ['inherit'],
    why: 'The browser gives form controls their own font, which beats inheritance. The `inherit` keyword forces the parent\'s value.' },

  /* ---- box ---- */
  { type: 'mc', topic: 'box',
    q: '`.box { box-sizing: content-box; width: 200px; padding: 10px; border: 5px solid; margin: 20px; }` How wide is the box from the outer edge of its left border to the outer edge of its right border?',
    choices: ['200px', '220px', '230px', '270px'],
    answer: 2,
    why: 'With content-box, width measures the content only: 200 + 2×10 padding + 2×5 border = 230px. The margin (another 40px) lies outside the border.' },
  { type: 'mc', topic: 'box',
    q: 'Same box, but with `box-sizing: border-box`. How wide is the **content** area now?',
    choices: ['170px', '200px', '180px', '150px'],
    answer: 0,
    why: 'With border-box the 200px includes padding and border, so the content gets 200 − 20 − 10 = 170px. The margin is still outside.' },
  { type: 'mc', topic: 'box',
    q: 'Two paragraphs are stacked in normal flow. The first has `margin-bottom: 30px`, the second `margin-top: 20px`. How much space is between them?',
    choices: ['50px', '20px', '10px', '30px'],
    answer: 3,
    why: 'Adjacent vertical margins collapse: only the larger one (30px) is kept. They would add up inside a flex or grid container, where margins do not collapse.' },
  { type: 'mc', topic: 'box',
    q: '`padding: 4px 12px 8px;` sets the **left** padding to:',
    choices: ['4px', '12px', '8px', '0'],
    answer: 1,
    why: 'With three values the order is top, left-and-right, bottom. The middle value (12px) applies to both left and right.' },

  /* ---- display ---- */
  { type: 'mc', topic: 'display',
    q: 'You give a `<span>` (no other rules) `width: 200px; height: 40px;`. What happens?',
    choices: ['It becomes 200 × 40', 'Only the width applies', 'Both are ignored, because a span is inline', 'It becomes a block element'],
    answer: 2,
    why: 'Inline boxes size to their content and ignore width and height. Use `display: inline-block` (or block) to make them apply.' },
  { type: 'fib', topic: 'display',
    q: 'To put each `<label>` on its own line above its input field, give the labels `display: ___;`.',
    accept: ['block'],
    why: '`<label>` is inline by default, so it sits next to the input. As a block it starts a new line and takes the full width.' },
  { type: 'tf', topic: 'display',
    q: '`display: inline-block` lets an element sit inside a line of text while still respecting width, height and vertical padding and margin.',
    answer: true,
    why: 'Inline-block is inline on the outside (flows in the line) and block on the inside (sizes apply). It is a common choice for nav links that need padding.' },
  { type: 'mc', topic: 'display',
    q: 'A badge has `position: absolute; top: 0; right: 0;`, but no element around it has a `position` rule. Where does the badge end up?',
    choices: ['At the top-right corner of its card', 'Where it would be in normal flow', 'At the top-right corner of the page, the fallback when no ancestor is positioned', 'Nowhere: absolute elements need a z-index to show'],
    answer: 2,
    why: 'Absolute offsets are measured from the nearest positioned ancestor (any position but static). With none, the page is the reference. Give the card `position: relative` to pin the badge to it.' },
  { type: 'tf', topic: 'display',
    q: 'An element with `position: absolute` keeps its space in the normal flow, so the content after it does not move.',
    answer: false,
    why: 'Absolute (and fixed) positioning takes the element out of the flow: the content after it moves up into its place. Relative positioning is the one that keeps the original space.' },
  { type: 'fib', topic: 'display',
    q: 'A box with a fixed height should show a scrollbar only when its content is too tall: `overflow: ___;`',
    accept: ['auto'],
    why: '`auto` adds scrollbars only when needed; `scroll` always shows them, `hidden` cuts the content off and `visible` (the default) lets it spill out.' },

  /* ---- units ---- */
  { type: 'mc', topic: 'units',
    q: 'With the default root font size, how big is text with `font-size: 1.25rem`?',
    choices: ['20px', '16px', '25px', 'It depends on the parent\'s font size'],
    answer: 0,
    why: '`rem` always refers to the root (`<html>`) font size, 16px by default: 1.25 × 16 = 20px, whatever the parent is.' },
  { type: 'mc', topic: 'units',
    q: 'A parent has `font-size: 20px`. Its child has `font-size: 1.5em; padding: 1em;`. How big is the child\'s padding?',
    choices: ['20px', '16px', '24px', '30px'],
    answer: 3,
    why: 'Inside `font-size`, `em` is relative to the parent: 1.5 × 20 = 30px. Everywhere else `em` is relative to the element\'s own font size, so `padding: 1em` = 30px.' },
  { type: 'tf', topic: 'units',
    q: 'The `fr` unit can be used for the `width` of any element.',
    answer: false,
    why: '`fr` only exists in grid track sizes (`grid-template-columns`, `grid-template-rows`, `grid-auto-rows`…). `width: 1fr` is invalid and ignored.' },

  /* ---- flex ---- */
  { type: 'mc', topic: 'flex',
    q: 'A flex container has `flex-direction: column`. Which declaration centres its items **horizontally**?',
    choices: ['`align-items: center`', '`justify-content: center`', '`text-align: center`', '`align-content: center`'],
    answer: 0,
    why: 'In a column the main axis is vertical, so the cross axis is horizontal, and the cross axis is controlled by `align-items`.' },
  { type: 'mc', topic: 'flex',
    q: 'You write `nav { display: flex; }` for `<nav><ul><li>…</li><li>…</li></ul></nav>`. Which elements become flex items?',
    choices: ['The `<li>` elements', 'Only the `<ul>`', 'The `<ul>` and every `<li>`', 'The `<a>` elements inside the list items'],
    answer: 1,
    why: 'Only direct children of a flex container are flex items. To put the list items in a row, make the `<ul>` the flex container.' },
  { type: 'mc', topic: 'flex',
    q: 'A 600px flex container (no gap) holds two items: one with `flex: 1`, the other with `flex: 2`. How wide are they?',
    choices: ['300px and 300px', '100px and 500px', 'It depends on their content', '200px and 400px'],
    answer: 3,
    why: '`flex: n` sets a basis of 0 and grow factor n, so the 600px are split 1:2. (Very long unbreakable content could still force a different result, because items do not shrink below their minimum content width.)' },
  { type: 'tf', topic: 'flex',
    q: 'By default, flex items move onto a new line when they no longer fit in the container.',
    answer: false,
    why: 'The default is `flex-wrap: nowrap`: items shrink and may overflow. You must opt in with `flex-wrap: wrap`.' },
  { type: 'fib', topic: 'flex',
    q: 'The default value of `align-items` in a flex container, which makes items in a row equally tall, is `___`.',
    accept: ['stretch'],
    why: 'With `stretch`, items with no set height fill the cross axis of the line. Changing it to `center` or `flex-start` loses the equal heights.' },

  /* ---- grid ---- */
  { type: 'mc', topic: 'grid',
    q: 'A 540px grid container has `grid-template-columns: 100px 1fr 1fr; gap: 20px;`. How wide is each `1fr` column?',
    choices: ['180px', '220px', '200px', '270px'],
    answer: 2,
    why: 'Free space = 540 − 100 (fixed track) − 2 × 20 (two gaps) = 400px, shared between 2fr: 200px each.' },
  { type: 'mc', topic: 'grid',
    q: 'In a 3-column grid, which declaration makes an item cover **all** the columns?',
    choices: ['`grid-column: 1 / 3`', '`grid-column: span 1`', '`grid-row: 1 / -1`', '`grid-column: 1 / -1`'],
    answer: 3,
    why: 'Three columns have four lines; `1 / -1` goes from the first line to the last. `1 / 3` stops at line 3 and covers only two columns.' },
  { type: 'mc', topic: 'grid',
    q: '`main { display: grid; grid-template-columns: 2fr 1fr; }` and `<main>` contains, in order, `section#featured`, `section#articles` and `aside` with no placement rules. Where does the `aside` end up?',
    choices: ['In the right column of row 1', 'In the left column of row 2', 'Hidden, because there are only two cells', 'On top of #featured'],
    answer: 1,
    why: 'Auto-placement fills cells in HTML order: #featured left, #articles right, and the aside starts a new implicit row in the left column. Giving #featured `grid-column: 1 / -1` fixes the layout.' },
  { type: 'tf', topic: 'grid',
    q: 'In `grid-template-areas`, a named area may form an L shape across several cells.',
    answer: false,
    why: 'Every named area must be a rectangle. An L shape (or rows with different numbers of cells) makes the whole declaration invalid, so it is ignored.' },
  { type: 'fib', topic: 'grid',
    q: '`grid-template-columns: ___(4, 1fr);` is the short way to write `1fr 1fr 1fr 1fr`.',
    accept: ['repeat'],
    why: '`repeat(count, tracks)` repeats a track pattern. Combined with `minmax()` and `auto-fit` it can even build responsive galleries without media queries.' },

  /* ---- responsive ---- */
  { type: 'mc', topic: 'responsive',
    q: 'A `@media (max-width: 768px)` breakpoint works when you narrow the desktop window, but on a real phone the page shows the zoomed-out desktop layout. What is the most likely cause?',
    choices: ['The page has no `<meta name="viewport" content="width=device-width, initial-scale=1">`', 'Phones ignore media queries', 'The query should use `min-width`', 'Breakpoints must be written in `em`'],
    answer: 0,
    why: 'Without the viewport tag, mobile browsers lay the page out about 980px wide and zoom out, so the viewport never measures 768px or less.' },
  { type: 'mc', topic: 'responsive',
    q: 'The `@media (max-width: 768px) { main { grid-template-columns: 1fr; } }` block is at the **top** of the stylesheet, and `main { grid-template-columns: 2fr 1fr; }` appears further down. What happens on a 400px screen?',
    choices: ['One column: media queries always win', 'Two columns: both rules have the same specificity and the later one wins', 'The page fails to render', 'One column, but only after a reload'],
    answer: 1,
    why: 'A media query adds no specificity. When it matches, its rule competes normally, and with a specificity tie source order decides. Put media queries after the rules they override.' },
  { type: 'mc', topic: 'responsive',
    q: 'When does `@media (min-width: 600px) { … }` apply?',
    choices: ['When the viewport is 600px wide or wider', 'When the viewport is narrower than 600px', 'Only at exactly 600px', 'Only on phones'],
    answer: 0,
    why: '`min-width: 600px` means "at least 600px". It is the building block of mobile-first CSS: a narrow base, enhanced as the screen gets wider.' },
  { type: 'mc', topic: 'responsive',
    q: 'An `<img width="800" height="400">` has only `max-width: 100%` (no `height: auto`) and sits in a 400px-wide column. How is it drawn?',
    choices: ['400 × 200, proportions kept', '800 × 400, overflowing the column', '400 × 400, squashed horizontally', 'It is not drawn'],
    answer: 2,
    why: 'The width shrinks to the column, but the `height` attribute still sets 400px, so the image is distorted. `height: auto` recalculates the height from the aspect ratio.' },

  /* ---- layout ---- */
  { type: 'mc', topic: 'layout',
    q: 'You need a gallery of product cards whose columns line up on every row, with the same number of columns per row. Which tool fits best?',
    choices: ['Flexbox with `flex-wrap: wrap`', 'Grid with `grid-template-columns`', 'Floats', '`display: inline-block` on every card'],
    answer: 1,
    why: 'Columns shared by all rows is a two-dimensional requirement: Grid defines the tracks once and every row obeys them.' },
  { type: 'mc', topic: 'layout',
    q: 'A row of tags of very different lengths should keep each tag at its natural width and wrap onto new lines as needed. Which tool fits best?',
    choices: ['Grid with `repeat(4, 1fr)`', 'A table', '`position: absolute` on each tag', 'Flexbox with `flex-wrap: wrap` and `gap`'],
    answer: 3,
    why: 'This is content-out layout: each item decides its own size and lines fill independently, which is what wrapping Flexbox does. Grid would force every tag into equal columns.' },
];

// <topic-videos> generated by video/embed.mjs: do not edit by hand
DATA.en.CSS_VIDEOS = [
  {
    "id": "css-box-model",
    "group": "box",
    "title": "The box model and padding",
    "mp4": "assets/video/css-box-model/css-box-model.mp4",
    "poster": "assets/video/css-box-model/css-box-model-poster.jpg",
    "captions": "assets/video/css-box-model/css-box-model.vtt",
    "duration": "2:48",
    "transcript": [
      "The box model: padding inside, margin outside.",
      "A box with some text. Nothing else yet. The text touches its own edge. Every element is four layers, inside out: content, padding, border, margin.",
      "Add padding: 20px. The box grows on every side, and the background grows with it. Padding is a cushion inside the box. It belongs to the box, so it takes the box's colour.",
      "Add a border: 6px solid orange. The border is the frame, just outside the padding. Leave out the style, and no border is drawn at all. In DevTools, the Computed tab draws all four layers, with their exact sizes.",
      "Now margin: 24px. Nothing inside changes. The box doesn't grow, and its colour doesn't follow. Margin is empty space that pushes other boxes away. Padding: cushion inside. Margin: air outside.",
      "Here's the classic mistake. Two cards, and you want a gap between them. So you add padding. Each card grows, its white background grows with it, and they still touch. Space between boxes is margin. 12px at the bottom, and the gap appears.",
      "Padding takes 1 to 4 values. With two, it's top and bottom, then left and right. With four, go clockwise from the top: top, right, bottom, left. Margin works the same way.",
      "Now size. width: 300px, padding: 20px, border: 5px. By default, width measures only the content. So the box is 350px wide: 300, plus 40, plus 10. Set box-sizing to border-box, and 300px means the whole box. The content shrinks to 250px. Margin stays outside, either way.",
      "Margin has two more tricks. margin: 0 auto shares the leftover space equally, so a narrow block centres. It needs a width, or a max-width. Otherwise there's nothing left to share. And vertical margins collapse. 30px below one heading, 20px above the next: the gap is 30px, not 50px.",
      "Practise it with the box model tool in CSS."
    ]
  },
  {
    "id": "css-flexbox",
    "group": "flex",
    "title": "Flexbox: one line, two axes",
    "mp4": "assets/video/css-flexbox/css-flexbox.mp4",
    "poster": "assets/video/css-flexbox/css-flexbox-poster.jpg",
    "captions": "assets/video/css-flexbox/css-flexbox.vtt",
    "duration": "3:21",
    "transcript": [
      "Flexbox: one line, two axes, and the declaration that lines up a header.",
      "A news site header. A title on the left, links on the right. Out of the box, it's a stack. Block elements pile up, one under another. One declaration fixes that: display: flex, on the header. The header is now a flex container. Its direct children, the h1 and the nav, become flex items, side by side.",
      "Flexbox is one-dimensional. It lays items along a line: the main axis. By default that runs left to right. Across it runs the cross axis, top to bottom. Every alignment property is named after an axis, never after left or right.",
      "justify-content works along the main axis. flex-start packs the items at the start. center puts half the leftover space before the first item, and half after the last. space-between sends the first item to one edge and the last to the other. Title left, nav right.",
      "align-items works across the line. flex-start hugs the top. center puts both items in the middle of the header's height. That's the whole header: three declarations, two axes.",
      "Now the links. The nav holds a ul, and the ul holds the li elements. Put display: flex on the nav, and nothing changes. The links stay stacked. Flex only reaches direct children. The nav's only child is the ul, so the ul is the single item. Make the ul the container, with a gap of 1rem. Now the links sit in a row.",
      "Change flex-direction to column, and the axes turn. The main axis now runs top to bottom. The cross axis runs left to right. justify-content didn't change. It still follows the main axis, so it now moves items vertically. align-items moves them horizontally. And vertical centring only shows if the container is taller than its content.",
      "Last question: how wide is each item? Flexbox works in two steps. First, every item gets its basis: its width, or its content size. Then it compares the total with the container, and shares out the difference. By default, items never grow. The leftover space just stays empty. Give two items flex: 1 and flex: 2, in a 600px container. Both start from 0. flex: 1 is shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0%. 600px to share, in the ratio 1 to 2. 200px, and 400px. Too wide instead? flex-shrink takes the excess back, the same way.",
      "Practise it with the Flexbox playground in CSS."
    ]
  },
  {
    "id": "css-grid",
    "group": "grid",
    "title": "Grid: draw the tracks first",
    "mp4": "assets/video/css-grid/css-grid.mp4",
    "poster": "assets/video/css-grid/css-grid-poster.jpg",
    "captions": "assets/video/css-grid/css-grid.vtt",
    "duration": "3:10",
    "transcript": [
      "Grid: draw the tracks first, then let the items fall into place.",
      "Here is an empty box, 920px wide. We make it a grid. Three columns: 200px, 1fr, 2fr. Nothing is inside yet, but the columns already exist. Between them run numbered lines. Three columns have four lines, 1 to 4.",
      "How wide is 1fr? The browser works it out last. Start with 920. Subtract the fixed track, 200. Subtract 2 gaps of 10. 700px are free. They are shared in three parts: 1fr is about 233px, 2fr about 467px. Resize the box and the fixed track stays put. Only the fr tracks stretch.",
      "Now the items arrive. You don't say where they go. Auto-placement fills the cells in HTML order, left to right. When a row is full, a new row starts. That's why you usually define only the columns.",
      "repeat(3, 1fr) is short for 1fr 1fr 1fr. minmax(200px, 1fr): never narrower than 200px, growing to fill the row. Add auto-fit, and the grid adds or drops columns as the box changes. No media query.",
      "You can also place an item yourself, using those line numbers. grid-column: 1 / 3 runs from line 1 to line 3. That covers 2 columns, not 3. span 2 says the same without counting. 1 / -1 means the full width. The other items auto-place around it. No extra HTML.",
      "For a whole page, name the regions. Each quoted string is one row; each word is one cell. Header, twice. Sidebar and content. Footer, twice. A name repeated across cells spans them. Each element claims its region with grid-area. One without it falls into a free cell, in the wrong place. On a phone, redraw the strings as one column. The sidebar drops below the content, and the HTML never changes.",
      "So Flexbox or Grid? Look at the shape of the problem. A nav is one line of items, sized by their content. Flexbox. A page has rows and columns that must line up. The layout decides the sizes. Grid. Most pages use both: a grid for the skeleton, flex rows inside the regions.",
      "Practise it with the Grid playground in CSS."
    ]
  }
];
// </topic-videos>
