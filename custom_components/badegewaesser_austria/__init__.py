"""Badegewässer Austria — Austrian bathing-water quality from AGES.

Data source: AGES — Österreichische Agentur für Gesundheit und
Ernährungssicherheit GmbH, CC BY 3.0 AT.

One config entry is one bathing water. Every entry shares a single
domain-wide coordinator, because one AGES request returns all 260 sites —
see `coordinator.py` for why that is not a per-entry coordinator.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr

from .const import CONF_SITE_ID, DOMAIN
from .coordinator import BadegewaesserCoordinator, async_get_coordinator
from .repairs import async_clear_missing_site, async_report_missing_site

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.SENSOR]


@dataclass(slots=True)
class BadegewaesserRuntimeData:
    """Per-entry view onto the shared coordinator.

    The coordinator itself is domain-wide and lives in `hass.data`; this is
    what `entry.runtime_data` holds so each entry still knows which of the 260
    bathing waters it is about.
    """

    coordinator: BadegewaesserCoordinator
    site_id: str


type BadegewaesserConfigEntry = ConfigEntry[BadegewaesserRuntimeData]


async def async_setup_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> bool:
    """Set up one bathing water."""
    coordinator = await async_get_coordinator(hass)

    # `async_config_entry_first_refresh()` refuses an entry-less coordinator
    # ("only supported for coordinators with a config entry"), so the
    # test-before-setup guarantee is made explicitly here instead. Only the
    # first entry pays for a fetch; later entries reuse the snapshot that is
    # already in memory, which is the whole point of sharing the coordinator.
    if not coordinator.data:
        await coordinator.async_refresh()
    if not coordinator.last_update_success:
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN,
            translation_key="cannot_connect",
            translation_placeholders={"detail": str(coordinator.last_exception)},
        )

    site_id: str = entry.data[CONF_SITE_ID]
    site = coordinator.data.get(site_id)
    if site is None:
        # Deliberately NOT a ConfigEntryError. A bathing water can disappear
        # from the document because it was decommissioned, or because one
        # fetch came back partial. Setting up anyway means the entities go
        # unavailable and recover on their own if the site returns, while the
        # repair issue tells the user what happened and offers the only action
        # that actually helps if it is permanent: remove the entry.
        _LOGGER.warning(
            "Bathing water %s is not in the AGES document; its entities will "
            "stay unavailable until it returns",
            site_id,
        )
        async_report_missing_site(hass, entry)
    else:
        async_clear_missing_site(hass, entry)
        device_registry = dr.async_get(hass)
        device_registry.async_get_or_create(
            config_entry_id=entry.entry_id,
            identifiers={(DOMAIN, site_id)},
            manufacturer="AGES",
            name=site.name,
            model=site.bundesland,
            serial_number=site_id,
        )

    entry.runtime_data = BadegewaesserRuntimeData(
        coordinator=coordinator, site_id=site_id
    )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Single reload owner. Pairing this listener with a reloading config-flow
    # method (`async_update_reload_and_abort`) is deprecated in HA 2026.6 and
    # a hard error in 2026.12, so the options flow uses the non-reloading
    # variant and lets this listener do the work.
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> bool:
    """Unload one bathing water.

    The shared coordinator is deliberately left in `hass.data`. It stops
    polling on its own once the last entity unsubscribes — the base class only
    reschedules while `_listeners` is non-empty — so there is nothing to tear
    down, and popping it would mean re-registering the HA-stop listener on
    every re-add.
    """
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> None:
    """Clean up anything that outlives the entry."""
    async_clear_missing_site(hass, entry)


async def _async_reload_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> None:
    """Reload after an options change."""
    await hass.config_entries.async_reload(entry.entry_id)
