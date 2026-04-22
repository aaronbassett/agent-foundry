# Use-Case Defaults

This file tells `SKILL.md` how each use-case affects later branches.

## Educational example

- **Intent:** learning resource. The DApp is not for production users.
- **Phase 6 (dev-experience):** entered. Demo script / wallet
  provisioning / local-devnet auto-provision are offered with default
  "yes."
- **Phase 7 (networks):** local devnet is pre-included; only asks about
  adding preview and/or preprod. Mainnet is not offered.
- **Rendered brief note:** under Summary or Use-case, phrase the
  rationale as learning-focused (e.g. "a teaching example for
  <concept>").

## Proof of Concept (PoC)

- **Intent:** internal / technical validation. Real users not in scope.
- **Phase 6:** entered. Same questions as Educational but defaults are
  still "yes" — PoCs commonly want demo scripts and wallet
  auto-provisioning for iteration speed.
- **Phase 7:** free multi-select of local / preview / preprod / mainnet.
  Mainnet is offered but rarely selected at PoC stage.
- **Rendered brief note:** frame the Use-case line as internal
  validation of a specific mechanism.

## MVP

- **Intent:** first shippable slice. Real users in scope.
- **Phase 6:** skipped entirely. Dev-experience conveniences are not
  captured in the brief. The downstream spec decides.
- **Phase 7:** free multi-select of local / preview / preprod / mainnet.
- **Rendered brief note:** Use-case line should emphasise the user
  outcome the MVP validates, not the internals.

## Inference hints for Phase 3a (privacy)

These are suggestions the skill uses when inferring candidate
privacy items:

- Educational examples often care about demonstrating a specific
  privacy primitive clearly (commitments, nullifiers, selective
  disclosure). The rendered brief should not name the primitive, but
  the privacy-direction items should clearly enumerate what the
  primitive *protects* (e.g., "individual votes", "donor identities").
- PoCs typically have a narrow privacy question to validate — enumerate
  the data that must remain private for the PoC's question to be
  meaningful.
- MVPs have broader privacy concerns — session data, profile info, and
  usage patterns in addition to the domain-specific secrets.
