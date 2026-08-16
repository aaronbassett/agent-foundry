# Secrets

This reference owns cross-language policy for where secrets live, how they rotate, and how leaks are caught; framework config mechanics belong to the language skills, and client-side exposure rules (Vite env, browser storage) belong to react-core's security reference.

## Layering

Environment variables are for configuration, not for high-value secrets in production. They leak through crash reporters, `/proc/<pid>/environ`, debug endpoints, and every child process that inherits them. Keep pointers and low-value config there; put database credentials, signing keys, and third-party API keys in a secret manager — AWS Secrets Manager, Google Cloud Secret Manager, Azure Key Vault, or HashiCorp Vault. Fetch at application startup, cache in memory, and refresh on a rotation signal or TTL rather than calling the manager per request. pydantic-settings ships optional sources for the first three via its `aws-secrets-manager`, `gcp-secret-manager`, and `azure-key-vault` extras.

`.env` files are a local-development convenience only: never committed, covered by the project `.gitignore` and your global excludes file (`git config core.excludesfile`), with a committed `.env.example` holding placeholders.

## Validate settings at startup

Fail at boot, not on first use. Python uses pydantic-settings:

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_")

    database_url: SecretStr
    session_secret: SecretStr
```

`SecretStr` keeps values out of `repr()` and log lines; unwrap with `.get_secret_value()` only at the point of use. Node uses zod:

```ts
import * as z from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
});

export const env = Env.parse(process.env); // fail fast on misconfiguration
```

Client-side Vite variables follow different rules — everything `VITE_`-prefixed ships to the browser and is public. That boundary is react-core's env section.

## Rotation: dual-secret ordering

Rotation must preserve the old secret before anything overwrites it — outstanding tokens were signed with it. The order:

1. Read the current secret and save it as `previous`.
2. Generate the new secret and write it as `current`.
3. Verifiers accept both `current` and `previous`; signers use only `current`.
4. After a grace window of at least one maximum token lifetime, delete `previous`.

Swap steps 1 and 2 and the old secret is destroyed at the moment of rotation: every outstanding session dies at once, and there is no rollback. Verification against both secrets during the window is what makes rotation invisible to users.

## CI credentials

OIDC federation is the default for cloud credentials in GitHub Actions: the job exchanges its identity token for short-lived cloud credentials (`aws-actions/configure-aws-credentials`, `google-github-actions/auth`, `azure/login`), so no long-lived cloud keys sit in repo secrets. Repo secrets remain only for values with no federation path. Use current action majors — `actions/checkout@v7`.

## Scanning

gitleaks and trufflehog are Go binaries; install them via Homebrew, their GitHub release binaries, or Docker — the npm registry has no legitimate distribution of either, and the npm package named `trufflehog` is an unrelated squatter.

```bash
brew install gitleaks trufflehog
# script install for trufflehog (macOS/Linux):
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin

gitleaks git .                                  # scan repo history
gitleaks dir .                                  # scan working tree
trufflehog git file://. --results=verified      # only credentials that verify live
```

Run one of them as a pre-commit hook and in CI; trufflehog's `--results=verified` keeps CI signal high by reporting only credentials it could actually authenticate with.

## Key generation

Generated with restrictive permissions, written to files, never echoed:

```bash
umask 077                                    # files below are created 0600
openssl rand -base64 48 > hs256.secret       # HMAC signing secret
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out rs256-private.pem
openssl pkey -in rs256-private.pem -pubout -out rs256-public.pem
openssl genpkey -algorithm ed25519 -out ed25519-private.pem
openssl pkey -in ed25519-private.pem -pubout -out ed25519-public.pem
```

Never print private key material to stdout — write files and print paths only; terminal scrollback, shell history, and CI logs all persist. Which algorithm to sign with is [authn-design.md](authn-design.md)'s decision.

## Hard rules

- Never log or echo a secret, at any log level, in any environment.
- Never pass secrets in argv: `ps` and `/proc` expose command lines to other processes. Use files or stdin.
- Secrets in error messages are leaks — exception text ends up in logs, traces, and sometimes HTTP responses. Connection strings in database errors are the classic case.
- Never reuse a secret across environments; a staging compromise must not open production.
- A secret that ever touched a commit is burned — rotate it; history rewrite is cleanup, not remediation.
