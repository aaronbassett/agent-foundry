---
name: devs:code-review
description: "Use when reviewing code changes — a diff, branch, PR, or named files. Carries the review method: scoping the change-set, converting suspicions into verified findings, and ranking by evidence-backed severity. Language idioms belong to the language skills (rust-core, python-core, typescript-core, react-core); security review specifics to security-core."
---

# Code Review — Method

The review method for producing evidence-based, severity-ranked findings. A finding that hasn't been checked against the actual code is a guess, not a finding.

This skill deliberately ships no analysis scripts: a reviewer that can read the diff, search the codebase, and run the project's own toolchain outperforms any metric-generating script — run the project's real commands instead.

## Reference routing

| Reference | Use when |
|---|---|
| [diff-scoping.md](references/diff-scoping.md) | Getting the right change-set, reading order, blast radius, scope discipline |
| [review-method.md](references/review-method.md) | The evidence bar per finding class; converting suspicion into verified finding |
| [severity-taxonomy.md](references/severity-taxonomy.md) | Blocking/Important/Minor tiers and the evidence each requires |

## Delegation

- **Security findings** — the `devs:security-core` skill (its review-lens reference is the weighted security checklist).
- **Language-idiom findings** — the matching language skill defines idiomatic: `devs:rust-core`, `devs:python-core`, `devs:typescript-core`, `devs:react-core` (+ `devs:react-components` for component house style). Load the skill for each language in the diff.
- **Dependency findings** (new packages in the diff, lockfile changes) — the `devs:deps-core` skill.

## The method in one paragraph

Scope the exact change-set and read it in dependency order. Judge every hunk in its real context — the whole function, its callers, the data it touches. For each candidate finding, attempt refutation against the code (guards, types, existing tests), verify by execution where cheap, and file only what survives — at the severity its verified impact supports, with file:line and a concrete failure scenario. Run the project's own gauntlet (its lint/typecheck/test commands, not a guessed list) and never flag what the project's tooling already enforces or explicitly disables.
