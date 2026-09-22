"""Binary sensor platform."""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from . import BadegewaesserConfigEntry
from .coordinator import is_in_season
from .entity import BadegewaesserEntity

PARALLEL_UPDATES = 0

CLOSED = BinarySensorEntityDescription(
    key="closed",
    translation_key="closed",
    device_class=BinarySensorDeviceClass.PROBLEM,
)

BATHING_SEASON = BinarySensorEntityDescription(
    key="bathing_season",
    translation_key="bathing_season",
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BadegewaesserConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the binary sensors for one bathing water."""
    async_add_entities(
        [
            BadegewaesserClosedSensor(entry, CLOSED),
            BadegewaesserSeasonSensor(entry, BATHING_SEASON),
        ]
    )


class BadegewaesserClosedSensor(BadegewaesserEntity, BinarySensorEntity):
    """Whether the authority has closed this bathing water."""

    @property
    def is_on(self) -> bool | None:
        """True when swimming is prohibited."""
        site = self.site
        return None if site is None else site.closed

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """The stated reason, when there is one."""
        site = self.site
        if site is None:
            return None
        return {"closure_reason": site.closure_reason}


class BadegewaesserSeasonSensor(BadegewaesserEntity, BinarySensorEntity):
    """Whether the bathing season is running.

    This one does NOT take its value from the coordinator, and that is the
    whole reason it needs its own class.

    The coordinator runs with `always_update=False` and the AGES document is
    frozen for roughly nine and a half months a year, so outside the season
    there is no refresh that changes anything and therefore no callback. An
    entity that read `is_in_season(today)` only when the coordinator published
    would latch at whatever it last wrote — reporting "season running" all
    through the winter, with nothing anywhere to indicate it was stale.

    So it schedules its own write just after midnight. The season boundary is
    a calendar fact; it has no business waiting on an HTTP response.
    """

    @property
    def is_on(self) -> bool:
        """True between 15 May and 30 September."""
        return is_in_season(dt_util.now().date())

    async def async_added_to_hass(self) -> None:
        """Start the daily re-evaluation alongside the coordinator listener."""
        await super().async_added_to_hass()

        @callback
        def _new_day(_now: Any) -> None:
            self.async_write_ha_state()

        # A minute past midnight rather than exactly midnight: it keeps the
        # write clear of the pile-up of other midnight jobs, and one minute of
        # latency on a date that changes twice a year is not worth optimising.
        self.async_on_remove(
            async_track_time_change(self.hass, _new_day, hour=0, minute=1, second=0)
        )
