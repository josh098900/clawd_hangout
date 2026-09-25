// Time as text, in one place so every countdown and clock in the game agrees.

/**
 * Seconds as m:ss. `round`: 'up' (the default: a countdown shows 0:01 until it's really over), 'down' (time
 * spent), or 'near'. `pad` = two-digit minutes ("05:00", the Den's pomodoro).
 */
export function mmss(sec: number, round: 'up' | 'down' | 'near' = 'up', pad = false): string {
  const n = Math.max(0, round === 'up' ? Math.ceil(sec) : round === 'down' ? Math.floor(sec) : Math.round(sec)), m = String(Math.floor(n / 60));
  return (pad ? m.padStart(2, '0') : m) + ':' + String(n % 60).padStart(2, '0');
}
