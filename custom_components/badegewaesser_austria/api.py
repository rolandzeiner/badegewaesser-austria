"""HTTP client and data model for the AGES bathing-water document.

One request returns every one of the 260 EU-designated Austrian bathing
waters, so there is exactly one endpoint and exactly one fetch per poll no
matter how many config entries exist.

Read the measured-capabilities block in `const.py` before changing anything
about caching here. The short version: there is no usable conditional GET,
the probe script will tell you there is, and the probe is wrong.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import date
from typing import Any, Final

import aiohttp

_LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Upstream
# ---------------------------------------------------------------------------
# Nothing here may import Home Assistant or the rest of the package; the
# guard in tests/test_api.py fails on any such import. The User-Agent is
# therefore a parameter: it comes from const.py, which needs HA's version.

API_URL: Final = "https://www.ages.at/typo3temp/badegewaesser_db.json"

# Strips the regeneration counter so the digest reflects content only. Anchored
# on the quoted form because upstream serialises it as a string; a `\d+`
# pattern without the quotes silently matches nothing and every poll then looks
# like a change. `VERSION` occurs exactly once in the document (measured), so
# `count=1` is safe and keeps the substitution O(1) in matches.
VERSION_FIELD_PATTERN: Final = r'"VERSION"\s*:\s*"[^"]*"\s*,'

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

# ---------------------------------------------------------------------------

_TIMEOUT: Final = aiohttp.ClientTimeout(total=30)
_VERSION_RE: Final = re.compile(VERSION_FIELD_PATTERN.encode())
_RATING_KEY_RE: Final = re.compile(RATING_KEY_PATTERN)

# 16 bytes is ample for change detection on a single document and costs about
# a millisecond on 312 KB. This is not a security boundary.
_DIGEST_SIZE: Final = 16


class BadegewaesserApiError(Exception):
    """Upstream could not be read or understood.

    A plain exception, so this module stays free of Home Assistant. It carries
    the translation key so both callers can do the right thing: the
    coordinator re-raises it as a translated `UpdateFailed`, the config flow
    turns it into a form error. `status` is the HTTP status when the server
    answered with one, so the outage tracker can tell a 5xx from a 404.
    """

    def __init__(
        self, translation_key: str, detail: str, *, status: int | None = None
    ) -> None:
        """Store the key, a developer-facing detail string and the status."""
        super().__init__(f"{translation_key}: {detail}")
        self.translation_key = translation_key
        self.detail = detail
        self.status = status


@dataclass(frozen=True, slots=True)
class Sample:
    """One laboratory sample taken at a bathing site."""

    sampled_on: date
    enterococci: int
    enterococci_below_limit: bool
    e_coli: int
    e_coli_below_limit: bool
    # None when upstream sent the 0 sentinel rather than a reading.
    water_temperature: float | None
    secchi_depth: float | None
    assessment: int


@dataclass(frozen=True, slots=True)
class Units:
    """Unit strings as the upstream declares them, per site.

    Uniform across all 260 sites when measured (KBE/100ml, KBE/100ml, °C, m),
    but read per site rather than hardcoded so a divergence shows up as data
    instead of as a silent mislabel.
    """

    enterococci: str
    e_coli: str
    water_temperature: str
    secchi_depth: str


@dataclass(frozen=True, slots=True)
class Contact:
    """The authority responsible for a bathing site."""

    authority: str
    street: str
    postcode_city: str
    phone: str
    email: str


@dataclass(frozen=True, slots=True)
class BathingSite:
    """One EU-designated bathing water, with its season's samples."""

    site_id: str
    name: str
    bundesland: str
    district: str
    municipality: str
    # None when upstream has no usable position. One site ("Wolfgangsee,
    # St. Gilgen - Gamsjaga") ships LONGITUDE/LATITUDE of "0", which is Null
    # Island rather than a coordinate — see `_parse_coordinate`. That one is
    # filled from its profile instead; see `COORDINATE_FALLBACKS`.
    latitude: float | None
    longitude: float | None
    contact: Contact
    closed: bool
    closure_reason: str | None
    # First rating in RATING_CLASSES walking newest year first, with the year
    # it came from. None when no year carries a classified rating.
    rating: str | None
    rating_year: int | None
    # First NON-EMPTY letter walking newest year first, whatever it was. Equal
    # to `rating` for every site measured; differs only where upstream carries
    # an unclassified letter such as "F" or "G".
    rating_raw: str | None
    rating_raw_year: int | None
    units: Units
    # Newest first.
    samples: tuple[Sample, ...]

    @property
    def latest_sample(self) -> Sample | None:
        """The most recent sample, or None if the site has never been sampled."""
        return self.samples[0] if self.samples else None


