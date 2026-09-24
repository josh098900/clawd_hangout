// The season: 'halloween' (October), 'winter' (December) or null. Online it comes from the
// server (the date, or the owner's `set_season` override, so the owner can switch it on early
// for everyone); LOCAL mode uses the date. `?season=halloween` previews it in this browser.

let current: string | null = null;
export const season = (): string | null => current;
export const isHalloween = (): boolean => current === 'halloween';
export function setSeason(s: string | null): void { current = s === 'halloween' || s === 'winter' ? s : null; }
