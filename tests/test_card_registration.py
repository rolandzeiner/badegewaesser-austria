"""Lovelace resource registration.

Registration is the single most silent-failure-prone part of a card-shipping
integration: every branch here either renders the card or leaves the user
staring at "Custom element doesn't exist", with nothing in the log that
distinguishes the two. Each branch gets a test.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.card_registration import (
    JSModuleRegistration,
)
from custom_components.badegewaesser_austria.const import (
    CARD_URL,
    CARD_VERSION,
    CONF_SITE_ID,
    DOMAIN,
)
from tests.conftest import setup_entry

VERSIONED_URL = f"{CARD_URL}?v={CARD_VERSION}"


def make_lovelace(mode: str = "storage", items: list[dict[str, Any]] | None = None):
    """A stand-in for HA's LovelaceData with a storage resource collection."""
    resources = MagicMock()
    resources.loaded = True
    resources.async_items = MagicMock(return_value=list(items or []))
    resources.async_create_item = AsyncMock()
    resources.async_update_item = AsyncMock()
    resources.async_delete_item = AsyncMock()
    lovelace = MagicMock()
    lovelace.resources = resources
    lovelace.mode = mode
    lovelace.resource_mode = mode
    return lovelace


def attach(hass: HomeAssistant, lovelace: Any) -> None:
    """Give hass a usable http component and a Lovelace collection."""
    http = MagicMock()
    http.async_register_static_paths = AsyncMock()
    hass.http = http  # type: ignore[assignment]
    hass.data["lovelace"] = lovelace
    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA

        hass.data[LOVELACE_DATA] = lovelace
    except ImportError:  # pragma: no cover
        pass


async def test_registration_is_skipped_without_http(hass: HomeAssistant) -> None:
    """PHACC does not bootstrap http, and production always has it.

    The guard exists so the test environment does not crash on a soft
    dependency; removing it turns every test that loads the integration red.
    """
    hass.http = None  # type: ignore[assignment]
    registration = JSModuleRegistration(hass)
    await registration.async_register()  # must not raise


async def test_storage_mode_creates_the_resource(hass: HomeAssistant) -> None:
    """The ordinary first install."""
    lovelace = make_lovelace()
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_register()

    lovelace.resources.async_create_item.assert_awaited_once_with(
        {"res_type": "module", "url": VERSIONED_URL}
    )


async def test_yaml_mode_writes_nothing(hass: HomeAssistant) -> None:
    """In YAML mode the user owns the resource list; writing to it is wrong."""
    lovelace = make_lovelace(mode="yaml")
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_register()

    lovelace.resources.async_create_item.assert_not_called()
    lovelace.resources.async_update_item.assert_not_called()


async def test_matching_version_is_left_alone(hass: HomeAssistant) -> None:
    """A no-op reload must not push a new URL at every browser session."""
    lovelace = make_lovelace(items=[{"id": "1", "url": VERSIONED_URL}])
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_register()

    lovelace.resources.async_update_item.assert_not_called()
    lovelace.resources.async_create_item.assert_not_called()


async def test_stale_version_is_updated(hass: HomeAssistant) -> None:
    """An upgrade rewrites the cache-busting query."""
    lovelace = make_lovelace(items=[{"id": "1", "url": f"{CARD_URL}?v=0.0.1"}])
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_register()

    lovelace.resources.async_update_item.assert_awaited_once_with(
        "1", {"res_type": "module", "url": VERSIONED_URL}
    )


async def test_failed_update_falls_back_to_recreate(hass: HomeAssistant) -> None:
    """HA has moved the exception class for this failure across versions.

    Catching broadly and recreating reaches the same observable state whatever
    was raised — which is why the except is deliberately broad here.
    """
    lovelace = make_lovelace(items=[{"id": "1", "url": f"{CARD_URL}?v=0.0.1"}])
    lovelace.resources.async_update_item.side_effect = KeyError("evicted")
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_register()

    lovelace.resources.async_delete_item.assert_awaited_once_with("1")
    lovelace.resources.async_create_item.assert_awaited_once_with(
        {"res_type": "module", "url": VERSIONED_URL}
    )


async def test_missing_bundle_logs_an_error(
    hass: HomeAssistant, caplog: pytest.LogCaptureFixture
) -> None:
    """A missing bundle breaks the entire user-visible surface, loudly."""
    lovelace = make_lovelace()
    attach(hass, lovelace)

    with patch(
        "custom_components.badegewaesser_austria.card_registration.Path.is_file",
        return_value=False,
    ):
        await JSModuleRegistration(hass).async_register()

    assert "card bundle missing" in caplog.text.lower()


