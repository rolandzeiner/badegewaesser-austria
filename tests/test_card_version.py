"""Invariant: the card version must match the manifest and the TS bundle.

Three places carry the version: `manifest.json`, `src/const.ts`, and
`const.py` (which reads `manifest.json` at import). The tests below derive
the expected value from `manifest.json` directly, so a `const.py` that
aliases a stale constant cannot fool them.

If these drift, HA's frontend WebSocket check sees a mismatch, shows a reload
banner, the reload re-serves the same mismatched JS, and the banner reappears
— an infinite loop for every user on a cached card.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from custom_components.badegewaesser_austria.const import (
    CARD_VERSION,
    INTEGRATION_VERSION,
)

_REPO_ROOT = Path(__file__).parent.parent
_TS_CONST = _REPO_ROOT / "src" / "const.ts"
_MANIFEST = _REPO_ROOT / "custom_components" / "badegewaesser_austria" / "manifest.json"

# `\b` on both sides so the pattern cannot match inside a longer name such as
# `RETRO_CARD_VERSION` if this repo ever grows a second card — `_` is a regex
# word character, so there is no boundary between it and `C`.
_CARD_PATTERN = re.compile(r'\bCARD_VERSION\b\s*=\s*"([^"]+)"')


def _expected_version() -> str:
    """The authoritative version string, read straight from the manifest."""
    return json.loads(_MANIFEST.read_text(encoding="utf-8"))["version"]


def test_integration_version_matches_manifest() -> None:
    """`INTEGRATION_VERSION` must equal `manifest.json::version` byte-for-byte."""
    expected = _expected_version()
    assert expected == INTEGRATION_VERSION, (
        f"INTEGRATION_VERSION drift: const.py={INTEGRATION_VERSION!r} vs "
        f"manifest.json={expected!r} — const.py should derive from the manifest"
    )


def test_card_version_aliases_integration_version() -> None:
    """`CARD_VERSION` is in lockstep with `INTEGRATION_VERSION`."""
    assert CARD_VERSION == INTEGRATION_VERSION, (
        f"CARD_VERSION drift: {CARD_VERSION!r} vs "
        f"INTEGRATION_VERSION={INTEGRATION_VERSION!r} — CARD_VERSION should "
        "alias INTEGRATION_VERSION, not carry its own string"
    )


def test_card_version_matches_ts() -> None:
    """`src/const.ts:CARD_VERSION` must equal the manifest version."""
    expected = _expected_version()
    assert _TS_CONST.is_file(), f"expected TS const module at {_TS_CONST}"
    match = _CARD_PATTERN.search(_TS_CONST.read_text(encoding="utf-8"))
    assert match is not None, (
        f"CARD_VERSION literal not found in {_TS_CONST}; the regex may be stale"
    )
    assert match.group(1) == expected, (
        f"CARD_VERSION drift: src/const.ts={match.group(1)!r} vs "
        f"manifest.json={expected!r} — bump both in the same commit"
    )
