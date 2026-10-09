// Checks the concept-section quiz: scoreboard and strip, skip, keyboard answers, the end screen,
// "retry the ones I missed" (no best score saved) and the rail's progress and best-score meters.
//
//   node site/tools/check-quiz.mjs
//   SHOTS=<dir> node site/tools/check-quiz.mjs     also saves screenshots
//
// Drives the HTML section's "Block, inline, div and span" topic.
// Browser: $CHROME_PATH, else an installed Chrome / Edge, else Playwright's Chromium.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { serve } from './serve.mjs';

const QUIZ = '#/browser/html/quiz';
const TOPIC = 'layout';

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const executablePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const SHOTS = process.env.SHOTS;
let bad = 0;
const expect = (ok, what) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || /\[(i18n|data)\]/.test(m.text())) problems.push(m.text()); });
// A perfect best score on one topic and a partial one on another, set once (reloads keep the run's storage).
await page.addInitScript(() => {
  if (sessionStorage.getItem('init')) return;
  localStorage.clear();
  localStorage.setItem('html-quiz-v1', JSON.stringify({ tables: 2, document: 2 }));
  sessionStorage.setItem('init', '1');
});
await page.goto(`${base}${QUIZ}/${TOPIC}`);
await page.waitForSelector('.q-strip');
const cells = () => page.$$eval('.q-strip .q-cell', (els) => els.map((e) => e.className.replace('q-cell', '').trim()));
const total = (await cells()).length;
const listed = +(await page.textContent(`.rail-quiz a[href$="/${TOPIC}"] .rail-count`));
expect(total > 1 && total === listed, `strip has one cell per question (${total} of ${listed})`);
expect(await page.isVisible('.rail-quiz a[href$="/tables"] .rail-score.perfect .rail-meter'), 'rail: perfect score with meter and check');
expect(await page.isVisible('.rail-quiz a[href$="/document"] .rail-score:not(.perfect) .rail-meter'), 'rail: partial score with meter');
expect((await cells())[0] === 'cur', 'first cell is current');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-start.png` });

// Skip: the question goes to the end, marked as skipped.
const firstQ = await page.textContent('#q-title');
await page.click('[data-action="skip"]');
expect((await page.textContent('#q-title')) !== firstQ, 'skip shows another question');
expect((await cells()).at(-1) === 'skip', 'skipped cell sits at the end');
expect(await page.isVisible('.q-skip'), 'skipped count shown');

// Answer every question: the first one by keyboard, then Enter moves on.
for (let n = 0; n < total; n++) {
  const tf = await page.$('.options .opt:not(:has(.letter))');
  const fib = await page.$('#fib-in');
  if (fib) { await page.fill('#fib-in', 'zzz'); await page.click('[data-fid="fib-go"]'); }
  else if (n === 0) { await page.focus('.options .opt'); await page.keyboard.press(tf ? 't' : 'b'); }
  else await page.click('.options .opt >> nth=0');
  await page.waitForSelector('#qf-title');
  if (n === 0) {
    const c = await cells();
    expect(/ok|bad/.test(c[0]), `answer fills the cell (${c[0]})`);
    expect(await page.isVisible('[data-action="next"]'), 'Next button shown after answering');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-answered.png`, fullPage: true });
    await page.focus('#qf-title');
    await page.keyboard.press('Enter');
  } else await page.click('[data-action="next"]');
}
await page.waitForSelector('.q-result');
const score = +(await page.$eval('.q-result-n', (e) => e.firstChild.textContent));
expect(!(await cells()).some((c) => c === '' || c.includes('cur')), 'end strip: every cell answered');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-end.png`, fullPage: true });
const railBest = await page.textContent('.rail-quiz a[aria-current] .rail-score, .rail-quiz a[aria-current] .rail-count');
expect(score === 0 || railBest.includes(`${score}/${total}`), `rail shows best ${score}/${total} (${railBest.trim()})`);

const retry = await page.$('[data-action="retry-missed"]');
expect(!!retry === score < total, 'retry-missed offered when something was missed');
if (retry) {
  const saved = await page.evaluate(() => localStorage.getItem('html-quiz-v1'));
  await retry.click();
  const n = (await cells()).length;
  expect(n === total - score, `retry run has only the missed questions (${n})`);
  const fib = await page.$('#fib-in');
  if (fib) { await page.fill('#fib-in', 'zzz'); await page.click('[data-fid="fib-go"]'); }
  else await page.click('.options .opt >> nth=0');
  await page.waitForSelector('#qf-title');
  expect(await page.isVisible('.rail-quiz .rail-live'), 'rail marks the run in progress');
  expect((await page.evaluate(() => localStorage.getItem('html-quiz-v1'))) === saved, 'retry run does not touch the best score');
}
expect(problems.length === 0, `no page errors or warnings ${problems.join(' | ')}`);
await page.close();

// Narrow screen: the dropdown replaces the rail, the keys hint is hidden.
const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
await phone.goto(`${base}${QUIZ}`);
await phone.waitForSelector('.q-strip');
expect(!(await phone.isVisible('.q-keys')), 'phone: keys hint hidden');
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
expect(!overflow, 'phone: no horizontal scroll');
if (SHOTS) await phone.screenshot({ path: `${SHOTS}/quiz-phone.png`, fullPage: true });

await browser.close();
server.close();
console.log(bad ? `${bad} check(s) failed` : 'all quiz checks passed');
process.exit(bad ? 1 : 0);
