"""Tests for the domain-wide upstream-outage Repairs issue (outage.py)."""

from __future__ import annotations

from contextlib import suppress
from datetime import timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.update_coordinator import UpdateFailed
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.api import BadegewaesserApiError
from custom_components.badegewaesser_austria.const import DOMAIN
from custom_components.badegewaesser_austria.coordinator import (
    BadegewaesserCoordinator,
    async_get_coordinator,
)
from custom_components.badegewaesser_austria.outage import (
    OUTAGE_DATA,
    OUTAGE_ISSUE_ID,
    OUTAGE_MIN_SECONDS,
    Fault,
    async_clear_outage,
    async_note_fault,
    classify,
)

_PAST_THRESHOLD = timedelta(seconds=OUTAGE_MIN_SECONDS + 1)


def _answer(
    session: MagicMock,
    body: bytes = b"",
    *,
    status: int = 200,
    exc: BaseException | None = None,
) -> None:
    """Make every later GET answer with `body` and `status`, or raise `exc`."""

    def _get(*_args: Any, **_kwargs: Any) -> MagicMock:
        if exc is not None:
            raise exc
        response = MagicMock()
        response.status = status
        response.read = AsyncMock(return_value=body)
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=response)
        cm.__aexit__ = AsyncMock(return_value=None)
        return cm

    session.get = MagicMock(side_effect=_get)


async def _fetch(coordinator: BadegewaesserCoordinator) -> None:
    """One real document request through the coordinator."""
    with suppress(UpdateFailed):
        await coordinator._async_update_data()


def _issue(hass: HomeAssistant) -> ir.IssueEntry | None:
    return ir.async_get(hass).async_get_issue(DOMAIN, OUTAGE_ISSUE_ID)


@pytest.mark.parametrize(
    ("err", "expected"),
    [
        (
            BadegewaesserApiError("invalid_response", "HTTP 502", status=502),
            Fault.OUTAGE,
        ),
        (
            BadegewaesserApiError("invalid_response", "HTTP 500", status=500),
            Fault.OUTAGE,
        ),
        (
            BadegewaesserApiError("invalid_response", "HTTP 503", status=503),
            Fault.OUTAGE,
        ),
        (BadegewaesserApiError("malformed_payload", "not JSON"), Fault.OUTAGE),
        (
            BadegewaesserApiError("invalid_response", "HTTP 404", status=404),
            Fault.ANSWERED,
        ),
        (
            BadegewaesserApiError("invalid_response", "HTTP 429", status=429),
            Fault.ANSWERED,
        ),
        (
            BadegewaesserApiError("cannot_connect", "request timed out"),
            Fault.INCONCLUSIVE,
        ),
        (BadegewaesserApiError("cannot_connect", "refused"), Fault.INCONCLUSIVE),
        (RuntimeError("unforeseen"), Fault.INCONCLUSIVE),
    ],
)
def test_classify(err: Exception, expected: Fault) -> None:
    """Only failures that prove a broken server count against AGES."""
    assert classify(err) is expected


