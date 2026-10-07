// Screenshots of concept cards for design review: the card (not the whole page) at 1280 px
// (light), 375 px (light) and 1280 px (dark). Also prints console warnings and errors.
//
//   node site/tools/shot.mjs <out-dir> <route> [<route> …]
//   node site/tools/shot.mjs ./shots server/runtime/what-is-node server/runtime/summary
//
// Routes are written without the leading "#/" (Git Bash rewrites "#/…" as a path).
// A route whose last part is "summary" is captured whole (the printable sheet).
// Files: <out-dir>/<last part of the route>-<mode>.png
// Browser: $CHROME_PATH, else an installed Chrome / Edge, else Playwright's Chromium.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from './serve.mjs';

const [out, ...args] = process.argv.slice(2);
const routes = args.map((r) => `#/${r.replace(/^#?\/?/, '')}`);
if (!out || !routes.length) {
  console.error('Usage: node site/tools/shot.mjs <out-dir> <route> [<route> …]');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

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

for (const mode of MODES) {
  const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height }, colorScheme: mode.theme, deviceScaleFactor: 1 });
  await context.addInitScript((th) => { try { localStorage.clear(); localStorage.setItem('theme', th); } catch (e) { /* none */ } }, mode.theme);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[${mode.name}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${mode.name}] console.${m.type()}: ${m.text()}`); });
  await page.goto(base);
  for (const route of routes) {
    await page.evaluate((h) => { location.hash = h; }, route);
    await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length);
    await page.waitForTimeout(250);
    const name = route.split('/').filter(Boolean).pop();
    const file = join(out, `${name}-${mode.name}.png`);
    const card = name === 'summary' ? null : await page.$('#view .concept');
    if (card) await card.screenshot({ path: file });
    else await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
  await context.close();
}

await browser.close();
server.close();
