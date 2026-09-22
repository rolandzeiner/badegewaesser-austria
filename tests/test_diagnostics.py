"""Diagnostics envelope and its redaction surface.

Two complementary checks, because neither alone is enough: a sentinel grep
catches a secret that leaks through a field nobody thought about, and a shape
assertion catches the structure changing under a field that was fine
yesterday. A per-field assertion catches neither.
"""

from __future__ import annotations

import json
from typing import Any

from homeassistant.components.diagnostics import REDACTED
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.diagnostics import (
    async_get_config_entry_diagnostics,
)
from tests.conftest import NORMAL_SITE_ID, setup_entry

SENTINEL = "sup3r-s3cret-sentinel-value"


async def dump(hass: HomeAssistant, entry: MockConfigEntry) -> dict[str, Any]:
    """The diagnostics payload for an entry."""
    return await async_get_config_entry_diagnostics(hass, entry)


async def test_envelope_shape(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The portfolio envelope: attribution, entry, coordinator, then payload."""
    await setup_entry(hass, config_entry)
    diagnostics = await dump(hass, config_entry)

    assert set(diagnostics) == {"attribution", "entry", "coordinator", "site"}
    assert set(diagnostics["entry"]) == {"title", "version", "data", "options"}
    assert "AGES" in diagnostics["attribution"]
    assert "CC BY 3.0 AT" in diagnostics["attribution"]


async def test_coordinator_block_reports_counts_not_payloads(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Every bathing water but this entry's is a count, not a record.

    260 sites in the document, one of which this entry is about. Dumping all
    of them into an issue thread would be noise at best.
    """
    await setup_entry(hass, config_entry)
    block = (await dump(hass, config_entry))["coordinator"]

    assert block["sites_in_document"] == 6
    assert block["entries_sharing_this_coordinator"] == 1
    assert block["last_update_success"] is True
    assert block["consecutive_failures"] == 0
    assert isinstance(block["content_digest"], str)
    assert block["upstream_version"] == "121625"
    assert "in_season" in block


async def test_conditional_get_absence_is_stated(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Said out loud, because a sibling integration's dump has a validator.

    A maintainer comparing two dumps would otherwise read the missing field
    as a bug rather than a decision.
    """
    await setup_entry(hass, config_entry)
    block = (await dump(hass, config_entry))["coordinator"]
    assert "not used" in block["conditional_get"]


async def test_the_configured_site_is_included(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """This one record is public register data and is what any bug is about."""
    await setup_entry(hass, config_entry)
    site = (await dump(hass, config_entry))["site"]

    assert site["site_id"] == NORMAL_SITE_ID
    assert site["name"] == "Naturbadesee Königsdorf"
    # The dump carries the raw AGES letter, not the HA state name.
    assert site["rating"] == "A"
    assert len(site["samples"]) == 5
    # Dates must survive as readable strings, not repr() of a date object.
    assert site["samples"][0]["sampled_on"] == "2026-08-20"


async def test_contact_details_are_redacted(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Public, but free to redact — and a missed one costs a disclosure."""
    await setup_entry(hass, config_entry)
    contact = (await dump(hass, config_entry))["site"]["contact"]

    assert contact["email"] == REDACTED
    assert contact["phone"] == REDACTED
    # The authority itself stays, because that is the useful half.
    assert contact["authority"] == "Bezirkshauptmannschaft Jennersdorf"


async def test_no_secret_survives_anywhere_in_the_dump(
    hass: HomeAssistant,
) -> None:
    """The grep that catches a field nobody thought about.

    This upstream needs no credentials today, so the redaction set is mostly
    forward-looking. That is exactly when a sentinel test earns its keep: the
    day a token field appears, this fails instead of shipping it.
    """
    entry = MockConfigEntry(
        domain="badegewaesser_austria",
        title="Naturbadesee Königsdorf",
        data={"site_id": NORMAL_SITE_ID, "api_key": SENTINEL},
        options={"token": SENTINEL, "password": SENTINEL},
        unique_id=NORMAL_SITE_ID,
    )
    await setup_entry(hass, entry)

    serialised = json.dumps(await dump(hass, entry), default=str)
    assert SENTINEL not in serialised


async def test_missing_site_dumps_none_without_raising(
    hass: HomeAssistant,
) -> None:
    """Diagnostics must still work for the entry you most want to debug."""
    entry = MockConfigEntry(
        domain="badegewaesser_austria",
        title="Weggefallener See",
        data={"site_id": "AT0000000000000000"},
        unique_id="AT0000000000000000",
    )
    await setup_entry(hass, entry)

    diagnostics = await dump(hass, entry)
    assert diagnostics["site"] is None
    assert diagnostics["coordinator"]["last_update_success"] is True


async def test_dump_is_json_serialisable(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """HA serialises this to JSON for download; a stray date object would 500."""
    await setup_entry(hass, config_entry)
    json.dumps(await dump(hass, config_entry))
