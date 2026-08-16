# Diff Scoping

Getting the right change-set and reading it in the right order. A review of the wrong diff is wrong everywhere else too — pin the change-set before forming a single opinion.

## Obtaining the change-set

| Target | Command |
|---|---|
| Staged changes | `git diff --cached` |
| Working tree | `git diff` |
| Branch vs merge-base | `git diff <base>...HEAD` |
| Same, explicit | `git diff "$(git merge-base <base> HEAD)" HEAD` |
| PR patch | `gh pr diff <n>` (`--name-only` for the file list first) |
| PR intent + discussion | `gh pr view <n>` (`--comments` for the thread) |
| Named commit | `git show <sha>` (`--stat` first for shape) |

The three-dot form diffs from the merge-base, not the base tip: it shows only what the branch changed, ignoring upstream drift. The explicit form produces the identical diff and also hands you the merge-base SHA — useful for blame bounds or checking out the baseline. Never review the two-dot form `<base>..HEAD`; it mixes upstream drift into the change-set.

## Reading order

Not top-of-diff-first:

1. **Intent** — the PR description, then `git log --oneline <base>..HEAD` for the commit narrative. What the author says the change does is the hypothesis the review tests.
2. **Interfaces before implementations** — changed types, schemas, signatures, and exports define what every other hunk must satisfy.
3. **Tests before the code they test** — changed tests state the intended behavior; deleted or weakened assertions are the first red flags to carry into the implementation read.
4. **Implementation last**, hunk by hunk, each judged in its full function and caller context — never by the diff window alone.

## Blast radius

Every changed public signature or export widens the review beyond the diff. Find the callers:

```bash
rg -n '\b<symbol>\b' <src-dirs>                        # every word-bounded textual reference
sg run --pattern '<symbol>($$$)' --lang <lang> <dir>   # call sites only
```

The two answer different questions: `rg` finds imports, definitions, comments, and calls alike; `ast-grep` returns only structural call expressions. Run both — the difference between their outputs is itself information (a symbol imported but never called, a call hidden in generated code).

History before judgment — especially on deletions:

```bash
git log -S'<token>' --oneline          # commits that added or removed the token
git blame -L <start>,<end> -- <file>   # which commit last touched these lines
```

A removal that looks safe often deletes a fix. `-S` surfaces the commit that introduced the line; its message says why the line existed. Read that before approving the deletion.

## Scope discipline

The review's subject is the change, not the codebase:

- Pre-existing issues in untouched code are findings about the codebase — record them in a separate codebase-notes section, never as blockers on this diff.
- A baseline that was already failing before the change contextualizes the review; it does not indict the change.
- Refactoring opportunities the diff merely exposes are Minor at most, or notes.
- The one exception: when the change interacts with a pre-existing bug to produce a new failure, that failure is in scope and gets traced like any other finding.
