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
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, Event, HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType

from .card_registration import JSModuleRegistration
from .const import CONF_SITE_ID, DOMAIN
from .coordinator import BadegewaesserCoordinator, async_get_coordinator
from .repairs import async_clear_missing_site, async_report_missing_site
from .websocket import async_register_websocket_commands

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


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Component-level setup: serve and register the Lovelace card.

    Deliberately here and not in `async_setup_entry`. Resource registration is
    per HA process, not per bathing water: doing it per entry would push a
    fresh `?v=` to every browser session each time an entry loads, and the
    frontend answers that by reloading — which with two entries never settles.
    """
    async_register_websocket_commands(hass)

    registration = JSModuleRegistration(hass)

    async def _register_card(_event: Event | None = None) -> None:
        await registration.async_register()

    # `after_dependencies` is soft ordering, so frontend / http / lovelace may
    # not be up yet at boot. Conditional rather than an unconditional listener:
    # an integration added at runtime is already past that event and would
    # otherwise wait for a restart that never comes.
    if hass.state is CoreState.running:
        await _register_card()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register_card)

    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> bool:
    """Set up one bathing water."""
    coordinator = await async_get_coordinator(hass)

    # Before the freshness check: an options change arrives here through the
    # reload listener, and a shorter interval also shortens what counts as
    # stale.
    coordinator.async_update_cadence()

    # `async_config_entry_first_refresh()` refuses an entry-less coordinator
    # ("only supported for coordinators with a config entry"), so the
    # test-before-setup guarantee is made explicitly here instead. Only the
    # first entry pays for a fetch; later entries reuse the snapshot that is
    # already in memory, which is the whole point of sharing the coordinator.
    if not await coordinator.async_ensure_fresh():
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
    every re-add. The snapshot it keeps is not trusted on a re-add:
    `async_ensure_fresh` refetches once it is older than the cadence.
    """
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> None:
    """Clean up anything that outlives the entry."""
    async_clear_missing_site(hass, entry)

    # The Lovelace resource is component-level, so it may only be withdrawn
    # once the LAST bathing water is gone. Wiring this to async_unload_entry
    # instead would tear the card out of every dashboard on any reload.
    remaining = [
        other
        for other in hass.config_entries.async_entries(DOMAIN)
        if other.entry_id != entry.entry_id
    ]
    if remaining:
        return
    await JSModuleRegistration(hass).async_unregister()


async def _async_reload_entry(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> None:
    """Reload after an options change."""
    await hass.config_entries.async_reload(entry.entry_id)
