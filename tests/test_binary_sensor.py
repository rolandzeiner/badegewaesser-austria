"""Binary sensor states, including the season sensor's independent clock."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.badegewaesser_austria.const import CONF_SITE_ID, DOMAIN
from tests.conftest import CLOSED_SITE_ID, setup_entry

PREFIX = "binary_sensor.naturbadesee_konigsdorf_"
SENSOR_PREFIX = "sensor.naturbadesee_konigsdorf_"
VIENNA = ZoneInfo("Europe/Vienna")


async def test_open_site_reports_off(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """All 260 live sites are open; this is the ordinary case."""
    await setup_entry(hass, config_entry)
    state = hass.states.get(f"{PREFIX}closed")
    assert state.state == "off"
    assert state.attributes["device_class"] == "problem"
    assert state.attributes["closure_reason"] is None


async def test_closed_site_reports_on_with_a_reason(hass: HomeAssistant) -> None:
    """The closure path, exercised against a synthetic row.

    TGESPERRT was "0" on all 260 sites and SPERRGRUND empty everywhere when
    the fixture was recorded, so this state has never been observed live. The
    parser is written against the documented shape, and this test says so
    rather than implying the behaviour was measured.
    """
    await setup_entry(
        hass,
        MockConfigEntry(
            domain=DOMAIN,
            title="Testsee gesperrt",
            data={CONF_SITE_ID: CLOSED_SITE_ID},
            unique_id=CLOSED_SITE_ID,
        ),
    )
    state = hass.states.get("binary_sensor.testsee_gesperrt_closed")
    assert state.state == "on"
    assert state.attributes["closure_reason"] == (
        "Blaualgen — Badeverbot bis auf Widerruf"
    )


async def test_season_sensor_follows_the_calendar(
    hass: HomeAssistant, config_entry: MockConfigEntry, freezer: FrozenDateTimeFactory
) -> None:
    """In season on 20 August."""
    await hass.config.async_set_time_zone("Europe/Vienna")
    freezer.move_to(datetime(2026, 8, 20, 12, 0, tzinfo=VIENNA))

    await setup_entry(hass, config_entry)
    assert hass.states.get(f"{PREFIX}bathing_season").state == "on"


async def test_season_sensor_flips_without_any_coordinator_update(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
) -> None:
    """The bug this sensor's own timer exists to prevent.

    The coordinator runs with `always_update=False`, and the AGES document is
    frozen for roughly nine and a half months a year. So outside the season
    there is no refresh that changes anything, and therefore no callback. A
    season sensor that only recomputed when the coordinator published would
    latch on "in season" straight through the winter — with nothing anywhere
    to indicate it was stale.

    This asserts the fix directly: the state flips across the boundary while
    the request count does not move.
    """
    await hass.config.async_set_time_zone("Europe/Vienna")
    freezer.move_to(datetime(2026, 8, 31, 12, 0, tzinfo=VIENNA))

    await setup_entry(hass, config_entry)
    assert hass.states.get(f"{PREFIX}bathing_season").state == "on"
    reading_before = hass.states.get(f"{SENSOR_PREFIX}water_temperature")

    # Cross into 1 September and let the sensor's own 00:01 job run. Scheduled
    # refreshes fire during this jump too — that is the point. They fetch an
    # unchanged document, so `always_update=False` suppresses every listener
    # callback and nothing data-driven writes a state.
    freezer.move_to(datetime(2026, 9, 1, 0, 2, tzinfo=VIENNA))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert hass.states.get(f"{PREFIX}bathing_season").state == "off"

    reading_after = hass.states.get(f"{SENSOR_PREFIX}water_temperature")
    assert reading_after.last_updated == reading_before.last_updated, (
        "the coordinator published nothing across this window, so the season "
        "flip can only have come from the sensor's own timer"
    )
    assert session.get.call_count >= 1, "a scheduled refresh did run"


async def test_season_sensor_flips_back_on_in_june(
    hass: HomeAssistant, config_entry: MockConfigEntry, freezer: FrozenDateTimeFactory
) -> None:
    """And it must come back — a latch that only opens is still a latch."""
    await hass.config.async_set_time_zone("Europe/Vienna")
    freezer.move_to(datetime(2027, 6, 14, 12, 0, tzinfo=VIENNA))

    await setup_entry(hass, config_entry)
    assert hass.states.get(f"{PREFIX}bathing_season").state == "off"

    freezer.move_to(datetime(2027, 6, 15, 0, 2, tzinfo=VIENNA))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert hass.states.get(f"{PREFIX}bathing_season").state == "on"


async def test_readings_survive_the_end_of_the_season(
    hass: HomeAssistant, config_entry: MockConfigEntry, freezer: FrozenDateTimeFactory
) -> None:
    """The requirement the whole availability design exists for.

    In February a household should still see "26.2 °C on 20 August" and an
    annual classification of A — not eight greyed-out rows. Out of season
    there is nothing new to measure, but last season's readings are still
    true.
    """
    await hass.config.async_set_time_zone("Europe/Vienna")
    freezer.move_to(datetime(2027, 2, 14, 12, 0, tzinfo=VIENNA))

    await setup_entry(hass, config_entry)

    assert hass.states.get(f"{PREFIX}bathing_season").state == "off"
    assert (
        hass.states.get("sensor.naturbadesee_konigsdorf_water_temperature").state
        == "26.2"
    )
    assert (
        hass.states.get("sensor.naturbadesee_konigsdorf_water_quality").state
        == "excellent"
    )
    # Midnight Vienna on the sampling day, which HA serialises as UTC — so
    # 20 August local reads "2026-08-19T22:00:00+00:00". Assert the local
    # date, because the local date is what the value means.
    sampled = datetime.fromisoformat(
        hass.states.get("sensor.naturbadesee_konigsdorf_last_sample").state
    )
    assert sampled.astimezone(VIENNA).date() == date(2026, 8, 20)


async def test_season_timer_is_released_on_unload(
    hass: HomeAssistant, config_entry: MockConfigEntry, freezer: FrozenDateTimeFactory
) -> None:
    """Registered through async_on_remove, so unloading really unhooks it."""
    await hass.config.async_set_time_zone("Europe/Vienna")
    freezer.move_to(datetime(2026, 8, 20, 12, 0, tzinfo=VIENNA))
    await setup_entry(hass, config_entry)

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    await hass.async_block_till_done()

    # HA leaves a restored `unavailable` state behind rather than deleting it.
    after_unload = hass.states.get(f"{PREFIX}bathing_season")
    assert after_unload.state == "unavailable"

    # Cross a day boundary. A timer still hooked up would try to write into a
    # removed entity; the state must simply not move.
    freezer.tick(timedelta(days=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    still = hass.states.get(f"{PREFIX}bathing_season")
    assert still.state == "unavailable"
    assert still.last_updated == after_unload.last_updated


async def test_entity_reads_nothing_when_its_site_leaves_the_snapshot(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The guard behind `available`, exercised directly.

    HA never calls `extra_state_attributes` on an unavailable entity, so the
    None-branch inside it is unreachable through the state machine. It still
    has to be right: `available` and the attribute reader consult the same
    lookup, and a None-blind reader would raise inside a property the moment
    the two ever disagreed.
    """
    from homeassistant.helpers.entity_component import DATA_INSTANCES

    await setup_entry(hass, config_entry)
    component = hass.data[DATA_INSTANCES]["binary_sensor"]
    entity = component.get_entity(f"{PREFIX}closed")
    assert entity is not None
    assert entity.site is not None
    assert entity.is_on is False

    entity.coordinator.data.clear()

    assert entity.site is None
    assert entity.available is False
    assert entity.is_on is None
    assert entity.extra_state_attributes is None
