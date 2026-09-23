"""Image platform: a photo of the bathing water.

The photos are AGES's own site pictures, built into `photos/` by
`scripts/build_photos.py`. That folder is not in git (the script says why), so
an install without it gets no image entity and nothing else changes. Only
sites with a photo get the entity: 259 of 260 when measured, since AGES has
none for Naturbadesee Königsdorf.

Served through Home Assistant's image proxy rather than a static path. The
browser only ever talks to Home Assistant, and only an authenticated session
can load a photo; a static path would have put every picture on the open web
for any install reachable from outside.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from homeassistant.components.image import ImageEntity, ImageEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import BadegewaesserConfigEntry
from .const import (
    PHOTO_CONTENT_TYPE,
    PHOTO_CREDITS_FILE,
    PHOTO_DIR_NAME,
    PHOTO_FALLBACK_CREDIT,
)
from .entity import BadegewaesserEntity

_LOGGER = logging.getLogger(__name__)

# Module-level so tests can point it at a folder of their own.
PHOTO_DIR = Path(__file__).parent / PHOTO_DIR_NAME

# Reads a local file; nothing to serialise.
PARALLEL_UPDATES = 0

PHOTO = ImageEntityDescription(key="photo", translation_key="photo")


@dataclass(frozen=True, slots=True)
class Photo:
    """One bathing water's photo on disk, and whom to credit for it."""

    path: Path
    credit: str
    updated: datetime


def load_photo(site_id: str) -> Photo | None:
    """Find a site's photo and its credit. Blocking; run in the executor."""
    path = PHOTO_DIR / f"{site_id}.webp"
    if not path.is_file():
        return None
    try:
        credits = json.loads(
            (PHOTO_DIR / PHOTO_CREDITS_FILE).read_text(encoding="utf-8")
        )
        credit = str(credits[site_id]["credit"])
    except (OSError, ValueError, KeyError, TypeError):
        # A photo without a credit line is still shown, credited to AGES,
        # whose site it came from — but say so, because a missing entry means
        # the build and the folder have drifted apart.
        _LOGGER.warning(
            "No credit for the photo of %s in %s; crediting AGES",
            site_id,
            PHOTO_CREDITS_FILE,
        )
        credit = PHOTO_FALLBACK_CREDIT
    # The file's own timestamp, so the state only moves when the photo does.
    updated = datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)
    return Photo(path=path, credit=credit, updated=updated)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BadegewaesserConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the photo entity, if this bathing water has a photo."""
    photo = await hass.async_add_executor_job(load_photo, entry.runtime_data.site_id)
    if photo is not None:
        async_add_entities([BadegewaesserPhoto(hass, entry, photo)])


class BadegewaesserPhoto(BadegewaesserEntity, ImageEntity):
    """A photo of the bathing water, with its credit as the attribution."""

    _attr_content_type = PHOTO_CONTENT_TYPE

    def __init__(
        self, hass: HomeAssistant, entry: BadegewaesserConfigEntry, photo: Photo
    ) -> None:
        """Bind the photo to its bathing water."""
        super().__init__(entry, PHOTO)
        # The coordinator base never calls up the MRO, so ImageEntity's own
        # setup (access tokens for the proxy URL) has to be invoked by hand.
        ImageEntity.__init__(self, hass)
        self._photo = photo
        # Replaces the data attribution: the photo is not CC BY 3.0 AT, and
        # labelling it so would misstate its licence.
        self._attr_attribution = f"Foto: {photo.credit}"
        self._attr_image_last_updated = photo.updated

    async def async_image(self) -> bytes | None:
        """The WebP as it sits on disk."""
        return await self.hass.async_add_executor_job(self._photo.path.read_bytes)
