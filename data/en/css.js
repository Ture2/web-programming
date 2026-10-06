'use strict';
/* CSS: concept cards, rail groups and self-check quiz (selectors, cascade and specificity,
   box model, units, Flexbox, Grid and responsive design). See site/README.md for the data
   contract. */

DATA.en.CSS_QUIZ_TOPICS = {
  apply: 'Writing and linking CSS',
  selectors: 'Selectors and pseudo-classes',
  cascade: 'Cascade, specificity and inheritance',
  box: 'Box model and sizing',
  display: 'Display and normal flow',
  units: 'Units and visual styling',
  flex: 'Flexbox',
  grid: 'Grid',
  responsive: 'Responsive design',
  layout: 'Choosing Flexbox or Grid',
};

DATA.en.CSS_GROUPS = [
  { key: 'selectors', label: 'Rules and selectors', icon: 'code' },
  { key: 'cascade', label: 'Cascade and specificity', icon: 'pyramid' },
  { key: 'box', label: 'Box model and flow', icon: 'levels' },
  { key: 'styling', label: 'Units and styling', icon: 'speed' },
  { key: 'flex', label: 'Flexbox', icon: 'arrow' },
  { key: 'grid', label: 'Grid', icon: 'table' },
  { key: 'responsive', label: 'Responsive design', icon: 'split' },
];

