"""Model semantics — the places where upstream means something other than it says.

Four of these encode a measurement, not a guess. Each references what was seen
in the live document on 2026-09-22 so a future reader can tell the difference
between "this is how the data is" and "this is how somebody assumed it was".
"""

from __future__ import annotations

import json
from datetime import date

import pytest

from custom_components.badegewaesser_austria.api import parse_document
from tests.test_api import (
    CLOSED,
    NEVER_SAMPLED,
    NORMAL,
    NULL_ISLAND,
    UNRATED,
    ZERO_TEMPERATURE,
    fixture_bytes,
)


@pytest.fixture(name="sites")
def sites_fixture() -> dict[str, object]:
    """Parsed fixture document."""
    return parse_document(json.loads(fixture_bytes()))


def test_every_fixture_site_parses(sites: dict) -> None:
    """The fixture's six rows all survive parsing."""
    assert len(sites) == 6
    assert sites[NORMAL].bundesland == "Burgenland"
    assert sites[NULL_ISLAND].bundesland == "Salzburg"
    assert sites[ZERO_TEMPERATURE].bundesland == "Wien"


# --- below the detection limit ---------------------------------------------


def test_below_detection_limit_is_flagged_not_published_as_a_count(
    sites: dict,
) -> None:
    """`E=15, O_E='<N'` reads "<15", not "15".

    The operator column is the whole point: 901 of 1362 live E. coli samples
    carry it. Publishing 15 as a measured count would overstate contamination
    at sites that are actually clean.
    """
    sample = sites[NORMAL].latest_sample
    assert sample.enterococci_below_limit is True
    assert sample.e_coli_below_limit is True
    # The number is still carried — it is the limit, and the card renders "<15".
    assert sample.enterococci == 15
    assert sample.e_coli == 15


# --- the unmeasured-temperature sentinel -----------------------------------


def test_zero_water_temperature_is_treated_as_unmeasured(sites: dict) -> None:
    """Upstream sends 0 for "not measured", not for 0 °C.

    Two of 1362 live samples do this, both in the Neue Donau in late August.
    An Austrian bathing lake is not at 0.0 °C in August, so 0 is a sentinel.
    Publishing it would be the same class of error as publishing a
    below-detection count as a measured one.
    """
    zeroed = [
        sample
        for sample in sites[ZERO_TEMPERATURE].samples
        if sample.water_temperature is None
    ]
    assert zeroed, "fixture should carry at least one unmeasured temperature"
    # Everything else about that sample is still usable.
    assert zeroed[0].secchi_depth is not None
    assert zeroed[0].sampled_on.year == 2026


def test_real_temperatures_survive(sites: dict) -> None:
    """The sentinel check must not eat genuine readings."""
    assert sites[NORMAL].latest_sample.water_temperature == pytest.approx(26.2)


# --- coordinates -----------------------------------------------------------


def test_null_island_coordinates_become_no_position(sites: dict) -> None:
    """ "0"/"0" is missing data, not a location off West Africa.

    Exactly one of the 260 live sites is in this state. Taken literally it
    sits ~5000 km from Austria, which would quietly win any "nearest bathing
    water" ranking — so the config flow must be able to tell it apart from a
    real position.
    """
    site = sites[NULL_ISLAND]
    assert site.latitude is None
    assert site.longitude is None


def test_real_coordinates_are_parsed(sites: dict) -> None:
    """A normal site keeps its WGS84 position."""
    site = sites[NORMAL]
    assert site.latitude == pytest.approx(47.008287)
    assert site.longitude == pytest.approx(16.163253)


# --- annual rating ---------------------------------------------------------


def test_rating_falls_back_to_the_most_recent_published_year(sites: dict) -> None:
    """The current year is empty until AGES publishes after the season.

    All 260 live sites had an empty `QUALITAET_2026` on 2026-09-22. A sensor
    that went unknown for the whole winter would be wrong — last year's
    classification is still the classification in force.
    """
    site = sites[NORMAL]
    assert site.rating == "A"
    assert site.rating_year == 2025


def test_unclassified_letter_is_skipped_but_kept_visible(sites: dict) -> None:
    """A letter outside A-D is not published as a rating.

    The live document carries a single "G" (2022) and a single "F" (2024)
    whose meaning AGES does not document. Skipping to the next year keeps the
    enum sensor honest; `rating_raw` keeps the actual letter rather than
    discarding evidence.
    """
    site = sites[UNRATED]
    assert site.rating == "B"
    assert site.rating_year == 2024
    assert site.rating_raw == "G"
    assert site.rating_raw_year == 2025


def test_rating_raw_matches_rating_for_an_ordinary_site(sites: dict) -> None:
    """Which is the case for all 260 live sites today."""
    site = sites[NORMAL]
    assert site.rating_raw == site.rating
    assert site.rating_raw_year == site.rating_year


def test_site_with_no_rating_at_all() -> None:
    """Every year empty means no rating, not a crash."""
    payload = json.loads(fixture_bytes())
    row = payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]
    for year in (2022, 2023, 2024, 2025, 2026):
        row[f"QUALITAET_{year}"] = ""

    site = parse_document(payload)[NORMAL]
    assert site.rating is None
    assert site.rating_year is None
    assert site.rating_raw is None


# --- closure ---------------------------------------------------------------


