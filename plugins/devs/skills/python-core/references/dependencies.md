# Python Dependency Management

uv owns the whole workflow: project metadata, lockfile, venv, Python versions. Never `pip install` into an environment — modern interpreters are PEP 668 externally-managed, and it bypasses the lockfile anyway.

## Project workflow (the default)

```bash
uv init myapp            # pyproject.toml, main.py, .python-version
uv add httpx             # add dep: resolve + install + update uv.lock in one step
uv add --dev pytest ruff
uv sync                  # make .venv match uv.lock exactly
uv run pytest            # run inside the env (auto-syncs first)
uv lock --check          # CI: fail if lockfile is stale
uv lock --upgrade        # refresh pins within pyproject constraints
```

Real output from this cycle:

```text
$ uv add httpx
Creating virtual environment at: .venv
Resolved 8 packages in 1ms
Installed 7 packages in 3ms
 + httpx==0.28.1
$ uv sync
Resolved 15 packages in 0.32ms
Audited 13 packages in 0.01ms
```

Commit `uv.lock` — it pins the full graph cross-platform. Never edit it by hand. `.venv` stays untracked.

## Dev deps: PEP 735 dependency-groups

`uv add --dev` writes `[dependency-groups]`, not `[project.optional-dependencies]`:

```toml
[project]
name = "demo-app"
requires-python = ">=3.12"
dependencies = ["httpx>=0.28.1"]

[dependency-groups]
dev = ["pytest>=9.1.1", "ruff>=0.16.3"]
```

Groups are private: never published, installed by `uv sync` by default (`--no-dev` to skip, `--group lint` to select others). Extras (`[project.optional-dependencies]`) are only for optional features you ship to installers of your package (`myapp[postgres]`). A `dev` extra is the legacy pattern — migrate it to a group.

## Version constraints

- **Apps**: loose lower bounds (`httpx>=0.28`) in pyproject; `uv.lock` is the real pin. Upper caps mostly cause resolution pain.
- **Libraries**: lower-bound what you actually import against; avoid speculative `<2.0` caps.
- **0.x packages** (fastapi is still 0.x): under semver any minor may break, so `>=0.104,<1.0` constrains nothing. Either cap the minor (`fastapi>=0.141,<0.142`) or rely on the lockfile plus CI to catch bumps — do not pretend `<1.0` is protection.

## Auditing and upgrades

```bash
uv tree --outdated       # deps with latest available versions
uv audit                 # built-in vulnerability audit over the lockfile (--output-format json for machine output)
```

`uv audit` is built into current uv — probe with `uv audit --help`; if the installed uv predates it, upgrade uv rather than adding auditors to the project. The full audit command surface (ignores, tool audits, output formats) lives in deps-core's python reference.

## Migrating

- From `requirements.txt`: `uv init && uv add -r requirements.txt` (and `uv add --dev -r requirements-dev.txt`).
- From Poetry/Pipenv/pip-tools: `sfw uvx migrate-to-uv` converts metadata and lockfile in place (Socket Firewall wrapping is what makes the one-shot run sanctioned — bare `uvx` is blocked in this environment).
- Stop generating `pip freeze > requirements.txt`. If a consumer needs one, `uv export` it from the lockfile.

## `uv pip`: the escape hatch

`uv pip install/list/show` is a fast pip replacement for envs uv doesn't manage — containers, CI images, one-off venvs. It bypasses `uv.lock`, so inside a uv project it's for debugging only, never routine installs.

## Ruff config placement

Lint settings go under `[tool.ruff.lint]` (only `line-length`-style global options sit at `[tool.ruff]`):

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]
```