def base_request_headers(user_agent: str) -> dict[str, str]:
    """Headers for every outbound call, coordinator and config flow alike.

    `Accept-Encoding` is deliberately ABSENT. aiohttp already negotiates
    `gzip, deflate, zstd` on Python 3.14, and setting the header here would
    REPLACE that offer rather than extend it — pinning `"gzip"` is a
    downgrade. Several repos in this portfolio carry that bug; this one does
    not, and `tests/test_api.py` asserts the key stays absent so a
    well-meaning edit trips CI.
    """
    return {
        "User-Agent": user_agent,
        "Accept": "application/json",
    }


def _as_str(raw: Any) -> str:
    """Coerce an upstream scalar to a stripped string."""
    return "" if raw is None else str(raw).strip()


def _as_float(raw: Any) -> float | None:
    """Coerce an upstream scalar to a float, or None if it is not numeric."""
    if isinstance(raw, bool) or raw is None:
        return None
    if isinstance(raw, int | float):
        return float(raw)
    try:
        return float(str(raw).replace(",", "."))
    except ValueError:
        return None


def _as_int(raw: Any, default: int = 0) -> int:
    """Coerce an upstream scalar to an int, falling back to `default`."""
    value = _as_float(raw)
    return default if value is None else int(value)


def _parse_coordinate(raw: Any) -> float | None:
    """Parse a WGS84 degree value, rejecting the Null Island sentinel.

    Upstream sends the string "0" for a site whose position it does not have.
    Taken literally that places the site in the Gulf of Guinea, roughly 5000 km
    from Austria — which would quietly win any "nearest bathing water" ranking.
    Exactly one of the 260 sites is in this state (measured 2026-09-22), and
    the honest representation is "no position", not (0, 0).
    """
    value = _as_float(raw)
    if value is None or value == 0.0:
        return None
    return value


def _parse_sample_date(raw: Any) -> date | None:
    """Parse upstream's `dd.mm.yyyy` into a calendar date.

    Split rather than `datetime.strptime`: a sample date is a calendar date,
    not an instant, so there is no timezone to attach and no reason to build a
    datetime only to throw the time away.
    """
    parts = _as_str(raw).split(".")
    if len(parts) != 3:
        return None
    try:
        day, month, year = (int(part) for part in parts)
        return date(year, month, day)
    except ValueError:
        return None


def _parse_sample(raw: dict[str, Any]) -> Sample | None:
    """Build a `Sample`, or None if it carries no usable date."""
    sampled_on = _parse_sample_date(raw.get("D"))
    if sampled_on is None:
        return None

    temperature = _as_float(raw.get("W"))
    if temperature == UNMEASURED_TEMPERATURE:
        # Upstream's "not measured" sentinel. An Austrian bathing lake is not
        # at 0.0 °C in July, and publishing it as a temperature would be the
        # same class of error as publishing a below-detection count as a
        # measured one.
        temperature = None

    return Sample(
        sampled_on=sampled_on,
        enterococci=_as_int(raw.get("E")),
        enterococci_below_limit=_as_str(raw.get("O_E")) == BELOW_DETECTION_OPERATOR,
        e_coli=_as_int(raw.get("E_C")),
        e_coli_below_limit=_as_str(raw.get("O_EC")) == BELOW_DETECTION_OPERATOR,
        water_temperature=temperature,
        secchi_depth=_as_float(raw.get("S")),
        assessment=_as_int(raw.get("A")),
    )