def test_closure_is_read_from_a_string_flag(sites: dict) -> None:
    """`TGESPERRT` is the STRING "0"/"1", not a boolean.

    This row is synthetic on purpose: `TGESPERRT` was "0" on all 260 sites and
    `SPERRGRUND` empty everywhere when the fixture was recorded, so the
    closure path has never been exercised against live data. The parser is
    written against the documented shape, not against an observed closure.
    """
    site = sites[CLOSED]
    assert site.closed is True
    assert site.closure_reason == "Blaualgen — Badeverbot bis auf Widerruf"


def test_open_site_has_no_closure_reason(sites: dict) -> None:
    """An empty SPERRGRUND becomes None, not an empty string."""
    assert sites[NORMAL].closed is False
    assert sites[NORMAL].closure_reason is None


@pytest.mark.parametrize("flag", ["1", "true", "J", "2"])
def test_anything_but_zero_counts_as_closed(flag: str) -> None:
    """Err towards "closed" — the safe direction for a swimming advisory."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]["TGESPERRT"] = flag
    assert parse_document(payload)[NORMAL].closed is True


@pytest.mark.parametrize("flag", ["0", ""])
def test_zero_or_missing_counts_as_open(flag: str) -> None:
    """A blank flag is not a closure."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]["TGESPERRT"] = flag
    assert parse_document(payload)[NORMAL].closed is False


# --- samples ---------------------------------------------------------------


def test_samples_are_ordered_newest_first(sites: dict) -> None:
    """Everything downstream reads `samples[0]` as "the latest"."""
    dates = [sample.sampled_on for sample in sites[NORMAL].samples]
    assert dates == sorted(dates, reverse=True)
    assert sites[NORMAL].latest_sample.sampled_on == date(2026, 8, 20)


def test_site_without_samples_has_no_latest(sites: dict) -> None:
    """A never-sampled site must not raise on `latest_sample`."""
    site = sites[NEVER_SAMPLED]
    assert site.samples == ()
    assert site.latest_sample is None


def test_unparseable_sample_date_drops_only_that_sample() -> None:
    """One bad date should not cost the site its other readings."""
    payload = json.loads(fixture_bytes())
    row = payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]
    original = len(row["MESSWERTE"])
    row["MESSWERTE"][0]["D"] = "not-a-date"

    site = parse_document(payload)[NORMAL]
    assert len(site.samples) == original - 1


def test_units_are_read_per_site_not_hardcoded(sites: dict) -> None:
    """Uniform across all 260 live sites, but read rather than assumed."""
    units = sites[NORMAL].units
    assert units.water_temperature == "°C"
    assert units.secchi_depth == "m"
    assert units.e_coli == "KBE/100ml"
    assert units.enterococci == "KBE/100ml"


# --- defensive coercion ----------------------------------------------------
#
# These branches exist because this is a 312 KB third-party document that
# nobody here controls. Untested defensive code is just code that has never
# run, so each path is exercised rather than merely present.


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (26.2, 26.2),
        (26, 26.0),
        ("26,2", 26.2),  # German decimal comma
        ("26.2", 26.2),
        (None, None),
        (True, None),  # bool is an int subclass — must not become 1.0
        ("n/a", None),
        ("", None),
    ],
)
def test_numeric_coercion(raw: object, expected: float | None) -> None:
    """Upstream numbers arrive as int, float or string depending on the field."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]["MESSWERTE"][0]["S"] = raw

    depth = parse_document(payload)[NORMAL].samples[0].secchi_depth
    if expected is None:
        assert depth is None
    else:
        assert depth == pytest.approx(expected)


@pytest.mark.parametrize(
    "raw", ["", "not-a-date", "20.08", "20.08.2026.1", "99.99.9999", "0.0.0"]
)
def test_unusable_sample_dates_are_dropped(raw: str) -> None:
    """A sample with no readable date cannot be placed in the series."""
    payload = json.loads(fixture_bytes())
    row = payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]
    original = len(row["MESSWERTE"])
    row["MESSWERTE"][0]["D"] = raw

    assert len(parse_document(payload)[NORMAL].samples) == original - 1


@pytest.mark.parametrize("raw", ["0", 0, 0.0, "", None, "abc"])
def test_unusable_coordinates_become_no_position(raw: object) -> None:
    """Anything that is not a real degree value means "no position"."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"][0]["LATITUDE"] = raw

    assert parse_document(payload)[NORMAL].latitude is None


def test_non_dict_regions_are_skipped() -> None:
    """A junk region must not take the rest of the document with it."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"].insert(0, "not a region")
    payload["BUNDESLAENDER"].insert(0, None)

    assert NORMAL in parse_document(payload)


def test_document_with_zero_usable_sites_raises() -> None:
    """A well-formed but empty document is an error, not an empty result.

    Silently publishing "no bathing waters exist" would make the config flow
    look broken rather than the upstream.
    """
    from custom_components.badegewaesser_austria.api import BadegewaesserApiError

    with pytest.raises(BadegewaesserApiError) as err:
        parse_document({"BUNDESLAENDER": []})
    assert err.value.translation_key == "malformed_payload"


def test_site_without_an_id_is_skipped() -> None:
    """No stable identity means no config entry could ever point at it."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"].append(
        {"BADEGEWAESSERNAME": "Namenlos", "BADEGEWAESSERID": ""}
    )

    sites = parse_document(payload)
    assert all(site.site_id for site in sites.values())
