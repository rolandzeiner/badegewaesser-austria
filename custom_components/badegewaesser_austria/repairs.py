"""Repair issues.

Exactly one, and it is domain-specific: the configured bathing water is no
longer in the AGES document. Nothing the integration can do fixes that, and
nothing about it is visible from the entity states alone — they simply go
unavailable, which looks identical to an outage. The issue is what tells the
user the difference.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir

from .const import CONF_SITE_ID, DOMAIN

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry


def _issue_id(entry: ConfigEntry) -> str:
    """One issue per config entry, so two missing sites raise two issues."""
    return f"site_missing_{entry.entry_id}"


@callback
def async_report_missing_site(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Tell the user their bathing water is gone from the upstream document."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        _issue_id(entry),
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="site_missing",
        translation_placeholders={
            "title": entry.title,
            "site_id": entry.data.get(CONF_SITE_ID, ""),
        },
    )


@callback
def async_clear_missing_site(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Withdraw the issue once the site is back, or the entry is gone.

    Raised once and cleared on recovery rather than re-raised every refresh —
    a repair issue that reappears on a timer trains people to dismiss it.
    """
    ir.async_delete_issue(hass, DOMAIN, _issue_id(entry))
