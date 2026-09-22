"""Constants for the Badegewässer Austria integration.

The measured upstream-capability block (compression, conditional GET, the
10-minute regeneration trap) lands here in Phase 2, alongside the cadence
constants. Phase 1 declares only what the skeleton needs.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

DOMAIN: Final = "badegewaesser_austria"

# Single source of truth for the version. `manifest.json` is read at import
# time so there is exactly one place to edit on a release: bump the manifest
# and `src/const.ts`, and everything Python-side follows.
_MANIFEST: Final[dict[str, str]] = json.loads(
    (Path(__file__).parent / "manifest.json").read_text(encoding="utf-8")
)

INTEGRATION_VERSION: Final[str] = _MANIFEST["version"]

# The bundled Lovelace card carries the same version as the integration.
# `tests/test_card_version.py` asserts this equals `CARD_VERSION` in
# src/const.ts byte-for-byte — a drift there is the infinite reload-banner
# bug.
CARD_VERSION: Final[str] = INTEGRATION_VERSION
