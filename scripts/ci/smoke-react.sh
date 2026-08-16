#!/usr/bin/env bash
# smoke-react.sh - Validate the react-core config templates and the
# react-components scaffold script against the current toolchain, and scan
# both skills for stale prescriptions. Each check exists because an audit
# found the shipped version broken in exactly that way (dead .eslintrc asset,
# scaffold output that never compiled, docs teaching removed APIs).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/colors.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE_DIR="$REPO_ROOT/plugins/devs/skills/react-core"
COMPONENTS_DIR="$REPO_ROOT/plugins/devs/skills/react-components"
TEMPLATES="$CORE_DIR/assets/config-templates"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

failed=0

print_section "react skills smoke test"

# ── 1. Toolchain: install CURRENT packages (the whole point is catching
#      upstream-removal regressions). typescript@6 is deliberate: the lint
#      toolchain pins 6.x per typescript-eslint's peer range. ───────────────
if ! command -v node >/dev/null 2>&1; then
    print_error "node not found — the smoke test requires Node.js"
    exit 1
fi
(cd "$WORK_DIR" && npm init -y >/dev/null 2>&1 \
    && npm install --no-fund --no-audit \
        vite @vitejs/plugin-react react react-dom \
        @types/react @types/react-dom \
        eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
        "@eslint-react/eslint-plugin" typescript@6 >/dev/null 2>&1)
BIN="$WORK_DIR/node_modules/.bin"
print_info "toolchain: node $(node --version), vite $("$BIN/vite" --version | awk '{print $2}'), eslint $("$BIN/eslint" --version | sed 's/^v//')"

# ── 2. vite.config.ts template: a minimal app using the @ alias builds ──────
VITE_DIR="$WORK_DIR/vite-app"
mkdir -p "$VITE_DIR/src"
cp "$TEMPLATES/vite.config.ts" "$VITE_DIR/"
ln -sf "$WORK_DIR/node_modules" "$VITE_DIR/node_modules"
printf '{ "name": "vite-app", "private": true, "type": "module" }\n' > "$VITE_DIR/package.json"
cat > "$VITE_DIR/index.html" <<'HTML'
<!doctype html>
<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
HTML
cat > "$VITE_DIR/src/App.tsx" <<'TSX'
export function App() {
  return <h1>ok</h1>;
}
TSX
cat > "$VITE_DIR/src/main.tsx" <<'TSX'
import { createRoot } from "react-dom/client";
import { App } from "@/App"; // exercises the template's @ alias
createRoot(document.getElementById("root")!).render(<App />);
TSX
if (cd "$VITE_DIR" && "$BIN/vite" build >/dev/null 2>&1) && [[ -f "$VITE_DIR/dist/index.html" ]]; then
    print_success "vite.config.ts builds a minimal app (@ alias resolves)"
else
    print_error "vite.config.ts failed to build:"
    (cd "$VITE_DIR" && "$BIN/vite" build 2>&1 | tail -5) || true
    failed=1
fi

# ── 3. eslint.react.config.js template: clean code passes, a rules-of-hooks
#      violation fails, and the hooks rule fires exactly once (the config
#      resolves the @eslint-react / eslint-plugin-react-hooks overlap). ─────
LINT_DIR="$WORK_DIR/lint-app"
mkdir -p "$LINT_DIR/src"
cp "$TEMPLATES/eslint.react.config.js" "$LINT_DIR/eslint.config.js"
ln -sf "$WORK_DIR/node_modules" "$LINT_DIR/node_modules"
printf '{ "name": "lint-app", "private": true, "type": "module" }\n' > "$LINT_DIR/package.json"
cat > "$LINT_DIR/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "esnext",
    "jsx": "react-jsx",
    "types": [],
    "noEmit": true
  },
  "include": ["src"]
}
JSON
cat > "$LINT_DIR/src/good.tsx" <<'TSX'
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
TSX
if (cd "$LINT_DIR" && "$BIN/eslint" src/good.tsx >/dev/null 2>&1); then
    print_success "eslint.react.config.js passes clean code"
else
    print_error "eslint.react.config.js rejects clean code:"
    (cd "$LINT_DIR" && "$BIN/eslint" src/good.tsx 2>&1 | tail -8) || true
    failed=1
fi

cat > "$LINT_DIR/src/bad.tsx" <<'TSX'
import { useState } from "react";

