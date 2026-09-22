/**
 * Card-side constants.
 *
 * CARD_VERSION must equal `version` in
 * custom_components/badegewaesser_austria/manifest.json byte-for-byte.
 * `tests/test_card_version.py` enforces the parity in CI. If the two drift,
 * the WebSocket version check sees a mismatch, shows the reload banner, the
 * reload re-serves the same JS, and the banner comes straight back — an
 * infinite loop for every HACS user.
 */
export const CARD_VERSION = "0.1.0";

export const CARD_TAG = "badegewaesser-austria-card";