def _resolve_rating(
    raw: dict[str, Any],
) -> tuple[str | None, int | None, str | None, int | None]:
    """Resolve the annual EU rating, newest year first.

    Returns `(rating, rating_year, rating_raw, rating_raw_year)`.

    Two separate answers because upstream gives two separate facts:

    * The current year's column is EMPTY until AGES publishes the annual
      assessment after the season ends — all 260 sites had an empty
      `QUALITAET_2026` on 2026-09-22 — so the newest *usable* rating is
      normally last year's. A sensor that went unknown all winter would be
      wrong; the 2025 rating is still the rating in force.
    * A letter outside A-D is not a classification we can publish as one. The
      live document carries a single "G" and a single "F" whose meaning AGES
      does not document. Skipping to the next year keeps the sensor honest,
      and `rating_raw` keeps the actual letter visible instead of discarding
      it.

    The years are whatever `QUALITAET_<year>` columns the document carries,
    newest first — see `RATING_KEY_PATTERN` for why they are not listed.
    """
    rating: str | None = None
    rating_year: int | None = None
    rating_raw: str | None = None
    rating_raw_year: int | None = None

    columns = sorted(
        (
            (int(match.group(1)), cell)
            for key, cell in raw.items()
            if (match := _RATING_KEY_RE.fullmatch(key))
        ),
        key=lambda column: column[0],
        reverse=True,
    )
    for year, cell in columns:
        value = _as_str(cell).upper()
        if not value:
            continue
        if rating_raw is None:
            rating_raw, rating_raw_year = value, year
        if value in RATING_CLASSES:
            rating, rating_year = value, year
            break

    return rating, rating_year, rating_raw, rating_raw_year


def _parse_site(raw: dict[str, Any], bundesland: str) -> BathingSite | None:
    """Build a `BathingSite`, or None if it has no usable identity."""
    site_id = _as_str(raw.get("BADEGEWAESSERID"))
    name = _as_str(raw.get("BADEGEWAESSERNAME"))
    if not site_id or not name:
        return None

    samples = sorted(
        (
            sample
            for entry in raw.get("MESSWERTE") or ()
            if isinstance(entry, dict) and (sample := _parse_sample(entry)) is not None
        ),
        key=lambda sample: sample.sampled_on,
        reverse=True,
    )

    rating, rating_year, rating_raw, rating_raw_year = _resolve_rating(raw)
    closure_reason = _as_str(raw.get("SPERRGRUND"))

    latitude = _parse_coordinate(raw.get("LATITUDE"))
    longitude = _parse_coordinate(raw.get("LONGITUDE"))
    if (latitude is None or longitude is None) and site_id in COORDINATE_FALLBACKS:
        latitude, longitude = COORDINATE_FALLBACKS[site_id]

    return BathingSite(
        site_id=site_id,
        name=name,
        bundesland=bundesland,
        district=_as_str(raw.get("BEZIRK")),
        municipality=_as_str(raw.get("GEMEINDE")),
        latitude=latitude,
        longitude=longitude,
        contact=Contact(
            authority=_as_str(raw.get("ANSPRECHSTELLE")),
            street=_as_str(raw.get("STRASSE_NUMMER")),
            postcode_city=_as_str(raw.get("PLZ_ORT")),
            phone=_as_str(raw.get("TELEFON")),
            email=_as_str(raw.get("EMAIL")),
        ),
        # Upstream sends "0" / "1" as STRINGS, not booleans. Anything that is
        # not a plain "0" counts as closed: erring towards "closed" is the
        # safe direction for a swimming advisory.
        closed=_as_str(raw.get("TGESPERRT")) not in ("", "0"),
        closure_reason=closure_reason or None,
        rating=rating,
        rating_year=rating_year,
        rating_raw=rating_raw,
        rating_raw_year=rating_raw_year,
        units=Units(
            enterococci=_as_str(raw.get("ENTEROKOKKEN_EINHEIT")),
            e_coli=_as_str(raw.get("E_COLI_EINHEIT")),
            water_temperature=_as_str(raw.get("WASSERTEMPERATUR_EINHEIT")),
            secchi_depth=_as_str(raw.get("SICHTTIEFE_EINHEIT")),
        ),
        samples=tuple(samples),
    )


