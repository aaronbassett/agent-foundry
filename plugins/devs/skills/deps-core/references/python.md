# Python Dependency Management

## Package Manager Detection

Identify the package manager from project files:

| Indicator | Package Manager | Config |
|---|---|---|
| `pyproject.toml` with `[tool.poetry]` | poetry | `pyproject.toml` |
| `pyproject.toml` with `[tool.uv]` or `uv.lock` present | uv | `pyproject.toml` |
| `pyproject.toml` (other) | pip | `pyproject.toml` |
| `requirements.txt` only (no `pyproject.toml`) | pip | `requirements.txt` |
| `setup.py` or `setup.cfg` only | pip (legacy) | `setup.py` / `setup.cfg` |
| `Pipfile` | pipenv | `Pipfile` |

To confirm the version:
- pip: `pip --version`
- poetry: `poetry --version`
- uv: `uv --version`

## Virtual Environment Awareness

**Always check if a virtual environment is active** before running commands. Look for:
- `$VIRTUAL_ENV` environment variable
- `.venv/` or `venv/` directory in project root
- `poetry env info` for poetry-managed environments
- `uv venv` for uv-managed environments

If no venv is active and you need to install packages, warn the user about installing into the system Python.

## Command Reference

### List Dependencies

| pip | poetry | uv |
|---|---|---|
| `pip list` | `poetry show` | `uv pip list` |
| `pip list --format json` | `poetry show --no-ansi` | `uv pip list --format json` |
| `pip freeze` (pinned versions) | `poetry export -f requirements.txt` | `uv pip freeze` |

### Check for Outdated Packages

| pip | poetry | uv |
|---|---|---|
| `pip list --outdated` | `poetry show --outdated` | `uv pip list --outdated` |
| `pip list --outdated --format json` | — | — |

### Security Audit

| pip | poetry | uv |
|---|---|---|
| `pip-audit` | `pip-audit` (in poetry shell) | `uv pip audit` |
| `pip-audit --json` | — | — |
| `safety check` | `safety check` | — |

`pip-audit` requires installation: `pip install pip-audit`
`safety` requires installation: `pip install safety`

### Install a Package

| pip | poetry | uv |
|---|---|---|
| `pip install <pkg>` | `poetry add <pkg>` | `uv add <pkg>` |
| `pip install <pkg>==<ver>` | `poetry add <pkg>@<ver>` | `uv add <pkg>==<ver>` |
| `pip install -e .` (editable) | `poetry install` | `uv pip install -e .` |
| `pip install -r requirements.txt` | `poetry install` | `uv pip install -r requirements.txt` |
| — | `poetry add --group dev <pkg>` | `uv add --dev <pkg>` |

### Uninstall a Package

| pip | poetry | uv |
|---|---|---|
| `pip uninstall <pkg>` | `poetry remove <pkg>` | `uv remove <pkg>` |
| `pip uninstall -y <pkg>` (no confirm) | — | — |

### View Package Information

| pip | poetry | uv |
|---|---|---|
| `pip show <pkg>` | `poetry show <pkg>` | `uv pip show <pkg>` |
| `pip index versions <pkg>` | — | — |
| Open `https://pypi.org/project/<pkg>/` | — | — |

### Why Is This Package Installed?

| pip | poetry | uv |
|---|---|---|
| `pipdeptree -r -p <pkg>` | `poetry show --tree` | `uv pip tree` |

`pipdeptree` requires installation: `pip install pipdeptree`

### Clear Cache

| pip | poetry | uv |
|---|---|---|
| `pip cache purge` | `poetry cache clear --all .` | `uv cache clean` |
| `pip cache info` | `poetry cache list` | `uv cache dir` |

## Lock Files

| Package Manager | Lock File | Format | Commit? |
|---|---|---|---|
| pip | `requirements.txt` (via `pip freeze`) | Plain text | Yes (applications) |
| poetry | `poetry.lock` | TOML | Yes, always |
| uv | `uv.lock` | TOML | Yes, always |
| pipenv | `Pipfile.lock` | JSON | Yes, always |

**Reading lock files:** Use `pip list` / `poetry show` / `uv pip list` to see resolved versions rather than parsing lock files directly.

**Updating the lock file:**
- pip: `pip freeze > requirements.txt`
- poetry: `poetry lock` (update lock without installing), `poetry update` (update + install)
- uv: `uv lock` (update lock), `uv sync` (update + install)

## Finding Release Notes

1. Get the project URL: `pip show <pkg>` → check "Home-page" or "Project-URL" fields
2. Check PyPI: `https://pypi.org/project/<pkg>/#history`
3. Check GitHub releases if the project is on GitHub
4. Check CHANGELOG.md or CHANGES.rst in the repository

## Upgrade Report

To prepare an upgrade report for a package:

1. Check current version: `pip show <pkg>` (or `poetry show <pkg>` / `uv pip show <pkg>`)
2. Check available versions: `pip index versions <pkg>` or check PyPI
3. Check for breaking changes:
   - Find the repository and read CHANGELOG.md or GitHub releases
   - Major version bumps (e.g., 3.x → 4.x) typically have breaking changes
   - Check migration guides (many major Python packages provide them)
4. Check who depends on it: `pipdeptree -r -p <pkg>` or `poetry show --tree`
5. For projects with type stubs, check if stub packages need updating too
