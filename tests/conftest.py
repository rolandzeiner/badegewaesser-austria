"""Shared pytest fixtures for Badegewässer Austria tests."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.syrupy import HomeAssistantSnapshotExtension
from syrupy.assertion import SnapshotAssertion

from custom_components.badegewaesser_austria.const import CONF_SITE_ID, DOMAIN

# The ordinary Burgenland site in the fixture: rating A via 2025, five
# samples, both analytes below the detection limit.
NORMAL_SITE_ID = "AT1051051100150010"
# Synthetic rows for states the live document has never been in.
CLOSED_SITE_ID = "AT9999999999999001"
UNRATED_SITE_ID = "AT9999999999999002"
NEVER_SAMPLED_SITE_ID = "AT9999999999999003"
# Ships LONGITUDE/LATITUDE of "0" upstream.
NULL_ISLAND_SITE_ID = "AT3230004400240040"

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(
    enable_custom_integrations: None,
) -> None:
    """Let PHACC load `custom_components/` at all.

    Without it every `async_setup` fails with "Integration not found" and the
    failure looks like a bug in this integration rather than a missing test
    wiring.
    """


@pytest.fixture(autouse=True)
def no_deprecated_ha_api(
    request: pytest.FixtureRequest, caplog: pytest.LogCaptureFixture
) -> Generator[None]:
    """Fail any test that trips Home Assistant's deprecation channel.

    `frame.report_usage` logs through `_LOGGER.warning` and never calls
    `warnings.warn`, so `pytest.ini`'s `error::DeprecationWarning` filter
    cannot see it. This is that filter's counterpart for HA's own channel,
    and it runs on every test rather than on one.

    HA emits two message shapes and picks the severity tier from whichever
    applies (`homeassistant/helpers/frame.py`):

    - "Detected that custom integration '<x>' ..." when the stack walk finds
      our integration. Governed by `custom_integration_behavior`, the most
      lenient tier — it is still LOG long after core has moved on.
    - "Detected code that ..." when HA cannot attribute the call to any
      integration, which is exactly what happens for a call made from a
      *test* file. Governed by `core_behavior`, the strictest tier, and so
      the first to turn a warning into a `RuntimeError`.

    Watching only the first shape is what let `device_registry.async_get_device`
    reach a hard CI failure across three portfolio repos on 2026-08-29. The
    deprecation had been logging since HA 2026.7, but only ever from the test
    file, so a single-shape tripwire never saw it. Catching both shapes means
    a deprecation fails the build while it is still a warning in our tier,
    which makes the eventual flip to ERROR a no-op.

    Records are read per phase via `get_records`, not from `caplog.text`:
    pytest installs a fresh handler for each of setup/call/teardown, so by the
    time this finaliser runs `caplog.text` holds teardown records only and
    would miss everything the test body logged.

    Opt out for a test that asserts deprecation behaviour on purpose:

        @pytest.mark.allow_deprecated_ha_api
    """
    yield
    if request.node.get_closest_marker("allow_deprecated_ha_api"):
        return
    hits = [
        message
        for phase in ("setup", "call")
        for record in caplog.get_records(phase)
        if (message := record.getMessage()).startswith(
            ("Detected that ", "Detected code that ")
        )
    ]
    if hits:
        pytest.fail(
            "Home Assistant reported deprecated API use:\n  " + "\n  ".join(hits),
            pytrace=False,
        )


@pytest.fixture
def snapshot(snapshot: SnapshotAssertion) -> SnapshotAssertion:
    """Use the HA snapshot extension so diagnostics / state dumps diff cleanly.

    Create/update snapshots with: pytest --snapshot-update
    Stored under tests/snapshots/ next to the test module.
    """
    return snapshot.use_extension(HomeAssistantSnapshotExtension)


@pytest.fixture(name="document")
def document_fixture() -> bytes:
    """The recorded AGES document, as it arrives off the wire."""
    return (Path(__file__).parent / "fixtures" / "badegewaesser_db.json").read_bytes()


def _response_cm(body: bytes, status: int = 200) -> MagicMock:
    """One `async with session.get(...)` context manager."""
    response = MagicMock()
    response.status = status
    response.read = AsyncMock(return_value=body)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=response)
    cm.__aexit__ = AsyncMock(return_value=None)
    return cm


@pytest.fixture(name="session")
def session_fixture(document: bytes) -> MagicMock:
    """A session that answers every GET with the recorded document.

    Patched in at `async_get_clientsession`, i.e. the lowest I/O boundary, so
    the real client, the real digest and the real parser all run. Only the
    socket is fake.
    """
    session = MagicMock()
    session.get = MagicMock(side_effect=lambda *a, **kw: _response_cm(document))
    return session


@pytest.fixture(autouse=True)
def patched_clientsession(session: MagicMock) -> Generator[MagicMock]:
    """Autouse so no test can reach the real AGES endpoint."""
    with patch(
        "custom_components.badegewaesser_austria.coordinator.async_get_clientsession",
        return_value=session,
    ):
        yield session


@pytest.fixture(autouse=True)
def _reset_shared_coordinator() -> Generator[None]:
    """Keep the domain-wide coordinator from leaking between tests.

    It is memoised in `hass.data`, which PHACC rebuilds per test, so nothing
    actually leaks today. The fixture is here to make that dependency
    explicit rather than accidental.
    """
    yield


@pytest.fixture(name="config_entry")
def config_entry_fixture() -> MockConfigEntry:
    """An entry for the fixture document's ordinary bathing water."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Naturbadesee Königsdorf",
        data={CONF_SITE_ID: NORMAL_SITE_ID},
        unique_id=NORMAL_SITE_ID,
    )


async def setup_entry(hass: HomeAssistant, entry: MockConfigEntry) -> MockConfigEntry:
    """Add and set up an entry, asserting it actually loaded."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry
