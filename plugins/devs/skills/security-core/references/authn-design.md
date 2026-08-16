# Authentication Design

This reference owns the cross-language authentication decisions: which model to use, what the token policy is, and what a verifier must check. Framework mechanics belong to the language skills — FastAPI wiring (PyJWT, pwdlib) in the python-core skill's fastapi-guide reference, axum extractors in rust-core's web-frameworks reference, and everything browser-side (token storage, CSRF, CSP) in the react-core skill's security reference.

## Choosing the model

| Client shape | Model | Consequences |
|---|---|---|
| Server-rendered web app | Server-side sessions; the id rides in an `HttpOnly; Secure; SameSite` cookie | Instant revocation, no client-side token handling. Cookie auth needs CSRF defense — the browser half is react-core's security reference |
| SPA + API (one or many verifying services) | Short-lived JWT access token plus rotating refresh token | Each service verifies statelessly. Browser storage rules are react-core's: HttpOnly cookie, never localStorage |
| Machine-to-machine | OAuth client credentials, or mTLS where the platform provides it | No user and no refresh token — the client re-authenticates with its credential. Scope each client to the minimum it needs |

When one server both renders and serves, take sessions: tokens add revocation lag there and buy nothing.

## Token policy

**Lifetime.** Access tokens live 15 minutes by default, never past an hour. The access-token TTL is your worst-case revocation lag; keep it short and lean on the refresh token for continuity.

**Refresh rotation with reuse detection.** Every refresh issues a new refresh token and retires the old one; all tokens from one login share a server-recorded family id. If a retired token is ever presented again, revoke the entire family and force re-login. The reasoning: rotation alone cannot tell thief from victim — after a theft both parties hold a refresh token, and a retired token reappearing is the only observable signal that two parties are refreshing. Since you cannot know which one is legitimate, killing the family is the only safe response.

**Revocation.** Sessions revoke server-side by deletion. JWTs revoke through expiry plus the refresh gate — at most one access-token lifetime of exposure. For instant kill (compromise, "log out everywhere"), keep a small deny-list of `jti` or family ids checked at the gateway; a deny-list of every token is just sessions with extra steps.

**Algorithm pinning.** The verifier pins the exact algorithm list in its own configuration; the token header's `alg` is attacker input and must never select the algorithm. Use asymmetric signatures (ES256 or EdDSA) whenever more than one service verifies: verifiers hold only public keys, so a leaked verifier config cannot mint tokens. HS256 is acceptable only when signer and verifier are the same service.

**Issuer and audience, always.** Pin `iss` to your issuer and `aud` to the consuming service, so a token minted for one API cannot clear another.

The whole verifier contract in one function (jose on npm; typechecked and executed — a valid token verifies, a wrong audience and an unpinned algorithm are both rejected):

```ts
import { jwtVerify, type CryptoKey, type JWTPayload } from 'jose';

export async function verifyAccessToken(token: string, publicKey: CryptoKey): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['ES256'], // pin the exact list; never trust the header's alg
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
  });
  return payload;
}
```

The Python equivalent — PyJWT `decode` with `algorithms`, `issuer`, `audience` — is in python-core's fastapi-guide.

## Passwords

argon2id is the house hash. bcrypt silently truncates input at 72 bytes — a long passphrase and its 72-byte prefix verify identically — so prefer argon2id wherever it is available. Mechanics per language: pwdlib's `PasswordHash.recommended()` in python-core's fastapi-guide; typescript-core owns the Node choice. Policy: minimum 12 characters, no composition rules, no low maximum length, check candidates against a breach corpus, and rate-limit the endpoint ([rate-limiting.md](rate-limiting.md)).

## MFA

TOTP with a verification window of 1: the verifier accepts the previous, current, and next time step, so with 30-second steps a code is honored across 90 seconds — enough for clock skew and slow typing. Do not widen it further. Replay tracking is mandatory: record the last accepted step (or a hash of the accepted code) per user and reject anything at or before it, or a shoulder-surfed code replays within its window. Issue single-use recovery codes at enrollment and store them hashed like passwords. Libraries: otplib (npm), pyotp (PyPI).

## OAuth for CLI, TUI, and desktop apps

Two flows, one decision. **Loopback redirect + PKCE** when the app can open a browser and bind a localhost port: the authorization code returns straight to the app — best experience, use it whenever possible. **Device authorization flow** when it cannot (SSH sessions, containers, devices): the user enters a short code on a second device while the app polls the token endpoint. When polling, honor the server's `interval`, and treat `slow_down` as permanent — it raises the polling interval by 5 seconds for that request and all subsequent ones (RFC 8628), not for a single retry. PKCE on every public client, always: a client secret compiled into a distributed binary is public, so there is nothing else keeping the code exchange honest.

## Token storage for CLI tools

OS keychain first: @napi-rs/keyring (npm) and keyring (PyPI) front the macOS Keychain, Windows Credential Locker, and the Secret Service API. Fall back to a file only where no keychain exists, and then only with authenticated encryption — AES-256-GCM or libsodium's XChaCha20-Poly1305 (libsodium-wrappers on npm, PyNaCl on PyPI) — deriving the key with a fresh random salt and encrypting with a fresh random nonce on every write, both stored beside the ciphertext, file mode 0600. Never CBC (unauthenticated, malleable) and never a fixed salt (one precomputed table then opens every install).
