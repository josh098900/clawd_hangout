// npm run test:lists
//
// The game keeps its own copy of a few lists the database also has (the server decides, the game draws and
// explains): claw prizes, fish + rarity odds, seeds, furniture / wallpaper / floor prices and the starter kit,
// the daily quests, and the weather roll. This builds the database from every migration (tests/sql/run.mjs
// --lists) and checks the game's source says exactly the same. A price or odds changed on one side only fails here.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(tmpdir(), 'lab-hangout-lists.json');
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: set CHROME_PATH.'); process.exit(2); }

rmSync(OUT, { force: true });
const r = spawnSync(process.execPath, [join(ROOT, 'tests/sql/run.mjs'), '__no_suites__', '--lists', OUT], { encoding: 'utf8' });
if (r.status !== 0 || !existsSync(OUT)) { console.error('building the database failed:\n' + r.stdout + r.stderr); process.exit(2); }
const sql = JSON.parse(readFileSync(OUT, 'utf8'));

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5195, strictPort: true, open: false, hmr: false } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5195/?local', { waitUntil: 'networkidle0' });
const game = await page.evaluate(async () => {
  const c = await import('/src/entities/critter.ts'), f = await import('/src/game/fish.ts'), g = await import('/src/world/garden.ts'), fu = await import('/src/world/furniture.ts'), q = await import('/src/game/quests.ts'), w = await import('/src/world/weather.ts');
  const ids = [...fu.FURN.keys(), ...fu.WALLPAPERS.map((x) => x.id), ...fu.FLOORS.map((x) => x.id)];
  return {
    claw: c.CLAW.map(([k, wt, s]) => [k, wt, s ?? null]), fish: f.FISH.map((x) => [x.name, x.rarity, x.cm[0], x.cm[1]]), odds: f.ODDS,
    seeds: g.SEEDS.map((s, i) => [i, s.name, s.cost, s.growS, s.pays]), furn: ids.map((id) => [id, fu.PRICE(id), fu.STARTER[id] ?? 0]),
    quests: Object.keys(q.QUESTS), roll: Array.from({ length: 3000 }, (_, i) => w.roll(i)),
  };
});
await browser.close(); await server.close();

const key = (x) => JSON.stringify(x);
let bad = 0;
const same = (what, a, b) => {
  const A = new Set(a.map(key)), B = new Set(b.map(key)), onlyGame = [...A].filter((x) => !B.has(x)), onlyDb = [...B].filter((x) => !A.has(x));
  if (onlyGame.length || onlyDb.length) { bad++; console.log(`FAIL  ${what}\n        only in the game: ${onlyGame.join(' ') || '-'}\n        only in the database: ${onlyDb.join(' ') || '-'}`); }
  else console.log(` ok   ${what} (${A.size})`);
};
same('claw prizes', game.claw, sql.claw);
same('fish', game.fish, sql.fish);
same('rarity odds', Object.entries(game.odds), Object.entries(sql.odds));
same('seeds', game.seeds, sql.seeds);
same('furniture, wallpapers, floors + starter kit', game.furn, sql.furn);
same('daily quests', game.quests, sql.quests);
const rollOk = key(game.roll) === key(sql.roll);
if (!rollOk) bad++;
console.log(`${rollOk ? ' ok ' : 'FAIL'}  weather roll (3000 slots)`);
console.log(bad ? `\n${bad} list(s) differ between the game and the database` : '\nthe game and the database agree');
process.exit(bad ? 1 : 0);
