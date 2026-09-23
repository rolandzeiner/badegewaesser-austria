"""Constants for the Badegewässer Austria integration.

Data source: AGES — Österreichische Agentur für Gesundheit und
Ernährungssicherheit GmbH, CC BY 3.0 AT.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from homeassistant.const import __version__ as _HA_VERSION

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

# ---------------------------------------------------------------------------
# Bundled Lovelace card
# ---------------------------------------------------------------------------

CARD_FILENAME: Final = "badegewaesser-austria-card.js"

# Serving the `www` subdirectory itself keeps the public URL flat — the card
# lives at /badegewaesser_austria/<file>, with no /www segment leaking into a
# URL users will see in their Lovelace resources list.
URL_BASE: Final = f"/{DOMAIN}"
CARD_URL: Final = f"{URL_BASE}/{CARD_FILENAME}"

# ---------------------------------------------------------------------------
# Upstream
# ---------------------------------------------------------------------------

API_URL: Final = "https://www.ages.at/typo3temp/badegewaesser_db.json"

# Identify ourselves properly rather than hiding behind HA's default
# clientsession UA: it lets AGES traffic-shape or contact *this* integration
# specifically instead of blanket-blocking every HA instance. HA convention is
# "HomeAssistant/{ver} {slug}/{ver}"; the trailing "(+<repo-url>)" follows the
# RFC 9110 product-token-comment convention so the operator has a contact
# point without having to guess the repo.
USER_AGENT: Final = (
    f"HomeAssistant/{_HA_VERSION} {DOMAIN}/{INTEGRATION_VERSION} "
    f"(+https://github.com/rolandzeiner/badegewaesser-austria)"
)

# --- Upstream capabilities, measured 2026-09-22 ----------------------------
#   https://www.ages.at/typo3temp/badegewaesser_db.json
#   Compression: honoured (gzip). 312348 B identity -> 24055 B wire (13.0x).
#   Auth: none. Rate limit: none advertised — no RateLimit-*, no Retry-After.
#   Cache-Control: max-age=0.  ETag: ABSENT.
#
#   Conditional GET: DO NOT IMPLEMENT IT. There is no usable conditional GET
#   here, and this is the one measurement on this endpoint that is easy to get
#   wrong, because the tooling actively disagrees.
#
#   `api-polling/scripts/probe_endpoint.py` reports
#       Conditional GET: verdict WORKS, If-Mod-Since -> 304: True
#   and recommends storing the validator. That verdict is an artefact of the
#   probe's own timing: all seven of its requests land inside one regeneration
#   window, so of course the 304 fires.
#
#   What is actually happening: the typo3temp file is REGENERATED EVERY ~10
#   MINUTES whether or not anything changed. Measured here on 2026-09-22:
#       16:17:51Z  Last-Modified 16:10:03Z  VERSION "121623"
#       16:39:18Z  Last-Modified 16:30:02Z  VERSION "121625"
#       16:51:13Z  replayed the 16:30:02Z validator -> HTTP 200, full 24 KB
#                  Last-Modified now 16:50:03Z, VERSION "121627"
#                  raw bytes differ; VERSION-stripped digests IDENTICAL
#   The third line is the one that settles it: a validator only 21 MINUTES
#   OLD — far younger than any interval this integration would ever poll at —
#   comes back 200 with the whole body, over content that had not changed at
#   all. The counter advanced +4 across 34 minutes: one regeneration per 10
#   minutes. So `Last-Modified` churns faster than any sane poll interval and
#   a 304 can never fire at 6 h or 24 h. Storing an `If-Modified-Since` would
#   buy nothing and cost a validator store, a cache, and a branch that is
#   never taken.
#
#   `VERSION` is a REGENERATION COUNTER, not a content version — it increments
#   across a byte-identical payload, so it is not a change signal either. Note
#   it is serialised as a STRING (`"VERSION":"121625"`), not an int.
#
#   The only honest change signal is a content hash of the payload with
#   VERSION stripped (api-polling §5). That saves the parse of a 312 KB
#   document, the storage writes and the state churn — NOT bytes. 24 KB
#   arrives either way, which is fine at this cadence.
#
#   Re-probe with api-polling/scripts/probe_endpoint.py before changing any of
#   the above — but read this whole block first, because the probe alone will
#   tell you to add the validator back.
# ---------------------------------------------------------------------------

# Strips the regeneration counter so the digest reflects content only. Anchored
# on the quoted form because upstream serialises it as a string; a `\d+`
# pattern without the quotes silently matches nothing and every poll then looks
# like a change. `VERSION` occurs exactly once in the document (measured), so
# `count=1` is safe and keeps the substitution O(1) in matches.
VERSION_FIELD_PATTERN: Final = r'"VERSION"\s*:\s*"[^"]*"\s*,'

# ---------------------------------------------------------------------------
# Season
# ---------------------------------------------------------------------------

# THE LEGAL BATHING SEASON, and the only thing the `Badesaison` sensor may
# report. Austria's Badegewässerverordnung § 4 is explicit:
#
#   "Die Badesaison ist der Zeitraum vom 15. Juni bis 31. August eines jeden
#    Kalenderjahres."
#   https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20006509
#
# This was 15 May - 30 September until 2026-09-22, which is the GERMAN
# definition (BadegewVO) applied to an Austrian integration by mistake. The
# visible symptom was the card cheerfully reporting "Badesaison läuft" on
# 22 September, five weeks after the last sample of the year.
#
# The live document corroborates the statute almost exactly: of 1362 samples,
# ZERO fall after 31 August, and exactly 260 fall before 15 June — one per
# bathing water, which is the pre-season sample Anlage 3 requires ("Kurz vor
# Beginn jeder Badesaison ist eine Probenahme vorzunehmen"). The data was
# saying this all along.
SEASON_START_MONTH: Final = 6
SEASON_START_DAY: Final = 15
SEASON_END_MONTH: Final = 8
SEASON_END_DAY: Final = 31

# THE MONITORING WINDOW — when readings can actually arrive, which is wider
# than the legal season at the front because of that mandated pre-season
# sample. Measured: samples span 26 May to 31 August, and the pre-season ones
# run 26 May to 10 June.
#
# Deliberately a second window rather than reusing the one above. The two
# answer different questions — "may one swim" versus "can the data move" — and
# collapsing them is what produced the bug: either the sensor lies in
# September, or the poll sleeps through the pre-season sample. Both end on
# 31 August, and both are justified above rather than chosen.
MONITORING_START_MONTH: Final = 5
MONITORING_START_DAY: Final = 15
MONITORING_END_MONTH: Final = 8
MONITORING_END_DAY: Final = 31

# ---------------------------------------------------------------------------
# Poll cadence
# ---------------------------------------------------------------------------

# In season. Samples arrive every ~20 days per site (measured: median 20,
# p10 14, p90 21, max 42 across 1102 consecutive-sample gaps), so 6 h is
# already far faster than the data moves. The justification is not sample
# freshness but TGESPERRT — an acute closure that can be posted any day
# during the season and is the one thing a bather needs promptly.
DEFAULT_SCAN_INTERVAL_SEASON_HOURS: Final = 6

# Out of season nothing can change at all: no samples are taken and the annual
# rating is already fixed. 24 KB/day is a courtesy poll that keeps the entry
# alive and picks up the new annual rating when AGES publishes it.
DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS: Final = 24

# Enforced in the coordinator, not only in the options-flow hints — a user
# editing the entry directly must not be able to go below this.
MIN_POLL_HOURS: Final = 3
MAX_POLL_HOURS: Final = 168  # one week

# Spread installs so they do not all fire on the same wall-clock second. Added
# to every computed interval, not just the first, which also stops a fleet
# re-synchronising after a shared outage.
POLL_JITTER_SECONDS: Final = 600

# Exponential backoff on sustained failure: no penalty for a single miss, then
# double from the second consecutive failure, clamped at MAX_POLL_HOURS and
# reset on the next success.
BACKOFF_AFTER_FAILURES: Final = 2

# ---------------------------------------------------------------------------
# Config / options keys
# ---------------------------------------------------------------------------

CONF_SITE_ID: Final = "site_id"
CONF_SCAN_INTERVAL_SEASON_HOURS: Final = "scan_interval_season_hours"
CONF_SCAN_INTERVAL_OFFSEASON_HOURS: Final = "scan_interval_offseason_hours"

# ---------------------------------------------------------------------------
# Data semantics
# ---------------------------------------------------------------------------

# `O_E` / `O_EC` carry a comparison operator rather than a value. The only
# non-null value observed across 1362 samples is "<N", which means the analyte
# was below the laboratory's detection limit — so `E=15, O_E="<N"` reads
# "<15", not "15". Publishing 15 as a measured count would be wrong.
BELOW_DETECTION_OPERATOR: Final = "<N"

# The EU Bathing Water Directive classes, best to worst, as AGES encodes them.
#
# The letter-to-meaning mapping is MEASURED, not assumed. AGES's own 2025
# report states that "251 (96,5 %) von 260 österreichischen Badestellen" were
# rated *ausgezeichnet*, and `QUALITAET_2025` in this document carries exactly
# 251 "A" values out of 260. That pins A = ausgezeichnet quantitatively, and
# the rest follow the Directive's four-class order (2006/7/EC: ausgezeichnet /
# gut / ausreichend / mangelhaft).
#
# Worth knowing before "correcting" this: the per-site AGES page also prints a
# line reading "Einhaltung der Richtwerte, Wasser guter Qualität" next to a
# site whose QUALITAET_* is "A". That is a different statement (compliance
# with guideline values) on a different axis, and reading it as the annual
# class is how you end up mapping A to "gut".
#
# Anything outside this set is NOT published as a rating: across the five
# year-columns the live document also carries a single "G" (2022) and a single
# "F" (2024) whose meaning AGES does not document anywhere found. They are
# kept verbatim in the `rating_raw` attribute rather than guessed at.
RATING_CLASSES: Final = ("A", "B", "C", "D")

# Home Assistant enum states double as translation keys, and hassfest enforces
# `[a-z0-9-_]+` on those — so the bare letters cannot be the state. Naming the
# class outright is better anyway: "excellent" says what "A" means to somebody
# who has never read the Directive. The original letter stays on the entity as
# the `rating_class` attribute for anyone who knows the AGES notation.
RATING_STATES: Final = {
    "A": "excellent",
    "B": "good",
    "C": "sufficient",
    "D": "poor",
}

# The per-sample `A` field, distinct from the annual class above, is published
# as the raw integer because the available sources disagree about what it
# means and none of them is AGES documentation:
#
#   * Observed in the live document: 1 (1282x), 2 (73x), 3 (7x). No 4.
#   * The AGES per-site page legend shows THREE per-measurement categories —
#     "Ausgezeichnete", "Gute" and "Mangelhafte Badegewässerqualität".
#   * A third-party Home Assistant tutorial (zeitwesentech.com, 2026) states
#     "1=Ausgezeichnet, 4=Baden verboten", i.e. a FOUR-level scale.
#
# Three categories or four, and no authority for the middle values. A 4 may
# simply never have occurred — TGESPERRT is "0" on all 260 sites, so nothing
# is currently prohibited. Publishing the number AGES publishes is the only
# option here that cannot be wrong; translating it into words would mean
# picking a side in a disagreement this integration cannot settle.
#
# The same tutorial independently corroborates D = sample date, S = Sichttiefe
# in metres, E = intestinal enterococci and E_C = E. coli, which is a useful
# second source for the field meanings this parser relies on.
SAMPLE_ASSESSMENT_IS_UNDOCUMENTED: Final = True

# The per-year rating columns, matched against the WHOLE key (`re.fullmatch`)
# and discovered from the document rather than listed here. This was a fixed
# (2026, ..., 2022) tuple until 2026-09-23, which would have stopped reading
# new ratings the day AGES published a year it did not name: `QUALITAET_2027`
# would have been ignored and the sensor would have kept reporting 2026's
# class as current, with nothing anywhere to say so.
#
# `WASSERQUALITAET_JAHR_*` must NOT match. Those columns duplicate the matching
# `QUALITAET_<year>` letter (verified byte-equal on all 260 sites) under
# relative names — HEUER, VORIGES, VOR_VORIGES — so they carry no year and
# are ignored entirely.
RATING_KEY_PATTERN: Final = r"QUALITAET_(\d{4})"

# Positions for sites whose upstream coordinates are "0"/"0", taken from the
# site's own bathing-water profile (section 1.18, "Koordinaten der
# Probenahmestelle im Bezugssystem ETRS89" — within a metre of WGS84 here).
# Used only while upstream sends no position, so an upstream fix wins
# automatically. Measured 2026-09-23: this is the only such site of 260.
#   https://www.ages.at/fileadmin/badegewaesser/pdf/AT3230004400240040.pdf
COORDINATE_FALLBACKS: Final[dict[str, tuple[float, float]]] = {
    # Wolfgangsee, St. Gilgen - Gamsjaga
    "AT3230004400240040": (47.7489768867, 13.4191829076),
}

# Upstream sends 0 for an unmeasured water temperature. Two of 1362 samples do
# this, in months when an Austrian lake cannot be at 0 °C, so it is a sentinel
# and not a reading. Sichttiefe has no such sentinel (its minimum is 0.1 m).
UNMEASURED_TEMPERATURE: Final = 0.0

# On-screen attribution. CC BY 3.0 AT asks for attribution "in the manner
# specified by the author"; naming AGES and the licence does that, and AGES is
# how the agency names itself. The full legal name is spelled out once in the
# README's Attribution section, where there is room for it — in a card footer
# it wrapped to two lines and pushed the licence onto the second.
ATTRIBUTION: Final = "Datenquelle: AGES · CC BY 3.0 AT"
