"""The photo entity: present only with a photo, and credited per photo."""

from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from homeassistant.components.image import async_get_image
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.const import ATTRIBUTION
from tests.conftest import NORMAL_SITE_ID, setup_entry

ENTITY_ID = "image.naturbadesee_konigsdorf_photo"
WEBP = b"RIFF\x1a\x00\x00\x00WEBPVP8L\x0d\x00\x00\x00/\x00\x00\x00\x10\x07\x10\x11\x11\x88\x88\xfe\x07\x00"


def _add_photo(photo_dir: Path, credits: object | None = None) -> Path:
    path = photo_dir / f"{NORMAL_SITE_ID}.webp"
    path.write_bytes(WEBP)
    if credits is not None:
        (photo_dir / "credits.json").write_text(json.dumps(credits), encoding="utf-8")
    return path


async def test_no_photo_means_no_entity(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """AGES has no photo for one site, and a clone has none at all.

    Either way the bathing water sets up normally, just without the image.
    """
    await setup_entry(hass, config_entry)
    assert hass.states.async_entity_ids("image") == []
    assert hass.states.get("sensor.naturbadesee_konigsdorf_water_temperature")


async def test_photo_is_served_through_the_image_proxy(
    hass: HomeAssistant, config_entry: MockConfigEntry, photo_dir: Path
) -> None:
    """The bytes on disk, as WebP, behind an access-token URL."""
    _add_photo(photo_dir, {NORMAL_SITE_ID: {"credit": "© TVB Königsdorf"}})
    await setup_entry(hass, config_entry)

    state = hass.states.get(ENTITY_ID)
    assert state is not None
    assert state.attributes["entity_picture"].startswith(
        f"/api/image_proxy/{ENTITY_ID}?token="
    )

    image = await async_get_image(hass, ENTITY_ID)
    assert image.content == WEBP
    assert image.content_type == "image/webp"


async def test_photo_carries_its_own_credit_not_the_data_licence(
    hass: HomeAssistant, config_entry: MockConfigEntry, photo_dir: Path
) -> None:
    """The photo is not CC BY 3.0 AT, so it must not say it is."""
    _add_photo(photo_dir, {NORMAL_SITE_ID: {"credit": "© TVB Königsdorf"}})
    await setup_entry(hass, config_entry)

    attribution = hass.states.get(ENTITY_ID).attributes["attribution"]
    assert attribution == "Foto: © TVB Königsdorf"
    assert attribution != ATTRIBUTION
    # The readings next to it keep the data licence.
    temperature = hass.states.get("sensor.naturbadesee_konigsdorf_water_temperature")
    assert temperature.attributes["attribution"] == ATTRIBUTION


@pytest.mark.parametrize(
    "credits",
    [
        None,  # no credits.json at all
        {"AT0000000000000000": {"credit": "© someone else"}},  # site missing
        {NORMAL_SITE_ID: "© not an object"},  # malformed entry
    ],
)
async def test_a_photo_without_a_credit_line_is_credited_to_ages(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    photo_dir: Path,
    caplog: pytest.LogCaptureFixture,
    credits: object | None,
) -> None:
    """Shown anyway, credited to the site it came from, and logged."""
    _add_photo(photo_dir, credits)
    with caplog.at_level(logging.WARNING):
        await setup_entry(hass, config_entry)

    assert hass.states.get(ENTITY_ID).attributes["attribution"] == "Foto: © AGES"
    assert "No credit for the photo" in caplog.text


async def test_unreadable_credits_file_is_credited_to_ages(
    hass: HomeAssistant, config_entry: MockConfigEntry, photo_dir: Path
) -> None:
    """A half-written credits.json must not take the entity down with it."""
    _add_photo(photo_dir)
    (photo_dir / "credits.json").write_text("{not json", encoding="utf-8")
    await setup_entry(hass, config_entry)

    assert hass.states.get(ENTITY_ID).attributes["attribution"] == "Foto: © AGES"


async def test_state_is_the_photo_file_time(
    hass: HomeAssistant, config_entry: MockConfigEntry, photo_dir: Path
) -> None:
    """The state only moves when the photo on disk does."""
    path = _add_photo(photo_dir, {NORMAL_SITE_ID: {"credit": "© AGES"}})
    stamp = datetime(2026, 5, 12, 10, 38, tzinfo=UTC)
    os.utime(path, (stamp.timestamp(), stamp.timestamp()))
    await setup_entry(hass, config_entry)

    assert hass.states.get(ENTITY_ID).state == stamp.isoformat()


async def test_unique_id_follows_the_frozen_formula(
    hass: HomeAssistant,
    config_entry: MockConfigEntry,
    photo_dir: Path,
    entity_registry: er.EntityRegistry,
) -> None:
    """`<entry_id>_<key>`, like every other entity of the bathing water."""
    _add_photo(photo_dir, {NORMAL_SITE_ID: {"credit": "© AGES"}})
    await setup_entry(hass, config_entry)

    entry = entity_registry.async_get(ENTITY_ID)
    assert entry.unique_id == f"{config_entry.entry_id}_photo"
    assert entry.translation_key == "photo"
