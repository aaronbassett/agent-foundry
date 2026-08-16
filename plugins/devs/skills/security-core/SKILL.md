---
name: devs:security-core
description: "Use when designing or reviewing authentication, authorization, secrets handling, rate limiting, or server-side HTTP hardening — and as the security lens for code review. Owns cross-language security decisions and policies; client-side browser security (XSS, CSP from the app's view, browser token storage) belongs to devs:react-core, framework mechanics to the language skills, and dependency auditing to devs:deps-core."
---

# Security Core

Cross-cutting application-security decisions: which model, what policy, what to check. The language skills own how to express these decisions in a given framework; this skill must never contradict them — where mechanics are needed, it delegates.

## Reference routing

| Reference | Use when |
|---|---|
| [authn-design.md](references/authn-design.md) | Choosing an auth model; token lifetime/rotation/revocation policy; MFA; CLI/desktop OAuth; password hashing policy |
| [authz-design.md](references/authz-design.md) | RBAC and resource ownership; why not to hand-roll policy engines; the Postgres/Supabase RLS multi-tenant pattern |
| [secrets.md](references/secrets.md) | Where secrets live, settings validation, rotation ordering, CI credentials (OIDC), scanners, key generation |
| [rate-limiting.md](references/rate-limiting.md) | What to limit on which key, tiering, distributed atomicity, fail-open vs fail-closed, response contract |
| [http-hardening.md](references/http-hardening.md) | Server-side canonical security headers, CSP nonce minting, CORS with credentials, HSTS |
| [review-lens.md](references/review-lens.md) | Reviewing a diff for security: weighted if-the-diff-touches-X-check-Y mappings |

## Ownership boundaries

- **devs:react-core** (security reference) owns client-side XSS/sanitization, the browser view of CSP and headers, and browser token storage. Server and client guidance must agree; where this skill states the server-side canonical, react-core states the client consequences.
- **The language skills** (rust-core, python-core, typescript-core) own framework security mechanics — axum middleware, FastAPI auth wiring, Express setup — and the per-language library choices.
- **devs:deps-core** owns dependency auditing and vulnerability scanning of the package tree.
- **devs:code-review** owns the general review method; this skill supplies the security dimension via review-lens.md.

This skill ships no scripts or config assets: security scaffolding rots faster than any other kind, and the language skills' verified templates are the correct home for runnable configuration.
