"""WebSocket command: which card version does the integration ship?

The `?v=` query on the resource URL is not a sufficient cache-buster on its
own — a browser or a service worker can still hand the frontend an older
bundle. This command lets the card ask the integration directly, which is the
only answer that cannot itself be cached.
"""

from __future__ import annotations

from typing import Any

# Imported from the canonical submodules rather than the package root: mypy
# --strict rejects `websocket_command` / `async_response` / `ActiveConnection`
# when they are resolved through websocket_api/__init__.py, but they ARE
# exported here.
import voluptuous as vol
from homeassistant.components.websocket_api import async_register_command
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.components.websocket_api.decorators import (
    async_response,
    websocket_command,
)
from homeassistant.core import HomeAssistant, callback

from .const import CARD_VERSION, DOMAIN


@websocket_command({vol.Required("type"): f"{DOMAIN}/card_version"})
@async_response
async def _websocket_card_version(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Answer with the version this integration shipped."""
    connection.send_result(msg["id"], {"version": CARD_VERSION})


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register the card-version command.

    Called from `async_setup`, i.e. once per HA process. That matters:
    `websocket_api` has no public deregister hook, so a handler registered
    here outlives the integration's removal. Registering per config entry
    would instead raise on the second entry. A stray handler nobody calls is
    harmless; the alternative is not.
    """
    async_register_command(hass, _websocket_card_version)