export function Bad({ flag }: { flag: boolean }) {
  if (flag) {
    const [x] = useState(0);
    return <span>{x}</span>;
  }
  return null;
}
TSX
# The hooks diagnostics surface under the @eslint-react/ namespace (the
# template's disable-conflict preset turns off the react-hooks copies) —
# match the rule name regardless of namespace.
lint_out="$(cd "$LINT_DIR" && "$BIN/eslint" src/bad.tsx 2>&1)" && lint_status=0 || lint_status=$?
hooks_hits="$(grep -c 'rules-of-hooks' <<<"$lint_out" || true)"
if [[ $lint_status -ne 0 && "$hooks_hits" -eq 1 ]]; then
    print_success "conditional hook rejected; rules-of-hooks fired exactly once"
elif [[ $lint_status -eq 0 ]]; then
    print_error "eslint.react.config.js accepted a conditional hook"
    failed=1
else
    print_error "rules-of-hooks fired $hooks_hits times (expected 1 — plugin overlap unresolved?)"
    echo "$lint_out" | tail -8
    failed=1
fi

# ── 4. scaffold-component.mjs: generates compiling, tested code; refuses
#      overwrites and rejects invalid names. Own workdir: generated code
#      compiles under CURRENT typescript, not the lint toolchain's 6.x.
#      (The generated .stories.tsx was proven against an installed
#      Storybook 10 at rebuild time; CI skips that install for time and
#      checks the file's existence only.) ───────────────────────────────────
SCAFFOLD="$COMPONENTS_DIR/scripts/scaffold-component.mjs"
SCAF_DIR="$WORK_DIR/scaffold-app"
mkdir -p "$SCAF_DIR"
(cd "$SCAF_DIR" && npm init -y >/dev/null 2>&1 \
    && npm install --no-fund --no-audit typescript vitest jsdom \
        react react-dom @types/react @types/react-dom \
        @testing-library/react >/dev/null 2>&1)
cat > "$SCAF_DIR/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "esnext",
    "jsx": "react-jsx",
    "types": [],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["**/*.stories.tsx"]
}
JSON

if (cd "$SCAF_DIR" && node "$SCAFFOLD" billing RevenueSummary >/dev/null 2>&1) \
    && [[ -f "$SCAF_DIR/src/features/billing/components/RevenueSummaryView.stories.tsx" ]]; then
    print_success "scaffold generates the component file set"
else
    print_error "scaffold failed to generate:"
    (cd "$SCAF_DIR" && node "$SCAFFOLD" billing RevenueSummary 2>&1 | tail -5) || true
    failed=1
fi

if (cd "$SCAF_DIR" && ./node_modules/.bin/tsc -p tsconfig.json >/dev/null 2>&1); then
    print_success "generated code typechecks under current tsc (strict)"
else
    print_error "generated code fails typecheck:"
    (cd "$SCAF_DIR" && ./node_modules/.bin/tsc -p tsconfig.json 2>&1 | head -5) || true
    failed=1
fi

if (cd "$SCAF_DIR" && ./node_modules/.bin/vitest run >/dev/null 2>&1); then
    print_success "generated test suite passes"
else
    print_error "generated test suite fails:"
    (cd "$SCAF_DIR" && ./node_modules/.bin/vitest run 2>&1 | tail -8) || true
    failed=1
fi

if scaffold_out="$(cd "$SCAF_DIR" && node "$SCAFFOLD" billing RevenueSummary 2>&1)"; then
    print_error "scaffold overwrote existing files without refusing"
    failed=1
elif grep -q "Refusing to overwrite" <<<"$scaffold_out"; then
    print_success "scaffold refuses to overwrite existing files"
else
    print_error "scaffold failed rerun but without the refusal message:"
    echo "$scaffold_out" | tail -3
    failed=1
fi

if (cd "$SCAF_DIR" && node "$SCAFFOLD" "../evil" Widget >/dev/null 2>&1); then
    print_error "scaffold accepted a path-traversal feature name"
    failed=1
else
    print_success "scaffold rejects path-traversal feature names"
fi

# ── 5. Rot-token scan over both skills (hubs, references, assets, scripts) ──
# Patterns are prescriptive wrong forms only — tokens that also appear in
# legitimate negative guidance (do-not-use tables) are deliberately absent.
ROT_PATTERNS=(
    'FixedSizeList'
    'onFID'
    'cacheTime:'
    '\.eslintrc'
    'X-XSS-Protection: 1'
    '@storybook/testing-library'
    '@storybook/blocks'
    'react-router-dom'
)
rot_found=0
for pattern in "${ROT_PATTERNS[@]}"; do
    if hits="$(grep -rEn "$pattern" "$CORE_DIR" "$COMPONENTS_DIR" \
        --include='*.md' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
        2>/dev/null)"; then
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
    print_error "react smoke test FAILED"
    exit 1
fi
print_success "react smoke test passed"
