# Contributing to Badegewässer Austria

Thanks for taking a look. This file describes how to get the project running
locally and what has to pass before a change lands.

## Dev setup

The project uses [`uv`](https://docs.astral.sh/uv/) for Python environments.

```bash
git clone https://github.com/rolandzeiner/badegewaesser-austria.git
cd badegewaesser-austria

uv venv --python 3.14          # the CI interpreter, NOT the support floor
source .venv/bin/activate
uv pip install -r requirements_test.txt

npm install                    # the Lovelace card's toolchain
```

`3.14` is what CI runs and what `pytest-homeassistant-custom-component`
requires. It is deliberately *not* the same as the support floor — see
[Two Python versions](#two-python-versions).

Optional but recommended:

```bash
pre-commit install
```

## Two Python versions

Every change has to respect both, and conflating them has shipped a broken
release elsewhere in this portfolio.

| Axis | Version | Where it is declared |
|---|---|---|
| **Runtime** — what we develop and test on | 3.14 | `validate.yml` `tests` job, your local venv |
| **Floor** — the oldest Python we must still run on | 3.13 | `pyproject.toml` `[tool.ruff] target-version`, the `compile-floor-python` CI job |

The floor is whatever `hacs.json`'s `homeassistant` value requires. HA 2025.6.0
declares `REQUIRED_PYTHON_VER = (3, 13, 2)`, which you can check rather than
remember:

```bash
gh api "repos/home-assistant/core/contents/homeassistant/const.py?ref=2025.6.0" \
  --jq .content | base64 -d | grep REQUIRED_PYTHON_VER
```

Setting `target-version` to the CI interpreter authorises `ruff format` to emit
syntax the floor cannot parse, and then declines to flag it. Raise the floor
only by changing all three declarations in one commit, plus the README's
requirement line and badge.

## Verification gate (must pass before pushing)

```bash
# Python
pytest tests/ -v
python scripts/check_module_coverage.py
mypy --strict --ignore-missing-imports custom_components/badegewaesser_austria
ruff check .
ruff format --check .                  # separate: `ruff check` ignores formatting

# The oldest Python we support. Derived, not hardcoded:
FLOOR=$(sed -n 's/^target-version = "py3\([0-9]*\)"/3.\1/p' pyproject.toml)
uv run --python "$FLOOR" --no-project python -m compileall -q \
  custom_components/badegewaesser_austria

# Card
npx tsc --noEmit                       # the ONLY type-check in the pipeline
npm test
npm run build
node -c custom_components/badegewaesser_austria/www/badegewaesser-austria-card.js
python3 scripts/readme_toc.py --check
```

CI runs all of the above plus `hassfest` and HACS validation.

Two of these are easy to skip and expensive to skip:

- **`ruff format --check`** is separate from `ruff check`, which never inspects
  formatting. Without it the formatter drifts silently until someone runs it.
- **`npx tsc --noEmit`** is the only type-check anywhere. Rolldown strips types
  without checking them, so a type error builds cleanly all the way to a
  shipped bundle.

## Coverage

`pytest.ini` enforces 95% over the package. That is only half the gate: the
quality scale's `test-coverage` rule is **per module**, and one module can slide
while the others carry the average. `scripts/check_module_coverage.py` reads the
`coverage.json` pytest writes and enforces the per-module floor. Run it after
the suite — pytest alone will not tell you a module regressed.

## The card

The card lives in `src/` and builds to
`custom_components/badegewaesser_austria/www/`.

```bash
npm run build     # production bundle
npm run dev       # watch mode
npm test          # vitest
```

**Commit the built bundle.** End users install through HACS and never run
`npm`, so `www/*.js` is tracked. CI asserts the committed bundle matches a
fresh build byte for byte — a stale bundle is the infinite reload-banner bug.

Tests that touch the DOM opt in **per file** with a docblock:

```ts
/**
 * @vitest-environment happy-dom
 */
```

There is no global `environment` setting and no `vitest.config.ts`, so only the
files that need a DOM pay for booting one.

## Version sync

Three places carry the version and must agree byte for byte:

| File | Field |
|---|---|
| `custom_components/badegewaesser_austria/manifest.json` | `version` |
| `src/const.ts` | `CARD_VERSION` |
| `custom_components/badegewaesser_austria/const.py` | derived from the manifest — no manual edit |

`tests/test_card_version.py` enforces this. If they drift, the card's WebSocket
version check sees a mismatch, shows a reload banner, the reload re-serves the
same bundle, and the banner comes back — for every user.

Bumping a version means editing `manifest.json` and `src/const.ts`, then
`npm run build`, and committing the rebuilt bundle in the same commit.

## Tooling

| Tool | Pin | Notes |
|---|---|---|
| `ruff` | exact, in `requirements_test.txt` | The `rev:` in `.pre-commit-config.yaml` must match. |
| `mypy` | exact, in `requirements_test.txt` | Same — check **both** tools when bumping either. |
| `rolldown` | exact, in `package.json` | Not Rollup. There is no Rollup anywhere in this portfolio. |
| `typescript` | exact | TS 7 is the Go-native compiler. |
| `vitest` + `happy-dom` | exact | |

Linters are pinned exactly because CI runs nightly: a floating range lets a new
upstream release turn the build red with no code change.

## Translations

Adding or changing a user-visible string means touching four files together:

- `custom_components/badegewaesser_austria/strings.json`
- `custom_components/badegewaesser_austria/translations/en.json`
- `custom_components/badegewaesser_austria/translations/de.json`
- `custom_components/badegewaesser_austria/icons.json` (for a new entity)

`tests/test_translations.py` enforces key parity, icon coverage, hassfest's
`[a-z0-9-_]+` key rule, and that the German copy uses **du**, never **Sie**.

Card-side strings live in `src/localize/languages/{de,en}.json`.

## Reporting issues

Open an issue with your Home Assistant version, the integration version, and
the relevant log lines. For a data problem, the entry's **Download diagnostics**
output is the most useful thing you can attach — it carries the bathing water's
record and the coordinator's state, with contact details redacted.
