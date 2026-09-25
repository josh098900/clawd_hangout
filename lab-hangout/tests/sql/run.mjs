// npm run test:sql [-- <filter>]
//
// Runs every migration in supabase/migrations twice (so re-running is proven safe) on a throwaway local
// Postgres, then each suite here (NN_name.sql) on a fresh copy of that database. A suite prints
// "PASS ..." / "FAIL ..." notices; any FAIL or SQL error fails the run.
//
// Needs Postgres 14+ installed (macOS: `brew install postgresql@14`). Nothing touches Supabase: stubs.sql
// stands in for its auth and realtime schemas. The database lives in your temp folder on port 5499
// (PGTEST_DIR / PGTEST_PORT to change them) and is stopped again at the end.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '../../supabase/migrations');
const DIR = process.env.PGTEST_DIR ?? join(tmpdir(), 'lab-hangout-pgtest');
const PORT = process.env.PGTEST_PORT ?? '5499';
const filter = process.argv[2] ?? '';

// find the Postgres tools: PG_BIN, Homebrew's postgresql@14+, or whatever is on the PATH
const candidates = [process.env.PG_BIN, ...['17', '16', '15', '14'].flatMap((v) => [`/opt/homebrew/opt/postgresql@${v}/bin`, `/usr/local/opt/postgresql@${v}/bin`])].filter(Boolean);
const BIN = candidates.find((d) => existsSync(join(d, 'pg_ctl'))) ?? '';
const tool = (name) => (BIN ? join(BIN, name) : name);
const run = (name, args, opts = {}) => spawnSync(tool(name), args, { encoding: 'utf8', ...opts });
if (run('pg_ctl', ['--version']).error) { console.error('Postgres not found. Install it (brew install postgresql@14) or set PG_BIN to its bin folder.'); process.exit(2); }

if (!existsSync(join(DIR, 'PG_VERSION'))) {
  const r = run('initdb', ['-D', DIR, '-U', 'postgres', '-A', 'trust']);
  if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
}
let started = false;
if (run('pg_ctl', ['-D', DIR, 'status']).status !== 0) {
  const r = run('pg_ctl', ['-D', DIR, '-l', join(DIR, 'server.log'), '-o', `-p ${PORT} -k '' -c listen_addresses=localhost`, '-w', 'start']);
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(2); }
  started = true;
}
const stop = () => { if (started) run('pg_ctl', ['-D', DIR, '-m', 'fast', 'stop']); };
const psql = (db, args) => run('psql', ['-h', 'localhost', '-p', PORT, '-U', 'postgres', '-X', '-q', '-d', db, ...args]);
const must = (db, args, what) => { const r = psql(db, ['-v', 'ON_ERROR_STOP=1', ...args]); if (r.status !== 0) { console.error(`${what} failed:\n${r.stderr}`); stop(); process.exit(1); } };

// the template: stubs, then every migration twice
must('postgres', ['-c', 'drop database if exists lh_template', '-c', 'drop database if exists lh_test', '-c', 'create database lh_template'], 'creating the database');
must('lh_template', ['-f', join(HERE, 'stubs.sql')], 'stubs.sql');
const migrations = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
for (const pass of [1, 2]) for (const m of migrations) must('lh_template', ['-f', join(MIGRATIONS, m)], `${m} (pass ${pass})`);
console.log(`migrations ${migrations[0]} .. ${migrations.at(-1)} ran twice OK`);

// each suite on a fresh copy
let pass = 0, fail = 0;
for (const suite of readdirSync(HERE).filter((f) => /^\d+_.*\.sql$/.test(f) && f.includes(filter)).sort()) {
  must('postgres', ['-c', 'drop database if exists lh_test', '-c', 'create database lh_test template lh_template'], 'copying the database');
  const r = psql('lh_test', ['-f', join(HERE, suite)]);
  const lines = (r.stdout + r.stderr).split('\n').map((l) => l.replace(/^psql:[^ ]* /, '').replace(/^(NOTICE|ERROR):\s+/, (m, k) => (k === 'ERROR' ? 'ERROR ' : '')));
  const ok = lines.filter((l) => l.startsWith('PASS')).length, bad = lines.filter((l) => l.startsWith('FAIL') || l.startsWith('ERROR'));
  pass += ok; fail += bad.length;
  console.log(`${bad.length ? 'FAIL' : ' ok '}  ${suite.padEnd(26)} ${ok} passed${bad.length ? `, ${bad.length} failed` : ''}`);
  for (const l of bad) console.log('        ' + l);
}
stop();
console.log(`\n${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