def parse_document(payload: Any) -> dict[str, BathingSite]:
    """Turn the decoded document into sites keyed by BADEGEWAESSERID.

    Raises `BadegewaesserApiError` if the document has no recognisable shape
    at all; tolerates individual malformed sites by skipping them, because one
    bad row in a 260-row third-party feed should not take the integration down
    for everybody.
    """
    if not isinstance(payload, dict):
        raise BadegewaesserApiError(
            "malformed_payload",
            f"top level is {type(payload).__name__}, expected object",
        )

    regions = payload.get("BUNDESLAENDER")
    if not isinstance(regions, list):
        raise BadegewaesserApiError(
            "malformed_payload", "document has no BUNDESLAENDER list"
        )

    sites: dict[str, BathingSite] = {}
    for region in regions:
        if not isinstance(region, dict):
            continue
        bundesland = _as_str(region.get("BUNDESLAND"))
        for entry in region.get("BADEGEWAESSER") or ():
            if not isinstance(entry, dict):
                continue
            site = _parse_site(entry, bundesland)
            if site is not None:
                sites[site.site_id] = site

    if not sites:
        raise BadegewaesserApiError(
            "malformed_payload", "document contained no usable bathing waters"
        )
    return sites


def content_digest(raw: bytes) -> str:
    """Digest of the payload with the regeneration counter removed.

    The upstream file is rewritten every ~10 minutes whether or not anything
    changed, and each rewrite bumps `VERSION`. Hashing the raw bytes would
    therefore report a change on every single poll. Stripping `VERSION` first
    makes the digest a genuine content signal.

    This saves the parse, the state writes and the downstream recomputation —
    NOT bytes. The 24 KB arrives either way.
    """
    return hashlib.blake2b(
        _VERSION_RE.sub(b"", raw, count=1), digest_size=_DIGEST_SIZE
    ).hexdigest()


class BadegewaesserClient:
    """Fetches and parses the AGES document.

    Holds the last digest so an unchanged document short-circuits before the
    JSON parse. Instantiated once per HA instance and shared by every config
    entry — see `coordinator.py`.
    """

    def __init__(self, session: aiohttp.ClientSession, user_agent: str) -> None:
        """Store the injected client session and the User-Agent to send."""
        self._session = session
        self._user_agent = user_agent
        self._digest: str | None = None
        self.upstream_version: str | None = None
        # The DECODED size — aiohttp has already undone the gzip by the time
        # `read()` returns, so this is ~312 KB, not the ~24 KB on the wire.
        # It was called `last_wire_bytes` until 2026-09-23, which made the
        # diagnostics dump overstate the transfer thirteen-fold.
        self.last_payload_bytes: int | None = None

    @property
    def digest(self) -> str | None:
        """Digest of the last document that was actually parsed."""
        return self._digest

    def reset_cache(self) -> None:
        """Forget the digest so the next fetch definitely re-parses."""
        self._digest = None

    async def async_fetch(self) -> dict[str, BathingSite] | None:
        """Fetch the document. Returns None when the content is unchanged.

        No validator is sent — see the measured block in `const.py`. The
        caller keeps its previous snapshot on a None result.
        """
        try:
            async with self._session.get(
                API_URL,
                headers=base_request_headers(self._user_agent),
                timeout=_TIMEOUT,
            ) as response:
                if response.status != 200:
                    raise BadegewaesserApiError(
                        "invalid_response",
                        f"HTTP {response.status}",
                        status=response.status,
                    )
                raw = await response.read()
        except TimeoutError as err:
            raise BadegewaesserApiError("cannot_connect", "request timed out") from err
        except aiohttp.ClientError as err:
            raise BadegewaesserApiError("cannot_connect", str(err)) from err

        self.last_payload_bytes = len(raw)
        digest = content_digest(raw)
        if digest == self._digest:
            _LOGGER.debug(
                "Upstream document unchanged (digest %s); skipping parse", digest
            )
            return None

        try:
            payload = json.loads(raw)
        except ValueError as err:  # JSONDecodeError, and UnicodeDecodeError
            raise BadegewaesserApiError("malformed_payload", str(err)) from err

        sites = parse_document(payload)
        self._digest = digest
        if isinstance(payload, dict):
            self.upstream_version = _as_str(payload.get("VERSION")) or None
        _LOGGER.debug(
            "Parsed %d bathing waters (digest %s, upstream VERSION %s)",
            len(sites),
            digest,
            self.upstream_version,
        )
        return sites
