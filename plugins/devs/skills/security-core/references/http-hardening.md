# HTTP Hardening

This reference is the server-side canonical for security headers and CORS; react-core's security reference owns the client/browser view of the same story, and the two must agree — same CSP shape, same header list, same X-XSS-Protection stance.

## The header block

**Content-Security-Policy** is nonce-based: the server mints a fresh nonce per response, stamps it on the script tags it emits, and never puts `'unsafe-inline'` in `script-src`. Alongside `script-src`, always set `object-src 'none'`, `base-uri 'none'` (blocks `<base>` hijacking of relative URLs), `form-action` (limits where forms can post), and `frame-ancestors` (the clickjacking control — it supersedes `X-Frame-Options`; keep `X-Frame-Options: DENY` only as a legacy-browser fallback).

**Strict-Transport-Security** with `includeSubDomains` commits every subdomain to HTTPS for `max-age`. Adding `preload` and submitting to the browser preload lists is effectively irreversible for the whole domain: removal takes months to propagate, and any subdomain that ever needs plain HTTP is broken for the duration. Add `preload` only once every current and future subdomain is HTTPS-only.

The rest of the block: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` deny-list for features you do not use (`geolocation=(), camera=(), microphone=()`), and `Cross-Origin-Opener-Policy: same-origin`.

**X-XSS-Protection**: never send it — or send explicitly `0`. The legacy filter is gone from modern browsers and could itself create XSS holes; helmet emits `X-XSS-Protection: 0` by default.

## Express example

helmet on express, verbatim from an executed server:

```ts
import { randomBytes } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';

const app = express();
app.disable('x-powered-by');

// Mint a fresh CSP nonce per response, before helmet reads it.
app.use((_req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          (_req, res) => `'nonce-${(res as express.Response).locals.cspNonce}'`,
        ],
        'object-src': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'connect-src': ["'self'"],
      },
    },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    xFrameOptions: { action: 'deny' }, // legacy fallback; frame-ancestors is authoritative
  }),
);
```

Response headers observed via curl against that server:

```
Content-Security-Policy: default-src 'self';script-src 'self' 'nonce-+jC0gj5tasnNfHUOYOy0yA==';object-src 'none';base-uri 'none';form-action 'self';frame-ancestors 'none';connect-src 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
X-XSS-Protection: 0
```

The nonce in the header matched the nonce on the emitted script tag; the pages this server renders consume it exactly as react-core's CSP section expects.

## CORS

When responses carry credentials, the allowlist must echo exact origins — the spec rejects `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true`, so a wildcard is not a loose policy, it is a broken one. Compare the request `Origin` against a fixed set and echo the match; never reflect arbitrary origins.

Two things CORS does not do: preflight is not a security boundary — it gates what browser JavaScript can read, while curl and server-to-server clients ignore it entirely, so authorization lives on the server regardless; and correct CORS does not defend cookie-authenticated mutations — session cookies still need `SameSite` (and CSRF tokens where warranted; react-core's CSRF section covers the client half).

## Delegation

- Rust: axum header/CORS middleware mechanics — rust-core's web-frameworks reference.
- Python: FastAPI middleware mechanics — python-core's FastAPI guide.
- Browser-side consumption of all of the above (nonce usage, Trusted Types, token storage) — react-core's security reference.
