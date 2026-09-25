// npm run test:smoke
//
// Starts the dev server in LOCAL mode (no Supabase) and drives headless Chrome through the game:
//   1. every room, in normal, winter and halloween dressing (with demo bots): it must load, and
//      nothing may throw or log an error. Also reports how busy the main thread was.
//   2. two players (two windows sharing a BroadcastChannel): they see each other, a move arrives,
//      and leaving the room is noticed.
//
// Uses your installed Chrome through puppeteer-core (set CHROME_PATH if it isn't found).

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: set CHROME_PATH to your Chrome or Chromium.'); process.exit(2); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5198, open: false } });
await server.listen();
const BASE = `http://localhost:${server.config.server.port}/?local&server=one&debug&idle=99999&weather=clear`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000, args: ['--hide-scrollbars'] });
const problems = [];
const check = (ok, what) => { console.log(`${ok ? ' ok ' : 'FAIL'}  ${what}`); if (!ok) problems.push(what); };
/** A page that records every uncaught error and console error. */
async function open(page, url) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: 1280, height: 760 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('#go')?.disabled, { timeout: 20000 });
  await page.click('#go'); await wait(1200);
  return errs;
}

try {
  // ---------- 1. every room, every dressing ----------
  for (const season of ['', 'winter', 'halloween']) {
    const page = await browser.newPage();
    const errs = await open(page, BASE + '&bots=4' + (season ? '&season=' + season : ''));
    const rooms = await page.evaluate(async () => (await import('/src/world/room.ts')).ROOM_IDS);
    const m0 = await page.metrics(), t0 = Date.now(), wrong = [];
    for (const id of rooms) {
      await page.evaluate((id) => window.__hangout.go(id), id); await wait(1100);
      if ((await page.evaluate(() => window.__hangout.room)) !== id) wrong.push(id);
    }
    const busy = ((await page.metrics()).TaskDuration - m0.TaskDuration) / ((Date.now() - t0) / 1000);
    const label = season || 'normal';
    check(!wrong.length, `${label}: all ${rooms.length} rooms load${wrong.length ? ' (not: ' + wrong.join(', ') + ')' : ''}`);
    check(!errs.length, `${label}: no errors${errs.length ? '\n        ' + [...new Set(errs)].slice(0, 5).join('\n        ') : ''}`);
    console.log(`      ${label}: main thread busy ${Math.round(busy * 100)}% (about 15% is normal)`);
    await page.close();
  }

  // ---------- 2. two players ----------
  const A = await browser.newPage(); const errA = await open(A, BASE);
  const tgt = browser.waitForTarget((t) => t.opener() && t.type() === 'page');
  await A.evaluate(() => window.open('about:blank', '_blank', 'popup,width=1280,height=760'));
  const B = await (await tgt).page();
  await B.evaluateOnNewDocument(() => { try { sessionStorage.clear(); } catch { /* a fresh player id for this window */ } });
  const errB = await open(B, BASE);
  const idA = await A.evaluate(() => window.__hangout.me.id), idB = await B.evaluate(() => window.__hangout.me.id);
  check(idA !== idB, 'two windows are two different players');
  await A.evaluate(() => window.__hangout.go('plaza', 300, 640)); await B.evaluate(() => window.__hangout.go('plaza', 500, 640)); await wait(2500);
  const seen = (p, id) => p.evaluate((id) => window.__hangout.others().find((o) => o[0] === id) ?? null, id);
  check(!!(await seen(B, idA)) && !!(await seen(A, idB)), 'they see each other in the Square');
  await A.evaluate(() => window.__hangout.at(620, 660)); await wait(1500);
  const a = await seen(B, idA);
  check(!!a && Math.abs(a[2] - 620) < 12 && Math.abs(a[3] - 660) < 12, `a move arrives (B sees A at ${a ? a[2] + ',' + a[3] : 'nowhere'}, expected 620,660)`);
  await A.evaluate(() => window.__hangout.go('lab')); await wait(2500);
  check(!(await seen(B, idA)), 'leaving the room is noticed');
  check(!errA.length && !errB.length, `two players: no errors${errA.length + errB.length ? '\n        ' + [...new Set([...errA, ...errB])].slice(0, 5).join('\n        ') : ''}`);
} catch (e) {
  check(false, 'the smoke test itself crashed: ' + (e instanceof Error ? e.stack : e));
} finally {
  await browser.close(); await server.close();
}
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall good');
process.exit(problems.length ? 1 : 0);
