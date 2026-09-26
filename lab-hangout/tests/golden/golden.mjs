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
  const mods = { lab: ['lab', 'makeLab'], plaza: ['plaza', 'makePlaza'], cinema: ['cinema', 'makeCinema'], den: ['den', 'makeDen'], roof: ['roof', 'makeRoof'], crypt: ['crypt', 'makeCrypt'], stage: ['stage', 'makeStage'], pier: ['pier', 'makePier'], arcade: ['arcade', 'makeArcade'], park: ['park', 'makePark'], diner: ['diner', 'makeDiner'], karts: ['karts', 'makeKarts'], lofts: ['lofts', 'makeLofts'], rocket: ['rocket', 'makeRocket'], station: ['station', 'makeSpaceStation'], spacewalk: ['spacewalk', 'makeSpacewalk'], lander: ['lander', 'makeLander'], moon: ['moon', 'makeMoon'], moonbase: ['moonbase', 'makeMoonBase'], wing: ['wing', 'makeWing'], reactor: ['reactor', 'makeReactor'] };
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
  // the city map: the city baked by night and by day, and its live layer (people and a friend, you, a hover, a pin
  // dropping, ? stickers, a YOU ARE HERE, a house party), plain and in both seasons
  const mp = await import('/src/world/map.ts');
  for (const day of [false, true]) { const c = px.mk(mp.MAP_W, mp.MAP_H); mp.paintMap(c.getContext('2d'), day); out['map:' + (day ? 'day' : 'night')] = H(c); }
  const mapLive = { a: A, me: { col: [34, 197, 160], room: 'lab' }, hiding: false, hover: 'cinema', pin: { id: 'pier', t0: A - 0.1 }, seen: new Set(['lab', 'plaza', 'den']), board: 'plaza', flats: 3, party: true,
    people: [{ id: 'a', name: 'SAM', col: [232, 216, 192], friend: true, room: 'pier' }, { id: 'b', name: 'ALEX', col: [90, 209, 255], friend: false, room: 'pier' }, { id: 'c', name: 'JO', col: [242, 194, 48], friend: false, room: 'train' }, { id: 'd', name: 'MO', col: [230, 86, 79], friend: true, room: 'moonbase' }, { id: 'e', name: 'KIT', col: [150, 210, 70], friend: false, room: 'flat' }] };
  for (const sn of [null, 'halloween', 'winter']) { season.setSeason(sn); out['map:live' + (sn ? ':' + sn : '')] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => mp.drawMapLive(mapLive)); }
  out['map:hiding'] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => mp.drawMapLive({ ...mapLive, hiding: true, hover: 'spacewalk', pin: null, board: null }));
  season.setSeason('halloween');
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
// ---- characters and sound, on a page that doesn't start the game (so nothing live can mix in) ----
const p2 = await b.newPage(); p2.on('pageerror', (e) => errs.push(e.message));
await p2.evaluateOnNewDocument(() => {
  const FIXED = 1790000123456; const RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
  globalThis.Date = FD; performance.now = () => 1234567.89;
  let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  // sound renders offline (silently, into a buffer we can fingerprint)
  globalThis.AudioContext = class extends OfflineAudioContext { constructor() { super(1, 44100 * 5, 44100); } resume() { return Promise.resolve(); } };
});
await p2.goto('http://localhost:5197/src/engine/math.ts', { waitUntil: 'load' });
Object.assign(res, await p2.evaluate(async () => {
  const sha = async (buf) => [...new Uint8Array(await crypto.subtle.digest('SHA-1', buf))].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
  const px = await import('/src/engine/pixel.ts'), av = await import('/src/entities/avatar.ts'), cr = await import('/src/entities/critter.ts');
  const out = {}, NOW = 1234.5, A = 12.345;
  const grid = async (name, list) => { // list of [look, setup(avatar), using?]
    const cols = 12, rows = Math.ceil(list.length / cols), c = px.mk(cols * 50, rows * 90), g = px.mk(cols * 25, rows * 45), gx = g.getContext('2d'); gx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    for (const dim of [0, 0.4]) {
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
      const pg = px.PX.glow; px.PX.glow = gx;
      px.withCtx(c.getContext('2d'), () => {
        list.forEach(([look, setup, using], i) => {
          const a = av.makeAvatar('av' + i, 'NAME' + i, { ...cr.DEFAULT_LOOK, ...look }, 25 + (i % cols) * 50, 80 + Math.floor(i / cols) * 90, i === 0, NOW - 5);
          a.stopT = NOW - 5; a.useT0 = NOW - 2; a.poseT0 = NOW - 1; a.pet.t = NOW;
          setup?.(a); px.PX.dim = dim; px.PX.emit = false; px.PX.fl = 0;
          av.drawAvatar(a, A, NOW, dim, using ?? null, 0, false);
        });
      });
      px.PX.glow = pg;
      out[name + ':' + dim] = (await sha(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)) + '/' + (await sha(gx.getImageData(0, 0, g.width, g.height).data));
    }
  };
  const L = (n) => Array.from({ length: n }, (_, i) => i);
  await grid('holds', L(18).map((h) => [{}, (a) => { a.hold = h; }]));
  await grid('poses', L(6).map((pz) => [{}, (a) => { a.pose = pz; }]).concat(['sit', 'desk', 'instrument', 'hammock', 'scope', 'rack', 'board', 'coffee', 'arcade', 'kart', 'mission'].map((u) => [{}, (a) => { a.use = 0; }, u])));
  await grid('moving', L(12).map((i) => [{ c: i % 9 }, (a) => { a.moving = true; a.walkDist = i * 7; a.dir = i % 2 ? 1 : -1; }]));
  for (const sp of [0, 1]) {
    await grid('hats' + sp, L(cr.HATS.length).map((h) => [{ sp, hat: h }]));
    await grid('faces' + sp, L(cr.FACES.length).map((f) => [{ sp, face: f }]));
    await grid('fits' + sp, L(cr.FITS.length).map((f) => [{ sp, fit: f }]));
    await grid('pets' + sp, L(cr.PETS.length).map((pt) => [{ sp, pet: pt }]));
  }
  await grid('emotes', av.ALL_EMOTES.map((e) => [{}, (a) => { a.emote = { kind: e.kind, t0: NOW - 0.3 }; }]));
  av.ENV.zeroG = true; await grid('zerog', L(6).map((i) => [{}, (a) => { a.moving = i % 2 === 1; a.pose = i < 2 ? 5 : 0; }])); av.ENV.free = true; await grid('free', L(4).map(() => [{}])); av.ENV.zeroG = false; av.ENV.free = false;
  av.ENV.ice = () => true; await grid('ice', L(4).map((i) => [{}, (a) => { a.moving = true; a.walkDist = i * 13; }])); av.ENV.ice = null;
  av.ENV.g = 0.6; await grid('gforce', L(3).map(() => [{}])); av.ENV.g = 0;
  // the Moon: a rock in hand, the buggy (bouncing), a moon jump, bounding, the rover (and a pet that waits inside), mining
  av.ENV.lowG = true; av.ENV.airless = true; av.ENV.bump = () => 3;
  await grid('moon', [[{}, (a) => { a.hold = 18; }], [{}, (a) => { a.pose = 6; a.moving = true; }], [{}, (a) => { a.pose = 5; }], [{}, (a) => { a.moving = true; a.walkDist = 13; }], [{ pet: 8 }], [{ pet: 2 }], [{}, (a) => { a.use = 0; }, 'rock']]);
  av.ENV.lowG = false; av.ENV.airless = false; av.ENV.bump = null;
  // sound: every effect, every instrument pad and a bar of music, rendered offline together
  const sfx = await import('/src/audio/sfx.ts'), mu = await import('/src/audio/music.ts');
  sfx.setSound(true);
  for (const k of Object.keys(sfx.SFX)) sfx.SFX[k]();
  for (let i = 0; i < 4; i++) for (let n = 0; n < 8; n++) mu.playPad(i, n, 0.5);
  const mp = new mu.MusicPlayer(); mp.set(mu.TRACKS[0], Date.now() / 1000); mp.volume(0.8); mp.tick();
  new mu.Rain().set(0.5); new mu.Rumble().set(0.5); new mu.Engine().set(0.7, true);
  const buf = await sfx.audio().AC.startRendering();
  // (overlapping sounds are summed in an order Chrome doesn't fix, so the last bits of a sample vary run to run:
  // keep each 50 ms slice's loudness instead, compared with a small tolerance)
  const d = buf.getChannelData(0), win = 2205; out.audio = [];
  out.pitch = []; // and how often it crosses zero in each slice (that follows the pitch, which loudness doesn't)
  for (let i = 0; i < d.length; i += win) {
    let e = 0, z = 0; for (let j = i; j < Math.min(d.length, i + win); j++) { e += d[j] * d[j]; if (j > i && (d[j] >= 0) !== (d[j - 1] >= 0)) z++; }
    out.audio.push(Math.round(Math.sqrt(e / win) * 1e6) / 1e6); out.pitch.push(z);
  }
  return out;
}));
await b.close(); await server.close();
if (errs.length) { console.error('errors while drawing:', errs); process.exit(1); }
if (update || !fs.existsSync(BASE)) { fs.writeFileSync(BASE, JSON.stringify(res, null, 1) + '\n'); console.log('saved', Object.keys(res).length, 'fingerprints as the new baseline'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
/** Sound (an array of loudness per slice) may wobble in its last digits; everything else must match exactly. */
const TOL = { audio: 1e-4, pitch: 4 }; // (zero crossings: a sample right at zero can flip either way)
const same = (a, b, k) => (Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= (TOL[k] ?? 0)) : a === b);
const changed = [...new Set([...Object.keys(base), ...Object.keys(res)])].filter((k) => !same(base[k], res[k], k));
for (const k of changed) console.log('CHANGED  ' + k);
console.log(changed.length ? changed.length + ' of ' + Object.keys(base).length + ' fingerprints changed' : 'all ' + Object.keys(base).length + ' fingerprints match the baseline');
process.exit(changed.length ? 1 : 0);
