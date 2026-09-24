// CODE: the Dev Den's typing game. Type three lines of (silly) code; finishing all three
// makes a commit with a random message. Works with a real keyboard and on phones (it's a
// plain text input under the hood).

import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const LINES = [
  'const coffee = await brew();', "if (build.failed) blame('dns');", 'for (const bug of bugs) squash(bug);', 'return vibes.filter(Boolean);',
  'while (!shipped) keepGoing();', "let ideas = ['???'];", 'deploy({ friday: true });', "console.log('here');", 'npm install more-coffee',
  'export default chill;', 'if (tests.pass) celebrate();', 'const plan = null; // TODO', 'await sleep(8 * HOURS);', 'git push --force-with-love',
  'rubberDuck.explain(problem);', "throw new Error('nope');", 'const slop = 0; // zero days', 'docs.write(); // someday',
];
const MSGS = ['fix typo', 'it works now??', 'remove console.log', 'add more coffee', 'refactor everything', 'wip', 'final final v2', 'please work',
  'tests pass locally', 'make it faster', 'undo last commit', 'add dark mode', 'update readme', 'bump deps', 'fix the fix', 'ship it'];

export function openTyping(onCommit: (msg: string, wpm: number) => void, onClose: () => void): void {
  const pick = [...LINES].sort(() => Math.random() - 0.5).slice(0, 3);
  let line = 0, t0 = 0, typed = 0, done = false;
  const m = openModal('CODE', onClose);
  const code = document.createElement('div');
  Object.assign(code.style, { fontFamily: "'VT323', ui-monospace, monospace", fontSize: '24px', lineHeight: '1.3', background: '#0E1620', color: '#56607A', padding: '12px 14px', minWidth: 'min(460px, 80vw)', whiteSpace: 'pre', overflowX: 'auto' });
  const input = document.createElement('input');
  Object.assign(input, { autocomplete: 'off', spellcheck: false, placeholder: 'type the highlighted line…' });
  input.setAttribute('autocapitalize', 'off'); input.setAttribute('autocorrect', 'off');
  Object.assign(input.style, { fontFamily: "'VT323', ui-monospace, monospace", fontSize: '22px', width: 'min(460px, 80vw)', background: 'rgba(0,0,0,.45)', color: '#FFE3B8', border: '0', borderBottom: '2px solid #5FE7FF', padding: '4px 8px', outline: 'none' });
  const stat = document.createElement('div'); Object.assign(stat.style, { fontFamily: "'VT323', monospace", fontSize: '18px', color: '#9FEFFF' });

  const render = () => {
    code.replaceChildren();
    pick.forEach((l, i) => {
      const d = document.createElement('div');
      if (i < line) { d.textContent = '✓ ' + l; d.style.color = '#7CF29C'; }
      else if (i > line) { d.textContent = '  ' + l; }
      else {
        const v = input.value; d.append('› ');
        for (let k = 0; k < l.length; k++) { const s = document.createElement('span'); s.textContent = l[k]; s.style.color = k < v.length ? (v[k] === l[k] ? '#FFFFFF' : '#FF6A6A') : k === v.length ? '#FFD65A' : '#8A94AE'; if (k === v.length) s.style.textDecoration = 'underline'; d.appendChild(s); }
      }
      code.appendChild(d);
    });
    const secs = t0 ? (performance.now() - t0) / 1000 : 0;
    stat.textContent = done ? '' : 'LINE ' + (line + 1) + '/3' + (secs > 1 ? '  ·  ' + Math.round((typed / 5) / (secs / 60)) + ' WPM' : '');
  };
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') m.close(); });
  input.addEventListener('input', () => {
    if (done) return;
    if (!t0) t0 = performance.now();
    SFX.key();
    if (input.value === pick[line]) {
      typed += pick[line].length; line++; input.value = ''; SFX.blip();
      if (line >= 3) {
        done = true;
        const wpm = Math.round((typed / 5) / ((performance.now() - t0) / 60000)), msg = MSGS[Math.floor(Math.random() * MSGS.length)];
        stat.textContent = "git commit -m '" + msg + "'  ·  " + wpm + ' WPM'; stat.style.color = '#7CF29C';
        onCommit(msg, wpm);
        setTimeout(m.close, 900);
      }
    }
    render();
  });
  m.body.append(code, input, stat, row(button('DONE', m.close, true)));
  render();
  setTimeout(() => input.focus(), 30);
}