DATA.en.CSS_CONCEPTS = [
  /* ---- 1. Rules and selectors -------------------------------------------------- */
  { id: 'writing-css', hub: 'selectors', topic: 'apply', 
    title: 'Writing and linking CSS',
    summary: 'A CSS **rule** pairs a selector (which elements) with a declaration block of `property: value;` pairs (how they look). Rules reach the page inline, in a `<style>` element, or from an external `.css` file linked with `<link rel="stylesheet">`.',
    body: [
      'Mental model: HTML says what each piece of the page **is**; CSS says how it **looks**; the browser joins the two by testing every rule\'s selector against every element. Keeping CSS in its own file means you can restyle a whole site without touching its content, and one stylesheet, downloaded once and cached, serves every page.',
      'Anatomy of `p { color: navy; margin: 0; }`: the **selector** is `p`; the curly braces hold the **declaration block**; each **declaration** is a property, a colon, a value and a semicolon. Comments are written `/* like this */`; the HTML form `<!-- -->` and the JavaScript form `//` do not work in CSS.',
      'If the browser does not understand a declaration (a typo such as `colr: red`, or an impossible value such as `width: big`), it silently **ignores that single declaration** and applies the rest. There is no error message on the page; the DevTools Styles pane shows the bad line struck through with a warning icon.',
    ],
    points: [
      '**Inline**: a `style="color: red"` attribute on one element. Affects only that element and beats every selector, so it is hard to override later. Avoid it outside quick tests.',
      '**Internal**: a `<style>` element inside `<head>`. Styles one page only.',
      '**External**: `<link rel="stylesheet" href="styles.css">` inside `<head>`. One file shared by every page of the site: the standard way.',
    ],
    code: `<!-- index.html, fixtures.html, login.html: the same line in every <head> -->
<head>
  <meta charset="UTF-8">
  <title>Riverside FC</title>
  <link rel="stylesheet" href="styles.css">
</head>

/* styles.css: one file, every page */
nav a {
  color: #1A1F6C;        /* text colour */
  text-decoration: none; /* no underline */
}`,
    example: 'A club site has `index.html`, `fixtures.html` and `login.html`, each with the same `<link rel="stylesheet" href="styles.css">`. Changing `nav a { color: … }` once in `styles.css` recolours the navigation on all three pages, and the browser downloads the file once and reuses it from its cache on the next page.',
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
    summary: 'A selector picks the elements a rule applies to: by tag name (`p`), by class (`.card`), by id (`#hero`), by attribute (`a[target]`) or all of them (`*`). Selectors can be compounded (`article.card`) and grouped with commas (`h1, h2`).',
    body: [
      'Mental model: a selector is a **query** over the HTML. The browser tests each element against it and applies the declarations to those that match. The more precisely a selector describes an element, the fewer elements it matches and, as the Specificity card shows, the stronger it is when rules conflict.',
      '**Classes** are the workhorse of styling: one element can carry several (`class="card featured"`) and one class can be reused on any number of elements. An **id** must be unique in the page, so `#hero` styles exactly one element; ids are best kept for link targets (`href="#articles"`) and JavaScript hooks, because their high specificity makes id-based styles hard to override.',
      'Writing two simple selectors **with no space** between them **compounds** them: `article.card` means "an `<article>` that also has class `card`", and `.card.featured` means one element with both classes. A **comma** groups independent selectors that share the same declarations: `h1, h2, h3 { font-family: Georgia, serif; }`.',
    ],
    table: {
      caption: 'The basic selectors',
      head: ['Selector', 'Matches', 'Example'],
      rows: [
        ['Type', 'every element with that tag', '`p`, `nav`, `button`'],
        ['Class', 'every element whose `class` list contains the name', '`.card`, `.btn-primary`'],
        ['Id', 'the one element with that `id`', '`#hero`'],
        ['Attribute', 'elements that have an attribute, or a given value', '`a[target]`, `input[type="email"]`'],
        ['Universal', 'every element', '`*`'],
        ['Compound', 'one element meeting all the parts', '`a.btn`, `.card.featured`'],
        ['Group (comma)', 'elements matching any of the selectors', '`h1, h2, h3`'],
      ],
    },
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
    summary: 'A combinator joins two selectors by how the elements are related in the HTML tree: anywhere inside (a space), direct child (`>`), the next sibling (`+`) or any later sibling (`~`).',
    body: [
      'Mental model: the HTML is a family tree. Every element has a parent, may have children, and shares its parent with its siblings. Combinators make a rule depend on **where** an element sits in that tree, so you can style "links in the nav" differently from "links in an article" without putting a class on every link.',
      'The browser checks a combinator selector **from right to left**: for `nav a` it takes every `<a>`, then keeps those with a `<nav>` somewhere above them. The rightmost part is always the element being styled; everything to its left is context. Combinators add nothing to specificity: only the simple selectors around them count.',
    ],
    table: {
      caption: 'The four combinators',
      head: ['Combinator', 'Written', 'Matches the B that is…'],
      rows: [
        ['Descendant', '`A B` (space)', 'anywhere inside an A, at any depth'],
        ['Child', '`A > B`', 'a direct child of an A (one level down)'],
        ['Next sibling', '`A + B`', 'immediately after an A, with the same parent'],
        ['Later sibling', '`A ~ B`', 'after an A (not necessarily right after), with the same parent'],
      ],
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
      css: `.menu a   { color: #1A1F6C; }               /* every link inside .menu */
.menu > a { background: #FFE9DC; }          /* only the direct child */

.card { border: 1px solid #999; padding: 6px; }
.card + .card { border-top: 4px solid #FF5700; } /* every card that follows a card */` } },

  { id: 'pseudo-classes', hub: 'selectors', topic: 'selectors', 
    title: 'Pseudo-classes: state and position',
    summary: 'A pseudo-class such as `:hover`, `:focus`, `:first-child` or `:nth-child(odd)` matches an element by its current **state** or its **position** among its siblings: information that is not written in the HTML.',
    body: [
      'Mental model: classes are labels **you** write in the HTML; pseudo-classes are labels the **browser** adds and removes as things happen. The pointer moves over a button, a field receives the keyboard focus, a list gets a new last item: you can style each of those moments without any JavaScript.',
      'A pseudo-class is attached to a selector with **one colon and no space**: `button:hover`, `input:focus`, `li:first-child`. **Pseudo-elements** use two colons and style a **part** of an element instead of a state: `p::first-line`, or `::before` / `::after`, which insert generated content.',
      'For links, write the state rules in the order `:link`, `:visited`, `:hover`, `:active`. They all have the same specificity, so the **later** one wins when two apply at once (a visited link that is also hovered).',
    ],
    table: {
      caption: 'Pseudo-classes you will use constantly',
      head: ['Pseudo-class', 'Matches'],
      rows: [
        ['`:hover`', 'while the mouse pointer is over the element'],
        ['`:focus`', 'while the element has keyboard focus (a clicked or tabbed-to input, button or link)'],
        ['`:focus-visible`', 'focus that the browser judges should be visible (typically keyboard navigation, not mouse clicks)'],
        ['`:active`', 'while the element is being pressed'],
        ['`:visited`', 'a link to a page already visited'],
        ['`:first-child` / `:last-child`', 'the first / last child of its parent'],
        ['`:nth-child(odd)`, `:nth-child(3n)`', 'children by position: odd ones, every third…'],
        ['`:not(.done)`', 'elements that do not match the selector inside'],
      ],
    },
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

  /* ---- 2. Cascade and specificity ---------------------------------------------- */
  { id: 'cascade', hub: 'cascade', topic: 'cascade', 
    title: 'The cascade: which declaration wins',
    summary: 'When several declarations set the **same property** on the **same element**, the cascade chooses one by asking, in this order: origin and `!important`, inline style, specificity, and finally source order (the last one wins).',
    body: [
      'Mental model: every element receives declarations from several places at once: the **browser\'s default stylesheet** (the user-agent stylesheet, which gives `<h1>` a large bold font, `<body>` an 8px margin and `<ul>` its bullets and left padding), your own stylesheets, and maybe a `style` attribute. The cascade is the tie-breaking procedure that guarantees exactly **one value per property**. Once you know the order of the questions, "why is my CSS not applied?" becomes a lookup, not guesswork.',
      'Only declarations of the **same property** compete, and the contest is decided property by property. Two rules that set different properties on the same element both apply, so `color` can come from one rule and `margin` from another.',
      '**Source order** is not a rare exception: it decides every tie in specificity, and ties are the most common conflict (two class selectors, or a base rule and the same selector inside a media query). "Later" means further down the same file, or in a stylesheet linked further down the `<head>`. The order of class names inside `class="…"` in the HTML is irrelevant.',
    ],
    table: {
      caption: 'The questions the cascade asks, in order (the first one that separates the candidates decides)',
      head: ['#', 'Question', 'Winner'],
      rows: [
        ['1', 'Origin and importance', 'your (author) styles beat browser defaults; any `!important` declaration beats every normal one'],
        ['2', 'Inline style?', 'a `style=""` attribute beats any selector'],
        ['3', 'Specificity', 'the selector with the higher (a, b, c) score'],
        ['4', 'Source order', 'the declaration that appears **last**'],
      ],
    },
    example: 'With `.btn { background: grey; }` followed by `.primary { background: orange; }`, the element `<a class="primary btn">` is **orange**: both selectors score (0,1,0), so the later rule wins. Swap the two rules in the file and it turns grey; swapping the class names in the HTML changes nothing.',
    mistake: 'Fixing a conflict with `!important`. It wins today, but the next time you need an override you need another `!important`, and soon nothing can be changed without one. Look at the Styles pane in DevTools instead: the losing declaration is struck through, so you can see which rule beat it and fix the selector or the order.',
    live: { kind: 'html',
      html: `<a class="primary btn" href="#">Which colour am I?</a>
<p>Swap the two rules on the right. Then try swapping the class names in the HTML: nothing changes.</p>`,
      css: `.btn     { background: grey;    color: white; padding: 8px 12px; }
.primary { background: #FF5700; }  /* same specificity (0,1,0): the later rule wins */` } },

  { id: 'specificity', hub: 'cascade', topic: 'cascade', 
    title: 'Specificity: the (a, b, c) score',
    summary: 'Specificity is a three-number score **(a, b, c)** computed for every selector: a = ids, b = classes, attribute selectors and pseudo-classes, c = type selectors and pseudo-elements. Scores are compared column by column from the left; the higher one wins.',
    body: [
      'Mental model: specificity measures how **precisely** a selector aims at an element. "Every paragraph" is a general default; "the paragraph inside `#hero`" is a deliberate exception, so the exception should win. Counting the parts of the selector is how the browser measures that precision.',
      'How to count: **a** = number of id selectors (`#hero`); **b** = number of class selectors (`.card`), attribute selectors (`[type="email"]`) and pseudo-classes (`:hover`, `:first-child`); **c** = number of type selectors (`p`, `li`) and pseudo-elements (`::before`). The universal selector `*` and the combinators (space, `>`, `+`, `~`) count **zero**.',
      'How to compare: compare **a** first; only if equal, compare **b**; only if equal, compare **c**. The columns never carry over: (0,11,0) still loses to (1,0,0). An inline `style=""` is not part of this score at all: it beats every selector, and `!important` beats both. If the scores are equal, source order decides.',
    ],
    table: {
      caption: 'Worked scores',
      head: ['Selector', '(a, b, c)', 'Why'],
      rows: [
        ['`*`', '(0,0,0)', 'universal counts nothing'],
        ['`p`', '(0,0,1)', 'one type'],
        ['`nav ul li a`', '(0,0,4)', 'four types; the spaces count nothing'],
        ['`.intro`', '(0,1,0)', 'one class'],
        ['`li:first-child`', '(0,1,1)', 'a pseudo-class counts like a class'],
        ['`a[target]`', '(0,1,1)', 'an attribute selector counts like a class'],
        ['`.card > p`', '(0,1,1)', 'the `>` counts nothing'],
        ['`.nav .link:hover`', '(0,3,0)', 'two classes plus one pseudo-class'],
        ['`#hero p`', '(1,0,1)', 'one id, one type'],
        ['`#hero .intro`', '(1,1,0)', 'beats `#hero p`: equal a, higher b'],
      ],
    },
    widget: 'specificity',
    practice: { href: '#/browser/css/practice/specificity', label: 'Practise scoring selectors' },
    example: 'Three rules colour the same link: `nav a { color: black; }` scores (0,0,2); `.link { color: navy; }` scores (0,1,0); `#main-nav a { color: orange; }` scores (1,0,1). The link is **orange**, wherever the rules appear in the file. Remove the id rule and it is **navy**: one class beats any number of type selectors.',
    mistake: 'Treating the score as one decimal number ("`#hero p` is worth 101 points, so eleven classes, worth 110, beat it"). The columns are compared separately and never carry: one id beats any number of classes. The practical lesson is to keep selectors **short and flat** (mostly single classes) so that any rule can be overridden by another single class placed later.',
    live: { kind: 'html',
      html: `<nav id="main-nav"><a class="link" href="#">Which colour wins?</a></nav>
<p>Delete rules one by one, starting with the id rule.</p>`,
      css: `#main-nav a { color: #FF5700; } /* (1,0,1) */
.link       { color: navy; }    /* (0,1,0) */
nav a       { color: black; }   /* (0,0,2) */
a { font-size: 20px; font-weight: bold; }` } },

  { id: 'inheritance', hub: 'cascade', topic: 'cascade', 
    title: 'Inheritance: values that flow down the tree',
    summary: 'Some properties, mostly text ones such as `color`, `font-family`, `font-size`, `line-height` and `text-align`, are **inherited**: an element with no value of its own takes its parent\'s. Box properties such as `margin`, `padding`, `border`, `width` and `background` are **not** inherited.',
    body: [
      'Mental model: inheritance is why `body { font-family: Arial, sans-serif; color: #222; }` restyles the whole page with one rule. Every descendant that does not set its own font or colour borrows its parent\'s, which borrowed its parent\'s, up to `body`. Text properties inherit because text inside a box should normally look like the rest of that box\'s text; box properties do not, because a border on an `<article>` should not be repeated around every paragraph inside it.',
      'An inherited value is the **weakest** value there is: any rule that targets the element itself, even a plain `p { }` with specificity (0,0,1), and even a browser default, beats it. That is why links stay blue inside a red paragraph: the user-agent stylesheet has a rule that targets `<a>` directly.',
      'Three keywords control it explicitly: `inherit` (take the parent\'s value, even for a non-inherited property), `initial` (the property\'s built-in starting value) and `unset` (inherit if the property normally inherits, otherwise `initial`).',
    ],
    points: [
      '**Inherited**: `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`, `list-style`, `cursor`, `visibility`.',
      '**Not inherited**: `margin`, `padding`, `border`, `width`, `height`, `background`, `display`, `box-shadow`, `border-radius`.',
      '**Form controls** (`button`, `input`, `select`, `textarea`) get their own font from the browser, so they ignore the body font unless you write `button, input, select, textarea { font: inherit; }`.',
    ],
    example: 'In `<article class="card"><p>Text with <a href="#">a link</a></p></article>`, the rule `.card { color: darkred; border: 1px solid; }` makes the paragraph text dark red (inherited) but draws **one** border, around the card only (not inherited). The link keeps the browser\'s blue until you write `.card a { color: inherit; }`.',
    mistake: 'Expecting `.card { color: red; }` to colour the links inside the card, or the login button to use the page font. Both have browser defaults that target them directly, and a direct rule always beats an inherited value. Target them yourself, or use `inherit`.',
    live: { kind: 'html',
      html: `<article class="card">
  <h2>Card title</h2>
  <p>Text inherits the card's colour and font, with <a href="#">a link</a> that does not.</p>
  <button>A button</button>
</article>`,
      css: `.card {
  font-family: Georgia, serif;  /* inherited */
  color: darkred;               /* inherited */
  border: 2px solid #1A1F6C;    /* NOT inherited: one border only */
  padding: 12px;
}
/* Uncomment to make the link and the button follow the card: */
/* .card a { color: inherit; }
   button  { font: inherit; } */` } },

  /* ---- 3. Box model and flow --------------------------------------------------- */
  { id: 'box-model', hub: 'box', topic: 'box', 
    title: 'The box model: content, padding, border, margin',
    summary: 'Every element is drawn as a rectangle of four layers, inside out: **content**, **padding** (space inside the border, painted with the background), **border**, and **margin** (transparent space outside the border that separates the box from its neighbours).',
    body: [
      'Mental model: a framed picture on a wall. The picture is the content, the mat around it is the padding, the frame is the border, and the bare wall up to the next frame is the margin. The background colour fills the content and padding (up to the outer edge of the border) but never the margin. Most spacing bugs come from putting space in the wrong layer: padding makes the box itself bigger and coloured; margin pushes other boxes away.',
      'The shorthands `margin` and `padding` take 1 to 4 values, going **clockwise from the top**: `padding: 10px` (all four sides); `padding: 10px 20px` (top and bottom 10, left and right 20); `padding: 10px 20px 5px` (top 10, left and right 20, bottom 5); `padding: 10px 20px 5px 0` (top, right, bottom, left). `border: 2px solid #ccc` sets width, style and colour; without a style (`solid`, `dashed`, `dotted`…) no border is drawn at all.',
      'To see the layers of any element, select it in DevTools and open the **Computed** tab: the box diagram shows the exact content, padding, border and margin sizes.',
    ],
    widget: 'box-model',
    practice: { href: '#/browser/css/practice/box-model', label: 'Practise with the box model' },
    example: '`.card { padding: 16px; border: 1px solid #ddd; margin-bottom: 12px; background: white; }` gives each card 16px of white breathing room around its text, a thin grey frame, and 12px of empty space before the next card.',
    mistake: 'Using padding to separate two cards. Padding is **inside** the card: each card grows and its background grows with it, but the cards still touch. Space **between** boxes is margin, or `gap` when the parent is a flex or grid container.',
    live: { kind: 'html',
      html: `<div class="box">content</div>
<div class="box">second box</div>`,
      css: `body { background: #EEF0FA; }
.box {
  background: #FFE9DC;          /* fills content + padding */
  padding: 20px;                /* inside the border */
  border: 6px solid #FF5700;
  margin: 24px;                 /* outside: shows the page background */
}` } },

  { id: 'box-sizing', hub: 'box', topic: 'box', 
    title: 'box-sizing: what width really measures',
    summary: '`box-sizing` decides which layers `width` and `height` measure: `content-box` (the default) sizes only the content, so padding and border are **added on top**; `border-box` makes padding and border fit **inside** the declared size.',
    body: [
      'Mental model: with the default, `width: 300px` means "the **content** is 300px wide", so every pixel of padding or border makes the visible box wider than you asked for. `border-box` changes the meaning to "the **box**, border included, is 300px wide", and the content shrinks to make room. That matches how people think about layout, which is why `*, *::before, *::after { box-sizing: border-box; }` is the first rule of most stylesheets: `*` reaches every element, and `::before` / `::after` cover generated content.',
      'Margin is never part of the declared size in either mode: it always sits outside.',
    ],
    table: {
      caption: '`width: 300px; padding: 20px; border: 5px solid;`',
      head: ['', 'content-box (default)', 'border-box'],
      rows: [
        ['Content width', '300px', '300 − 2×20 − 2×5 = **250px**'],
        ['Visible width (border to border)', '300 + 2×20 + 2×5 = **350px**', '**300px**'],
        ['Margin', 'added outside', 'added outside'],
      ],
    },
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
.border  { box-sizing: border-box; }  /* 300px wide on screen */` } },

  { id: 'margins-centering', hub: 'box', topic: 'box', 
    title: 'Margins: centring with auto, and collapsing',
    summary: '`margin: 0 auto` centres a block that is narrower than its container (it needs a `width` or `max-width`); vertical margins between stacked blocks **collapse**, so the gap is the larger margin, not the sum.',
    body: [
      'Mental model: `auto` margins **share out the leftover space**. A block with `max-width: 420px` inside an 800px container has 380px to spare; `auto` on the left and the right splits it equally, so the box sits in the middle. `text-align: center` is a different tool: it centres the **inline content** (text, images, inline-blocks) inside a box, not the box itself.',
      'Margin collapsing: in normal block flow, when the bottom margin of one block meets the top margin of the next, the browser keeps only the **larger** one. `h2 { margin-bottom: 24px; }` followed by `p { margin-top: 16px; }` leaves 24px, not 40px. Margins never collapse horizontally, and they do not collapse between items of a flex or grid container.',
      'A child\'s top margin can also collapse **through** a parent that has no border, padding or content above it, so the space appears outside the parent. Giving the parent some padding (or making it a flex/grid container) stops it.',
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
  margin: 0 auto;           /* try text-align: center instead: the box stays left */
  padding: 1rem;
  background: white;
  border: 1px solid #ccc;
}
.a { margin-bottom: 30px; background: #FFE9DC; }
.b { margin-top: 20px;    background: #FFE9DC; }` } },

  { id: 'display-flow', hub: 'box', topic: 'display', 
    title: 'Normal flow and display: block, inline, inline-block, none',
    summary: '`display` sets how a box takes part in layout: `block` boxes stack vertically and fill the available width, `inline` boxes flow inside lines of text, `inline-block` flows in a line but accepts width and height, and `none` removes the element from the page.',
    body: [
      'Mental model: with no layout CSS at all, the browser uses **normal flow**. Block boxes are laid out top to bottom like paragraphs in a document; inline boxes are laid out left to right inside them like words in a sentence, wrapping at the edge. Every element has a default `display` from the browser (`<p>`, `<div>`, `<section>`, `<ul>`, `<form>`, `<h1>` are block; `<a>`, `<span>`, `<strong>`, `<label>`, `<img>`, `<input>`, `<button>` are inline-level), and CSS can change it without changing what the element means.',
      '`display: flex` and `display: grid` are values of the same property: the element itself still behaves as a block on the outside, but it lays out its **children** with Flexbox or Grid instead of normal flow.',
    ],
    table: {
      caption: 'How each value behaves',
      head: ['Value', 'Starts a new line?', 'Default width', 'width / height', 'Vertical margin'],
      rows: [
        ['`block`', 'yes', 'fills the container', 'applied', 'applied (and may collapse)'],
        ['`inline`', 'no', 'its content', '**ignored**', '**ignored** (padding paints but does not push lines apart)'],
        ['`inline-block`', 'no', 'its content', 'applied', 'applied'],
        ['`none`', '—', 'removed from layout and from screen readers', '—', '—'],
      ],
    },
    example: 'A form where each `<label>` sits on its own line above its field: `label { display: block; margin-bottom: 4px; }` and `input { display: block; width: 100%; }`. Nav links that need padding and a clickable area larger than the text: `nav a { display: inline-block; padding: 8px 12px; }`.',
    mistake: 'Setting `width`, `height` or `margin-top` on an `<a>` or a `<span>` and seeing nothing happen: inline boxes size to their text and ignore those properties. Switch to `inline-block` or `block` (or lay out the parent with Flexbox). Also, `visibility: hidden` is not the same as `display: none`: hidden elements are invisible but **keep their space**.',
    live: { kind: 'html',
      html: `<p>Inline: <span class="i">span</span> <span class="i">span</span></p>
<p>Inline-block: <span class="ib">span</span> <span class="ib">span</span></p>
<p>Block: <span class="b">span</span> <span class="b">span</span></p>`,
      css: `span { width: 120px; height: 40px; padding: 6px; margin: 8px; background: #FFE9DC; border: 1px solid #FF5700; }
.i  { display: inline; }       /* width, height, vertical margin ignored */
.ib { display: inline-block; } /* in the line, but sized */
.b  { display: block; }        /* own line each */` } },

  /* ---- 4. Units and styling ---------------------------------------------------- */
  { id: 'css-units', hub: 'styling', topic: 'units', 
    title: 'Units: px, %, em, rem, vw/vh and fr',
    summary: 'Lengths are either absolute (`px`) or relative to something: the containing block (`%`), a font size (`em`, `rem`), the viewport (`vw`, `vh`) or, in grid tracks only, the free space (`fr`).',
    body: [
      'Mental model: choosing a unit means choosing **what the size should follow**. A hairline border should stay 1px whatever happens: `px`. A column should follow its container: `%` or `fr`. Text and the spacing around text should follow the reader\'s font-size setting: `rem`. That last one is an accessibility point: if someone sets a larger default font in the browser, rem-based text and spacing grow with it.',
      '`em` and `rem` differ in **what they are relative to**. `rem` (root em) always refers to the font size of the `<html>` element, 16px by default. `em` refers to the font size of the element itself; when used inside `font-size` it refers to the parent\'s font size, which is why nested `em` font sizes **compound**.',
      'A zero needs no unit: `margin: 0`. A `%` width is a share of the parent\'s content width; a `%` padding or margin is a share of the parent\'s **width**, even on the top and bottom.',
    ],
    table: {
      caption: 'Assuming the browser default root font size of 16px',
      head: ['Unit', 'Relative to', 'Example', 'Typical use'],
      rows: [
        ['`px`', 'nothing (a CSS pixel)', '`border: 1px solid`', 'borders, shadows, small fixed details'],
        ['`%`', 'the containing block', '`max-width: 100%`', 'fluid widths, images'],
        ['`em`', 'the element\'s own font size', '`padding: 0.5em 1em`', 'spacing that should scale with that element\'s text'],
        ['`rem`', 'the root (`<html>`) font size', '`font-size: 1.25rem` = 20px', 'font sizes, consistent spacing'],
        ['`vw` / `vh`', '1% of the viewport width / height', '`height: 100vh`', 'full-screen sections'],
        ['`fr`', 'a share of the free space in a grid container', '`grid-template-columns: 2fr 1fr`', 'grid tracks only'],
      ],
    },
    example: 'With the default 16px root: `h1 { font-size: 2rem; }` is 32px. A button with `font-size: 0.875rem; padding: 0.5em 1em;` has 14px text and padding of 7px (top/bottom) by 14px (left/right): the `em` padding is computed from the button\'s own 14px font size, so a bigger button gets proportionally bigger padding automatically.',
    mistake: 'Nesting `em` font sizes: with `li { font-size: 0.8em; }`, a list inside a list item is 0.8 × 0.8 = 0.64 of the original size, and a third level 0.51. `em` compounds through the tree; `rem` always goes back to the root, which is why `rem` is the safer default for font sizes. Also, `fr` is not a general length: `width: 1fr` is invalid and ignored.',
    live: { kind: 'html',
      html: `<ul class="em"><li>em level 1<ul><li>em level 2<ul><li>em level 3</li></ul></li></ul></li></ul>
<ul class="rem"><li>rem level 1<ul><li>rem level 2<ul><li>rem level 3</li></ul></li></ul></li></ul>
<div class="vw">This bar is 50vw wide: half of the preview's width.</div>`,
      css: `.em li  { font-size: 0.8em; }  /* shrinks at every level */
.rem li { font-size: 0.8rem; } /* always 0.8 x 16px = 12.8px */
.vw { width: 50vw; background: #FFE9DC; padding: 0.5rem; }` } },

  { id: 'visual-styling', hub: 'styling', topic: 'units', 
    title: 'Colour, text and decoration',
    summary: 'The everyday styling properties almost every page relies on: colours (`color`, `background-color`), fonts (`font-family`, `font-size`, `font-weight`, `line-height`), text (`text-align`, `text-decoration`), lists (`list-style`) and decoration (`border-radius`, `box-shadow`, `cursor`).',
    body: [
      'Mental model: layout decides **where** boxes go; these properties decide what the boxes **look like**. Text properties are inherited, so set them once on `body` and override them only where a component differs. Decorative properties are not inherited, so they belong on the component itself (the card, the button).',
      'Colours can be written as names (`navy`), as hexadecimal `#RRGGBB` (two hex digits each for red, green and blue, from `00` to `FF`: `#1A1F6C`), or as `rgb(26 31 108)`. Add transparency with a fourth value: `rgb(0 0 0 / 0.15)` is black at 15% opacity, ideal for shadows. Keep enough **contrast** between text and background (dark grey on white, white on navy) so the page stays readable.',
      'A **font stack** lists fallbacks: in `font-family: "Segoe UI", Arial, sans-serif;` the browser uses the first font installed on the reader\'s device. Always end with a generic family (`serif`, `sans-serif`, `monospace`). Names with spaces need quotes.',
    ],
    table: {
      caption: 'Properties and typical values',
      head: ['Property', 'What it does', 'Example'],
      rows: [
        ['`color`', 'text colour (inherited)', '`color: #222;`'],
        ['`background-color`', 'fills content and padding', '`background-color: #F4F4F8;`'],
        ['`font-family`', 'font stack (inherited)', '`font-family: Arial, sans-serif;`'],
        ['`font-size` / `font-weight`', 'size / boldness', '`font-size: 1.125rem; font-weight: 700;`'],
        ['`line-height`', 'space between lines; unitless = × font size', '`line-height: 1.5;`'],
        ['`text-align`', 'aligns inline content inside the box', '`text-align: center;`'],
        ['`text-decoration`', 'underline (or not) on text, e.g. links', '`text-decoration: none;`'],
        ['`list-style`', 'list markers (bullets, numbers)', '`list-style: none;`'],
        ['`border-radius`', 'rounds the corners', '`border-radius: 8px;`'],
        ['`box-shadow`', 'x-offset y-offset blur colour', '`box-shadow: 0 2px 8px rgb(0 0 0 / 0.15);`'],
        ['`cursor`', 'mouse pointer shape over the element', '`cursor: pointer;`'],
      ],
    },
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

  /* ---- 5. Flexbox -------------------------------------------------------------- */
  { id: 'flex-axes', hub: 'flex', topic: 'flex', 
    title: 'Flexbox: container, items and the two axes',
    summary: '`display: flex` makes an element a **flex container** and its direct children **flex items**, laid out along a **main axis** chosen with `flex-direction`; the **cross axis** is perpendicular to it.',
    body: [
      'Mental model: Flexbox is **one-dimensional**: it puts the items in a line, then distributes the space along that line. Everything depends on which way the line runs. With `flex-direction: row` (the default) the main axis is horizontal and the cross axis vertical; with `column` they swap. The alignment properties are named after the **axes**, not after left/right/top/bottom, so the same `justify-content: center` centres horizontally in a row and vertically in a column.',
      'Only the **direct children** of the container become flex items. In `<nav><ul><li>…`, putting `display: flex` on `<nav>` makes the `<ul>` the only flex item; the `<li>`s are still in normal flow, stacked with bullets. Make the `<ul>` itself the flex container to put the links in a row.',
      '`row-reverse` and `column-reverse` flip the **visual** order only. Screen readers and the Tab key still follow the HTML order, so use them for visual tweaks, never to fix content that is in the wrong order in the HTML.',
    ],
    table: {
      caption: 'What each flex-direction does to the axes',
      head: ['flex-direction', 'Main axis', 'Cross axis', '`justify-content` moves items', '`align-items` moves items'],
      rows: [
        ['`row` (default)', 'left → right', 'top → bottom', 'horizontally', 'vertically'],
        ['`row-reverse`', 'right → left', 'top → bottom', 'horizontally', 'vertically'],
        ['`column`', 'top → bottom', 'left → right', 'vertically', 'horizontally'],
        ['`column-reverse`', 'bottom → top', 'left → right', 'vertically', 'horizontally'],
      ],
    },
    widget: 'flexbox',
    practice: { href: '#/browser/css/practice/flexbox', label: 'Open the Flexbox playground' },
    example: 'A site header: `header { display: flex; justify-content: space-between; align-items: center; }` puts the `<h1>` on the left and the `<nav>` on the right (main axis), both vertically centred (cross axis). Inside it, `nav ul { display: flex; gap: 1rem; list-style: none; }` turns the links into a row.',
    mistake: 'Believing `justify-content` is always horizontal. It works along the **main** axis: after `flex-direction: column` it moves items vertically and `align-items` moves them horizontally. And vertical centring in a column only shows if the container is taller than its content (give it a `height` or `min-height`).',
    live: { kind: 'html',
      html: `<header>
  <h1>DevNews</h1>
  <nav><ul><li><a href="#">Home</a></li><li><a href="#">Articles</a></li><li><a href="#">About</a></li></ul></nav>
</header>`,
      css: `header {
  display: flex;
  flex-direction: row;            /* try column */
  justify-content: space-between; /* main axis */
  align-items: center;            /* cross axis */
  padding: 0 1rem;
  background: #1A1F6C;
  color: white;
}
nav ul { display: flex; gap: 1rem; list-style: none; padding: 0; } /* the ul is the flex container of the li */
nav a  { color: white; }` } },

  { id: 'flex-alignment', hub: 'flex', topic: 'flex', 
    title: 'Flexbox alignment: justify-content, align-items, gap, wrap',
    summary: '`justify-content` distributes the items along the main axis, `align-items` positions them on the cross axis, `gap` sets the space between them, and `flex-wrap: wrap` lets them flow onto new lines.',
    body: [
      'Mental model: once the items are on the line there is usually space left over, and two separate questions to answer. **Along** the line: pack the items at the start, centre them, or spread them out? That is `justify-content`. **Across** the line: top, middle, bottom, or stretch to the full height? That is `align-items`. One property per axis.',
      'The default `align-items: stretch` makes items without a set height as tall as the container (or as the tallest item in the row): that is why cards in a flex row come out equal-height for free. `align-self` on a single item overrides `align-items` for that item.',
      'By default items **never wrap** (`flex-wrap: nowrap`): they shrink to fit and, if they cannot shrink further, overflow. `flex-wrap: wrap` starts a new line instead. With several lines, `align-content` positions the **lines** inside the container (it has no effect on a single line).',
    ],
    table: {
      caption: '`justify-content` values (main axis)',
      head: ['Value', 'Leftover space goes…'],
      rows: [
        ['`flex-start` (default)', 'all at the end; items packed at the start'],
        ['`center`', 'half before the first item, half after the last'],
        ['`flex-end`', 'all at the start; items packed at the end'],
        ['`space-between`', 'between items only; first and last touch the edges'],
        ['`space-around`', 'equal space on both sides of every item, so edges get half a gap'],
        ['`space-evenly`', 'equal gaps everywhere, edges included'],
      ],
    },
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
  align-items: stretch;           /* try flex-start, center, flex-end */
  height: 120px;
  background: #EEF0FA;
}
.item { width: 60px; background: #FF5700; color: white; text-align: center; }

.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; max-width: 280px; }
.tags span { background: #1A1F6C; color: white; padding: 2px 10px; border-radius: 999px; }` } },

  { id: 'flex-sizing', hub: 'flex', topic: 'flex', 
    title: 'Flexible sizes: flex-grow, flex-shrink, flex-basis',
    summary: 'Each flex item has a starting size (`flex-basis`), a share of the leftover space it may take (`flex-grow`) and a share of any overflow it gives back (`flex-shrink`). The shorthand `flex: grow shrink basis` sets all three.',
    body: [
      'Mental model: Flexbox sizes items in two steps. First, each item gets its **basis** (its `width`, or its content size when the basis is `auto`). Then the container compares the total with its own size. If there is space left, it is handed out in proportion to `flex-grow`; if the items are too wide, they shrink in proportion to `flex-shrink`. The default is `flex: 0 1 auto`: do not grow, may shrink, start from your content size.',
      'The shorthand is what you will use: `flex: 1` means `1 1 0%`: start from zero and take an equal share, so all `flex: 1` items end up the same width. `flex: 2` on one item and `flex: 1` on another gives a 2:1 split of the space.',
    ],
    table: {
      caption: 'Common `flex` shorthands',
      head: ['Shorthand', 'Expands to', 'Meaning'],
      rows: [
        ['(default)', '`0 1 auto`', 'content size, may shrink, never grows'],
        ['`flex: 1`', '`1 1 0%`', 'equal shares of all the space'],
        ['`flex: 2`', '`2 1 0%`', 'twice the share of a `flex: 1` sibling'],
        ['`flex: auto`', '`1 1 auto`', 'content size plus a share of the leftover'],
        ['`flex: none`', '`0 0 auto`', 'exactly its content size; never grows or shrinks'],
      ],
    },
    widget: 'flexbox',
    example: 'A search bar: `.search { display: flex; gap: 8px; }`, `.search input { flex: 1; }`, `.search button { flex: none; }`. The button keeps its natural width and the input takes **all** the rest, on any screen width. In a 600px container with no gap, two items with `flex: 1` and `flex: 2` become 200px and 400px.',
    mistake: 'Expecting `flex: 1` items to be equal when one contains a long unbreakable word, a URL or a wide image. A flex item will not shrink below its content\'s minimum width (`min-width: auto` by default), so it pushes its siblings narrower or overflows. Add `min-width: 0` (and, for text, `overflow-wrap: anywhere`) to the item.',
    live: { kind: 'html',
      html: `<form class="search"><input placeholder="Search articles"><button>Search</button></form>
<div class="split"><div class="one">flex: 1</div><div class="two">flex: 2</div></div>`,
      css: `.search { display: flex; gap: 8px; }
.search input  { flex: 1; padding: 6px; }    /* takes all the leftover space */
.search button { flex: none; }                /* keeps its natural width */

.split { display: flex; margin-top: 1rem; }
.split div { padding: 8px; color: white; }
.one { flex: 1; background: #1A1F6C; }
.two { flex: 2; background: #FF5700; }        /* twice the share */` } },

  /* ---- 6. Grid ----------------------------------------------------------------- */
  { id: 'grid-tracks', hub: 'grid', topic: 'grid', 
    title: 'Grid: tracks, fr and auto-placement',
    summary: '`display: grid` turns an element\'s children into **grid items** placed in cells formed by column and row **tracks**, sized with `grid-template-columns` / `grid-template-rows` in px, %, `auto` or `fr` (a share of the free space).',
    body: [
      'Mental model: Flexbox starts from the **items** and lets them find room on a line; Grid starts from the **container**: you draw the columns (and, if you need them, the rows) first, and the items drop into the cells. That is why Grid suits page skeletons and card galleries, where things must line up both across and down.',
      '`fr` is computed **last**: the browser takes the container width, subtracts fixed tracks (px), content-sized tracks (`auto`) and the gaps, and divides what is left by the total number of `fr`. In `grid-template-columns: 200px 1fr 2fr; gap: 10px;` on a 920px container: 920 − 200 − 2×10 = 700px free, so `1fr` = 233.3px and `2fr` = 466.7px.',
      '**Auto-placement**: items you do not place yourself fill the cells in HTML order, left to right and then onto the next row, and new rows are created as needed (these **implicit rows** are sized `auto`, i.e. by their content, unless you set `grid-auto-rows`). So usually you only define the columns.',
    ],
    points: [
      '`repeat(3, 1fr)` is short for `1fr 1fr 1fr`.',
      '`minmax(200px, 1fr)`: a track never narrower than 200px, growing up to `1fr`.',
      '`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));` fits as many 220px-or-wider columns as the container allows, so a card gallery goes from 4 columns to 1 **without any media query** (beyond the slides, but very handy).',
      '`gap` (or `row-gap` / `column-gap`) sets the space between tracks, never at the outer edges.',
    ],
    widget: 'grid',
    practice: { href: '#/browser/css/practice/grid', label: 'Open the Grid playground' },
    example: 'The DevNews `<main>` with `display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;` on a 930px container: 930 − 32 = 898px free, so the article column is 598.7px and the sidebar 299.3px, and both keep that 2:1 ratio at any width.',
    mistake: 'Putting `grid-template-columns: 2fr 1fr` on a `<main>` that has **three** children and expecting "articles left, sidebar right". Auto-placement fills the cells in order: the first child takes the left cell, the second the right cell, and the third wraps to the left cell of row 2. Make the extra child span both columns or place the items explicitly (next card).',
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
    body: [
      'Mental model: a grid with 3 columns has **4 vertical lines**: line 1 before the first column, line 4 after the last. Placement is written in lines, not cells: `grid-column: 1 / 3` means "from line 1 to line 3", which covers the first two columns. Negative numbers count from the end, so `grid-column: 1 / -1` always means "the full width", however many columns there are.',
      '`span n` says how many tracks to cover from wherever the item would start: `grid-column: span 2`. The two forms mix: `grid-column: 2 / span 2` starts at line 2 and covers two columns. `grid-row` works the same way vertically.',
      'Inside its cell, an item is positioned by `justify-items` (along the row, i.e. horizontally) and `align-items` (along the column, i.e. vertically), both set on the container and both `stretch` by default, so the item fills its cell. `justify-self` / `align-self` override them for one item. Unlike Flexbox, Grid really has one property per axis per cell; `justify-items` has no effect in a flex container.',
    ],
    table: {
      caption: 'Placement in a 3-column grid',
      head: ['Declaration', 'Covers'],
      rows: [
        ['`grid-column: 1 / 2`', 'column 1 only (line 1 to line 2)'],
        ['`grid-column: 1 / 3`', 'columns 1 and 2'],
        ['`grid-column: 1 / -1`', 'all three columns (first line to last line)'],
        ['`grid-column: span 2`', 'two columns, starting wherever auto-placement puts it'],
        ['`grid-column: 2 / span 2`', 'columns 2 and 3'],
        ['`grid-row: span 2`', 'two rows tall'],
      ],
    },
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
    body: [
      'Mental model: areas let you describe a page skeleton the way you would sketch it on paper (header across the top, sidebar on the left, content beside it, footer at the bottom) and then **rearrange whole regions by redrawing the sketch**, which is exactly what a media query does for a narrow screen.',
      'The rules: every string must contain the **same number of cells**, matching the number of columns; each named area must form a **rectangle** (no L shapes); a `.` marks an empty cell; repeating a name across neighbouring cells makes that area span them. If the template breaks a rule, the whole declaration is invalid and ignored.',
      'On the items, the name is written **without quotes**: `.site-header { grid-area: header; }`. Every child must be assigned: a child with no `grid-area` is auto-placed into whatever cell is still free, which is rarely what you want.',
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
.site-footer { grid-area: footer; }

/* narrow screens: redraw the sketch as one column */
@media (max-width: 768px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "content"
      "sidebar"
      "footer";
  }
}`,
    widget: 'grid',
    example: 'In the code above, the header and the footer span both columns because their names are repeated across the row. On a narrow screen the media query redraws the sketch as one column and moves the sidebar **below** the content, without touching the HTML.',
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

  /* ---- 7. Responsive design ---------------------------------------------------- */
  { id: 'responsive-foundations', hub: 'responsive', topic: 'responsive', 
    title: 'Responsive foundations: viewport tag, fluid widths, fluid images',
    summary: 'A responsive page adapts to any screen width. It needs the viewport `<meta>` tag, widths that are relative instead of fixed (`%`, `fr`, `max-width`), and images capped with `img { max-width: 100%; height: auto; }`.',
    body: [
      'Mental model: phones were designed to display pages built for desktops. Unless a page says otherwise, a mobile browser lays it out on a virtual canvas about **980px wide** and zooms out until it fits: the text becomes tiny and no `max-width: 768px` breakpoint ever matches. The tag `<meta name="viewport" content="width=device-width, initial-scale=1">` in the `<head>` tells the browser "this page is designed for your real width". It must be in every page.',
      'With that in place, a layout made of fluid pieces stretches and shrinks on its own: blocks fill their container, grids share space with `fr`, a content wrapper is capped with `max-width` and centred with `margin: 0 auto`. Media queries are then only needed for the changes that fluid sizing cannot do, like moving the sidebar below the content.',
      'Images have a fixed natural size (an 800px-wide photo stays 800px) and overflow narrow containers. `max-width: 100%` lets an image shrink to the container but never grow beyond its natural size; `height: auto` recalculates the height so the proportions are kept.',
    ],
    code: `<!-- in the <head> of EVERY page -->
<meta name="viewport" content="width=device-width, initial-scale=1">

/* styles.css */
img {
  max-width: 100%;   /* shrink with the container, never stretch */
  height: auto;      /* keep the aspect ratio */
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
  height: auto;     /* delete this line: the circle is squashed */
}` } },

  { id: 'media-queries', hub: 'responsive', topic: 'responsive', 
    title: 'Media queries and breakpoints',
    summary: 'A media query such as `@media (max-width: 768px) { … }` wraps rules that apply only while a condition about the device is true, most often the viewport width. The width at which the layout changes is called a **breakpoint**.',
    body: [
      'Mental model: a media query is an **if** for CSS. The rules inside are ignored until the condition becomes true and switch off again when it stops being true, live, as the window is resized. They add **no specificity**: a rule inside a media query competes like any other, so the `@media` block must come **after** the base rules it overrides.',
      '`max-width: 768px` means "a viewport 768px wide **or less**"; `min-width: 769px` means "769px or more". **Desktop-first** stylesheets write the wide layout as the base and override it with `max-width` queries; **mobile-first** stylesheets write the single-column layout as the base and add columns with `min-width` queries. Mobile-first usually needs less overriding, because the narrow layout is the simplest one.',
      'Conditions can be combined with `and`, as in `@media (min-width: 600px) and (max-width: 900px)`, and media queries test more than width: `@media print` for printing, `@media (prefers-color-scheme: dark)` for a dark theme. Pick breakpoints where **your** layout starts to look wrong, not for specific phone models.',
    ],
    code: `/* Desktop-first: wide layout is the base */
main { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

@media (max-width: 768px) {          /* 768px or narrower */
  main { grid-template-columns: 1fr; }
}

/* Mobile-first: one column is the base */
.cards { display: grid; gap: 1rem; }

@media (min-width: 600px) {          /* 600px or wider */
  .cards { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1000px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
}`,
    widget: 'responsive',
    practice: { href: '#/browser/css/practice/responsive', label: 'Practise with breakpoints' },
    example: 'A typical news-style page: `main` is a two-column grid (`2fr 1fr`); at 768px or less, `@media (max-width: 768px) { main { grid-template-columns: 1fr; } }` turns it into one column, so the `<aside>` drops below the articles. Resize the window (or use the DevTools device toolbar) to check that the switch really happens.',
    mistake: 'Putting the `@media` block at the **top** of the stylesheet. The base rule `main { grid-template-columns: 2fr 1fr; }` further down has the same specificity and comes later, so it wins at every width and the breakpoint seems broken. Media queries go after the rules they modify. The other classic cause is a missing viewport `<meta>` tag (previous card).',
    live: { kind: 'html',
      html: `<div class="banner">Resize your window: this preview changes colour and layout at 480px.</div>
<div class="cards"><div>A</div><div>B</div><div>C</div></div>`,
      css: `/* mobile-first base */
.banner { background: #FF5700; color: white; padding: 8px; }
.cards  { display: grid; gap: 8px; margin-top: 8px; }
.cards div { background: #1A1F6C; color: white; padding: 16px; }

@media (min-width: 480px) {   /* 480px or wider */
  .banner { background: #1A1F6C; }
  .cards  { grid-template-columns: repeat(3, 1fr); }
}` } },

  { id: 'flex-vs-grid', hub: 'responsive', topic: 'layout', 
    title: 'Flexbox or Grid?',
    summary: 'Use **Flexbox** when items flow along one line and their content should decide their size; use **Grid** when rows and columns must line up and the container should decide the sizes. Most pages use both: Grid for the page skeleton, Flexbox inside the regions.',
    body: [
      'Mental model: ask **"content out or layout in?"** Flexbox is content-out: give it items and it fits them into a line, wrapping wherever it must, each row independent of the others. Grid is layout-in: you define the tracks first and the items obey them. If the items on the second line of a wrapped flex container do not line up with the first line and you wish they did, you wanted Grid.',
      'They nest freely: a grid cell can be a flex container and a flex item can be a grid container. In a typical news-style page, `<main>` is a grid (articles and sidebar), the `<header>` and the nav `<ul>` are flex rows, and each card can use Flexbox for its own contents.',
    ],
    table: {
      caption: 'Typical choices',
      head: ['Situation', 'Tool', 'Why'],
      rows: [
        ['Logo on the left, nav on the right', 'Flexbox', 'one row; `justify-content: space-between`'],
        ['Links in a nav bar, buttons in a toolbar', 'Flexbox', 'one row of content-sized items with `gap`'],
        ['Tags or chips of different lengths', 'Flexbox + `flex-wrap`', 'each item keeps its natural width'],
        ['Input stretching next to a button', 'Flexbox', '`flex: 1` on the input'],
        ['Page skeleton: header / sidebar / main / footer', 'Grid', 'two dimensions, named areas'],
        ['Card gallery whose columns line up', 'Grid', 'columns shared by every row'],
        ['Content + sidebar with a fixed ratio', 'Grid', '`grid-template-columns: 2fr 1fr`'],
      ],
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
