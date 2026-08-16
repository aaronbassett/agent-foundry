# Severity Taxonomy

Three tiers. Severity is a claim about verified impact, and each tier carries an evidence bar — a finding may only be filed at a tier whose bar it clears.

## Blocking

Breaks correctness, security, or data integrity if merged.

**Bar:** a traced, concrete failure scenario — the specific inputs or state, the path through the code, the wrong outcome — plus an explicit verification status: reproduced by execution, traced by hand, or `not fully verified: <gap>`. "This looks unsafe" never blocks; "given input X, line N does Y, and the caller persists Y" does.

## Important

Significant design, testing, or reliability debt that should be fixed but doesn't break: the new coupling that makes the next change hazardous, changed behavior with no covering test, the assertion a rewrite weakened, error handling that turns failures silent.

**Bar:** cited evidence of the impact — the coupling named with the files it binds, the uncovered path shown with the test search that proved absence, the weakened assertion quoted before and after. An Important finding answers "what does this cost, shown where?"

## Minor

Worthwhile polish: naming, a stale comment, a simplification.

**Bar:** one line — file:line and the specific improvement. If it needs a paragraph, it is either Important or it is noise. Generic advice ("consider adding documentation") is not a finding at any tier.

## Severity honesty

- Severity reflects verified impact — never confidence, effort to fix, or how thorough it makes the review look.
- Couldn't fully verify? **Downgrade, don't drop.** File at the tier the verified portion supports, and state plainly what full verification would take ("needs a run against the real queue"). The reader decides whether to pay that cost.
- Never inflate a Minor to appear rigorous; never soften a Blocking to be polite. The tier is information the merger acts on — distorting it in either direction misinforms the decision.
- The count of findings is not a quality metric in either direction. Zero findings after a real verification pass is a legitimate result; padding with manufactured Minors is noise, and dropping real findings to seem agreeable is failure.
