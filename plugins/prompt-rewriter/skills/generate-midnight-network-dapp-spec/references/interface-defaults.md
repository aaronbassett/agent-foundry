# Interface Defaults — Privacy-Item Hints Only

This file has **no stack recommendations.** Framework and library
choices belong to the downstream spec. The skill uses the hints here
only to enrich Phase 3a's privacy inference.

## Web UI

Typical privacy-relevant items a Web UI introduces:

- Browser session identifiers / cookies
- Local / session storage contents
- Browser fingerprint (less directly controllable by the DApp)
- Form submission metadata (timing, draft state)
- Address-bar history and referrer headers

## CLI

Typical privacy-relevant items a CLI introduces:

- Command-line arguments persisted in shell history
- Environment variables read at invocation time
- Filesystem artefacts (`.state/`, cached outputs)
- Timestamps of invocation
- Terminal scrollback

## TUI

Typical privacy-relevant items a TUI introduces:

All of the CLI items, plus:

- On-screen state visible to shoulder-surfers during the session
- Terminal multiplexer / tmux scrollback retention

## Headless

Typical privacy-relevant items a headless build introduces:

- API call metadata (inputs, outputs, timing) visible to the caller
- Consumer-application logs that may capture DApp inputs/outputs
- Service accounts / signing keys held by the caller

## Usage in Phase 3a

For each selected interface, the skill pulls the relevant bullets above
and merges them into the Phase 3a candidate list **only if** the core
concept doesn't already cover them. Do not pad the list — the goal is
relevance, not exhaustiveness.
