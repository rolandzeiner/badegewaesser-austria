"""Config and options flow."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.config_flow import (
    CONF_BUNDESLAND,
    _format_distance,
)
from custom_components.badegewaesser_austria.const import (
    CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    CONF_SITE_ID,
    DOMAIN,
)
from custom_components.badegewaesser_austria.coordinator import async_get_coordinator
from tests.conftest import NORMAL_SITE_ID, NULL_ISLAND_SITE_ID


def option_values(result: dict, key: str = CONF_SITE_ID) -> list[str]:
    """The selector option values offered by a form step."""
    selector = result["data_schema"].schema[key]
    return [option["value"] for option in selector.config["options"]]


def option_labels(result: dict, key: str = CONF_SITE_ID) -> list[str]:
    """The selector option labels offered by a form step."""
    selector = result["data_schema"].schema[key]
    return [option["label"] for option in selector.config["options"]]


async def start(hass: HomeAssistant) -> dict:
    """Open the flow at its menu."""
    return await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )


# --- the menu --------------------------------------------------------------


async def test_user_step_offers_both_routes(hass: HomeAssistant) -> None:
    """Two ways in, because people arrive with two different questions."""
    result = await start(hass)
    assert result["type"] is FlowResultType.MENU
    assert set(result["menu_options"]) == {"bundesland", "nearby"}


# --- browse by province ----------------------------------------------------


async def test_bundesland_step_lists_the_provinces_present(
    hass: HomeAssistant,
) -> None:
    """Only provinces that actually carry bathing waters."""
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    assert result["step_id"] == "bundesland"
    assert option_values(result, CONF_BUNDESLAND) == [
        "Burgenland",
        "Salzburg",
        "Wien",
    ]


async def test_site_step_is_scoped_to_the_chosen_province(
    hass: HomeAssistant,
) -> None:
    """Picking Burgenland must not offer a lake in Vienna."""
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Wien"}
    )
    assert result["step_id"] == "site"
    labels = option_labels(result)
    assert len(labels) == 1
    assert "Neue Donau" in labels[0]


async def test_full_browse_flow_creates_the_entry(hass: HomeAssistant) -> None:
    """Province, then site, then an entry keyed on the AGES site id."""
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Burgenland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SITE_ID: NORMAL_SITE_ID}
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Naturbadesee Königsdorf"
    assert result["data"] == {CONF_SITE_ID: NORMAL_SITE_ID}
    assert result["result"].unique_id == NORMAL_SITE_ID


async def test_site_labels_carry_the_municipality(hass: HomeAssistant) -> None:
    """A name alone does not say where the lake is."""
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Burgenland"}
    )
    assert "Naturbadesee Königsdorf (Königsdorf)" in option_labels(result)


# --- near me ---------------------------------------------------------------


async def test_nearby_excludes_sites_with_no_position(
    hass: HomeAssistant, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The Null Island site must not be ranked as if (0, 0) were a location.

    Upstream sends "0"/"0" for one of the 260 sites. Taken literally that is
    ~5000 km away in the Gulf of Guinea, so it would sort last rather than
    look obviously broken — a silent wrong answer. That site now takes its
    profile position, so the fallback is emptied to test the general rule.
    """
    monkeypatch.setattr(
        "custom_components.badegewaesser_austria.api.COORDINATE_FALLBACKS", {}
    )
    hass.config.latitude = 48.2082
    hass.config.longitude = 16.3738

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "nearby"}
    )

    assert result["step_id"] == "nearby"
    assert NULL_ISLAND_SITE_ID not in option_values(result)
    assert NORMAL_SITE_ID in option_values(result)


async def test_nearby_is_ordered_by_distance(hass: HomeAssistant) -> None:
    """Closest first — that is the only thing this list is for."""
    hass.config.latitude = 48.2082  # Vienna
    hass.config.longitude = 16.3738

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "nearby"}
    )

    labels = option_labels(result)
    assert "Neue Donau" in labels[0], "the Vienna site should come first"
    distances = [float(label.rsplit(" ", 2)[-2].replace(",", ".")) for label in labels]
    assert distances == sorted(distances)


async def test_nearby_creates_the_entry(hass: HomeAssistant) -> None:
    """The near-me route ends at the same place as the browse route."""
    hass.config.latitude = 48.2082
    hass.config.longitude = 16.3738

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "nearby"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SITE_ID: NORMAL_SITE_ID}
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {CONF_SITE_ID: NORMAL_SITE_ID}


async def test_nearby_aborts_without_a_home_location(hass: HomeAssistant) -> None:
    """Ranking by distance from (0, 0) would be worse than saying so."""
    hass.config.latitude = 0.0
    hass.config.longitude = 0.0

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "nearby"}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_home_location"


