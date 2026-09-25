// npm run test:golden [-- --update]
//
// A refactor safety net: fingerprints (SHA-1) of everything the game draws and computes, with every clock frozen
// and Math.random seeded, compared with tests/golden/baseline.json. For each room it checks
//   - the baked backdrop(s)
//   - its animated layer, props and front layer
//   - its winter and halloween dressing
// plus pure maths: the weather roll, Diner tickets, the CPU karts, the time formatters.
// A change that should not change how anything looks must pass this unchanged. When a change is MEANT to
// change the look, check it with your eyes, then run with --update to save the new baseline.
// Uses a fresh dev server of its own (port 5197) so no hot-reloaded module is mixed in.

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../..'), BASE = join(HERE, 'baseline.json'), update = process.argv.includes('--update');
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.error('Chrome not found: set CHROME_PATH.'); process.exit(2); }
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5197, strictPort: true, open: false, hmr: false } });
await server.listen();
const b = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.evaluateOnNewDocument(() => {
  const FIXED = 1790000123456; const RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  globalThis.Date = FD; performance.now = () => 1234567.89;
  let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
});
await p.goto('http://localhost:5197/?local', { waitUntil: 'networkidle0' });
const res = await p.evaluate(async () => {
  const jobs = []; const H = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const k = '#' + jobs.length; jobs.push(crypto.subtle.digest('SHA-1', d).then((b) => [k, [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('')])); return k; };
  const px = await import('/src/engine/pixel.ts'), season = await import('/src/world/season.ts'), W = await import('/src/world/winter.ts'), HW = await import('/src/world/halloween.ts');
  const mods = { lab: ['lab', 'makeLab'], plaza: ['plaza', 'makePlaza'], cinema: ['cinema', 'makeCinema'], den: ['den', 'makeDen'], roof: ['roof', 'makeRoof'], crypt: ['crypt', 'makeCrypt'], stage: ['stage', 'makeStage'], pier: ['pier', 'makePier'], arcade: ['arcade', 'makeArcade'], park: ['park', 'makePark'], diner: ['diner', 'makeDiner'], karts: ['karts', 'makeKarts'], lofts: ['lofts', 'makeLofts'], rocket: ['rocket', 'makeRocket'], station: ['station', 'makeSpaceStation'], spacewalk: ['spacewalk', 'makeSpacewalk'] };
  const rooms = {};
  for (const [id, [f, fn]] of Object.entries(mods)) rooms[id] = (await import('/src/world/' + f + '.ts'))[fn]();
  const sub = await import('/src/world/subway.ts'), flat = await import('/src/world/flat.ts');
  rooms.subway = sub.makeStation(0); rooms.parkstn = sub.makeStation(1); rooms.dinerstn = sub.makeStation(2); rooms.kartstn = sub.makeStation(3); rooms.train = sub.makeTrain();
  for (const f of ['flat', 'flatbed', 'flatkit']) rooms[f] = flat.makeFlatRoom(f);
  const out = {};
  const A = 12.345;
  const draw = (room, extra) => {
    const c = px.mk(room.w, room.h), g = px.mk(Math.ceil(room.w / 2), Math.ceil(room.h / 2)), gx = g.getContext('2d'); gx.setTransform(0.5, 0, 0, 0.5, 0, 0); gx.globalCompositeOperation = 'lighter';
    const pc = px.PX.ctx, pg = px.PX.glow; px.PX.glow = gx;
    px.withCtx(c.getContext('2d'), () => { px.PX.dim = room.dim; px.PX.emit = false; px.PX.fl = 0; px.PX.gmul = 1; extra(); });
    px.PX.glow = pg; px.PX.ctx = pc; return H(c) + '/' + H(g);
  };
  for (const [id, room] of Object.entries(rooms)) {
    room.build(); out[id + ':bg'] = H(room.bg) + (room.bgAlt ? '/' + H(room.bgAlt) : '');
    out[id + ':scene'] = draw(room, () => { room.drawBack(A); for (const pr of [...room.props].sort((p, q) => p.y - q.y)) pr.draw(A); room.drawFront?.(A); });
  }
  season.setSeason('winter'); W.installWinter(rooms);
  for (const room of Object.values(rooms)) draw(room, () => W.winterGround(room)); // (build the snow once first: the snow layer is cached, like in the game)
  for (const [id, room] of Object.entries(rooms)) out[id + ':winter'] = draw(room, () => { W.winterGround(room); W.winterBack(room, A); for (const pr of W.winterProps(id)) pr.draw(A); W.winterFront(room, A, { x: 0, y: 0, w: room.w, h: room.h }, false); });
  season.setSeason('halloween'); HW.installHalloween(rooms);
  for (const [id, room] of Object.entries(rooms)) out[id + ':halloween'] = draw(room, () => { HW.halloweenBack(room, A); for (const pr of HW.halloweenProps(id)) pr.draw(A); HW.halloweenFront(room, A); });
  // pure maths
  const wx = await import('/src/world/weather.ts'), dn = await import('/src/game/diner.ts'), kt = await import('/src/game/kart.ts'), sp = await import('/src/world/space.ts'), ct = await import('/src/world/contest.ts'), gd = await import('/src/world/garden.ts'), fm = await import('/src/engine/format.ts');
  out.roll = Array.from({ length: 3000 }, (_, i) => wx.roll(i)).join(',').length + ':' + H(Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
  let rh = 0; for (let i = 0; i < 3000; i++) rh = (rh * 31 + wx.roll(i)) >>> 0; out.rollHash = rh;
  out.tickets = [1, 77, 4242].map((seed) => JSON.stringify(dn.tickets({ ...dn.newShift('h', 'H', 2, 1790000000000), seed }))).map((s) => s.length + ':' + [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0)).join(' ');
  out.cpu = kt.TRACKS.map((tr) => [0, 3.3, 20, 61].map((t) => JSON.stringify(kt.cpuAt(tr, 1234, 1, t))).join('|')).join(' ');
  out.fmt = [0, 0.4, 9.5, 59.4, 59.6, 60, 119.6, 600, 3599.9].map((s) => [fm.mmss(s), fm.mmss(s), gd.duration(s * 60), kt.raceTime(s * 1000)].join(',')).join(' ');
  const done = Object.fromEntries(await Promise.all(jobs));
  for (const k of Object.keys(out)) out[k] = String(out[k]).replace(/#\d+/g, (m) => done[m]);
  return out;
});
await b.close(); await server.close();
if (errs.length) { console.error('errors while drawing:', errs); process.exit(1); }
if (update || !fs.existsSync(BASE)) { fs.writeFileSync(BASE, JSON.stringify(res, null, 1) + '\n'); console.log('saved', Object.keys(res).length, 'fingerprints as the new baseline'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8')), changed = [...new Set([...Object.keys(base), ...Object.keys(res)])].filter((k) => base[k] !== res[k]);
for (const k of changed) console.log('CHANGED  ' + k);
console.log(changed.length ? changed.length + ' of ' + Object.keys(base).length + ' fingerprints changed' : 'all ' + Object.keys(base).length + ' fingerprints match the baseline');
process.exit(changed.length ? 1 : 0);
