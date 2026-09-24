// Cloudflare Turnstile, only for a first visit's anonymous sign-in (and only when
// VITE_TURNSTILE_SITE_KEY is set). Supabase checks the token server-side: switch on
// Auth -> Attack Protection -> CAPTCHA (Turnstile) with the matching secret key.

interface Turnstile { render(el: HTMLElement, opts: Record<string, unknown>): string }
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('could not load the human check (Turnstile)'));
    document.head.appendChild(s);
  });
  return loading;
}

/** Show the widget in `el` and resolve with its token once the visitor passes. */
export async function turnstileToken(siteKey: string, el: HTMLElement): Promise<string> {
  await load();
  el.classList.remove('hidden');
  return new Promise((res, rej) => {
    window.turnstile!.render(el, {
      sitekey: siteKey, theme: 'dark',
      callback: (token: string) => { el.classList.add('hidden'); res(token); },
      'error-callback': () => rej(new Error('the human check failed, reload to try again')),
    });
  });
}
