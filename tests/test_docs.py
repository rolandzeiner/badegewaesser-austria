"""README and CONTRIBUTING conformance.

Documentation drift is invisible: a README that promises HA 2025.1 while
`hacs.json` says 2025.6 looks perfectly fine and sends users down a dead end.
Every number in the docs that also exists in code is asserted against the code
here, so the two cannot disagree quietly.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from custom_components.badegewaesser_austria.const import (
    ATTRIBUTION,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    LATE_RESULTS_POLL_HOURS,
    MAX_POLL_HOURS,
    MIN_POLL_HOURS,
    MONITORING_END_DAY,
    MONITORING_END_MONTH,
    MONITORING_START_DAY,
    MONITORING_START_MONTH,
    RATING_STATES,
    SEASON_END_DAY,
    SEASON_END_MONTH,
    SEASON_START_DAY,
    SEASON_START_MONTH,
)

REPO = Path(__file__).parent.parent
README = (REPO / "README.md").read_text(encoding="utf-8")
CONTRIBUTING = (REPO / "CONTRIBUTING.md").read_text(encoding="utf-8")
HACS = json.loads((REPO / "hacs.json").read_text(encoding="utf-8"))

# The photo surface is in the code but ships dormant: only a local photos/
# folder creates the image entity, and no release carries one until AGES
# consents to the photos' reproduction (see .gitignore). Documenting it would
# promise every HACS user a photo they cannot get, so it stays out of the
# README until the photos may ship. The editor hides these rows without one.
PHOTO_ONLY_OPTIONS = {"show_photo", "show_map"}
PHOTO_ONLY_PLATFORMS = {"image"}


def test_ha_min_badge_matches_hacs_json() -> None:
    """The badge is what users read before installing."""
    floor = HACS["homeassistant"]
    short = ".".join(floor.split(".")[:2])
    assert f"Home%20Assistant-%3E%3D{short}-blue" in README, (
        f"the HA badge should say >={short}, matching hacs.json"
    )


def test_requirements_section_matches_hacs_json() -> None:
    """And so is the requirements line."""
    assert f"**{HACS['homeassistant']}**" in README


def test_hacs_zip_filename_matches_the_domain() -> None:
    """The release workflow fails at tag time if these disagree."""
    assert HACS["filename"] == "badegewaesser_austria.zip"
    assert HACS["zip_release"] is True


def test_documented_card_options_match_the_editor() -> None:
    """A documented option the editor cannot set is a promise nobody keeps."""
    editor = (REPO / "src" / "editor.ts").read_text(encoding="utf-8")
    # Schema rows carry `name: "..."`; the grid container's own name is empty.
    in_editor = {name for name in re.findall(r'name:\s*"([a-z_]+)"', editor) if name}
    documented = set(re.findall(r"^\| `([a-z_]+)` \|", README, re.MULTILINE))
    assert in_editor - PHOTO_ONLY_OPTIONS <= documented, (
        f"undocumented card options: {in_editor - PHOTO_ONLY_OPTIONS - documented}"
    )
    assert not documented & PHOTO_ONLY_OPTIONS, (
        f"photo options documented before the photos ship: "
        f"{documented & PHOTO_ONLY_OPTIONS}"
    )


def test_documented_entities_match_the_translations() -> None:
    """The entity table must list what the integration actually creates."""
    strings = json.loads(
        (
            REPO / "custom_components" / "badegewaesser_austria" / "strings.json"
        ).read_text(encoding="utf-8")
    )
    names = {
        entry["name"]
        for platform, entries in strings["entity"].items()
        if platform not in PHOTO_ONLY_PLATFORMS
        for entry in entries.values()
    }
    for name in names:
        assert f"| {name} |" in README, f"{name} is missing from the entity table"
    for platform in PHOTO_ONLY_PLATFORMS:
        for entry in strings["entity"][platform].values():
            assert f"| {entry['name']} |" not in README, (
                f"{entry['name']} documented before the photos ship"
            )


def test_documented_quality_states_match_the_code() -> None:
    """The classification table is the one place the letters are explained."""
    for letter, state in RATING_STATES.items():
        assert f"`{state}`" in README, f"{state} missing from the quality table"
        assert f"| {letter} |" in README, (
            f"letter {letter} missing from the quality table"
        )


def test_documented_poll_intervals_match_the_defaults() -> None:
    """Cadence is the most-read number in the file and the easiest to drift."""
    assert f"every {DEFAULT_SCAN_INTERVAL_SEASON_HOURS} hours" in README
    assert f"every {LATE_RESULTS_POLL_HOURS} hours" in README
    assert "| 1 Oct – 14 May | no polls |" in README
    assert f"between {MIN_POLL_HOURS} and {MAX_POLL_HOURS} hours" in README


def test_documented_legal_season_matches_the_statute() -> None:
    """The docs must quote the statute, not a neighbouring country's.

    Badegewässerverordnung § 4 is 15 June to 31 August. The README said
    15 May to 30 September until 2026-09-22, which is the German definition.
    """
    assert (SEASON_START_MONTH, SEASON_START_DAY) == (6, 15)
    assert (SEASON_END_MONTH, SEASON_END_DAY) == (8, 31)
    assert "15 June and 31 August" in README
    assert "Badegewässerverordnung" in README


def test_documented_monitoring_window_matches_the_code() -> None:
    """And the cadence table must quote the wider window it actually uses."""
    assert (MONITORING_START_MONTH, MONITORING_START_DAY) == (5, 15)
    assert (MONITORING_END_MONTH, MONITORING_END_DAY) == (8, 31)
    assert "15 May – 31 Aug" in README


def test_docs_never_mention_the_old_window() -> None:
    """A stale date in the copy is how the wrong season survives a fix."""
    assert "30 September" not in README
    assert "30 Sep" not in README


def test_attribution_is_short_on_screen_and_full_in_the_docs() -> None:
    """CC BY 3.0 AT asks for exactly one thing, so both forms have to be right.

    The on-screen string names the source and the licence, which is what the
    licence asks for; the full legal name is spelled out once here, where it
    does not wrap a card footer onto two lines.
    """
    assert ATTRIBUTION == "Datenquelle: AGES · CC BY 3.0 AT"
    assert ATTRIBUTION in README
    assert "Österreichische Agentur für Gesundheit und Ernährungssicherheit" in README
    assert "creativecommons.org/licenses/by/3.0/at/" in README


@pytest.mark.parametrize(
    "heading",
    [
        "## Features",
        "## Requirements",
        "## Installation",
        "## Setup",
        "## Options",
        "## Entities",
        "## Data updates",
        "## Examples",
        "## Known limitations",
        "## Troubleshooting",
        "## Removal",
        "## Attribution",
        "## Disclaimer",
    ],
)
def test_quality_scale_docs_sections_exist(heading: str) -> None:
    """Each one satisfies a named docs-* rule in quality_scale.yaml."""
    assert heading in README


def test_disclaimer_is_bilingual() -> None:
    """Austrian users land here in German; the courtesy is portfolio-wide."""
    disclaimer = README.split("## Disclaimer")[1]
    assert "not affiliated with" in disclaimer
    assert "steht in keiner Verbindung" in disclaimer
    # And the German half uses du, like every other German string here.
    assert "Entscheide nie" in disclaimer
    assert not re.search(r"\bSie\b", disclaimer)


def test_contributing_documents_the_real_gate() -> None:
    """A gate that has drifted from CONTRIBUTING teaches the wrong workflow."""
    for command in (
        "pytest tests/ -v",
        "python scripts/check_module_coverage.py",
        "mypy --strict --ignore-missing-imports",
        "ruff check .",
        "ruff format --check .",
        "npx vp check",
        "npm run build",
    ):
        assert command in CONTRIBUTING, f"{command} missing from CONTRIBUTING"


def test_contributing_states_both_python_axes() -> None:
    """The distinction that a wrong answer has already broken a release for."""
    pyproject = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    floor = re.search(r'target-version = "py3(\d+)"', pyproject)
    assert floor is not None
    assert f"3.{floor.group(1)}" in CONTRIBUTING
    assert "3.14" in CONTRIBUTING
