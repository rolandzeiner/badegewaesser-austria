"""Sensor platform."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import UnitOfLength, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.typing import StateType
from homeassistant.util import dt as dt_util

from . import BadegewaesserConfigEntry
from .api import BathingSite
from .const import RATING_CLASSES
from .entity import BadegewaesserEntity

# The coordinator is domain-wide and fetches once for every entry, so there is
# nothing here to serialise.
PARALLEL_UPDATES = 0


@dataclass(frozen=True, kw_only=True)
class BadegewaesserSensorDescription(SensorEntityDescription):
    """A sensor described by how it reads a bathing water."""

    value_fn: Callable[[BathingSite], StateType | datetime]
    attrs_fn: Callable[[BathingSite], dict[str, Any]] | None = None
    # Unit strings that upstream declares per site rather than us hardcoding.
    unit_fn: Callable[[BathingSite], str | None] | None = None


def _latest_temperature(site: BathingSite) -> float | None:
    sample = site.latest_sample
    return sample.water_temperature if sample else None


def _latest_e_coli(site: BathingSite) -> int | None:
    sample = site.latest_sample
    return sample.e_coli if sample else None


def _latest_enterococci(site: BathingSite) -> int | None:
    sample = site.latest_sample
    return sample.enterococci if sample else None


def _latest_secchi(site: BathingSite) -> float | None:
    sample = site.latest_sample
    return sample.secchi_depth if sample else None


def _latest_sample_time(site: BathingSite) -> datetime | None:
    """Midnight local time on the sampling day.

    Upstream gives a calendar date with no clock time, so any time-of-day
    here would be invented. Midnight is the conventional stand-in and keeps
    the value a real `timestamp`, which is what lets a dashboard render "vor
    3 Wochen" without the integration having to recompute an age.
    """
    sample = site.latest_sample
    return dt_util.start_of_local_day(sample.sampled_on) if sample else None


def _detection_attrs(below: bool) -> Callable[[BathingSite], dict[str, Any]]:
    """Expose whether the published count is a limit rather than a reading."""

    def _attrs(site: BathingSite) -> dict[str, Any]:
        sample = site.latest_sample
        if sample is None:
            return {}
        flag = sample.enterococci_below_limit if below else sample.e_coli_below_limit
        # The state carries the detection limit, not a measured count, when
        # this is true — "<15", not "15". Publishing the number without the
        # flag would overstate contamination at sites that are actually clean,
        # which is 901 of 1362 live E. coli samples.
        return {"below_detection_limit": flag}

    return _attrs


def _quality_attrs(site: BathingSite) -> dict[str, Any]:
    """Which year the classification is for, and anything unclassifiable."""
    attrs: dict[str, Any] = {"rating_year": site.rating_year}
    if site.rating_raw != site.rating:
        # Upstream carried a letter outside A-D. It is not published as a
        # rating, but discarding it would hide evidence rather than handle it.
        attrs["rating_raw"] = site.rating_raw
        attrs["rating_raw_year"] = site.rating_raw_year
    return attrs


def _sample_attrs(site: BathingSite) -> dict[str, Any]:
    """The per-sample assessment that rides with the newest reading.

    Note what is NOT here: a "days since sampling" attribute. It would derive
    from today's date, and this coordinator only writes state when the
    document changes — which out of season it never does. The attribute would
    silently freeze at whatever it was in September. The timestamp state is
    the honest carrier; age is the consumer's to compute.
    """
    sample = site.latest_sample
    return {"sample_assessment": sample.assessment} if sample else {}


SENSORS: tuple[BadegewaesserSensorDescription, ...] = (
    BadegewaesserSensorDescription(
        key="water_temperature",
        translation_key="water_temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=_latest_temperature,
    ),
    BadegewaesserSensorDescription(
        key="e_coli",
        translation_key="e_coli",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=_latest_e_coli,
        attrs_fn=_detection_attrs(below=False),
        unit_fn=lambda site: site.units.e_coli or None,
    ),
    BadegewaesserSensorDescription(
        key="enterococci",
        translation_key="enterococci",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=_latest_enterococci,
        attrs_fn=_detection_attrs(below=True),
        unit_fn=lambda site: site.units.enterococci or None,
    ),
    BadegewaesserSensorDescription(
        key="secchi_depth",
        translation_key="secchi_depth",
        device_class=SensorDeviceClass.DISTANCE,
        state_class=SensorStateClass.MEASUREMENT,
        native_unit_of_measurement=UnitOfLength.METERS,
        value_fn=_latest_secchi,
    ),
    BadegewaesserSensorDescription(
        key="water_quality",
        translation_key="water_quality",
        device_class=SensorDeviceClass.ENUM,
        options=list(RATING_CLASSES),
        value_fn=lambda site: site.rating,
        attrs_fn=_quality_attrs,
    ),
    BadegewaesserSensorDescription(
        key="last_sample",
        translation_key="last_sample",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=_latest_sample_time,
        attrs_fn=_sample_attrs,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BadegewaesserConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the sensors for one bathing water."""
    async_add_entities(
        BadegewaesserSensor(entry, description) for description in SENSORS
    )


class BadegewaesserSensor(BadegewaesserEntity, SensorEntity):
    """One reading of one bathing water."""

    entity_description: BadegewaesserSensorDescription

    @property
    def native_value(self) -> StateType | datetime:
        """The current reading, or None when there is nothing to report."""
        site = self.site
        return None if site is None else self.entity_description.value_fn(site)

    @property
    def native_unit_of_measurement(self) -> str | None:
        """Prefer the unit upstream declares for this site."""
        site = self.site
        unit_fn = self.entity_description.unit_fn
        if site is not None and unit_fn is not None:
            return unit_fn(site)
        return super().native_unit_of_measurement

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Per-sensor context that the state alone cannot carry."""
        site = self.site
        attrs_fn = self.entity_description.attrs_fn
        if site is None or attrs_fn is None:
            return None
        return attrs_fn(site)
