---
description: Walk through an adaptive Q&A to generate a Midnight Network DApp spec brief. The brief is designed as input to a downstream spec / planning skill such as /superpowers:brainstorming or /sdd:specify.
---

# /prompt-rewriter:midnight-dapp-spec

This command invokes the generator skill. It takes no arguments — the
skill runs the full adaptive Q&A every time.

## Execution

Invoke the skill:

```text
Skill(skill="prompt-rewriter:generate-midnight-network-dapp-spec")
```

Do not add orchestration logic here. The skill owns the flow; this
command is a pure wrapper so the user can type `/prompt-rewriter:midnight-dapp-spec`
instead of asking the assistant to invoke the skill by name.
