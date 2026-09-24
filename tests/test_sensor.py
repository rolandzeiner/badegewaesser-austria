"""Sensor states and attributes."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from homeassistant.const import ATTR_LATITUDE, ATTR_LONGITUDE
from homeassistant.core import HomeAssistant, State
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.const import (
    ATTRIBUTION,
    CONF_SITE_ID,
    DOMAIN,
)
from tests.conftest import (
    NEVER_SAMPLED_SITE_ID,
    NULL_ISLAND_SITE_ID,
    UNRATED_SITE_ID,
    setup_entry,
)

PREFIX = "sensor.naturbadesee_konigsdorf_"


async def test_all_six_sensors_exist(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The documented entity set, present after one setup."""
    await setup_entry(hass, config_entry)
    for key in (
        "water_temperature",
        "e_coli",
        "enterococci",
        "secchi_depth",
        "water_quality",
        "last_sample",
    ):
        assert hass.states.get(f"{PREFIX}{key}") is not None, key


@pytest.mark.parametrize(
    ("key", "expected"),
    [
        ("water_temperature", "26.2"),
        ("e_coli", "15"),
        ("enterococci", "15"),
        ("secchi_depth", "1.05"),
        ("water_quality", "excellent"),
    ],
)
async def test_values_from_the_newest_sample(
    hass: HomeAssistant, config_entry: MockConfigEntry, key: str, expected: str
) -> None:
    """Each sensor reads the most recent sample, not an arbitrary one."""
    await setup_entry(hass, config_entry)
    assert hass.states.get(f"{PREFIX}{key}").state == expected