@pytest.mark.parametrize(
    ("metres", "language", "expected"),
    [
        (4200, "de", "4,2 km"),
        (4200, "en", "4.2 km"),
        (134345, "de", "134 km"),
        (134345, "en", "134 km"),
        (950, "de-AT", "0,9 km"),  # 0.95 km formats down, not up
        (9990, "en", "10.0 km"),  # just under the one-decimal cutoff
        (0, "en", "0.0 km"),
    ],
)
def test_distance_formatting(metres: float, language: str, expected: str) -> None:
    """German writes 4,2 — and this integration's audience writes German."""
    assert _format_distance(metres, language) == expected


# --- guards ----------------------------------------------------------------


async def test_duplicate_site_is_rejected(hass: HomeAssistant) -> None:
    """One entry per bathing water; the site id is the identity."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_SITE_ID: NORMAL_SITE_ID},
        unique_id=NORMAL_SITE_ID,
    ).add_to_hass(hass)

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Burgenland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SITE_ID: NORMAL_SITE_ID}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_flow_aborts_when_upstream_is_down(
    hass: HomeAssistant, session: MagicMock
) -> None:
    """test-before-configure: no entry is created against an unreachable API."""
    session.get = MagicMock(side_effect=TimeoutError)

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "cannot_connect"


async def test_site_that_vanishes_mid_flow_aborts(hass: HomeAssistant) -> None:
    """A bathing water removed between rendering the form and submitting it.

    Note this is the ONLY way that abort is reachable. The selector is built
    with `custom_value=False`, so a value that was never offered is rejected
    by schema validation before the step runs — which is the selector doing
    its job. The real race is narrower: the dropdown was rendered from a
    snapshot, and the snapshot moved underneath it.
    """
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Burgenland"}
    )
    assert NORMAL_SITE_ID in option_values(result)

    coordinator = await async_get_coordinator(hass)
    assert coordinator.data is not None
    coordinator.data.pop(NORMAL_SITE_ID)

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SITE_ID: NORMAL_SITE_ID}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "unknown_site"


# --- options ---------------------------------------------------------------


async def test_options_flow_stores_both_intervals(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """Season and off-season are separate settings, not one."""
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(config_entry.entry_id)
    assert result["step_id"] == "init"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            CONF_SCAN_INTERVAL_SEASON_HOURS: 4,
            CONF_SCAN_INTERVAL_OFFSEASON_HOURS: 72,
        },
    )
    await hass.async_block_till_done()

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert config_entry.options == {
        CONF_SCAN_INTERVAL_SEASON_HOURS: 4,
        CONF_SCAN_INTERVAL_OFFSEASON_HOURS: 72,
    }


async def test_options_change_reloads_the_entry(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> None:
    """The update listener is the single reload owner.

    The flow deliberately uses `async_create_entry`, not a reloading variant:
    pairing an update listener with `async_update_reload_and_abort` is
    deprecated in HA 2026.6 and a hard error in 2026.12, and double-reloads
    today.
    """
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()

    with patch("homeassistant.config_entries.ConfigEntries.async_reload") as reload:
        result = await hass.config_entries.options.async_init(config_entry.entry_id)
        await hass.config_entries.options.async_configure(
            result["flow_id"],
            {
                CONF_SCAN_INTERVAL_SEASON_HOURS: 8,
                CONF_SCAN_INTERVAL_OFFSEASON_HOURS: 24,
            },
        )
        await hass.async_block_till_done()

    assert reload.call_count == 1


async def test_site_step_aborts_if_upstream_dies_mid_flow(
    hass: HomeAssistant, session: MagicMock
) -> None:
    """The dropdown is on screen, then AGES goes away before the user submits.

    The province step has its own guard, so getting here means rendering the
    site form successfully first and only then breaking the upstream — which
    is also the only sequence a real user could produce.
    """
    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "bundesland"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_BUNDESLAND: "Burgenland"}
    )
    assert result["step_id"] == "site"

    # Drop the cached snapshot so the next step has to go to the network,
    # then take the network away.
    coordinator = await async_get_coordinator(hass)
    coordinator.data.clear()
    session.get = MagicMock(side_effect=TimeoutError)

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_SITE_ID: NORMAL_SITE_ID}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "cannot_connect"


async def test_nearby_step_aborts_if_upstream_is_down(
    hass: HomeAssistant, session: MagicMock
) -> None:
    """Same guarantee on the near-me route."""
    hass.config.latitude = 48.2082
    hass.config.longitude = 16.3738
    session.get = MagicMock(side_effect=TimeoutError)

    result = await start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": "nearby"}
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "cannot_connect"
