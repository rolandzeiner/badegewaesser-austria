"""Shared pytest fixtures for Badegewässer Austria tests."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from pytest_homeassistant_custom_component.syrupy import HomeAssistantSnapshotExtension
from syrupy.assertion import SnapshotAssertion

pytest_plugins = "pytest_homeassistant_custom_component"


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
