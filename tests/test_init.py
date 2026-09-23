"""Entry lifecycle: setup, unload, the missing-site repair, device registry."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.const import (
    CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    CONF_SITE_ID,
    DOMAIN,
    POLL_JITTER_SECONDS,
)
from custom_components.badegewaesser_austria.coordinator import async_get_coordinator
from tests.conftest import NORMAL_SITE_ID, setup_entry


async def test_setup_and_unload(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The happy path, including a clean unload."""
    await setup_entry(hass, config_entry)
    assert config_entry.state is ConfigEntryState.LOADED

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.NOT_LOADED


async def test_setup_registers_the_device(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """One device per bathing water, present before any entity reports state."""
    await setup_entry(hass, config_entry)

    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, NORMAL_SITE_ID), config_entry.entry_id
    )
    assert device is not None
    assert device.name == "Naturbadesee Königsdorf"
    assert device.manufacturer == "AGES"
    assert device.model == "Burgenland"


async def test_unreachable_upstream_gives_config_entry_not_ready(
    hass: HomeAssistant, config_entry: MockConfigEntry, session: MagicMock
) -> None:
    """test-before-setup: a down API means retry, not a half-loaded entry."""
    session.get = MagicMock(side_effect=TimeoutError)

    config_entry.add_to_hass(hass)
    assert not await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    assert config_entry.state is ConfigEntryState.SETUP_RETRY


async def test_second_entry_does_not_refetch(
    hass: HomeAssistant, config_entry: MockConfigEntry, session: MagicMock
) -> None:
    """The point of the shared coordinator: N entries, one request.

    All 260 bathing waters arrive in one document, so a second entry must
    reuse the snapshot already in memory rather than multiply the load on
    AGES by the number of lakes a household happens to follow.
    """
    await setup_entry(hass, config_entry)
    assert session.get.call_count == 1

    await setup_entry(
        hass,
        MockConfigEntry(
            domain=DOMAIN,
            title="Neue Donau",
            data={CONF_SITE_ID: "AT1300002200020010"},
            unique_id="AT1300002200020010",
        ),
    )

    assert session.get.call_count == 1


async def test_an_options_change_applies_the_new_interval_at_once(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The reload an options change triggers must carry the new cadence.

    Before 2026-09-23 the interval was only recomputed after a poll, so the
    new value waited out one more cycle at the old one.
    """
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        await setup_entry(hass, config_entry)
        hass.config_entries.async_update_entry(
            config_entry,
            options={
                CONF_SCAN_INTERVAL_SEASON_HOURS: 3,
                CONF_SCAN_INTERVAL_OFFSEASON_HOURS: 24,
            },
        )
        await hass.async_block_till_done()

    interval = config_entry.runtime_data.coordinator.update_interval
    assert interval is not None
    assert 3 * 3600 <= interval.total_seconds() <= 3 * 3600 + POLL_JITTER_SECONDS


async def test_re_adding_after_the_last_removal_refetches_a_stale_snapshot(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    session: MagicMock,
    freezer: FrozenDateTimeFactory,
) -> None:
    """The shared coordinator stays in memory after the last entry goes.

    Its snapshot must not be served to an entry added weeks later.
    """
    await setup_entry(hass, config_entry)
    await hass.config_entries.async_remove(config_entry.entry_id)
    await hass.async_block_till_done()

    freezer.tick(timedelta(days=30))
    await setup_entry(
        hass,
        MockConfigEntry(
            domain=DOMAIN,
            title="Neue Donau",
            data={CONF_SITE_ID: "AT1300002200020010"},
            unique_id="AT1300002200020010",
        ),
    )

    assert session.get.call_count == 2


async def test_missing_site_raises_a_repair_and_still_loads(
    hass: HomeAssistant,
) -> None:
    """A bathing water absent from the document is explained, not hidden.

    Deliberately NOT a ConfigEntryError: the site might be back next refresh
    (a partial document) or gone for good (decommissioned). Loading anyway
    means the entities go unavailable and recover on their own, while the
    repair issue tells the user which of the two it is and what to do.
    """
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Weggefallener See",
        data={CONF_SITE_ID: "AT0000000000000000"},
        unique_id="AT0000000000000000",
    )
    await setup_entry(hass, entry)

    assert entry.state is ConfigEntryState.LOADED
    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"site_missing_{entry.entry_id}")
    assert issue is not None
    assert issue.translation_key == "site_missing"
    assert issue.severity is ir.IssueSeverity.WARNING


async def test_missing_site_entities_are_unavailable(hass: HomeAssistant) -> None:
    """Unavailable is correct here — we genuinely cannot find out."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Weggefallener See",
        data={CONF_SITE_ID: "AT0000000000000000"},
        unique_id="AT0000000000000000",
    )
    await setup_entry(hass, entry)

    states = [
        state
        for state in hass.states.async_all()
        if state.entity_id.endswith("_wassertemperatur")
        or "water_temperature" in state.entity_id
    ]
    assert all(state.state == "unavailable" for state in states)


async def test_repair_is_cleared_when_the_site_returns(
    hass: HomeAssistant,
) -> None:
    """Raised once and withdrawn on recovery.

    A repair issue that reappears on a timer trains people to dismiss repairs.
    """
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Naturbadesee Königsdorf",
        data={CONF_SITE_ID: NORMAL_SITE_ID},
        unique_id=NORMAL_SITE_ID,
    )
    entry.add_to_hass(hass)

    # First load with the site absent.
    coordinator = await async_get_coordinator(hass)
    await coordinator.async_refresh()
    assert coordinator.data is not None
    vanished = coordinator.data.pop(NORMAL_SITE_ID)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    issue_id = f"site_missing_{entry.entry_id}"
    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is not None

    # Site comes back; reload.
    coordinator.data[NORMAL_SITE_ID] = vanished
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is None


async def test_removing_the_entry_clears_its_repair(hass: HomeAssistant) -> None:
    """A repair must not outlive the entry it is about."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Weggefallener See",
        data={CONF_SITE_ID: "AT0000000000000000"},
        unique_id="AT0000000000000000",
    )
    await setup_entry(hass, entry)
    issue_id = f"site_missing_{entry.entry_id}"
    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is not None

    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()

    assert ir.async_get(hass).async_get_issue(DOMAIN, issue_id) is None
