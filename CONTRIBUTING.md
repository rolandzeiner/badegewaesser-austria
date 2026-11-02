# Contributing to Badegewässer Austria

Thanks for taking a look. This repo is a Home Assistant integration with a Lovelace card. Everything you need to work on it is on this page, and the gate in *Verification gate* has to pass before a change lands.

## Quick start

```bash
git clone https://github.com/rolandzeiner/badegewaesser-austria.git
cd badegewaesser-austria
uv venv --python 3.14 && source .venv/bin/activate
uv pip install -r requirements_test.txt pre-commit
pre-commit install
npm ci && npm run build
```

Before a PR, run the gate in *Verification gate*. It is what CI runs, so failing locally only costs you a push.

## Branching and releases

- Work on `dev`; PRs target `dev`. Nothing is committed or force-pushed to `main`.
- For anything bigger than a fix, open an issue first so the shape is agreed before the code is written.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. A subject line, then bullets that say what changed and why.
- The built bundle is committed and travels with the `src/` change that produced it: users install through the Marketplace and never run `npm`, and CI fails when the committed bundle differs from a fresh build by a byte.
- Releases are the maintainer's: a `dev → main` PR, squash-merged, then a tag from `main`. Publishing the release runs `release.yml`, which attaches `badegewaesser_austria.zip`, a flat archive of `custom_components/badegewaesser_austria/`. `hacs.json` sets `zip_release`, so the Marketplace downloads that file, and a release without it can't be installed. If the job fails, `gh workflow run release.yml -f tag=vX.Y.Z` re-runs it against the existing tag.
- Contributions are accepted under the repo's MIT licence.

## Python environment

