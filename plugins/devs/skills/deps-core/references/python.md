# Python Dependency Management — Command Surface

Policy lives in python-core's dependencies reference: uv owns the whole workflow (project metadata, lockfile, venv, Python versions), version-constraint rules, and migration off pip/poetry. Where that reference speaks, it wins — this file is the verified command surface. Environment policy, once: supply-chain hooks here hard-block bare `pip install`, `uv add`, `uv pip install`, `uv tool install`, `uvx`, and `pipx`. The sanctioned mutation route is the Socket Firewall wrapper — `sfw uv add <pkg>` passes the guard. Read-only commands need no wrapper. Prefer built-in auditors; a missing tool is a reported gap, never installed around the block.

## uv (the default)

Detection: `uv.lock` present. Commands marked **current uv** exist in today's uv but not in older installs — probe with `uv audit --help` before relying on them. If the probe fails, the fix is upgrading uv, not layering external tools.

| Task | Command | Availability |
|---|---|---|
| Vulnerability audit (whole lockfile, OSV-backed; also flags adverse statuses like deprecation and quarantine) | `uv audit` | current uv |
| Audit, machine output | `uv audit --output-format json` (also `sarif`) | current uv |
| Suppress an advisory by ID | `uv audit --ignore <ID>`; `--ignore-until-fixed <ID>` resurfaces it once a fix version exists | current uv |
| Audit uv-installed tools | `uv tool audit <name>` or `uv tool audit --all` | current uv |
| Dependency tree | `uv tree` | any uv |
| Why is X here (reverse tree) | `uv tree --invert --package <pkg>` | any uv |
| Outdated, lockfile-level | `uv tree --outdated` (annotates latest available versions) | any uv |
| Outdated, active-venv-level | `uv pip list --outdated`; `uv pip list --format json` | any uv |
| Lockfile fresh? (CI gate) | `uv lock --check` | any uv |
| Export lockfile | `uv export -o requirements.txt` (current uv also emits `pylock.toml` and CycloneDX via `--format`) | any uv |
| Add / remove | `sfw uv add <pkg>` · `sfw uv add --dev <pkg>` · `uv remove <pkg>` | any uv |
| Make `.venv` match the lock | `uv sync` | any uv |
| Cache | `uv cache clean [pkg]` · `uv cache dir` | any uv |

`uv pip …` inspects whatever environment is active — useful in containers and CI images uv doesn't manage — but bypasses `uv.lock`; inside a uv project treat it as read-only debugging.

## pip (unmanaged environments only)

For environments with no `uv.lock`: bare `requirements.txt` projects, system images, someone else's venv. Pin the interpreter with `python -m pip` when several Pythons are installed.

| Task | Command |
|---|---|
| Outdated | `pip list --outdated --format json` |
| Package metadata | `pip show <pkg>` |
| Available versions on the index | `pip index versions <pkg>` |
| Clear cache | `pip cache purge` (inspect with `pip cache dir`, `pip cache info`) |

pip has no built-in vulnerability audit. The external auditor is **pip-audit**: bare `pip-audit` audits the current environment, `pip-audit -r requirements.txt` audits a requirements file, `-f json` for machine output. It must already be installed (`pip-audit --version` to confirm) or be run in an environment that has it — the ephemeral pipx/uvx route is blocked here, so a missing pip-audit is a reported gap. `--disable-pip` is valid only against hashed requirements files or together with `--no-deps`.

`safety scan` is an alternative auditor, but it requires a Safety account (`safety auth` login flow) — use pip-audit unless the project already uses Safety.

## poetry (legacy projects)

For maintaining existing poetry projects (`poetry.lock` present). Whether and how to migrate them to uv is python-core policy, not this file's.

| Task | Command | Notes |
|---|---|---|
| Outdated | `poetry show --outdated` | `--top-level` limits to direct deps |
| Machine output | `poetry show --format json` | not combinable with `--tree` |
| Dependency tree | `poetry show --tree` | `--why` marks direct vs required-by |
| Activate env | `poetry env activate` | prints the activation command; `poetry shell` moved to the `poetry-plugin-shell` plugin |
| Env details | `poetry env info` | `--path` for just the venv path |
| Export lockfile | `poetry export` | requires `poetry-plugin-export`, no longer bundled — confirm it's installed before relying on it |
| Preview an update | `poetry update --dry-run` | `--lock` updates the lockfile only |
| Lockfile consistent? | `poetry check --lock` | verifies `poetry.lock` matches `pyproject.toml` |
| Clear PyPI cache | `poetry cache clear PyPI --all` | `poetry cache list` names the caches |
| Add / remove | `sfw poetry add <pkg>` · `poetry remove <pkg>` | |

poetry has no built-in vulnerability audit — use pip-audit (above) against the project's environment, or osv-scanner directly on `poetry.lock` (see cross-ecosystem.md).
