# Security

## XSS

React escapes the text and attribute values it renders, so interpolating strings into JSX is safe by default. XSS enters through the escape hatches: raw HTML, URLs, and anything that turns strings into code. The react-components skill's web3-ui reference defers to this file for XSS handling.

**Raw HTML.** Render it only through a component in which sanitization is the sole path to the sink — no branch may reach `dangerouslySetInnerHTML` with unsanitized input:

```tsx
import DOMPurify from 'dompurify';

export function RichText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href'],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**URLs.** `href` and `src` accept `javascript:` and other executable schemes. Allowlist protocols before rendering user-supplied URLs:

```ts
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

export function safeUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw, window.location.origin);
    return SAFE_PROTOCOLS.includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
```

```tsx
import { safeUrl } from './safe-url';

export function UserLink({ link, label }: { link: string; label: string }) {
  return <a href={safeUrl(link) ?? '#'}>{label}</a>;
}
```

**Trusted Types.** Adding `require-trusted-types-for 'script'` to CSP makes DOM sinks reject plain strings; DOMPurify can emit Trusted Types (`RETURN_TRUSTED_TYPE: true`).

## Auth token storage

Session tokens belong in `HttpOnly; Secure; SameSite` cookies: script injected by any XSS can read `localStorage` and `sessionStorage`, but it cannot read an HttpOnly cookie. The client never touches the token — it sends `credentials: 'include'` and lets the browser attach it, which is how the API layer in [data-fetching.md](./data-fetching.md) is built.

## CSRF

Cookie auth means browsers attach credentials to cross-site requests, so mutations need CSRF defense. `SameSite=Lax` (or `Strict`) on the session cookie is the first line. Where a token is also required (e.g. the double-submit-cookie pattern), read it in a plain module function the API layer can call — hooks only run inside components:

```ts
// Plain function, usable from the API layer — not a hook.
export function csrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('csrf_token='))
    ?.split('=')[1];
}
```

The API layer sends the value as an `X-CSRF-Token` header on mutating requests.

## CSP and security headers

Ship a nonce-based policy: the server mints a fresh nonce per response and stamps it on the script tags it emits. No `'unsafe-inline'` in `script-src`.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<per-response>';
  object-src 'none'; base-uri 'none'; frame-ancestors 'none';
  connect-src 'self' https://api.example.com
```

Alongside it:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cross-Origin-Opener-Policy: same-origin
```

Do not send `X-XSS-Protection` — or send `X-XSS-Protection: 0` explicitly. The legacy filter is non-standard, absent from modern browsers, and can itself create XSS holes. CSP's `frame-ancestors` supersedes `X-Frame-Options`; keep `X-Frame-Options: DENY` only as a fallback for legacy browsers.

## Environment and config

Vite exposes only `VITE_`-prefixed variables to the client via `import.meta.env`. Everything in the bundle is public — secrets never ship to the client; calls that need them go through your backend. Validate at startup:

```ts
import * as z from 'zod';

const Env = z.object({
  VITE_API_URL: z.url(),
});

export const env = Env.parse(import.meta.env); // fail fast on misconfiguration
```

## Supply chain

Dependency auditing, provenance, and update policy are owned by the typescript-core skill's dependencies reference.