async def test_already_registered_path_is_not_an_error(
    hass: HomeAssistant,
) -> None:
    """A reload re-registers the static path; that RuntimeError is expected."""
    lovelace = make_lovelace()
    attach(hass, lovelace)
    hass.http.async_register_static_paths.side_effect = RuntimeError("already")

    await JSModuleRegistration(hass).async_register()  # must not raise


async def test_unloaded_resources_are_retried(hass: HomeAssistant) -> None:
    """Lovelace can still be loading when the integration sets up."""
    lovelace = make_lovelace()
    lovelace.resources.loaded = False
    attach(hass, lovelace)

    with patch(
        "custom_components.badegewaesser_austria.card_registration.async_call_later"
    ) as later:
        await JSModuleRegistration(hass).async_register()

    assert later.called, "a not-yet-loaded collection must schedule a retry"
    lovelace.resources.async_create_item.assert_not_called()


async def test_unregister_removes_the_resource(hass: HomeAssistant) -> None:
    """Removing the last entry withdraws the resource."""
    lovelace = make_lovelace(items=[{"id": "1", "url": VERSIONED_URL}])
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_unregister()

    lovelace.resources.async_delete_item.assert_awaited_once_with("1")


async def test_unregister_is_a_noop_in_yaml_mode(hass: HomeAssistant) -> None:
    """Never delete a resource the user wrote themselves."""
    lovelace = make_lovelace(mode="yaml", items=[{"id": "1", "url": VERSIONED_URL}])
    attach(hass, lovelace)

    await JSModuleRegistration(hass).async_unregister()

    lovelace.resources.async_delete_item.assert_not_called()


# --- component-level wiring ------------------------------------------------


async def test_setup_registers_immediately_when_hass_is_running(
    hass: HomeAssistant,
) -> None:
    """An integration added at runtime is already past the started event.

    An unconditional listener would leave its card unregistered until the next
    restart — a restart nobody knows to perform.
    """
    hass.set_state(CoreState.running)
    with patch(
        "custom_components.badegewaesser_austria.JSModuleRegistration"
    ) as registration:
        registration.return_value.async_register = AsyncMock()
        assert await async_setup_component(hass, DOMAIN, {})
        await hass.async_block_till_done()

    registration.return_value.async_register.assert_awaited_once()


async def test_setup_defers_registration_until_hass_has_started(
    hass: HomeAssistant,
) -> None:
    """`after_dependencies` is soft ordering, so frontend may not be up yet."""
    hass.set_state(CoreState.starting)
    with patch(
        "custom_components.badegewaesser_austria.JSModuleRegistration"
    ) as registration:
        registration.return_value.async_register = AsyncMock()
        assert await async_setup_component(hass, DOMAIN, {})
        await hass.async_block_till_done()
        registration.return_value.async_register.assert_not_awaited()

        hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
        await hass.async_block_till_done()

    registration.return_value.async_register.assert_awaited_once()


async def test_resource_survives_while_another_entry_remains(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Registration is per HA process, not per bathing water.

    Withdrawing it when one of two entries is removed would tear the card out
    of every dashboard that still has a working entry.
    """
    await setup_entry(hass, config_entry)
    second = MockConfigEntry(
        domain=DOMAIN,
        title="Neue Donau",
        data={CONF_SITE_ID: "AT1300002200020010"},
        unique_id="AT1300002200020010",
    )
    await setup_entry(hass, second)

    with patch(
        "custom_components.badegewaesser_austria.JSModuleRegistration"
    ) as registration:
        registration.return_value.async_unregister = AsyncMock()
        await hass.config_entries.async_remove(config_entry.entry_id)
        await hass.async_block_till_done()
        registration.return_value.async_unregister.assert_not_awaited()

        await hass.config_entries.async_remove(second.entry_id)
        await hass.async_block_till_done()

    registration.return_value.async_unregister.assert_awaited_once()


async def test_websocket_command_answers_with_the_shipped_version(
    hass: HomeAssistant,
    hass_ws_client: Any,
    config_entry: MockConfigEntry,
) -> None:
    """The card's only cache-proof way to learn what the integration ships.

    The `?v=` query alone is not enough — a service worker can serve an older
    bundle anyway, and this answer cannot itself be cached.
    """
    await setup_entry(hass, config_entry)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": f"{DOMAIN}/card_version"})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {"version": CARD_VERSION}
