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
  const mods = { lab: ['lab', 'makeLab'], plaza: ['plaza', 'makePlaza'], cinema: ['cinema', 'makeCinema'], den: ['den', 'makeDen'], roof: ['roof', 'makeRoof'], crypt: ['crypt', 'makeCrypt'], stage: ['stage', 'makeStage'], pier: ['pier', 'makePier'], arcade: ['arcade', 'makeArcade'], park: ['park', 'makePark'], diner: ['diner', 'makeDiner'], karts: ['karts', 'makeKarts'], lofts: ['lofts', 'makeLofts'], rocket: ['rocket', 'makeRocket'], station: ['station', 'makeSpaceStation'], spacewalk: ['spacewalk', 'makeSpacewalk'], lander: ['lander', 'makeLander'], moon: ['moon', 'makeMoon'], moonbase: ['moonbase', 'makeMoonBase'], wing: ['wing', 'makeWing'], reactor: ['reactor', 'makeReactor'], chem: ['chem', 'makeChem'], aquarium: ['aquarium', 'makeAquarium'], sub: ['sub', 'makeSub'], airport: ['airport', 'makeAirport'], plane: ['plane', 'makePlane'], kef: ['kef', 'makeKef'], reykjavik: ['reykjavik', 'makeReykjavik'], tourbus: ['tourbus', 'makeTourbus'], seljaland: ['seljaland', 'makeSeljaland'], gorge: ['seljaland', 'makeGorge'], skoga: ['skoga', 'makeSkoga'], skogatop: ['skoga', 'makeSkogaTop'], wreck: ['wreck', 'makeWreck'], beach: ['beach', 'makeBeach'] };
  const rooms = {};
  for (const [id, [f, fn]] of Object.entries(mods)) rooms[id] = (await import('/src/world/' + f + '.ts'))[fn]();
  const sub = await import('/src/world/subway.ts'), flat = await import('/src/world/flat.ts');
  rooms.subway = sub.makeStation(0); rooms.parkstn = sub.makeStation(1); rooms.dinerstn = sub.makeStation(2); rooms.kartstn = sub.makeStation(3); rooms.airportstn = sub.makeStation(4); rooms.train = sub.makeTrain();
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
  // THE CHEM LAB's reactions: one of each kind going off (1.5 s in) and both two-chemist ones, fingerprinted; then every
  // one of the 84 mixes drawn at three moments at both benches (none may throw: the reactor-freeze lesson)
  const chemW = await import('/src/world/chem.ts'), chemG = await import('/src/game/chem.ts'), NOWMS = Date.now(), cr = rooms.chem;
  const liveMix = (b, m, u) => ({ b, mix: m, out: chemG.outcome(m), at: NOWMS - u * 1000, by: 'x', seed: 4242 + m });
  const chemScene = () => { cr.drawBack(A); for (const pr of [...cr.props, ...(cr.extras?.(A) ?? [])].sort((p, q) => p.y - q.y)) pr.draw(A); cr.drawFront?.(A); };
  const kinds = new Map(); for (const m of chemG.ALL_MIXES) { const k = chemG.outcome(m).kind; if (!kinds.has(k)) kinds.set(k, m); }
  for (const [kind, m] of kinds) { chemW.CHEM.live = [liveMix(0, m, 1.5)]; out['chem:rx:' + kind] = draw(cr, chemScene); }
  chemW.CHEM.live = [];
  for (const [id, u] of [['toothpaste', 6], ['confetti', 2]]) { chemW.CHEM.duo = { id, at: NOWMS - u * 1000 }; out['chem:duo:' + id] = draw(cr, chemScene); }
  { const c = px.mk(cr.w, cr.h), g = px.mk(Math.ceil(cr.w / 2), Math.ceil(cr.h / 2)), pc = px.PX.ctx, pg = px.PX.glow; px.PX.glow = g.getContext('2d');
    px.withCtx(c.getContext('2d'), () => { for (const m of chemG.ALL_MIXES) for (const u of [0.3, 1.5, 3.2]) for (const b of [0, 1]) { chemW.CHEM.live = [liveMix(b, m, u)]; chemW.CHEM.duo = null; chemScene(); } });
    px.PX.glow = pg; px.PX.ctx = pc; }
  chemW.CHEM.live = []; chemW.CHEM.duo = null;
  // THE CITY AQUARIUM: the gallery with every tank full (each fish at its own size), feeding time, the jelly disco, and
  // SARDINE 1 in the pen (and its periscope off the Pier) at each point of its 8 minutes; the season's extras further down
  const aqG = await import('/src/game/aquarium.ts'), aqW = await import('/src/world/aquarium.ts'), subG = await import('/src/game/sub.ts'), ar = rooms.aquarium;
  const aqScene = () => { ar.drawBack(A); for (const pr of [...ar.props].sort((p, q) => p.y - q.y)) pr.draw(A); };
  aqG.GALLERY.forEach((f, i) => aqG.GAL.tanks.set(f, { fish: f, name: 'NAME' + i, cm: 10 + i * 9, at: 0 }));
  out['aquarium:gallery'] = draw(ar, aqScene);
  aqG.FEED.skew = 30 - (Date.now() / 1000) % 900; aqW.AQUA.scoops.push({ x: 1000, t0: performance.now() / 1000 - 2 }); out['aquarium:feeding'] = draw(ar, aqScene); aqG.FEED.skew = 0; aqW.AQUA.scoops.length = 0;
  aqW.AQUA.jellyDancers = 3; out['aquarium:disco'] = draw(ar, aqScene); aqW.AQUA.jellyDancers = 0;
  for (const k of [20, 95, 200, 475]) { subG.SUB.skew = k - (Date.now() / 1000) % 480; out['aquarium:sub:' + k] = draw(ar, aqScene); out['pier:sub:' + k] = draw(rooms.pier, () => rooms.pier.drawBack(A)); }
  subG.SUB.skew = 0; aqG.GAL.tanks.clear();
  // SARDINE 1 (step 18, push 2): the cabin with the window at the dock, going down, and in every zone of the sea (lights on and off, by
  // night too), the troubles, the visitors and the baby octopus on the glass, the claw at work and its CLAW CAM; every new creature and find
  const subW = await import('/src/world/sub.ts'), seaW = await import('/src/world/sea.ts'), sl = await import('/src/world/sealife.ts'), sr = rooms.sub, T = Date.now() / 1000, N = 3729166, S = subW.SUBW;
  const subScene = () => { sr.drawBack(A); for (const pr of [...sr.props, ...(sr.extras?.(A) ?? [])].sort((p, q) => p.y - q.y)) pr.draw(A); };
  const seaAt = (x, y, lamps, day = 1) => ({ x, y, vx: 0, vy: 0, T, n: N, day, a: A, lamps, lampT: T - 5, life: subG.seaLife(T, N, { x, y, still: 5 }, { on: lamps, lt: T - 5, lp: T - 20 }), finds: subG.findsOf(N), got: 0, ping: { T: T - 1, x, y }, buoys: subG.buoysOf(N), mapped: 1, rain: false, flashK: 0, snow: false, halloween: false, winter: false });
  S.board = ['DOCKED', 'DIVE 1:08', 'MISSION:', 'THE WHALE']; S.pen = { a: A, day: 1, wl: 360, slide: 0, gate: 0, boil: 0 }; out['sub:dock'] = draw(sr, subScene);
  S.pen = { a: A, day: 1, wl: 300, slide: 40, gate: 0.5, boil: 1 }; out['sub:diving'] = draw(sr, subScene); S.pen = null;
  for (const [name, x, y, lamps] of [['harbour', 300, 20, false], ['kelp', 800, 70, false], ['reef', 1400, 88, false], ['wreck', 1990, 120, true], ['dropoff', 2420, 205, false], ['deep', 2440, 520, true], ['trench', 3000, 1110, true], ['trenchdark', 3000, 1110, false], ['end', 3300, 1000, true]]) { S.sea = seaAt(x, y, lamps); S.depth = y; S.lamps = lamps; out['sub:' + name] = draw(sr, subScene); }
  S.sea = seaAt(1400, 88, false, 0); out['sub:reef:night'] = draw(sr, subScene);
  S.sea = seaAt(1990, 120, true); S.leak = 1; S.fixing = [true, false, false, false]; out['sub:leak'] = draw(sr, subScene); S.leak = 0;
  S.fixing = [false, false, true, false]; S.lightsOut = true; out['sub:lightsout'] = draw(sr, subScene); S.lightsOut = false; S.fixing = [false, false, false, false];
  S.glass = { ...S.glass, seal: 3 }; out['sub:seal'] = draw(sr, subScene); S.glass = { ...S.glass, seal: -1, squid: 3 }; out['sub:squid'] = draw(sr, subScene); S.glass = { ...S.glass, squid: -1, octo: 3 }; out['sub:octo'] = draw(sr, subScene); S.glass = { ...S.glass, octo: -1 };
  S.claw = { cx: 5, cd: 20, shut: 0.5, hold: 'coins', busy: true }; S.bin = ['chest', 'coins', 'bottle']; out['sub:claw'] = draw(sr, subScene);
  { const c = px.mk(240, 140); seaW.drawClawCam(c, { v: seaAt(1940, 150, true), cx: 0, cd: 20, shut: 1, hold: 'chest' }); out['sub:clawcam'] = H(c); }
  S.sea = null; S.claw = { cx: 0, cd: 0, shut: 0, hold: null, busy: false }; S.bin = []; S.depth = 0; S.lamps = false;
  out['sealife:new'] = draw({ w: 520, h: 250, dim: 0 }, () => { sl.seaOtter(20, 20, 1, A); sl.seal(60, 20, 1, A); sl.sealOnGlass(120, 34, A, 2); sl.seahorse(170, 20, A, 1); sl.seahorse(185, 20, A, 0); sl.garibaldi(210, 20, 1, A); sl.leopardShark(250, 20, 1, A); sl.octopusRock(300, 20, A, 1); sl.octopusRock(320, 20, A, 0); sl.grouper(340, 20, A, 1); sl.lanternfish(380, 20, A, 1); sl.humpback(110, 110, 1, A); sl.anglerfish(250, 100, 1, A, true); sl.anglerfish(290, 100, 1, A, false); sl.dumbo(330, 100, 1, A); sl.yetiCrab(360, 100, 1, A); sl.squidOnGlass(380, 70, 510, 150, A, 2); sl.babyOctopusOnGlass(460, 195, A, 2); ['coins', 'pearl', 'bottle', 'chest', 'duck', 'rduck', 'cone', 'phone', 'gnome', 'shades', 'trumpet', 'tyre', 'globe', 'present', 'bell', 'boot', 'can', 'bag', 'crisps'].forEach((k, i) => sl.drawFind(k, 14 + i * 26, 240, A)); });
  // UP PERISCOPE's view all the way round from the surface (5 views side by side), in each weather and time of day, the rocket on its pad
  { const ui = await import('/src/ui/sub.ts'), sp = await import('/src/world/space.ts'); sp.FLIGHT.skew = 1190 - (Date.now() / 1000) % 1200;
    for (const [name, day, wx] of [['day', 1, 'clear'], ['dusk', 0.42, 'clear'], ['night', 0, 'clear'], ['rain', 0.9, 'rain'], ['storm', 0.1, 'storm'], ['fog', 0.05, 'fog'], ['snow', 0.8, 'snow']])
      out['periscope:' + name] = draw({ w: 480, h: 96, dim: 0 }, () => { for (let i = 0; i < 5; i++) { const g = px.PX.ctx; g.save(); g.translate(i * 96, 0); ui.surfaceView(i * 96, day, wx, 0, A); g.restore(); } });
    sp.FLIGHT.skew = 0; }
  season.setSeason('winter'); W.installWinter(rooms);
  for (const room of Object.values(rooms)) draw(room, () => W.winterGround(room)); // (build the snow once first: the snow layer is cached, like in the game)
  for (const [id, room] of Object.entries(rooms)) out[id + ':winter'] = draw(room, () => { W.winterGround(room); W.winterBack(room, A); for (const pr of W.winterProps(id)) pr.draw(A); W.winterFront(room, A, { x: 0, y: 0, w: room.w, h: room.h }, false); });
  out['aquarium:own:winter'] = draw(ar, aqScene); // (the diver's Santa hat, the snowflake in the ocean tank)
  season.setSeason('halloween'); HW.installHalloween(rooms);
  for (const [id, room] of Object.entries(rooms)) out[id + ':halloween'] = draw(room, () => { HW.halloweenBack(room, A); for (const pr of HW.halloweenProps(id)) pr.draw(A); HW.halloweenFront(room, A); });
  out['aquarium:own:halloween'] = draw(ar, aqScene); // (the diver's witch hat, a skeleton fish, cobwebs in the gallery)
  // the city map: the city baked by night and by day, and its live layer (people and a friend, you, a hover, a pin
  // dropping, ? stickers, a YOU ARE HERE, a house party), plain and in both seasons
  const mp = await import('/src/world/map.ts');
  for (const day of [false, true]) { const c = px.mk(mp.MAP_W, mp.MAP_H); mp.paintMap(c.getContext('2d'), day); out['map:' + (day ? 'day' : 'night')] = H(c); }
  const mapLive = { a: A, me: { col: [34, 197, 160], room: 'lab' }, hiding: false, hover: 'cinema', pin: { id: 'pier', t0: A - 0.1 }, seen: new Set(['lab', 'plaza', 'den']), board: 'plaza', flats: 3, party: true,
    people: [{ id: 'a', name: 'SAM', col: [232, 216, 192], friend: true, room: 'pier' }, { id: 'b', name: 'ALEX', col: [90, 209, 255], friend: false, room: 'pier' }, { id: 'c', name: 'JO', col: [242, 194, 48], friend: false, room: 'train' }, { id: 'd', name: 'MO', col: [230, 86, 79], friend: true, room: 'moonbase' }, { id: 'e', name: 'KIT', col: [150, 210, 70], friend: false, room: 'flat' }] };
  for (const sn of [null, 'halloween', 'winter']) { season.setSeason(sn); out['map:live' + (sn ? ':' + sn : '')] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => mp.drawMapLive(mapLive)); }
  out['map:hiding'] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => mp.drawMapLive({ ...mapLive, hiding: true, hover: 'spacewalk', pin: null, board: null }));
  // THE AIRPORT and ICELAND (step 19): LAB AIR at each point of its 10 minutes, seen through the terminal's window, KEF's window and the
  // cabin's (the moving map, the seatbelt signs, PENNY's trolley, a bumpy leg with the masks down); the carousel's bags, the X-ray and the
  // arch; REYKJAVÍK by night (each strength of aurora), dawn, day and dusk, and in each of Iceland's weathers; the map's ICELAND page and
  // the plane on the city's; the view from the top of the church
  season.setSeason(null);
  { const airG = await import('/src/game/air.ts'), iceW = await import('/src/world/iceland.ts'), aprW = await import('/src/world/airport.ts'), planeW = await import('/src/world/plane.ts'), kefW = await import('/src/world/kef.ts'), rvkW = await import('/src/world/reykjavik.ts'), icm = await import('/src/world/icemap.ts'), pass = await import('/src/ui/passport.ts');
    const atK = (k) => { airG.AIR.skew = 0; airG.AIR.skew = k - (airG.airT() % 600); };
    const iceAt = (p, kp, sky) => { iceW.ICE.skew = 0; const p0 = iceW.iceP(); iceW.ICE.skew = ((p - p0 + 1) % 1) * 1200; if (kp !== undefined) for (let s = 0; s < 400 && iceW.kpOf(iceW.tonight()) !== kp; s++) iceW.ICE.skew += 1200; iceW.forceIceWeather(sky); };
    const sceneOf = (room) => () => { room.drawBack(A); for (const pr of [...room.props].sort((p, q) => p.y - q.y)) pr.draw(A); room.drawFront?.(A); };
    iceAt(0.7, undefined, 'clear');
    for (const k of [30, 95, 110, 120, 140, 585, 595]) { atK(k); out['airport:jet:' + k] = draw(rooms.airport, sceneOf(rooms.airport)); }
    for (const k of [285, 295, 330, 395, 420, 440]) { atK(k); out['kef:jet:' + k] = draw(rooms.kef, sceneOf(rooms.kef)); }
    for (const k of [30, 95, 110, 120, 140, 200, 270, 292, 330]) { atK(k); out['plane:' + k] = draw(rooms.plane, sceneOf(rooms.plane)); }
    { let n = 0; while (!(airG.masksDrop(n) && n % 2 === 0)) n++; const [t0] = airG.turbWindow(n); airG.AIR.skew = 0; airG.AIR.skew = n * 300 + t0 + 3 - airG.airT(); out['plane:masks'] = draw(rooms.plane, sceneOf(rooms.plane)); }
    atK(200); planeW.PLANEW.penny = { x: 500, y: 530 }; out['plane:trolley'] = draw(rooms.plane, sceneOf(rooms.plane)); planeW.PLANEW.penny = null;
    kefW.KEFW.bags = [{ u: 0.1, col: [200, 70, 60], mine: false }, { u: 0.3, col: [60, 110, 200], mine: true }, { u: 0.55, col: [0, 0, 0], mine: false, odd: 'kayak' }, { u: 0.85, col: [0, 0, 0], mine: false, odd: 'cooler' }]; kefW.KEFW.stamp = performance.now() / 1000 - 0.1;
    atK(330); out['kef:bags'] = draw(rooms.kef, sceneOf(rooms.kef)); kefW.KEFW.bags = []; kefW.KEFW.stamp = -99;
    aprW.AIRW.xray = { hold: 19, t0: performance.now() / 1000 - 1 }; aprW.AIRW.arch = { t: performance.now() / 1000 - 0.3, beep: true }; atK(200); out['airport:security'] = draw(rooms.airport, sceneOf(rooms.airport));
    aprW.AIRW.xray = { hold: -1, t0: -99 }; aprW.AIRW.arch = { t: -99, beep: false };
    for (const [name, p, kp, sky] of [['night0', 0.2, 0, 'clear'], ['night4', 0.2, 4, 'clear'], ['night6', 0.2, 6, 'clear'], ['storm', 0.2, 8, 'clear'], ['dawn', 0.5, undefined, 'clear'], ['day', 0.7, undefined, 'clear'], ['dusk', 0.93, undefined, 'clear'], ['snow', 0.2, 6, 'snow'], ['cloudy', 0.7, undefined, 'cloudy'], ['drizzle', 0.7, undefined, 'drizzle'], ['gale', 0.7, undefined, 'gale']]) { iceAt(p, kp, sky); out['reykjavik:' + name] = draw(rooms.reykjavik, sceneOf(rooms.reykjavik)); }
    iceAt(0.2, 6, 'clear'); rvkW.REYKW.elfOpen = performance.now() / 1000 - 1; rvkW.REYKW.pet = performance.now() / 1000 - 0.5; out['reykjavik:elf'] = draw(rooms.reykjavik, sceneOf(rooms.reykjavik)); rvkW.REYKW.elfOpen = -99; rvkW.REYKW.pet = -99;
    for (const day of [false, true]) { const c = px.mk(mp.MAP_W, mp.MAP_H); icm.paintIceland(c.getContext('2d'), day); out['icemap:' + (day ? 'day' : 'night')] = H(c); }
    const iceLive = { ...mapLive, me: { col: [34, 197, 160], room: 'reykjavik' }, hover: 'kef', pin: null, board: 'reykjavik', seen: new Set(['kef']), people: [{ id: 'a', name: 'SAM', col: [232, 216, 192], friend: true, room: 'plane' }, { id: 'b', name: 'ALEX', col: [90, 209, 255], friend: false, room: 'kef' }] };
    for (const [name, k, p, kp, sky, hov] of [['in', 250, 0.2, 6, 'clear', null], ['kef', 330, 0.7, undefined, 'clear', 'skoga'], ['out', 440, 0.2, 8, 'snow', null], ['gale', 200, 0.7, undefined, 'gale', 'geysir'], ['drizzle', 200, 0.7, undefined, 'drizzle', null]]) { atK(k); iceAt(p, kp, sky); out['icemap:live:' + name] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => icm.drawIcelandLive(iceLive, hov)); }
    for (const k of [30, 105, 120, 135, 580, 595]) { atK(k); out['map:jet:' + k] = draw({ w: mp.MAP_W, h: mp.MAP_H, dim: 0 }, () => mp.drawMapLive({ ...mapLive, people: [{ id: 'a', name: 'SAM', col: [232, 216, 192], friend: true, room: 'plane' }] })); }
    for (const [name, p, kp] of [['day', 0.7], ['night', 0.2, 6]]) { iceAt(p, kp, 'clear'); out['tower:' + name] = draw({ w: 640, h: 90, dim: 0 }, () => { for (let i = 0; i < 4; i++) { const g = px.PX.ctx; g.save(); g.translate(i * 160, 0); pass.towerView(i * 160, A); g.restore(); } }); }
    // LAB AIR's timetable, every second of its 10 minutes: the phases known, the doors open at one end at a time and never in the
    // air, the route and the height in bounds; 10,000 legs' bumpy air inside the cruise; and Iceland's weather and KP tables
    const PH = ['board', 'push', 'taxi', 'roll', 'climb', 'cruise', 'descend', 'land']; let bad = 0, sig = '';
    for (let k = 0; k < 600; k++) { const a = airG.airAt(k + 0.5), open = airG.doorOpenAt('city', a) || airG.doorOpenAt('kef', a);
      if (!PH.includes(a.phase) || !(a.u >= 0 && a.u <= 1) || !(a.alt >= 0 && a.alt <= 1) || (open && airG.flying(a)) || (airG.doorOpenAt('city', a) && airG.doorOpenAt('kef', a)) || (airG.flying(a) && (airG.onGroundAt('city', a) || airG.onGroundAt('kef', a)))) bad++;
      sig += a.phase[0] + (open ? 'o' : '') + Math.round(a.u * 9) + Math.round(a.alt * 9); }
    let tsig = 0; for (let n = 0; n < 10000; n++) { const w = airG.turbWindow(n); if (w && !(w[0] >= airG.CRUISE_S && w[1] <= airG.DESCEND_S)) bad++; tsig = (tsig * 31 + (w ? w[0] * 17 + w[1] : 1) + (airG.masksDrop(n) ? 7 : 0)) >>> 0; }
    if (bad) throw new Error('LAB AIR: ' + bad + ' bad seconds / legs in the timetable');
    out.air = sig.length + ':' + [...sig].reduce((x, ch) => (x * 31 + ch.charCodeAt(0)) >>> 0, 0) + ':' + tsig;
    let ws = 0, ks = 0; for (let s2 = 0; s2 < 3000; s2++) ws = (ws * 31 + iceW.iceRoll(s2)) >>> 0; for (let n = 0; n < 3000; n++) { const kp = iceW.kpOf(n); if (!(kp >= 0 && kp <= 9)) throw new Error('KP ' + kp); ks = (ks * 31 + kp) >>> 0; }
    out.ice = ws + ':' + ks;
    airG.AIR.skew = 0; iceW.ICE.skew = 0; iceW.forceIceWeather(null); }
  // THE SOUTH COAST (step 19, push 2): each stop by night (under the lights), day, dusk, in a gale and in snow, with the bus waiting;
  // the bus on the road both ways and at a stop; a sneaker wave running up the beach; the ring glinting; and the tour's timetable and
  // the sneaker wave swept every second (one stop's doors at a time, never while driving; the road in bounds)
  { const tg = await import('/src/game/tour.ts'), iceW = await import('/src/world/iceland.ts'), cw = await import('/src/world/coast.ts'), bw = await import('/src/world/beach.ts'), sw = await import('/src/world/skoga.ts'), tb = await import('/src/world/tourbus.ts');
    const iceAt = (p, kp, sky) => { iceW.ICE.skew = 0; const p0 = iceW.iceP(); iceW.ICE.skew = ((p - p0 + 1) % 1) * 1200; if (kp !== undefined) for (let s = 0; s < 400 && iceW.kpOf(iceW.tonight()) !== kp; s++) iceW.ICE.skew += 1200; iceW.forceIceWeather(sky); };
    const tourAt = (k) => { tg.TOUR.skew = 0; tg.TOUR.skew = k - (tg.tourT() % tg.TOUR_CYCLE); };
    const sceneOf = (room) => () => { room.drawBack(A); for (const pr of [...room.props].sort((p, q) => p.y - q.y)) pr.draw(A); room.drawFront?.(A); };
    const STOP_K = { seljaland: 105, gorge: 105, skoga: 165, skogatop: 165, wreck: 215, beach: 275 };
    for (const id of ['seljaland', 'gorge', 'skoga', 'skogatop', 'wreck', 'beach']) { cw.COAST.view = { x0: 0, x1: rooms[id].w }; tourAt(STOP_K[id]);
      for (const [name, p, kp, sky] of [['night', 0.2, 6, 'clear'], ['day', 0.7, undefined, 'clear'], ['dusk', 0.93, undefined, 'clear'], ['gale', 0.7, undefined, 'gale'], ['snow', 0.2, 0, 'snow']]) { iceAt(p, kp, sky); out[id + ':' + name] = draw(rooms[id], sceneOf(rooms[id])); } }
    iceAt(0.7, undefined, 'clear'); tb.TBW.view = { x0: 0, x1: 1200 };
    for (const k of [10, 60, 110, 230, 330]) { tourAt(k); out['tourbus:' + k] = draw(rooms.tourbus, sceneOf(rooms.tourbus)); }
    iceAt(0.2, 6, 'clear'); tourAt(330); out['tourbus:night'] = draw(rooms.tourbus, sceneOf(rooms.tourbus));
    iceAt(0.7, undefined, 'clear'); cw.COAST.view = { x0: 0, x1: 2000 }; bw.BEACH.skew = 0; bw.BEACH.skew = 3.5 - bw.waveP(); out['beach:wave'] = draw(rooms.beach, sceneOf(rooms.beach)); bw.BEACH.skew = 0;
    sw.SKOW.glint = performance.now() / 1000 - 1; sw.SKOW.glintX = 800; out['skoga:ring'] = draw(rooms.skoga, sceneOf(rooms.skoga)); sw.SKOW.glint = -99;
    let bad = 0, sig = '';
    for (let k = 0; k < tg.TOUR_CYCLE; k++) { tourAt(k + 0.5); const t = tg.tour(), open = tg.STOPS.map((_, s2) => tg.busAt(s2, t)).filter(Boolean).length;
      if (open > 1 || (t.phase === 'drive' && open) || (t.phase === 'stop' && open !== 1) || !(t.km >= 0 && t.km <= 182) || !(t.u >= 0 && t.u <= 1) || !(t.left > 0)) bad++;
      sig += t.phase[0] + t.from + Math.round(t.km / 20); }
    for (let s2 = 0; s2 < tg.STOPS.length; s2++) for (let k = 0; k < tg.TOUR_CYCLE; k += 7) { tourAt(k); const w = tg.nextBus(s2); if (!(w >= 0 && w <= tg.TOUR_CYCLE)) bad++; }
    for (let q = 0; q < 1400; q++) { const y = bw.sneakerY(q / 10); if (!(y >= bw.SURF.calm - 0.01 && y <= bw.SURF.far + 0.01)) bad++; }
    if (bad) throw new Error('the tour bus / the sneaker wave: ' + bad + ' bad seconds');
    out.tour = sig.length + ':' + [...sig].reduce((x, ch) => (x * 31 + ch.charCodeAt(0)) >>> 0, 0);
    tg.TOUR.skew = 0; iceW.ICE.skew = 0; iceW.forceIceWeather(null); cw.COAST.view = { x0: 0, x1: 2000 }; }
  season.setSeason('halloween');
  // pure maths
  const wx = await import('/src/world/weather.ts'), dn = await import('/src/game/diner.ts'), kt = await import('/src/game/kart.ts'), sp = await import('/src/world/space.ts'), ct = await import('/src/world/contest.ts'), gd = await import('/src/world/garden.ts'), fm = await import('/src/engine/format.ts');
  out.roll = Array.from({ length: 3000 }, (_, i) => wx.roll(i)).join(',').length + ':' + H(Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
  let rh = 0; for (let i = 0; i < 3000; i++) rh = (rh * 31 + wx.roll(i)) >>> 0; out.rollHash = rh;
  out.tickets = [1, 77, 4242].map((seed) => JSON.stringify(dn.tickets({ ...dn.newShift('h', 'H', 2, 1790000000000), seed }))).map((s) => s.length + ':' + [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0)).join(' ');
  out.cpu = kt.TRACKS.map((tr) => [0, 3.3, 20, 61].map((t) => JSON.stringify(kt.cpuAt(tr, 1234, 1, t))).join('|')).join(' ');
  // THE REACTOR's maths: every shift's surges and faults are well formed (a surge once had no message for half the seeds,
  // which froze the board), and a whole shift worked forward (fixed settings, faults left alone) comes out the same
  const rx = await import('/src/game/reactor.ts');
  let badRx = 0;
  for (let seed = 0; seed < 5000; seed++) { const g0 = { t0: 1790000000000, seed, lvl: 1 + (seed % 4) }; for (const sg of rx.surges(g0)) if (typeof sg.text !== 'string' || !sg.text || !(sg.mw > 0)) badRx++; for (const f of rx.faults(g0)) if (!(f.kind >= 0 && f.kind < 5)) badRx++; }
  if (badRx) throw new Error(badRx + ' reactor surges / faults are malformed');
  // THE CHEM LAB's chemistry: 84 mixes, each makes something well formed (the table itself is fingerprinted too)
  let badChem = 0; for (let m = 0; m < 256; m++) { if (!chemG.okMix(m)) continue; const o = chemG.outcome(m); if (!o.name || !(o.dur > 0) || !o.kind || o.c.length !== 3 || o.c.some((v) => !(v >= 0 && v <= 255))) badChem++; }
  if (chemG.ALL_MIXES.length !== 84 || badChem) throw new Error('chem: ' + chemG.ALL_MIXES.length + ' mixes, ' + badChem + ' malformed');
  // SARDINE 1's timetable and feeding time, every second of their loops: phases in order, the sub never half out of the pen for long
  { const PH = ['board', 'submerge', 'dive', 'home', 'surface'], t0 = Math.floor(Date.now() / 480000) * 480000; let last = 0, bad = 0, sig = '';
    for (let k = 0; k < 480; k++) { const d = subG.dive(t0 + k * 1000 + 500), i = PH.indexOf(d.phase), s = subG.penSink(d); if (i < last || !(s >= 0 && s <= 1) || !(subG.backIn(d) >= 0) || !(d.left > 0)) bad++; last = i; sig += d.phase[0] + (s === 0 ? '0' : s === 1 ? '1' : 'x'); }
    const f0 = Math.floor(Date.now() / 900000) * 900000; for (let k = 0; k < 900; k++) { const f = aqG.feeding(f0 + k * 1000 + 500); if (f.on !== (k < 90) || !(f.next > 0 && f.next <= 900)) bad++; }
    if (bad) throw new Error('aquarium: ' + bad + ' bad seconds in the timetables');

    out.sub = sig.length + ':' + [...sig].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0); }
  // SARDINE 1's seeds: 10,000 dives, each mission / trouble / find / whale / octopus / buoy well formed (the reactor-freeze lesson)
  { let bad = 0, sig = 0;
    for (let n = 0; n < 10000; n++) {
      const m = subG.missionOf(n), ts = subG.troublesOf(n), fs2 = subG.findsOf(n, n % 2 === 0), bs = subG.buoysOf(n), oc = subG.octopusAt(n);
      if (!(m >= 0 && m < subG.MISSIONS.length) || (n > 0 && subG.missionOf(n - 1) === m)) bad++;
      if (ts.length < 2 || ts.length > 3 || ts.some((t, i) => !(t.kind >= 0 && t.kind < 4) || t.k < 130 || t.k > 395 || (i && t.k - ts[i - 1].k < 50))) bad++;
      for (const f of fs2) if (!subG.FIND_NAMES[f.kind] || !(f.y <= subG.seabed(f.x) + 0.5) || !(f.x > 0 && f.x < subG.SEA_W) || f.i > 15) bad++;
      for (const b2 of bs) if (!(b2.y < subG.seabed(b2.x) - 10)) bad++;
      if (oc !== null && !(oc >= 160 && oc + subG.OCTO_S < subG.SUB_HOME)) bad++;
      sig = (sig * 31 + m * 7 + ts.length + fs2.length * 3 + (oc ?? 0) + (subG.whaleOn(n) ? 1 : 0)) >>> 0;
    }
    if (bad) throw new Error('SARDINE 1: ' + bad + ' malformed dives');
    out.dives = sig; }
  // ...and the Cap'n's tour, flown from the gate on calm seas: it never touches the rock, and it's the same every time
  { const st = subG.newDive(3729166, 'x'); let m = { x: st.x, y: st.y, vx: 0, vy: 0 }, bonks = 0, sig = '';
    for (let T2 = st.at; T2 < 3729166 * 480 + subG.SUB_HOME; T2 += subG.TICK) { const s2 = subG.autoStick(m, T2 - 3729166 * 480), r2 = subG.stepSub(m, s2.sx, s2.sy, subG.CALM, T2); m = r2.m; if (r2.bonk) bonks++; if (Math.round((T2 - st.at) * 10) % 200 === 0) sig += m.x.toFixed(1) + ',' + m.y.toFixed(1) + ' '; }
    if (bonks) throw new Error('SARDINE 1: the tour bonked ' + bonks + ' times');
    out.tour = sig.length + ':' + [...sig].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0); }
  // NPCs never wait where E would offer TALK instead of a spot players need (currentAction asks nearestNpc(30), dy x1.5,
  // before nearestSpot(20)): MARINA once stood on the aquarium's FEED step all through feeding time. A few short, older
  // stops are known and left be (COOKIE's by the kitchen stations on purpose: talking to COOKIE starts the tour).
  { const { Npcs } = await import('/src/game/npcs.ts'), bad = [];
    const KNOWN = new Set(['npc-fizz:0', 'npc-fizz:5', 'npc-fizz:8', 'npc-fizz-chem:3', 'npc-gus:2', 'npc-gus:6', 'npc-gus:7', 'npc-oak:2', 'npc-oak:4', 'npc-cookie:0', 'npc-cookie:1', 'npc-cookie:2', 'npc-cookie:3', 'npc-cookie:5', 'npc-fern:1', 'npc-cosmo:1']);
    for (const n of new Npcs(rooms).list) {
      const room = rooms[n.def.room];
      n.def.stops.forEach((st, si) => {
        if (!st.wait || KNOWN.has(n.def.id + ':' + si)) return;
        const at = st.use !== undefined ? [room.spots[st.use].sx, room.spots[st.use].sy] : [st.x, st.y];
        room.spots.forEach((sp, j) => { if (j !== st.use && Math.hypot(sp.sx - at[0], (sp.sy - at[1]) * 1.5) < 34) bad.push(n.def.id + ' stop ' + si + ' by ' + n.def.room + ' spot ' + j + ' (' + sp.kind + ')'); });
      });
    }
    if (bad.length) throw new Error('NPCs in the way of spots: ' + bad.join('; ')); }
  { const t = chemG.ALL_MIXES.map((m) => { const o = chemG.outcome(m); return m + ':' + o.kind + ':' + o.name + ':' + o.c.join('.') + ':' + o.dur; }).join(' '); out.chem = t.length + ':' + [...t].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0); }
  out.reactor = [7, 4242, 99999].map((seed) => { let g = { ...rx.newShift('h', 'H', 2, 1790000000000), seed }; g.fixed = rx.faults(g).map(() => 0); g.rods = 6; g.pumps = 3; g.turb = 7; g = rx.advance(g, g.t0 + 240000, () => 0.3); return [g.heat.toFixed(3), g.sat.toFixed(3), g.secs, g.melt, rx.grid(g)].join(','); }).join(' ');
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
  await grid('holds25', [25, 26, 27, 28].map((h) => [{}, (a) => { a.hold = h; }])); // (step 19: a hot dog, a skyr, a cinnamon swirl, a suitcase)
  await grid('airpose', ['checkin', 'xray', 'forecast', 'lav', 'drinks', 'passport', 'carousel', 'skyr', 'pylsa', 'bakery', 'tower', 'voyager', 'auroracam', 'cat', 'elf'].map((u) => [{}, (a) => { a.use = 0; }, u]));
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
  // the chem lab: a potion in hand (each kind), every effect mid-way and just starting (and on Clawd), and the poses at a bench, the shower, the book
  await grid('potions', L(6).map((k) => [{}, (a) => { a.hold = av.HOLD_POTION + k; }]));
  const fxAt = (k, since) => (a) => { a.fx = { k, t0: NOW - since, t1: NOW + 20 }; };
  await grid('fx', L(7).flatMap((k) => [[{}, fxAt(k + 1, 3)], [{}, fxAt(k + 1, 0.2)]]).concat([1, 2, 7].map((k) => [{ sp: 1 }, fxAt(k, 3)])));
  await grid('chempose', ['chem', 'shower', 'recipes'].map((u) => [{}, (a) => { a.use = 0; }, u]));
  // SARDINE 1: the escape hatch's rubber ring (just starting, and on Clawd), and the poses at its stations
  await grid('fxring', [[{}, fxAt(8, 3)], [{}, fxAt(8, 0.2)], [{ sp: 1 }, fxAt(8, 3)]]);
  await grid('subpose', ['helm', 'subcam', 'sonar', 'subclaw', 'periscope', 'tea'].map((u) => [{}, (a) => { a.use = 0; }, u]));
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
