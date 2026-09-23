"""Diagnostics dump.

Diagnostics end up pasted into public GitHub issues, so the default is to
surface metadata and counts rather than payloads. The exception here is the
one bathing water this entry is actually about: that record is public register
data published under CC BY, it is the thing any parser bug would be about, and
the entry's title already names the lake — so withholding it would cost
debuggability without buying privacy.

The authority's phone number and email are redacted anyway. They are public
too, but an extra entry in TO_REDACT costs nothing and a missed one costs a
disclosure.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import date
from typing import TYPE_CHECKING, Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import ATTRIBUTION, INTEGRATION_VERSION
from .coordinator import is_in_season

if TYPE_CHECKING:
    from . import BadegewaesserConfigEntry

TO_REDACT = {
    # Present today.
    "email",
    "phone",
    # Forward-looking: this upstream needs no credentials, but a future field
    # named any of these must never ride into an issue thread.
    "api_key",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "Authorization",
}


def _jsonable(value: Any) -> Any:
    """Make dataclass output JSON-safe, keeping dates readable."""
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [_jsonable(item) for item in value]
    return value


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: BadegewaesserConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for one bathing water."""
    coordinator = entry.runtime_data.coordinator
    site_id = entry.runtime_data.site_id
    site = (coordinator.data or {}).get(site_id)

    return {
        "attribution": ATTRIBUTION,
        "entry": {
            "title": entry.title,
            "version": INTEGRATION_VERSION,
            "data": async_redact_data(dict(entry.data), TO_REDACT),
            "options": async_redact_data(dict(entry.options), TO_REDACT),
        },
        "coordinator": {
            "last_update_success": coordinator.last_update_success,
            "last_exception": repr(coordinator.last_exception),
            "update_interval_seconds": (
                coordinator.update_interval.total_seconds()
                if coordinator.update_interval
                else None
            ),
            "consecutive_failures": coordinator.consecutive_failures,
            "last_fetch_utc": (
                coordinator.last_fetch_utc.isoformat()
                if coordinator.last_fetch_utc
                else None
            ),
            "in_season": is_in_season(dt_util.now().date()),
            # Counts, not payloads, for everything this entry is not about.
            "sites_in_document": len(coordinator.data or {}),
            "entries_sharing_this_coordinator": len(
                hass.config_entries.async_entries(entry.domain)
            ),
            "upstream_version": coordinator.client.upstream_version,
            "content_digest": coordinator.client.digest,
            # Decoded size, after aiohttp's gzip — see the client attribute.
            "last_payload_bytes": coordinator.client.last_payload_bytes,
            # Stated rather than implied: a reader comparing this dump against
            # a sibling integration will notice the absence otherwise.
            "conditional_get": (
                "not used — upstream regenerates every ~10 min, so no validator "
                "can ever be fresh; see const.py"
            ),
        },
        "site": (
            async_redact_data(_jsonable(asdict(site)), TO_REDACT)
            if site is not None
            else None
        ),
    }