async def test_issue_appears_only_after_the_threshold(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """A 502 starts the clock; the issue waits until it has run out."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, status=502)
    await _fetch(coordinator)
    assert _issue(hass) is None

    freezer.tick(timedelta(seconds=OUTAGE_MIN_SECONDS - 60))
    await _fetch(coordinator)
    assert _issue(hass) is None

    freezer.tick(timedelta(seconds=61))
    await _fetch(coordinator)
    issue = _issue(hass)
    assert issue is not None
    assert issue.translation_key == OUTAGE_ISSUE_ID
    assert issue.severity is ir.IssueSeverity.WARNING
    assert issue.is_fixable is False
    assert issue.is_persistent is False


async def test_one_fault_never_raises_however_long_ago_it_began(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The time alone isn't enough; the outage needs a second fault."""
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(_PAST_THRESHOLD * 10)
    assert _issue(hass) is None
    assert hass.data[OUTAGE_DATA][""].failures == 1


async def test_two_faults_inside_the_window_raise_nothing(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Back-to-back setup retries after a restart must not raise the issue."""
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(timedelta(seconds=10))
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(timedelta(seconds=20))
    async_note_fault(hass, Fault.OUTAGE)
    assert _issue(hass) is None


async def test_recovery_clears_the_issue(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
    document: bytes,
) -> None:
    """The first good answer ends the outage and removes the issue."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, status=503)
    await _fetch(coordinator)
    freezer.tick(_PAST_THRESHOLD)
    await _fetch(coordinator)
    assert _issue(hass) is not None

    _answer(session, document)
    await _fetch(coordinator)
    assert _issue(hass) is None
    assert "" not in hass.data[OUTAGE_DATA]

    # The next outage has to earn its own threshold again.
    _answer(session, status=503)
    await _fetch(coordinator)
    assert _issue(hass) is None


async def test_an_unchanged_document_is_an_answer(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
    document: bytes,
) -> None:
    """The digest short-circuit still means AGES answered with a real file."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, document)
    await _fetch(coordinator)
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(_PAST_THRESHOLD)
    await _fetch(coordinator)
    async_note_fault(hass, Fault.OUTAGE)
    assert _issue(hass) is None


async def test_an_unreadable_body_counts_as_an_outage(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """A 200 whose body isn't the document is a fault on AGES's side."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, b"<html>Wartung</html>")
    await _fetch(coordinator)
    freezer.tick(_PAST_THRESHOLD)
    _answer(session, b'["not", "an", "object"]')
    await _fetch(coordinator)
    assert _issue(hass) is not None


async def test_network_errors_never_start_the_clock(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """Timeouts and connection errors can be the user's own network."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, exc=TimeoutError())
    await _fetch(coordinator)
    freezer.tick(_PAST_THRESHOLD)
    _answer(session, exc=aiohttp.ClientConnectionError("refused"))
    await _fetch(coordinator)
    _answer(session, status=502)
    await _fetch(coordinator)
    assert _issue(hass) is None


async def test_network_errors_keep_a_running_outage_going(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """A timeout in the middle of an outage doesn't reset its clock."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, status=502)
    await _fetch(coordinator)
    freezer.tick(_PAST_THRESHOLD)
    _answer(session, exc=TimeoutError())
    await _fetch(coordinator)
    _answer(session, status=502)
    await _fetch(coordinator)
    assert _issue(hass) is not None


async def test_a_real_client_error_answer_ends_the_outage(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """A 404 comes from a working server, so the clock starts over."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, status=502)
    await _fetch(coordinator)
    freezer.tick(timedelta(seconds=OUTAGE_MIN_SECONDS - 60))
    _answer(session, status=404)
    await _fetch(coordinator)
    freezer.tick(timedelta(seconds=120))
    _answer(session, status=502)
    await _fetch(coordinator)
    assert _issue(hass) is None


async def test_a_local_parse_bug_is_not_an_outage(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
    document: bytes,
) -> None:
    """A crash after the request succeeded must not read as AGES's fault."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, document)
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(_PAST_THRESHOLD)
    with (
        patch(
            "custom_components.badegewaesser_austria.api.parse_document",
            side_effect=KeyError("BUNDESLAENDER"),
        ),
        pytest.raises(KeyError),
    ):
        await coordinator._async_update_data()
    assert _issue(hass) is None
    assert hass.data[OUTAGE_DATA][""].failures == 1


async def test_issue_is_created_once(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Later failures leave the raised issue alone instead of re-creating it."""
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(_PAST_THRESHOLD)
    with patch(
        "custom_components.badegewaesser_austria.outage.ir.async_create_issue"
    ) as create:
        async_note_fault(hass, Fault.OUTAGE)
        async_note_fault(hass, Fault.OUTAGE)
    assert create.call_count == 1


async def test_scopes_keep_separate_clocks_and_issues(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A scoped outage gets its own issue id and doesn't touch the others."""
    async_note_fault(hass, Fault.OUTAGE, scope="a", placeholders={"name": "A"})
    async_note_fault(hass, Fault.OUTAGE, scope="b")
    freezer.tick(_PAST_THRESHOLD)
    async_note_fault(hass, Fault.OUTAGE, scope="a", placeholders={"name": "A"})
    registry = ir.async_get(hass)
    issue = registry.async_get_issue(DOMAIN, f"{OUTAGE_ISSUE_ID}_a")
    assert issue is not None
    assert issue.translation_placeholders == {"name": "A"}
    assert registry.async_get_issue(DOMAIN, f"{OUTAGE_ISSUE_ID}_b") is None

    async_clear_outage(hass, "a")
    assert registry.async_get_issue(DOMAIN, f"{OUTAGE_ISSUE_ID}_a") is None
    assert set(hass.data[OUTAGE_DATA]) == {"b"}


async def test_clear_outage_forgets_state_and_issue(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Removing the last entry drops both the clock and the issue."""
    async_note_fault(hass, Fault.OUTAGE)
    freezer.tick(_PAST_THRESHOLD)
    async_note_fault(hass, Fault.OUTAGE)
    assert _issue(hass) is not None

    async_clear_outage(hass)
    assert _issue(hass) is None
    assert OUTAGE_DATA not in hass.data


async def test_the_coordinator_key_is_left_alone(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, session: MagicMock
) -> None:
    """`hass.data[DOMAIN]` is the coordinator, so the state must live elsewhere."""
    coordinator = await async_get_coordinator(hass)
    _answer(session, status=503)
    await _fetch(coordinator)
    freezer.tick(_PAST_THRESHOLD)
    await _fetch(coordinator)
    assert _issue(hass) is not None
    assert hass.data[DOMAIN] is coordinator


async def test_removing_the_last_entry_clears_the_outage(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
    config_entry: MockConfigEntry,
) -> None:
    """The issue can't outlive the integration: the last removal drops it."""
    _answer(session, status=502)
    config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    freezer.tick(_PAST_THRESHOLD)
    await hass.config_entries.async_reload(config_entry.entry_id)
    await hass.async_block_till_done()
    assert _issue(hass) is not None

    assert await hass.config_entries.async_remove(config_entry.entry_id)
    await hass.async_block_till_done()
    assert _issue(hass) is None
    assert OUTAGE_DATA not in hass.data


async def test_entries_in_setup_retry_raise_and_clear_the_issue(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    session: MagicMock,
    document: bytes,
    config_entry: MockConfigEntry,
) -> None:
    """An upstream outage, end to end through real config-entry setups.

    The shape of the 2026-10-21 incident, when AGES answered 503 for an
    afternoon: every entry sits in setup retry and no coordinator timer runs.
    The setup attempts themselves have to feed the clock, or the issue never
    appears in exactly the case it was built for. Pinned here because nobody
    can stage a real outage to check.
    """
    _answer(session, status=503)
    config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.SETUP_RETRY
    assert _issue(hass) is None

    freezer.tick(_PAST_THRESHOLD)
    await hass.config_entries.async_reload(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.SETUP_RETRY
    assert _issue(hass) is not None

    _answer(session, document)
    await hass.config_entries.async_reload(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.LOADED
    assert _issue(hass) is None
