# Rate Limiting

This reference owns cross-language rate-limiting policy — what to key on, how to tier, distributed correctness, and the response contract; per-framework middleware mechanics belong to the language skills.

## Key selection

Key on the most specific identity available: authenticated user id first, then API key, then IP as the last resort. IP keying is weak — corporate NATs share one address, and attackers rotate through many — so treat it as the fallback for unauthenticated traffic only.

IP keying has two correctness preconditions. First, `trust proxy` (or the framework equivalent) must match your actual proxy depth — untrusted means every client behind the load balancer shares the proxy's IP; over-trusted means clients forge `X-Forwarded-For` and mint fresh keys at will. express-rate-limit refuses the permissive `trust proxy: true` for exactly this reason; set the hop count (`app.set('trust proxy', 1)`). Second, IPv6 clients hold entire /64 subnets, so keying on the bare address lets one machine rotate through billions of keys — normalize with `ipKeyGenerator`, which masks IPv6 addresses to their subnet:

```ts
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100, // per key per window
  standardHeaders: 'draft-8', // RateLimit + RateLimit-Policy headers
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.get('x-api-key') ?? ipKeyGenerator(req.ip ?? ''), // IPv6-safe fallback
  store: new RedisStore({
    prefix: 'rl:api:',
    sendCommand: (...args: string[]) => redis.sendCommand(args),
  }),
});
```

`limit` is the current option name; `standardHeaders: 'draft-8'` emits the standard headers so you never hand-roll header names.

## Tiering

| Endpoint class | Posture | Typical shape |
|---|---|---|
| Auth (login, reset, signup, MFA) | Strict, per-IP and per-target-account | Single digits per 15 minutes |
| Authenticated API | Moderate, per user or API key | Tens to hundreds per minute |
| Static/public content | Generous or CDN-delegated | Rarely worth app-level limits |

Limit login attempts per target account as well as per source; credential stuffing spreads across IPs but converges on accounts.

## Distributed correctness

With multiple app instances, a read-check-write sequence against shared storage (`GET`, compare, `SET`) is a race: concurrent requests all read the same count, all pass the check, all increment — the limiter fails open under exactly the load that matters. The fix is one atomic operation in the store. In Redis that means a Lua script (scripts execute atomically) or a library that issues atomic commands, which is what rate-limit-redis does above. The fixed-window primitive:

```lua
-- EVAL <script> 1 <key> <window-seconds> <limit>
local current = redis.call("INCR", KEYS[1])
if current == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
if current > tonumber(ARGV[2]) then return 0 end
return current
```

Executed against Redis 8: a burst of 60 concurrent calls with limit 5 admitted exactly 5 and counted exactly 60 — no lost updates, no over-admission.

## Failure policy

Decide per endpoint class what happens when the store is unreachable, and write it down. Auth endpoints fail closed: a Redis outage must not become an unthrottled credential-stuffing window. General API traffic usually fails open, availability over precision — but that is a documented decision, not a default you fell into.

## Response contract

Rejections return `429` with `Retry-After` plus the standard `RateLimit` and `RateLimit-Policy` headers — `standardHeaders: 'draft-8'` produces all of them. Well-behaved clients back off exactly as told; do not invent header names.

## Delegation

- Rust: axum limiting via tower-governor — mechanics in rust-core's web-frameworks reference.
- Python: FastAPI limiting via slowapi — mechanics in python-core's FastAPI guide. One trap worth stating here: slowapi requires registering its `RateLimitExceeded` exception handler on the app; without it, exceeded limits surface as 500s instead of 429s.
