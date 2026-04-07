---
name: supply-chain-defence:harden
description: >-
  This skill should be used when the user asks to "harden npm config",
  "create .npmrc", "secure my npm setup", "configure lockfile-lint",
  "add preinstall script", "harden package.json", "generate security config",
  "add CI security checks", or "harden my project against supply chain attacks".
  Generates or updates configuration files only — does not install tools.
---

# Supply Chain Hardening

Generate or update project configuration files for supply chain security. This skill writes config files — it does not install tools (use `setup` for that).

## 1. .npmrc

Check if `.npmrc` exists in the project root. Create or update with these settings:

```ini
# Supply chain defence — hardened npm configuration
ignore-scripts=true
package-lock=true
registry=https://registry.npmjs.org/
strict-ssl=true
audit-level=low
npx-auto-install=false
save-exact=true
min-release-age=5
```

**Important:** Preserve any existing settings the user has that don't conflict (e.g., custom `//registry.npmjs.org/:_authToken` lines, `@scope:registry` entries). Only add/update the security-relevant settings listed above.

## 2. .lockfile-lintrc

Create `.lockfile-lintrc` in the project root if `lockfile-lint` is installed:

```json
{
  "path": "<detected-lockfile>",
  "type": "<detected-pm>",
  "allowed-hosts": ["npm"],
  "validate-https": true,
  "validate-integrity": true
}
```

Set `path` and `type` based on the detected package manager and lockfile.

## 3. package.json Scripts

Add or update security-related scripts in `package.json`. Use the package manager (not direct file editing) where possible. For scripts that must be added to `package.json`, use `npm pkg set` or equivalent:

**preinstall script:**
```bash
npm pkg set scripts.preinstall="npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https"
```

**audit script:**
```bash
npm pkg set scripts.audit:security="npm audit && npx lockfile-lint --path <lockfile> --type <pm> --allowed-hosts npm --validate-https"
```

Adapt commands for the detected package manager (pnpm/yarn equivalents).

## 4. CI Workflow Snippet (GitHub Actions)

Offer to create `.github/workflows/supply-chain-check.yml`:

```yaml
name: Supply Chain Check
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Audit
        run: npm audit
      - name: Lockfile lint
        run: npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https
      - name: Audit signatures
        run: npm audit signatures
```

Adapt for the detected package manager.

## Verification

After making changes, summarise what was created/updated and remind the user to:
1. Review the changes
2. Commit the new config files
3. Restart Claude Code if hooks need to pick up new `.npmrc` settings
