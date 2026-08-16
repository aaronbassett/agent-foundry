# Review Method

Converting suspicions into verified findings. The unit of work is the candidate finding; the discipline is refutation.

## The loop

1. **Candidate** — while reading, note anything suspicious: file:line plus the claim.
2. **Refute** — attack the claim from the code before believing it. Is there a guard upstream? Does a type make the bad state unrepresentable? Does every caller already sanitize? Does a test pin the behavior? Most candidates die here — let them.
3. **Verify** — where checking is cheap, run it: the typechecker, the one relevant test file, a search, a snippet.
4. **Report** — survivors only, each labeled with how it was verified: `verified: ran <command>`, `verified: traced with inputs <X>`, or `not fully verified: <what's missing>`.

## Evidence bar per class

**Logic bug** — trace the failing path with concrete inputs: name the input or state, walk it through the code, state the wrong outcome. When the code runs cheaply, write the snippet and run it — a reproduced failure is the strongest evidence there is. No traceable path, no finding.

**Missing test coverage** — verify absence before claiming it. Search the test files for the symbol and the behavior under multiple names, and show the search you ran:

```bash
rg -l '<symbol>' <test-dir>/    # exit 1 = nothing in the tests mentions it
python3 <test-file>             # then run the relevant suite via the project's own runner
```

A negative search with strategies shown is evidence; "seems untested" is a guess.

**Duplication** — locate the other instances and cite them file:line. Structural search catches variants that formatting hides from text search:

```bash
sg run --pattern 'JSON.parse($$$)' --lang js <dir>
```

**Type unsafety** — the compiler is the authority: run the project's typechecker and quote its output. If it passes, the claim is dead unless you can show a hole the checker cannot see (serialization boundary, escape-hatch cast, FFI) — and then show it.

**Performance** — an argument, not a vibe: the loop bounds, the complexity class, and the actual data size that makes it matter. "O(n²) over a collection capped at 50" is not a finding. Measure when feasible; otherwise label it an unmeasured complexity argument.

**Dead code** — prove nothing references it: word-bounded `rg` across the repo plus the language's own reachability tooling (compiler unused-code warnings, knip, vulture — whatever the ecosystem provides). Dynamic dispatch, reflection, and config-driven lookups defeat text search; when they are present, say so and downgrade confidence.

## Using the machines

Run the project's own commands, never a guessed tool list. Find them:

```bash
fd -g '{package.json,Makefile,pyproject.toml,Cargo.toml}' -E node_modules   # locate the manifests
jq -r '.scripts // {} | keys[]' package.json                                # the project's own verbs
ls .github/workflows/                                                       # CI defines what green means
```

Map where risk concentrates in the touched files, and read the top of the list hardest:

```bash
scc --by-file --sort complexity <touched-paths>
```

Structural pattern checks (`sg run --pattern … --lang …`) verify claims that text search cannot: "every call passes a timeout", "no bare catch swallows the error". One structural query beats ten regex approximations.

## Anti-noise rules

- **The linter config outranks you.** Anything the project's linter already enforces, don't repeat. Anything it explicitly disables, the project has decided — not a finding.
- **No style preferences** beyond the project's own tooling and instruction files.
- **One root cause = one finding.** Fifteen call sites missing the same check is one finding with a site list, not fifteen findings.
- **No hypothetical-future findings.** Findings describe the code as it is against the requirements as they are, not against a scale or feature the project hasn't asked for.
