// Crawls every route of the site in headless Chromium and reports problems: page errors,
// console errors and [i18n]/[data]/[tools] warnings, failed requests, and horizontal
// overflow. Each route is checked at 1280 px (light), 375 px (light) and 1280 px (dark).
// With --axe it also runs axe-core (WCAG 2.1 AA) on every route in every mode.
//
//   node site/tools/check.mjs                 every route
//   node site/tools/check.mjs --only server   routes whose hash contains "server"
//   node site/tools/check.mjs --axe           also the accessibility audit
//
// Routes are read from the page (SECTIONS): each card, the quiz, each tool page and the
// summary, plus #/ and #/progress. Exit code 1 when anything is found.
// Browser: $CHROME_PATH, else an installed Chrome / Edge, else Playwright's Chromium.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const withAxe = args.includes('--axe');

const browserPath = () => [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));

const MODES = [
  { name: '1280', width: 1280, height: 900, theme: 'light' },
  { name: '375', width: 375, height: 800, theme: 'light' },
  { name: 'dark', width: 1280, height: 900, theme: 'dark' },
];

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const executablePath = browserPath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});

const probe = await browser.newPage();
await probe.goto(base);
const routes = (await probe.evaluate(() => ['#/', '#/progress', ...SECTIONS.filter((s) => s.data.concepts.length).flatMap((s) => [
  ...s.data.concepts.map((c) => `${s.base}/${c.id}`),
  `${s.base}/quiz`,
  ...s.tools.map((id) => `${s.base}/practice/${id}`),
  `${s.base}/summary`,
])])).filter((r) => r.includes(only));
await probe.close();

const findings = [];
const axePath = withAxe ? createRequire(import.meta.url).resolve('axe-core/axe.min.js') : '';

for (const mode of MODES) {
  const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height }, colorScheme: mode.theme });
  await context.addInitScript((th) => { try { localStorage.clear(); localStorage.setItem('theme', th); } catch (e) { /* none */ } }, mode.theme);
  const page = await context.newPage();
  let route = '';
  const add = (kind, text) => findings.push({ mode: mode.name, route, kind, text });
  page.on('pageerror', (e) => add('pageerror', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || /\[(i18n|data|tools)\]/.test(m.text())) add(`console.${m.type()}`, m.text());
  });
  page.on('requestfailed', (r) => add('request', `${r.url()} ${r.failure() ? r.failure().errorText : ''}`));
  page.on('response', (r) => { if (r.status() >= 400) add('request', `${r.status()} ${r.url()}`); });

  await page.goto(base);
  for (route of routes) {
    await page.evaluate((h) => { location.hash = h; }, route);
    await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length);
    await page.waitForTimeout(120);
    const over = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= w + 1) return '';
      const wide = [...document.querySelectorAll('#view *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.scroll, pre, [data-scroll]');
      }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
      return `scrollWidth ${document.documentElement.scrollWidth} > ${w}: ${wide.join(', ')}`;
    });
    if (over) add('overflow', over);
    if (withAxe) {
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: axePath });
      const res = await page.evaluate(() => window.axe.run('#main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      res.violations.forEach((v) => add('axe', `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
    }
  }
  await context.close();
}

await browser.close();
server.close();

console.log(`Checked ${routes.length} routes × ${MODES.length} modes${withAxe ? ' + axe' : ''}.`);
if (!findings.length) {
  console.log('No findings.');
} else {
  findings.forEach((f) => console.log(`[${f.mode}] ${f.route}  ${f.kind}: ${f.text}`));
  console.log(`${findings.length} findings.`);
  process.exitCode = 1;
}
