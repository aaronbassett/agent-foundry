# Security Review Lens

The weighted checklist the code-reviewer agent applies to a diff: match what the diff touches, run that row's checks, and route to the sibling reference for depth. Weighted means most dangerous first — not every row on every diff.

## Mappings, most dangerous first

**Auth or session code** → algorithms pinned at verification (no `alg` from the token), issuer and audience checked, secret/key rotation honors the dual-secret window, session id regenerated on privilege change (fixation). Depth: [authn-design.md](authn-design.md), rotation ordering in [secrets.md](secrets.md).

**New or changed endpoints** → the authorization check exists at the data layer (query scoped to the caller), not just in the handler or UI; input validated at the trust boundary with a schema, not sanitized ad hoc. If the endpoint is login/reset/signup, it also needs a strict, fail-closed rate-limit tier. Depth: [authz-design.md](authz-design.md), [rate-limiting.md](rate-limiting.md).

**SQL** → every value reaches the query as a bind parameter; string-built SQL is a finding even when inputs "look safe". New tables or policy changes: does RLS still hold for multi-tenant reads? Depth: [authz-design.md](authz-design.md).

**Secret-shaped strings** → grep the diff; these patterns are verified against a planted fixture with no false positives on benign identifiers:

```bash
rg -n "AKIA[0-9A-Z]{16}"                                  # AWS access key id
rg -n -- "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" # private key material
rg -n "sk_live_[0-9a-zA-Z]{24,}"                          # Stripe live key
rg -n "gh[pousr]_[A-Za-z0-9]{36,}"                        # GitHub token
```

Any hit on a real credential means rotate now — see [secrets.md](secrets.md); deletion is not remediation.

**New dependencies** → route to deps-core for vetting (typosquats, install scripts, maintenance state). One line in the review naming the package is enough; do not audit it inline.

**Crypto code** → no hand-rolled primitives or protocol assembly; authenticated encryption only (AES-GCM, ChaCha20-Poly1305) — never ECB or unauthenticated CBC; no fixed or reused salts and nonces; passwords hashed with a password KDF per [authn-design.md](authn-design.md), never a bare digest.

**File uploads or outbound URL fetching (SSRF surface)** → the URL's host must be resolved and the resulting IP pinned for the actual connection (resolve-then-pin), or DNS rebinding defeats the check; cloud metadata endpoints (169.254.169.254 and provider equivalents) blocked; the blocklist must handle decimal, hex, and octal IP encodings (`http://2130706433/` is 127.0.0.1). Uploads: validate content type server-side and store outside the web root.

**Headers, CORS, or cookie flags** → compare against the canonical block in [http-hardening.md](http-hardening.md); a diff that weakens CSP or adds a wildcard origin with credentials is a blocking finding.

Everything else in the diff gets the general review method from devs:code-review — this lens is the security dimension, not the whole review.
