"""README and CONTRIBUTING conformance.

Documentation drift is invisible: a README that promises HA 2025.1 while
`hacs.json` says 2025.6 looks perfectly fine and sends users down a dead end.
Every number in the docs that also exists in code is asserted against the code
here, so the two cannot disagree quietly.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

from custom_components.badegewaesser_austria.const import (
    ATTRIBUTION,
    DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    INTEGRATION_VERSION,
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
    assert in_editor <= documented, (
        f"undocumented card options: {in_editor - documented}"
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
        for platform in strings["entity"].values()
        for entry in platform.values()
    }
    for name in names:
        assert f"| {name} |" in README, f"{name} is missing from the entity table"


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
    assert f"every {DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS} hours" in README
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


def test_every_feature_bullet_carries_a_version_marker() -> None:
    """Historical markers are frozen, so they have to be right when written."""
    section = README.split("## Supported Functions")[1].split("## Requirements")[0]
    bullets = [line for line in section.splitlines() if line.startswith("- **")]
    assert bullets, "expected feature bullets"
    for bullet in bullets:
        assert re.search(r"\*\(\d+\.\d+\.\d+\)\*", bullet), bullet


def test_release_markers_name_a_shipped_or_the_next_version() -> None:
    """A marker names a version that shipped, or the one being built.

    Until 0.1.0 shipped, every marker simply equalled the manifest. Since then
    a new feature carries the NEXT version while manifest.json still says the
    last release — the workflow bumps once per cycle, just before the release
    PR. So a marker is valid if it is not newer than the manifest, or if it is
    exactly one patch, minor or major step past it. A typo such as 0.12.0
    is neither.
    """
    major, minor, patch = (int(part) for part in INTEGRATION_VERSION.split("."))
    current = (major, minor, patch)
    upcoming = {(major, minor, patch + 1), (major, minor + 1, 0), (major + 1, 0, 0)}
    section = README.split("## Supported Functions")[1].split("## Requirements")[0]
    for marker in re.findall(r"\*\((\d+\.\d+\.\d+)\)\*", section):
        version = tuple(int(part) for part in marker.split("."))
        assert version <= current or version in upcoming, marker


@pytest.mark.parametrize(
    "heading",
    [
        "## Supported Functions",
        "## Requirements",
        "## Installation",
        "## Setup",
        "## Data Updates",
        "## Use Cases",
        "## Troubleshooting",
        "## Known Limitations",
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
        "npx tsc --noEmit",
        "npm run build",
        "scripts/readme_toc.py --check",
    ):
        assert command in CONTRIBUTING, f"{command} missing from CONTRIBUTING"


def test_contributing_states_both_python_axes() -> None:
    """The distinction that a wrong answer has already broken a release for."""
    pyproject = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    floor = re.search(r'target-version = "py3(\d+)"', pyproject)
    assert floor is not None
    assert f"3.{floor.group(1)}" in CONTRIBUTING
    assert "3.14" in CONTRIBUTING


def test_table_of_contents_is_current() -> None:
    """The same check CI runs, so a stale list fails locally first."""
    result = subprocess.run(
        [sys.executable, str(REPO / "scripts" / "readme_toc.py"), "--check"],
        capture_output=True,
        cwd=REPO,
        check=False,
    )
    assert result.returncode == 0, result.stdout.decode()
