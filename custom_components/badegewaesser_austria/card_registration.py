"""Lovelace JS module registration.

Follows the canonical community guide:
https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909

Registration happens once per HA process, from `async_setup` — never from
`async_setup_entry`. Doing it per entry would re-register the resource with a
fresh `?v=` on every config entry, and the HA frontend answers that by
reloading, which with two entries is an endless loop.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from homeassistant.components.http import (  # type: ignore[attr-defined,unused-ignore]
    StaticPathConfig,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later

from .const import CARD_FILENAME, CARD_URL, CARD_VERSION

# Older HA installs lacked LOVELACE_DATA — fall back to the bare-string key.
# The compound ignore covers `attr-defined` on older HA and `unused-ignore` on
# newer HA where the symbol IS exported.
try:
    from homeassistant.components.lovelace.const import (  # type: ignore[attr-defined,unused-ignore]
        LOVELACE_DATA,
    )
except ImportError:  # pragma: no cover — HA predating LOVELACE_DATA
    LOVELACE_DATA = None  # type: ignore[assignment,unused-ignore]

if TYPE_CHECKING:
    from homeassistant.components.lovelace.resources import ResourceStorageCollection

_LOGGER = logging.getLogger(__name__)

# 60 ticks x 5 s = 5 minutes. Reaching the cap means Lovelace's resource
# loader never flipped `loaded` — broken storage, a YAML-mode race, or changed
# internals. One warning beats polling forever.
_LOVELACE_LOAD_RETRY_MAX = 60
_LOVELACE_LOAD_RETRY_INTERVAL_S = 5


class JSModuleRegistration:
    """Serve the card bundle and register it as a Lovelace resource."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Look up the Lovelace data, preferring the typed key."""
        self.hass = hass
        if LOVELACE_DATA is not None:
            self.lovelace = self.hass.data.get(LOVELACE_DATA)
        else:
            self.lovelace = self.hass.data.get("lovelace")

    async def async_register(self) -> None:
        """Serve the bundle, then register it if Lovelace is in storage mode."""
        # `http` is a soft dependency through `after_dependencies`, and PHACC
        # does not bootstrap it. Skipping is correct in tests and unreachable
        # in production, where http is always loaded.
        if getattr(self.hass, "http", None) is None:
            _LOGGER.debug("http component not available; skipping card registration")
            return
        await self._async_register_path()
        if self.lovelace is not None and self._is_storage_mode():
            await self._async_wait_for_lovelace_resources()

    def _is_storage_mode(self) -> bool:
        """Is Lovelace storing its own resources?

        HA renamed the field: `mode` up to 2026.1, `resource_mode` from
        2026.2. Only one exists on any given version, so both are probed.
        Fails closed — in YAML mode the user owns the resource list and this
        integration must not write to it.
        """
        assert self.lovelace is not None
        return any(
            getattr(self.lovelace, attr, None) == "storage"
            for attr in ("resource_mode", "mode")
        )

    async def _async_register_path(self) -> None:
        """Serve www/ at URL_BASE."""
        card_path = Path(__file__).parent / "www" / CARD_FILENAME
        if not card_path.is_file():
            _LOGGER.error(
                "Lovelace card bundle missing at %s — the integration will load "
                "but the card cannot render. Reinstall via HACS or run "
                "`npm run build`.",
                card_path,
            )
            return
        try:
            await self.hass.http.async_register_static_paths(
                # cache_headers=True is safe only because the Lovelace resource
                # URL carries `?v={version}` from manifest.json, so a release
                # changes the URL and the long max-age never needs invalidating.
                # The local cost: dev-push writes a rebuilt bundle to the same
                # URL with the same `?v=`, so card iteration needs a hard
                # refresh rather than a plain reload.
                [StaticPathConfig(CARD_URL, str(card_path), True)]
            )
        except RuntimeError:
            # "Already registered" is the expected result of a reload, not an
            # error worth surfacing.
            _LOGGER.debug("Static path already registered for %s", CARD_URL)

    async def _async_wait_for_lovelace_resources(self) -> None:
        """Poll until Lovelace's resource collection is loaded, then register."""
        assert self.lovelace is not None
        attempts = 0
        unsub: Any = None

        async def _check_loaded(_now: Any) -> None:
            nonlocal attempts, unsub
            # Clear the handle before doing any work, so an unregister during
            # the wait cannot hold a drained scheduler slot.
            unsub = None
            assert self.lovelace is not None
            if self.lovelace.resources.loaded:
                await self._async_register_module()
                return
            attempts += 1
            if attempts >= _LOVELACE_LOAD_RETRY_MAX:
                _LOGGER.warning(
                    "Lovelace resources never reported loaded after %d x %ds; "
                    "giving up. Reload the integration once Lovelace is back.",
                    _LOVELACE_LOAD_RETRY_MAX,
                    _LOVELACE_LOAD_RETRY_INTERVAL_S,
                )
                return
            unsub = async_call_later(
                self.hass, _LOVELACE_LOAD_RETRY_INTERVAL_S, _check_loaded
            )

        await _check_loaded(0)

    async def _async_register_module(self) -> None:
        """Create or update this integration's Lovelace resource."""
        assert self.lovelace is not None
        # `async_register` gates this behind `_is_storage_mode()`, so the
        # collection is always the storage variant; the cast narrows the union
        # for mypy without a runtime dependency on the class.
        resources = cast("ResourceStorageCollection", self.lovelace.resources)
        versioned_url = f"{CARD_URL}?v={CARD_VERSION}"

        for item in resources.async_items():
            if str(item.get("url") or "").split("?")[0] != CARD_URL:
                continue
            if item.get("url") == versioned_url:
                return
            try:
                await resources.async_update_item(
                    item["id"], {"res_type": "module", "url": versioned_url}
                )
            except Exception as err:  # noqa: BLE001 — HA shifts the class
                # HA core has moved the concrete exception for this failure
                # across versions. Delete-and-recreate reaches the same
                # observable state whatever the cause.
                _LOGGER.debug(
                    "Updating the Lovelace resource failed (%s); recreating it", err
                )
                await resources.async_delete_item(item["id"])
                await resources.async_create_item(
                    {"res_type": "module", "url": versioned_url}
                )
            _LOGGER.info("Updated Lovelace resource to %s", versioned_url)
            return

        await resources.async_create_item({"res_type": "module", "url": versioned_url})
        _LOGGER.info("Registered Lovelace resource %s", versioned_url)

    async def async_unregister(self) -> None:
        """Drop the Lovelace resource this integration owns."""
        if self.lovelace is None or not self._is_storage_mode():
            return
        resources = cast("ResourceStorageCollection", self.lovelace.resources)
        for item in list(resources.async_items()):
            if str(item.get("url") or "").split("?")[0] == CARD_URL:
                await resources.async_delete_item(item["id"])
                _LOGGER.info("Removed Lovelace resource %s", item.get("url"))
