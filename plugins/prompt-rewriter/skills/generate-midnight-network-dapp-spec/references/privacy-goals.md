# Privacy Goals — Inference and Fallback

Used in Phase 3a to produce a *tailored* privacy multi-select rather
than a generic list.

## Inference procedure

Given:

- Phase 2 core concept (one-line description)
- Phase 2 audience
- Phase 3 value-movement selection
- Phase 4 interface selections

Produce a candidate list of 4–10 concrete data items likely present
in this DApp. Use these heuristics (not rules):

### Identity and ownership
- If the DApp has participants distinct from administrators, candidate:
  "participant identity / pseudonym linkage".
- If value moves between parties, candidates: "sender identity",
  "recipient identity", "individual transfer amounts".

### Group / membership
- If the concept implies membership (access control, allowlists,
  DAOs, ticketing, clubs), candidates: "group membership roster",
  "individual member status", "membership proof details".

### Actions and history
- If the concept implies repeated actions (voting, bidding, donating,
  posting), candidates: "per-action content", "per-action timestamps",
  "linkage between a participant and their actions".

### Aggregates
- Pair each private item with its public aggregate when meaningful:
  "per-action content (private) vs. total count of actions (public)".
- Use the public-aggregate/private-detail dichotomy to seed the
  "Likely public" column.

### Interface-driven items
(See `interface-defaults.md` for full hints.)
- Web UI introduces session and device metadata.
- CLI introduces command-line argument history.
- Headless builds still have API-level metadata.

## Presenting the list

Ask a single `AskUserQuestion` per item with options:
- *Likely private*
- *Likely public*
- *Undecided / depends on design*
- *Doesn't apply*

If there are more than 6 items, group them by theme (identity /
membership / actions / aggregates) and ask a multi-select per group.

## Generic fallback list

Use this **only** if inference produces fewer than 4 candidates.

- Participant identity
- Participant contact details / profile info
- Individual action content (votes, donations, bids, messages, etc.)
- Individual action timestamps
- Linkage between participant and their actions
- Transaction amounts
- Membership status (if any group concept is present)
- Session / device metadata (if a UI is in scope)

Preserve the same *private / public / undecided / doesn't apply*
answer options.

## Anti-patterns

- Don't present Compact-specific vocabulary ("commitment", "nullifier",
  "Merkle root") in the questions. These belong to the downstream spec.
- Don't ask the user to classify "fees" — DUST is generated from NIGHT
  holdings and paid at the protocol level; it is not a DApp-level
  privacy item.
- Don't invent items the user didn't hint at. If the concept is clearly
  bounded, keep the list bounded.
