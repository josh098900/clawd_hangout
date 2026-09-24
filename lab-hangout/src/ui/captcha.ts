// Cloudflare Turnstile, only for a guest's anonymous sign-in (and only when
// VITE_TURNSTILE_SITE_KEY is set). Supabase checks the token server-side: switch on
// Auth -> Attack Protection -> CAPTCHA (Turnstile) with the matching secret key.
// Logging in with Discord/Google doesn't need it.

interface Turnstile { render(el: HTMLElement, opts: Record<string, unknown>): string; remove(id: string): void; reset(id: string): void }
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error('could not load the human check (Turnstile), check your connection')); };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Show the widget in `el` and resolve with a fresh token once the visitor passes. Tokens are
 * single-use, so every call renders a new widget (and removes it after). An expired token
 * re-runs the check by itself.
 */
export async function turnstileToken(siteKey: string, el: HTMLElement): Promise<string> {
  await load();
  el.classList.remove('hidden');
  const box = document.createElement('div'); el.replaceChildren(box);
  return new Promise((res, rej) => {
    const ts = window.turnstile!;
    const done = (fn: () => void) => { try { ts.remove(id); } catch { /* already gone */ } el.classList.add('hidden'); el.replaceChildren(); fn(); };
    const id = ts.render(box, {
      sitekey: siteKey, theme: 'dark',
      callback: (token: string) => done(() => res(token)),
      'expired-callback': () => ts.reset(id),
      'error-callback': () => done(() => rej(new Error('the human check failed, try again'))),
    });
  });
}
