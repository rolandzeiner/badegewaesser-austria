"""The four-file translation tax, enforced locally instead of by CI.

Every one of these failed silently or late at some point:

* A key present in one file and missing from another falls back rather than
  erroring, so a half-translated string just quietly shows English.
* An entity without an `icons.json` entry renders HA's generic domain icon,
  which looks deliberate.
* hassfest rejects a translation key outside `[a-z0-9-_]+`, but only in CI —
  this suite ran green with an uppercase enum state until the push failed.
* "Sie" instead of "du" is portfolio-wide wrong and no tool checks it.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

DOMAIN_DIR = (
    Path(__file__).parent.parent / "custom_components" / "badegewaesser_austria"
)
FILES = ("strings.json", "translations/en.json", "translations/de.json")

# hassfest: "need to be [a-z0-9-_]+ and cannot start or end with a hyphen or
# underscore".
KEY_RE = re.compile(r"[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$")

# Structural keys HA defines, which are not ours to rename.
STRUCTURAL = {"data", "data_description", "menu_options", "state", "step"}


def load(name: str) -> dict[str, Any]:
    """One translation file."""
    return json.loads((DOMAIN_DIR / name).read_text(encoding="utf-8"))


def key_paths(node: Any, prefix: str = "") -> set[str]:
    """Every leaf path in a nested dict."""
    if isinstance(node, dict):
        found: set[str] = set()
        for key, value in node.items():
            found |= key_paths(value, f"{prefix}.{key}" if prefix else key)
        return found
    return {prefix}


@pytest.mark.parametrize("name", FILES)
def test_files_are_valid_json(name: str) -> None:
    """A trailing comma here breaks the integration at load, not at lint."""
    assert load(name)


def test_all_three_files_carry_the_same_keys() -> None:
    """A missing key is a silent fallback, never an error."""
    base = key_paths(load("strings.json"))
    for name in FILES[1:]:
        assert key_paths(load(name)) == base, name


@pytest.mark.parametrize("name", FILES)
def test_every_key_segment_satisfies_hassfest(name: str) -> None:
    """The rule that failed this repo's first hassfest run.

    An enum sensor's options double as translation keys, so declaring
    `options=["A", "B", "C", "D"]` produced `entity.sensor.water_quality.state.A`
    — rejected by hassfest, and by nothing else in the local gate.
    """
    offenders = [
        f"{path} -> {segment}"
        for path in key_paths(load(name))
        for segment in path.split(".")
        if not KEY_RE.fullmatch(segment)
    ]
    assert not offenders, offenders


def test_every_entity_has_an_icon() -> None:
    """A missing icons.json entry falls back to a generic domain icon."""
    strings = load("strings.json")["entity"]
    icons = json.loads((DOMAIN_DIR / "icons.json").read_text())["entity"]
    for platform in strings:
        assert set(strings[platform]) == set(icons[platform]), platform


def test_no_hardcoded_icons_in_python() -> None:
    """`_attr_icon` fails the icon-translations rule; icons.json is the home."""
    for module in DOMAIN_DIR.glob("*.py"):
        assert "_attr_icon" not in module.read_text(encoding="utf-8"), module.name


def test_german_uses_du_not_sie() -> None:
    """Portfolio-wide rule, and nothing else enforces it."""
    german = (DOMAIN_DIR / "translations" / "de.json").read_text(encoding="utf-8")
    assert not re.findall(r"\b(Sie|Ihre[nmrs]?|Ihnen)\b", german)


def test_enum_options_match_their_translation_states() -> None:
    """An enum sensor may only report a state it declared AND translated.

    Declaring an option with no matching state string shows the raw slug in
    the UI; translating a state that is not a declared option is dead copy.
    """
    from custom_components.badegewaesser_austria.sensor import SENSORS

    declared = {
        description.key: set(description.options or ())
        for description in SENSORS
        if description.options
    }
    assert declared, "expected at least one enum sensor"

    strings = load("strings.json")["entity"]["sensor"]
    for key, options in declared.items():
        assert set(strings[key]["state"]) == options, key


def test_every_translated_message_is_non_empty() -> None:
    """An empty string renders as a blank label, which reads as a bug."""
    for name in FILES:
        for path in key_paths(load(name)):
            node: Any = load(name)
            for segment in path.split("."):
                node = node[segment]
            assert isinstance(node, str) and node.strip(), f"{name}: {path}"
