#!/usr/bin/env bash
# smoke-review-deps-security.sh - Guard the code-review, deps-core, and
# security-core skills plus the code-reviewer/deps-maintenance agents and the
# check-deps command. These skills deliberately ship no scripts or assets
# (method/command-surface content only), so the checks are structural: the
# deleted script surfaces must stay deleted, links must resolve, and known
# stale prescriptions must not reappear.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/colors.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEVS="$REPO_ROOT/plugins/devs"
SKILLS=("$DEVS/skills/code-review" "$DEVS/skills/deps-core" "$DEVS/skills/security-core")
AGENTS=("$DEVS/agents/code-reviewer.md" "$DEVS/agents/deps-maintenance.md")
COMMAND="$DEVS/commands/check-deps.md"

failed=0

print_section "review/deps/security skills smoke test"

# ── 1. No executable surfaces: these skills ship references only ────────────
for skill in "${SKILLS[@]}"; do
    name="$(basename "$skill")"
    if [[ -d "$skill/scripts" || -d "$skill/assets" ]]; then
        print_error "$name: scripts/ or assets/ reappeared — these skills ship references only"
        failed=1
    else
        print_success "$name: no executable surfaces (as designed)"
    fi
done

# ── 2. Every relative markdown link resolves ────────────────────────────────
link_fail=0
for skill in "${SKILLS[@]}"; do
    while IFS=: read -r file link; do
        target="${link%%#*}"
        if [[ ! -f "$(dirname "$file")/$target" ]]; then
            print_error "broken link: $file -> $link"
            link_fail=1
        fi
    done < <(grep -rEon '\]\(([^)#h][^)]*)\)' --include='*.md' "$skill" \
        | sed -E 's/:[0-9]+:\]\(/:/; s/\)$//')
done
if [[ $link_fail -eq 0 ]]; then
    print_success "all relative links resolve"
else
    failed=1
fi

# ── 3. Hub routing tables and agent skill grants point at real files ────────
for skill in "${SKILLS[@]}"; do
    refs_dir="$skill/references"
    while IFS= read -r ref; do
        base="$(basename "$ref")"
        if ! grep -q "$base" "$skill/SKILL.md"; then
            print_error "$(basename "$skill"): $base exists but is not routed from SKILL.md"
            failed=1
        fi
    done < <(find "$refs_dir" -name '*.md' 2>/dev/null)
done
for agent in "${AGENTS[@]}"; do
    while IFS= read -r sk; do
        dir="${sk#devs:}"
        if [[ ! -f "$DEVS/skills/$dir/SKILL.md" ]]; then
            print_error "$(basename "$agent"): preloads $sk but skills/$dir/SKILL.md missing"
            failed=1
        fi
    done < <(grep '^skills:' "$agent" | sed 's/^skills: *//; s/, */\n/g')
done
print_success "routing and skill grants verified (unless errors above)"

# ── 4. Rot-token scan: stale prescriptions that must not reappear ───────────
# Patterns are prescriptive wrong forms only; tokens that appear in legitimate
# negative guidance are deliberately absent.
ROT_PATTERNS=(
    'uv pip audit'
    'senior-code-reviewer'
    'cargo rm'
    '--no-ansi'
    'from pydantic import BaseSettings'
    'from jose import'
    'speakeasy'
    'X-XSS-Protection: 1'
    'X-XSS-Protection"] = "1'
    '@trufflesecurity/trufflehog'
    'detect_code_smells'
    'analyze_complexity'
    'npx tsc'
)
rot_found=0
for pattern in "${ROT_PATTERNS[@]}"; do
    if hits="$(grep -rFn "$pattern" "${SKILLS[@]}" "${AGENTS[@]}" "$COMMAND" 2>/dev/null)"; then
        print_error "stale prescription '$pattern':"
        echo "$hits"
        rot_found=1
    fi
done
if [[ $rot_found -eq 0 ]]; then
    print_success "rot-token scan clean"
else
    failed=1
fi

# ── Result ───────────────────────────────────────────────────────────────────
echo ""
if [[ $failed -ne 0 ]]; then
    print_error "review/deps/security smoke test FAILED"
    exit 1
fi
print_success "review/deps/security smoke test passed"
