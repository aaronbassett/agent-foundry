# Reading Level Calibration Examples

Instructions for the questionnaire skill: Present these example pairs to the user
using AskUserQuestion. Each pair differs along ONE axis while holding others
constant. This isolates the dimension being calibrated. For each pair, ask:
"Which feels closer to what you're aiming for?" with options:
"Closer to Version A", "Closer to Version B", "Somewhere between".

---

## Vocabulary Complexity

### Pair 1: Explaining a caching strategy

**Version A (simple vocabulary):**
> When a user asks for the same data twice, the system keeps a copy of the first
> answer and hands it back immediately instead of looking it up again. This saved
> copy goes stale after a set amount of time, at which point the system fetches a
> fresh version. The tradeoff is that users sometimes see slightly old data, but
> pages load much faster.

**Version B (technical vocabulary):**
> When a client issues a redundant request, the system serves a memoized response
> from its cache layer rather than re-querying the origin. Cached entries are
> evicted based on a configurable TTL, after which the next request triggers a
> cache-miss and upstream fetch. The tradeoff is eventual consistency versus
> reduced latency at the p50 and p99.

**What this calibrates:** Jargon density, polysyllabic word frequency, assumed technical vocabulary. Both versions use the same sentence structure and explain the same concept — only the word choices differ.

### Pair 2: Describing an API rate limiter

**Version A (simple vocabulary):**
> The API only allows a certain number of requests per minute from each user. When
> someone goes over that limit, the server sends back an error telling them to wait
> before trying again. A counter resets at the start of each time window, so
> blocked users do not have to wait long. This protects the service from being
> overwhelmed by a single heavy user.

**Version B (technical vocabulary):**
> The API enforces per-tenant rate limiting using a fixed-window algorithm. When a
> consumer exceeds the configured threshold, the server responds with HTTP 429 and
> a Retry-After header indicating the remaining cooldown interval. The token bucket
> replenishes at the window boundary, bounding the maximum backoff duration. This
> mitigates noisy-neighbor effects and preserves SLO headroom for other tenants.

**What this calibrates:** Domain-specific terminology density and assumed familiarity with protocol-level details. Sentence length and structure are held constant across both versions.

---

## Syntactic Complexity

### Pair 3: Deploying a feature flag

**Version A (simple syntax):**
> Feature flags let you turn new code on or off without redeploying. You wrap the
> new behavior in a conditional check. The flag service tells your app whether the
> feature is active. If you spot a problem, you flip the flag off. Traffic goes
> back to the old path instantly.

**Version B (complex syntax):**
> Feature flags — which decouple deployment from release by wrapping new behavior
> in a runtime conditional evaluated against a remote flag service — let you
> activate or deactivate code paths without redeploying. If, after rolling the
> feature out to production traffic, you observe a problem, disabling the flag
> immediately reroutes requests to the previous code path, a rollback mechanism
> that requires neither a deploy pipeline nor a maintenance window.

**What this calibrates:** Sentence length, clause nesting depth, and use of parenthetical structures. Both versions use the same vocabulary level and convey the same amount of information — only the sentence architecture differs.

### Pair 4: Choosing a database index

**Version A (simple syntax):**
> Your query is slow because it scans every row. Adding an index on the filtered
> column fixes this. The database builds a sorted lookup structure. Reads get
> faster. Writes get slightly slower because the index must be updated too.

**Version B (complex syntax):**
> Because the query planner, finding no suitable index on the filtered column,
> falls back to a sequential scan — which touches every row in the table — adding
> a B-tree index on that column transforms the operation from O(n) to
> O(log n), though this improvement in read performance comes at the cost of
> marginally slower writes, since each INSERT and UPDATE must now maintain the
> index structure in addition to the heap.

**What this calibrates:** Clause embedding depth and sentence boundary frequency. Vocabulary and conceptual density are matched; only the syntactic packaging changes.

---

## Conceptual Density

### Pair 5: Why microservices introduce latency

**Version A (fewer ideas per paragraph):**
> When you split a monolith into microservices, calls that used to happen inside
> one process now travel over the network. Network calls are slower than in-process
> calls. This added latency can stack up when one request touches several services
> in sequence.

**Version B (more ideas per paragraph):**
> Decomposing a monolith into microservices replaces in-process function calls with
> network hops, each adding serialization overhead, TLS handshake time, and
> potential DNS resolution. Latency compounds along the critical path when services
> form call chains, and tail latency at each hop multiplies rather than adds, which
> is why a p99 of 20ms across five sequential calls can produce a composite p99 far
> exceeding 100ms.

**What this calibrates:** Ideas-per-paragraph and the number of distinct concepts introduced in a single passage. Both versions use comparable vocabulary and sentence structure — Version B simply packs more distinct ideas into the same space.

### Pair 6: The purpose of a load balancer

**Version A (fewer ideas per paragraph):**
> A load balancer sits between users and your servers. It spreads incoming requests
> across multiple server instances. If one server goes down, the load balancer
> stops sending traffic to it. This keeps the application available even when
> individual servers fail.

**Version B (more ideas per paragraph):**
> A load balancer distributes incoming requests across a pool of backend instances
> using a configurable algorithm — round-robin for uniform workloads, least-
> connections when request cost varies, or consistent hashing when session affinity
> matters. It also performs health checks at a set interval, removing unhealthy
> nodes from rotation and reinstating them after consecutive successful probes, a
> process that interacts with connection draining to avoid dropping in-flight
> requests during transitions.

**What this calibrates:** Number of distinct concepts introduced per passage. Vocabulary level and sentence complexity are comparable; the difference is how many separate ideas the reader must absorb at once.

---

## Scaffolding Level

### Pair 7: Setting up environment variables

**Version A (more scaffolding):**
> Environment variables let you store configuration outside your code — things like
> API keys and database URLs. This matters because you do not want secrets checked
> into version control. To use one, you first define it in your shell or in a
> `.env` file. Then, in your application code, you read it at startup, typically
> with something like `process.env.DATABASE_URL`. If the variable is missing, your
> app should fail immediately with a clear error rather than silently misbehaving
> later.

**Version B (less scaffolding):**
> Store configuration such as API keys and database URLs in environment variables
> rather than in code. Define them in a `.env` file or your shell, read them via
> `process.env.DATABASE_URL` at startup, and validate their presence eagerly to
> fail fast on missing values.

**What this calibrates:** How much the writing explains the "why" behind each step, provides context for decisions, and anticipates the reader's potential confusion. The raw informational content is identical — the difference is how much the writer unpacks it.

### Pair 8: Explaining a pull request workflow

**Version A (more scaffolding):**
> Before merging code, you open a pull request so others can review it. The reason
> for this step is that a second pair of eyes catches bugs and style issues you
> might miss. When you create the PR, write a short summary of what changed and why
> — this helps reviewers understand your intent rather than just reading the diff
> cold. After at least one approval, you merge the PR into the main branch. If CI
> fails, fix the issue in a follow-up commit on the same branch rather than closing
> and reopening the PR.

**Version B (less scaffolding):**
> Open a pull request with a summary of the change, get at least one approval, and
> merge to main. If CI fails, push a fix to the same branch. Write the PR
> description for reviewers who have not seen the associated ticket — cover what
> changed and the motivation behind it.

**What this calibrates:** The degree to which the text explains motivations, anticipates questions, and walks the reader through each step versus assuming the reader can fill in the gaps. Vocabulary, syntax, and conceptual density are held constant.