async def test_below_detection_limit_is_flagged(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The state is a detection limit, and the attribute says so.

    "15" with the flag reads "<15". Publishing the number alone would
    overstate contamination at sites that are actually clean — 901 of 1362
    live E. coli samples are in exactly this state.
    """
    await setup_entry(hass, config_entry)
    for key in ("e_coli", "enterococci"):
        state = hass.states.get(f"{PREFIX}{key}")
        assert state.state == "15"
        assert state.attributes["below_detection_limit"] is True


async def test_units_come_from_the_document(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Uniform across all 260 live sites, but read rather than hardcoded."""
    await setup_entry(hass, config_entry)
    assert (
        hass.states.get(f"{PREFIX}e_coli").attributes["unit_of_measurement"]
        == "KBE/100ml"
    )


async def test_water_quality_declares_its_options_and_year(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """An enum sensor may only ever report a state it declared.

    Which is why the parser refuses to publish a letter outside A-D: the live
    document carries a "G" and an "F", and handing either to HA would raise.
    """
    await setup_entry(hass, config_entry)
    state = hass.states.get(f"{PREFIX}water_quality")
    assert state.attributes["options"] == [
        "excellent",
        "good",
        "sufficient",
        "poor",
    ]
    assert state.state in state.attributes["options"]
    # The AGES letter stays reachable for anyone who reads their publications.
    # A = ausgezeichnet is measured, not assumed: AGES's 2025 report says 251
    # of 260 sites were rated "ausgezeichnet", and QUALITAET_2025 carries
    # exactly 251 "A" values.
    assert state.attributes["rating_class"] == "A"
    # 2026 is empty until AGES publishes after the season, so the rating in
    # force is last year's — and the sensor says which year it means.
    assert state.attributes["rating_year"] == 2025


async def test_unclassified_letter_is_reported_but_not_published(
    hass: HomeAssistant,
) -> None:
    """The "G" site falls back to 2024's B, and keeps the G visible."""
    await setup_entry(
        hass,
        MockConfigEntry(
            domain=DOMAIN,
            title="Testsee ohne Klassifizierung",
            data={CONF_SITE_ID: UNRATED_SITE_ID},
            unique_id=UNRATED_SITE_ID,
        ),
    )
    state = hass.states.get("sensor.testsee_ohne_klassifizierung_water_quality")
    assert state.state == "good"
    assert state.attributes["rating_class"] == "B"
    assert state.attributes["rating_year"] == 2024
    assert state.attributes["rating_raw"] == "G"
    assert state.attributes["rating_raw_year"] == 2025


async def test_last_sample_is_a_timestamp(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """A real timestamp, so a dashboard can render an age without help."""
    await setup_entry(hass, config_entry)
    state = hass.states.get(f"{PREFIX}last_sample")
    assert state.attributes["device_class"] == "timestamp"
    assert state.state.startswith("2026-08-20T")
    assert state.attributes["sample_assessment"] == 1


async def test_no_days_since_attribute(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """There must be no attribute derived from today's date.

    The coordinator only writes state when the document changes, and out of
    season it never does — so a "days since sampling" attribute would freeze
    at its September value and quietly stay wrong until the following June.
    The timestamp state is the honest carrier; age is the consumer's to
    compute.
    """
    await setup_entry(hass, config_entry)
    attributes = hass.states.get(f"{PREFIX}last_sample").attributes
    assert not any("age" in key or "days" in key for key in attributes)


async def test_never_sampled_site_reports_unknown_not_unavailable(
    hass: HomeAssistant,
) -> None:
    """ "No sample exists" is a known fact, not a failure to find out."""
    await setup_entry(
        hass,
        MockConfigEntry(
            domain=DOMAIN,
            title="Testsee ohne Proben",
            data={CONF_SITE_ID: NEVER_SAMPLED_SITE_ID},
            unique_id=NEVER_SAMPLED_SITE_ID,
        ),
    )
    for key in ("water_temperature", "e_coli", "last_sample"):
        state = hass.states.get(f"sensor.testsee_ohne_proben_{key}")
        assert state.state == "unknown", key


async def test_attribution_is_on_every_entity(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """CC BY 3.0 AT requires attribution, and it is the only obligation."""
    await setup_entry(hass, config_entry)
    for state in hass.states.async_all():
        assert state.attributes["attribution"] == ATTRIBUTION


async def test_entities_go_unavailable_only_when_the_fetch_fails(
    hass: HomeAssistant, config_entry: MockConfigEntry, session: MagicMock
) -> None:
    """Unavailable means "we could not find out" — nothing else."""
    from custom_components.badegewaesser_austria.coordinator import (
        async_get_coordinator,
    )

    await setup_entry(hass, config_entry)
    assert hass.states.get(f"{PREFIX}water_temperature").state == "26.2"

    session.get = MagicMock(side_effect=TimeoutError)
    coordinator = await async_get_coordinator(hass)
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert hass.states.get(f"{PREFIX}water_temperature").state == "unavailable"


def _temperature_state(hass: HomeAssistant, entry: MockConfigEntry) -> State:
    """The water-temperature state of an entry, found by its unique_id."""
    from homeassistant.helpers import entity_registry as er

    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{entry.entry_id}_water_temperature"
    )
    assert entity_id is not None
    state = hass.states.get(entity_id)
    assert state is not None
    return state


def _null_island_entry() -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title="Wolfgangsee, St. Gilgen - Gamsjaga",
        data={CONF_SITE_ID: NULL_ISLAND_SITE_ID},
        unique_id=NULL_ISLAND_SITE_ID,
    )


async def test_temperature_sensor_carries_the_position(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Under HA's own names, so maps and find_coordinates understand it."""
    await setup_entry(hass, config_entry)
    attributes = _temperature_state(hass, config_entry).attributes
    assert attributes[ATTR_LATITUDE] == pytest.approx(47.008287)
    assert attributes[ATTR_LONGITUDE] == pytest.approx(16.163253)


async def test_only_one_entity_per_lake_carries_the_position(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """HA's Map dashboard draws every entity with a position.

    It is a map card with show_all, so the pair on all eight entities would
    stack eight markers on each lake.
    """
    await setup_entry(hass, config_entry)
    located = [
        state.entity_id
        for state in hass.states.async_all()
        if ATTR_LATITUDE in state.attributes or ATTR_LONGITUDE in state.attributes
    ]
    assert located == [f"{PREFIX}water_temperature"]


async def test_position_is_not_recorded(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """It never changes, so the recorder would only repeat the same pair."""
    await setup_entry(hass, config_entry)
    state_info = _temperature_state(hass, config_entry).state_info
    assert state_info is not None
    assert {ATTR_LATITUDE, ATTR_LONGITUDE, "season_samples"} <= state_info[
        "unrecorded_attributes"
    ]


async def test_null_island_site_publishes_its_profile_position(
    hass: HomeAssistant,
) -> None:
    """Gamsjaga's upstream "0"/"0" is replaced, never passed through."""
    entry = await setup_entry(hass, _null_island_entry())
    attributes = _temperature_state(hass, entry).attributes
    assert attributes[ATTR_LATITUDE] == pytest.approx(47.7489768867)
    assert attributes[ATTR_LONGITUDE] == pytest.approx(13.4191829076)


async def test_no_position_means_no_attributes(
    hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A site without a position stays off the map, not at (0, 0)."""
    monkeypatch.setattr(
        "custom_components.badegewaesser_austria.api.COORDINATE_FALLBACKS", {}
    )
    entry = await setup_entry(hass, _null_island_entry())
    attributes = _temperature_state(hass, entry).attributes
    assert ATTR_LATITUDE not in attributes
    assert ATTR_LONGITUDE not in attributes
    # The rest of the entity is unaffected.
    assert "season_samples" in attributes


async def test_unique_ids_are_entry_scoped(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The formula is frozen; changing it would wipe every install's history."""
    from homeassistant.helpers import entity_registry as er

    await setup_entry(hass, config_entry)
    registry = er.async_get(hass)
    entry = registry.async_get(f"{PREFIX}water_temperature")
    assert entry.unique_id == f"{config_entry.entry_id}_water_temperature"