- The project uses [`uv`](https://docs.astral.sh/uv/) for Python environments, the same tool CI installs with (`astral-sh/setup-uv` and `uv pip install --system`), so a gate that passes locally resolves what CI resolves. Plain `python -m venv` and `pip` work too.
- `3.14` is the CI interpreter and what `pytest-homeassistant-custom-component` requires. It is deliberately not the support floor; see *Two Python versions*.
- `pre-commit install` runs ruff, ruff-format, mypy and `vp check` on every commit, plus the whitespace hooks, from which the built bundle is excluded (see *Card toolchain*).
- A venv built months ago drifts from `requirements_test.txt`. Re-run `uv pip install -U -r requirements_test.txt` after a pin bump and whenever you come back to the repo; the `-U` is what moves a floating range such as PHACC's.
- `requirements_test.txt` carries its own rules in its header comment: PHACC governs the test stack, and nothing it pins is declared again.
- `custom_components/badegewaesser_austria/_dev_fixture.py` is gitignored and the `no-dev-fixture` CI job fails if it ever lands. The coordinator applies it to a snapshot for local card work (a closure, a problem state); production installs never have the file, and the call is skipped under pytest.

## Two Python versions

Every change has to respect both, and conflating them has shipped a broken release in this portfolio.

| Axis | Version | Where it is declared |
|---|---|---|
| **Runtime**: what we develop and test on | 3.14 | `validate.yml` `tests` job, your local venv |
| **Floor**: the oldest Python we must still run on | 3.13 | `pyproject.toml` `[tool.ruff] target-version`, the `compile-floor-python` CI job |

The floor is whatever `hacs.json`'s `homeassistant` value requires. HA 2025.6.0 declares `REQUIRED_PYTHON_VER = (3, 13, …)`, which you can check rather than remember:

```bash
gh api "repos/home-assistant/core/contents/homeassistant/const.py?ref=2025.6.0" \
  --jq .content | base64 -d | grep REQUIRED_PYTHON_VER
```

Setting `target-version` to the CI interpreter lets `ruff format` emit syntax the floor cannot parse and then stay silent about it; that is how a sibling once shipped a `SyntaxError` with green CI, because every check ran on the newer interpreter. Raise the floor only by changing all three declarations in one commit, plus the README's requirement line and badge.

## Card toolchain

The card lives in `src/` and builds to `custom_components/badegewaesser_austria/www/badegewaesser-austria-card.js`. Its whole toolchain runs through [Vite+](https://viteplus.dev/) (`vp`), configured in `vite.config.ts`: `vp build` (Vite library mode on Rolldown), `vp test` (Vitest) and `vp check` (Oxfmt, Oxlint and the type-check). The only card `devDependencies` are `vite-plus` and `happy-dom`; Vitest, Rolldown and the type-checker ship inside `vite-plus`, and `typescript` is not installed. `npx vp` runs the copy in `node_modules`; a global `vp` works too.

| Command | What it does |
|---|---|
| `npm run dev` | Watches `src/` and rebuilds the bundle on save, with a sourcemap (`--mode development`). |
| `npm run build` | Production build into `www/`. |
| `npm test` | `vp test run`: the card suites. |
| `npm run check` | `vp check`: Oxfmt, Oxlint and the type-check. `npx vp check --fix` rewrites what it can. |

Node 24.11 or newer (26 works too) and npm 11.

Commit the built bundle. End users install through the Marketplace and never run `npm`, so `custom_components/badegewaesser_austria/www/badegewaesser-austria-card.js` is tracked. CI asserts the committed bundle matches a fresh build byte for byte; a stale bundle is the infinite reload-banner bug. A dev build writes a `.map` file next to it; it is gitignored.

Things in `vite.config.ts` that fail silently if you change them:

- The banner must be a **legal** comment, `/*! ... */`, with `comments: { legal: true }`. The minifier strips a `//` banner without a word; only the built file's first bytes show it.
- **`minify` lives on `rolldownOptions.output`, with `dropConsole: false`.** Vite's library mode skips whitespace minification for ES output, so `build.minify` alone ships the bundle with its whitespace left in. `dropConsole` is all-or-nothing, and the `console.*` calls here sit in `catch` blocks, where dropping them turns a caught error into a silent one.
- **Dev vs prod comes from `--mode development`** (`npm run dev`). A plain `vp build` is production: minified, no sourcemap.
- **`fmt.embeddedLanguageFormatting` stays `"off"`.** Otherwise Oxfmt reformats Lit `html` and `css` templates and changes the whitespace inside rendered elements, which is a DOM change, not a style change.
- **`fmt.ignorePatterns` keeps Oxfmt to the card source.** `tests/**` holds the Python suite and its recorded AGES document, whose bytes the digest tests depend on, and `custom_components/**` holds the bundle.
- **Decorators are not configured.** Rolldown reads `tsconfig.json` itself and enables Lit's legacy decorators from it. If that ever regresses, class fields overwrite Lit's accessors and reactivity dies while the build stays green; `src/card.test.ts` mounts the card and sets `hass`, which stops rendering the moment that happens.
- **`lint.plugins` replaces Oxlint's defaults.** It names `typescript`, `unicorn` and `oxc` next to `vitest`; drop one and its rules stop running without a word. The `vitest/*` rules fail a committed `.only` or `.skip`, a test without an assertion, a duplicate title, an `expect` inside an `if` and a bare `toThrow()`, and `reportUnusedDisableDirectives` fails a disable comment that no longer suppresses anything.
- **`lint.options.denyWarnings: true`.** Without it `vp check` exits 0 on warnings, and CI and pre-commit let them through.
- **`codeSplitting: false`.** The card is one file; a dashboard resource can't load a second chunk the bundler decided on. The editor is eagerly imported and inlined by it.
- **`emptyOutDir: false`.** Vite empties the output directory before each build by default, and `www/` sits inside the integration package.

The `vite` override in `package.json` must name the same version as `vite-plus`. It keeps npm from installing upstream Vite next to Vite+'s core. Dependabot bumps `vite-plus` but not the override, and `src/toolchain.test.ts` fails until both match. Bump with `npx --package=vite-plus@<new> vp migrate --no-interactive`, which moves both; `npm install vite-plus@<new>` fails with ERESOLVE.

The build does not type-check. `vp check` is the only thing between a type error and a green build, which is why the gate runs it as its own step. It also catches a backtick inside a Lit `css` or `html` template, comments included, which ends the template early and fails the card at load while the build stays green.

The bundle is excluded from the `end-of-file-fixer` and `trailing-whitespace` hooks: the bundler emits no trailing newline, and a hook that fixes the file after the build leaves it out of sync with a fresh one, which CI asserts byte for byte. `vp check` runs as a local hook on card source; don't switch to Vite+'s own `vp staged` hooks, which take over `core.hooksPath` and silently disable ruff and mypy.

`tsconfig.json`'s `lib` is the card's browser floor: ES2022. The ES2023 array methods such as `toSorted()` stay out: the bundle doesn't polyfill them. Raising it is a browser requirement for users; say so in the README's Requirements section in the same commit.

### Trying it in Home Assistant

Copy `custom_components/badegewaesser_austria/` into your Home Assistant config's `custom_components/` and restart Home Assistant. After a card change, copy the rebuilt `www/` file the same way and hard-refresh the browser: the resource URL only changes with the version.

## Verification gate

```bash
# Python
pytest tests/ -v
python scripts/check_module_coverage.py   # the per-module floor; pytest alone checks the total
mypy --strict --ignore-missing-imports custom_components/badegewaesser_austria
ruff check .
ruff format --check .                     # separate: `ruff check` never inspects formatting

# The oldest Python we support, derived from pyproject.toml, never hardcoded
FLOOR=$(sed -n 's/^target-version = "py3\([0-9]*\)"/3.\1/p' pyproject.toml)
uv run --python "$FLOOR" --no-project python -m compileall -q custom_components/badegewaesser_austria

# Card
npx vp check                              # format, lint and the only type-check
npm test                                  # vp test run
npm run build                             # commit the rebuilt bundle with the src/ change
git diff --exit-code -- custom_components/badegewaesser_austria/www/*.js
node -c custom_components/badegewaesser_austria/www/badegewaesser-austria-card.js
```

CI runs the same checks plus hassfest, HACS validation, `npm audit --omit=dev --audit-level=high`, a check that the committed bundle matches a fresh build, the dev-fixture guard and CodeQL. Failing locally only costs you a push.

Two of these are easy to skip and expensive to skip:

- **`ruff format --check`** is separate from `ruff check`, which never inspects formatting. Without it the formatter drifts silently until someone runs it.
- **`npx vp check`** is the only type-check anywhere. The build strips types without checking them, so a type error builds cleanly all the way to a shipped bundle.

**Keep `--no-project`** on the `compileall` line. Without it `uv` treats the repo root as a project, finds no `requires-python`, and rebuilds `.venv` on the floor interpreter, taking every tool in it along. Recover with `uv venv --clear --python 3.14 && uv pip install -r requirements_test.txt pre-commit`.

## Tests

**Python.** `pytest tests/` runs on `pytest-homeassistant-custom-component`. `tests/conftest.py` holds what a new test starts from: `document` is the recorded AGES document from `tests/fixtures/badegewaesser_db.json` as it arrives off the wire, `session` a mock `aiohttp` session that serves it, `config_entry` an entry for one bathing water, and `setup_entry()` loads it. Five autouse fixtures are on in every test: `auto_enable_custom_integrations`, `patched_clientsession`, `no_deprecated_ha_api`, `photo_dir`, and `_reset_shared_coordinator`, which clears the domain-wide coordinator between tests, since every entry shares one. `test_api.py` opens with an AST guard: `api.py` may import only the standard library and aiohttp, and a relative import counts as a violation, since `const.py` pulls Home Assistant in for the User-Agent; the same file checks the User-Agent on the request, that no `Accept-Encoding` is pinned, and that the content digest ignores the document's regeneration counter. `test_parsing.py` pins what the upstream's fields mean where they differ from what they say; `test_coordinator.py` the season windows, the cadence, the backoff and the one-request-per-poll guarantee; `test_sensor.py`, `test_binary_sensor.py` and `test_image.py` the entities; `test_outage.py` and `test_init.py` the Repairs issues and the entry lifecycle; `test_card_registration.py` the Lovelace resource; `test_translations.py` the four-file set. `test_docs.py` reads the README and this file. The harness traps that cost an afternoon:

- The autouse `no_deprecated_ha_api` fixture fails any test that trips Home Assistant's deprecation channel, in both of HA's message shapes. A test that exercises a deprecated API on purpose takes `@pytest.mark.allow_deprecated_ha_api`; don't weaken the fixture.
- Unknown markers fail the run (`strict_markers`), a hung fixture fails after 15 s, and a `DeprecationWarning` or `RuntimeWarning` reached through our own code is an error (`pytest.ini` says which libraries are exempt and how to add one).
- The photo folder is created per test by the autouse `photo_dir` fixture under `tmp_path`. A test about the image entity writes its own `credits.json` there; nothing reads the real folder.

**Card.** The suites sit beside the sources as `src/**/*.test.ts` and import from `vite-plus/test`, not `vitest`. Five run in plain Node: `utils.test.ts` covers the number, count and date formatters, `season-track.test.ts` the calendar-anchored axis maths and the label rows, `localize.test.ts` the language lookup and its fallbacks, `editor-defaults.test.ts` that the editor shows the card's real defaults and saves only what changed, and `toolchain.test.ts` pins the `vite` override named in *Card toolchain*. `card.test.ts` opts in to a DOM with a `@vitest-environment happy-dom` line in its leading comment and mounts the card and the editor: registration, the card API, the eight-entity resolution through the registry, the header, the season track and its tooltip, the tile trends, the readings, the photo header and its credit, the map link and the map view, the gated grid-cell rules, attribution, the editor, legacy entity-shaped configs and the version banner.

- The HA components the card and editor host (`ha-card`, `ha-form`, `ha-icon`, `ha-alert`) are deliberately never defined in tests, and `window.loadCardHelpers`, which the map view needs, is absent. An undefined element is inert, Lit renders straight through it, and not stubbing them is what keeps this layer free of a test harness.
- happy-dom lays nothing out, so the container query that stacks the readings and the grid-cell fill are checked on the stylesheet text.

A change to what the card does comes with a test that fails without it.

### Coverage

`pytest.ini` enforces `--cov-fail-under=95` on the package total. That is only half the gate: `scripts/check_module_coverage.py` reads the `coverage.json` pytest writes and holds every module to the same floor, because one module can slide while the others carry the average. Run it after the suite; `pytest tests/ --cov-report=term-missing` gives the per-file view. The card side has no gate and the provider is not a dependency. To see which branches a change left unexercised, install it for one run at the Vitest version Vite+ bundles:

```bash
V=$(npx vp toolchain vitest | grep -oE 'vitest@[0-9.]+' | head -1 | cut -d@ -f2)
npm i --no-save @vitest/coverage-v8@"$V"
npx vp test run --coverage --coverage.provider=v8 --coverage.reporter=text \
  '--coverage.include=src/**/*.ts' '--coverage.exclude=src/**/*.test.ts'
```

`--no-save` leaves `package.json` and the lockfile alone; the next `npm ci` removes the provider.

## Version sync

`manifest.json` `version` and `src/const.ts` `CARD_VERSION` must match byte for byte. `const.py` derives its value from the manifest at import, so the Python side needs no edit, and `tests/test_card_version.py` enforces the pair. The failure mode: the card's version check sees a mismatch, shows the reload banner, the reload re-serves the same bundle, and the banner comes back, for every user. A bump edits both files, rebuilds the bundle and commits all three together. Neither carries a `-beta` suffix: a pre-release has the final release's number and GitHub's pre-release flag. The README badge reads the latest release tag and needs no edit.

## Dependencies

| Package | Pin | Why |
|---|---|---|
| `ruff`, `mypy` | exact, `requirements_test.txt` | CI runs nightly; a floating linter turns the build red with no code change. The `rev:` in `.pre-commit-config.yaml` must match; check both tools when bumping either. |
| `pytest-homeassistant-custom-component` | `>=` floor with a `<` cap | it tracks HA core; pinning it would freeze the HA version tested against |
| `vite-plus` | exact, `package.json` | it decides what the committed bundle looks like; the `vite` override names the same version |
| `happy-dom` | exact | it decides what the DOM suite sees; the siblings keep one version |
| `lit` | caret | maintained, keeps semver |

- **Dependabot's blind spots.** It bumps the `requirements_test.txt` pin and leaves the hook `rev` alone (it is told to); it bumps `vite-plus` and leaves the override alone. The toolchain test catches the second; nothing catches the first except reading both files.
- **Runtime vs dev.** What the build inlines into the bundle is a `dependency`; a build-time tool is a `devDependency` even though the build needs it. CI's `npm audit --omit=dev` only means something because of that split.
- **Adding a dependency.** The bundle loads on every dashboard, so a new runtime dependency is discussed in an issue first; today the card has `lit` alone. Its licence must be compatible with MIT and its notice must survive the build (`comments: { legal: true }` keeps the `@license` comments). Prefer vendoring a few constants with a provenance comment over depending on a package that exports thousands.

## Translations

Adding or changing a user-visible string means touching four files together: `strings.json`, `translations/en.json`, `translations/de.json`, and `icons.json` for a new entity. `tests/test_translations.py` enforces key parity, icon coverage, hassfest's `[a-z0-9-_]+` key rule, that every enum option has a translated state, and that the German copy uses **du**, never **Sie**.

The card's strings live in `src/localize/languages/{de,en}.json`. `src/localize/localize.ts` default-imports each pack (`import de from "./languages/de.json"`) into its `LANGUAGES` map, resolves the language from `hass.locale.language` with the region stripped (`de-AT` reads the `de` pack), and falls back to English key by key, so one missing string shows English instead of an empty label. A new language is a pack beside `en.json` with the same keys, imported and added to the map the same way; `localize.test.ts` covers the lookup.

## Home Assistant conventions

- Every `UpdateFailed` carries `translation_domain`, `translation_key` and placeholders; never a bare string. `BadegewaesserApiError` in `api.py` carries the key, the `detail` placeholder and the HTTP status the coordinator raises with, and `test_api_errors_keep_their_translation_contract` in `tests/test_coordinator.py` pins them, since `strings.json` and `outage.py` both depend on them.
- Icons live in `icons.json`; `_attr_icon = "mdi:…"` appears nowhere.
- Every platform module sets `PARALLEL_UPDATES = 0`.
- `api.py` imports nothing from Home Assistant or the package: it owns the document URL, the request headers, the parser, the dataclasses, the content digest and `BadegewaesserApiError`; callers pass in the session and the User-Agent, because `const.py` imports HA. The AST guard in `tests/test_api.py` fails on any such import. Outside `api.py`, catch `BadegewaesserApiError`, never `aiohttp`'s errors.
- The `User-Agent` constant goes on every outbound call and no `Accept-Encoding` is pinned (aiohttp's own offer already gets gzip). One shared, domain-wide poll serves every entry, at the shortest interval any entry asks for, with `MIN_POLL_HOURS` as the floor; from October to mid-May it makes no scheduled request at all, because nothing in the document moves. There is no conditional GET, by measurement: the block in `const.py` says why, read it before adding one. These are fair use towards AGES; don't lower the floor or add a per-entry fetch.
- `unique_id` formulas are frozen: changing one wipes every existing install.
- `ATTRIBUTION` in `const.py` is the data-source statement every entity emits and the card shows in its footer. The photos are not covered by that licence: they are AGES's site pictures, built into a gitignored `photos/` folder by a script that never ships, carry their own credit from `credits.json`, and reach the browser only through Home Assistant's image proxy, so an install without the folder gets no image entity and nothing else changes. Never commit a photo.
- Diagnostics redact the fields in `TO_REDACT` in `diagnostics.py`, the site contact's `email` and `phone` among them; the set only grows. The test fixture is the public AGES document; nothing in a fixture is a credential.

## Where things are

| Module | Owns |
|---|---|
| `api.py` | The one request to AGES and everything about the document: URL, headers, parser, dataclasses, per-field sentinels, the content digest, `BadegewaesserApiError`. HA-free. |
| `coordinator.py` | The shared, domain-wide poller: season windows, cadence, the off-season dormancy, backoff, `apply_dev_fixture`, and turning `BadegewaesserApiError` into a translated `UpdateFailed`. |
| `outage.py`, `repairs.py` | The upstream-outage Repairs issue, and the "bathing water missing" issue. |
| `const.py` | Domain, version, User-Agent, poll cadence, season windows, the photo folder, and the measured block on why there is no conditional GET. |
| `entity.py`, `sensor.py`, `binary_sensor.py`, `image.py` | The shared entity base with the device, the readings and rating sensors, the closed and bathing-season binary sensors, the photo entity. |
| `config_flow.py`, `diagnostics.py`, `card_registration.py`, `websocket.py`, `__init__.py` | The search-or-browse flow with its options step, diagnostics, the Lovelace resource registration for the bundle, the `card_version` WebSocket command, and the domain setup. |
| `src/badegewaesser-austria-card.ts`, `src/card-styles.ts` | The card and its styles, including the container query and the gated grid-cell rules. |
| `src/editor.ts` | The `ha-form` editor with the device picker. |
| `src/config.ts` | `normaliseConfig()` and `tidyConfig()`: the one place the card's defaults live. |
| `src/season-track.ts`, `src/utils.ts` | The calendar-anchored season axis; the formatters. |
| `src/localize/` | The card strings. |

### Adding a card option

Add the key to `BadegewaesserCardConfig` in `src/types.ts`, its default to `normaliseConfig()` in `src/config.ts`, and a field to the schema in `src/editor.ts`, with an `editor.*` label in both language packs. `editor-defaults.test.ts` pins the defaults and `card.test.ts` what the card does with the key.

## Style

- TypeScript strict; the `tsconfig.json` flags are not negotiable, and `vp check` reports no warnings (`denyWarnings`).
- Comments say why, not what; identifiers carry the what.
- The browser floor is ES2022: no `toSorted()` or other ES2023 built-in. Imports carry no extension; the bundler resolves them.
- Runtime dependencies are `lit` alone; adding one goes through *Dependencies*.
- Python: `pyproject.toml` is the source of truth for ruff, mypy and coverage; change rules there, never in CI flags or hook args. A rule that is noise in tests goes into `per-file-ignores`, not off.
- German copy uses du.

## Reporting issues

Open an issue with:

- your Home Assistant version and the Badegewässer Austria version
- the diagnostics download: **Settings → Devices & services → Badegewässer Austria** → ⋮ → **Download diagnostics**. It carries the bathing water's record and the coordinator's state; the site contact's email and phone are redacted before the file is written.
- the steps to reproduce, and the log lines from `custom_components.badegewaesser_austria`

A security problem goes through **Report a vulnerability** under the repository's **Security** tab, not a public issue.
