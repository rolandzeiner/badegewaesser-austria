"""Shared entity base."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import EntityDescription
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .api import BathingSite
from .const import ATTRIBUTION, DOMAIN
from .coordinator import BadegewaesserCoordinator

if TYPE_CHECKING:
    from . import BadegewaesserConfigEntry


class BadegewaesserEntity(CoordinatorEntity[BadegewaesserCoordinator]):
    """One reading of one bathing water."""

    _attr_has_entity_name = True
    _attr_attribution = ATTRIBUTION

    def __init__(
        self,
        entry: BadegewaesserConfigEntry,
        description: EntityDescription,
    ) -> None:
        """Bind the entity to its entry's bathing water."""
        super().__init__(entry.runtime_data.coordinator)
        self.entity_description = description
        self._site_id = entry.runtime_data.site_id
        # Frozen formula. Changing it wipes every existing install's history.
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, self._site_id)})

    @property
    def site(self) -> BathingSite | None:
        """This entity's bathing water in the latest snapshot."""
        if not self.coordinator.data:
            return None
        return self.coordinator.data.get(self._site_id)

    @property
    def available(self) -> bool:
        """Available unless the fetch failed or the site vanished upstream.

        Deliberately NOT tied to the bathing season. Out of season there is
        nothing new to measure, but last season's readings and the annual
        classification are still true and still worth showing — a household
        checking in February should see "17.4 °C on 31 August", not a row of
        greyed-out entities. Unavailable means "we could not find out", and
        for roughly nine and a half months of the year that is simply false.
        """
        return super().available and self.site is not None
