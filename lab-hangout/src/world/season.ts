// The season: 'halloween' (October), 'winter' (1 December - 6 January) or null. Online it comes from the
// server (the date, or the owner's `set_season` override, so the owner can switch it on early
// for everyone); LOCAL mode uses the date. `?season=halloween` previews it in this browser.

let current: string | null = null;
export const season = (): string | null => current;
export const isHalloween = (): boolean => current === 'halloween';
export const isWinter = (): boolean => current === 'winter';
export function setSeason(s: string | null): void { current = s === 'halloween' || s === 'winter' ? s : null; }
