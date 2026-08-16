#!/usr/bin/env bash
# smoke-typescript-core.sh - Validate the typescript-core skill's tsconfig
# templates against the current TypeScript compiler and scan for stale
# prescriptions. Each check exists because an audit found the shipped version
# broken in exactly that way (baseUrl removed in TS 7, types [] default, ...).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/colors.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILL_DIR="$REPO_ROOT/plugins/devs/skills/typescript-core"
TEMPLATES="$SKILL_DIR/assets/tsconfig-templates"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

failed=0

print_section "typescript-core skill smoke test"

# ── 1. Toolchain: install CURRENT typescript (the whole point is catching
#      compiler-removal regressions like baseUrl) ────────────────────────────
if ! command -v node >/dev/null 2>&1; then
    print_error "node not found — the smoke test requires Node.js"
    exit 1
fi
(cd "$WORK_DIR" && npm init -y >/dev/null 2>&1 \
    && npm install --no-fund --no-audit typescript @types/node react @types/react >/dev/null 2>&1)
TSC="$WORK_DIR/node_modules/.bin/tsc"
print_info "toolchain: node $(node --version), tsc $("$TSC" --version | awk '{print $2}')"

# ── 2. Every template variant compiles a stub under the current tsc ─────────
make_variant() { # name  stub-relpath  stub-content
    local name="$1" stub="$2" content="$3"
    local dir="$WORK_DIR/v-$name"
    mkdir -p "$dir/src"
    cp "$TEMPLATES/strict-base.json" "$dir/"
    cp "$TEMPLATES/$name.json" "$dir/tsconfig.json"
    printf '{ "type": "module" }\n' > "$dir/package.json"
    ln -sf "$WORK_DIR/node_modules" "$dir/node_modules"
    printf '%s\n' "$content" > "$dir/$stub"
}

make_variant strict-node src/index.ts 'export const port: number = Number(process.env["PORT"] ?? 3000);'
make_variant library src/index.ts 'export function add(a: number, b: number): number {
  return a + b;
}'
make_variant strict-react src/App.tsx 'import React from "react";
export function App(): React.JSX.Element {
  return <div>ok</div>;
}'

for v in strict-node library strict-react; do
    if (cd "$WORK_DIR/v-$v" && "$TSC" -p tsconfig.json >/dev/null 2>&1); then
        print_success "$v.json compiles under current tsc"
    else
        print_error "$v.json fails under current tsc:"
        (cd "$WORK_DIR/v-$v" && "$TSC" -p tsconfig.json 2>&1 | head -5) || true
        failed=1
    fi
done

# monorepo-base is an extends-target: validate via a tiny consuming package.
mkdir -p "$WORK_DIR/v-mono/pkg/src"
cp "$TEMPLATES/strict-base.json" "$TEMPLATES/monorepo-base.json" "$WORK_DIR/v-mono/"
printf '{ "type": "module" }\n' > "$WORK_DIR/v-mono/pkg/package.json"
ln -sf "$WORK_DIR/node_modules" "$WORK_DIR/v-mono/pkg/node_modules"
cat > "$WORK_DIR/v-mono/pkg/tsconfig.json" <<'JSON'
{
  "extends": "../monorepo-base.json",
  "compilerOptions": { "module": "nodenext", "target": "es2024", "rootDir": "./src", "outDir": "./dist", "types": [] },
  "include": ["src/**/*"]
}
JSON
printf 'export const one: number = 1;\n' > "$WORK_DIR/v-mono/pkg/src/index.ts"
if (cd "$WORK_DIR/v-mono/pkg" && "$TSC" -p tsconfig.json >/dev/null 2>&1); then
    print_success "monorepo-base.json compiles via a consuming package"
else
    print_error "monorepo-base.json fails under current tsc"
    failed=1
fi

# ── 3. Negative check: erasableSyntaxOnly must actually reject an enum ──────
printf 'export enum Color { Red }\n' >> "$WORK_DIR/v-strict-node/src/index.ts"
if (cd "$WORK_DIR/v-strict-node" && "$TSC" -p tsconfig.json >/dev/null 2>&1); then
    print_error "strict-node.json accepted an enum — erasableSyntaxOnly not effective"
    failed=1
else
    print_success "strict-node.json rejects enums (erasableSyntaxOnly enforced)"
fi

# ── 4. Rot-token scan over the whole skill ──────────────────────────────────
ROT_PATTERNS=(
    '\.addSink\('
    'seamless-immutable'
    'jest\.fn\('
    '"baseUrl"'
)
rot_found=0
for pattern in "${ROT_PATTERNS[@]}"; do
    if hits="$(grep -rEn "$pattern" "$SKILL_DIR/SKILL.md" "$SKILL_DIR/references" "$SKILL_DIR/assets" 2>/dev/null)"; then
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
    print_error "typescript-core smoke test FAILED"
    exit 1
fi
print_success "typescript-core smoke test passed"
