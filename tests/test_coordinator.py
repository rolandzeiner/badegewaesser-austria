"""Coordinator cadence, backoff, and the one-request-per-poll guarantee.

The backoff and interval arithmetic is the kind of thing that keeps "working"
while being wrong — a doubling that never resets, or a floor that only exists
in the options form, produces no error anywhere. It is asserted directly.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import UpdateFailed
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.badegewaesser_austria.api import (
    BadegewaesserApiError,
    BadegewaesserClient,
)
from custom_components.badegewaesser_austria.const import (
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    CONF_SITE_ID,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    DOMAIN,
    LATE_RESULTS_POLL_HOURS,
    MAX_POLL_HOURS,
    MAX_SNAPSHOT_AGE_HOURS,
    MIN_POLL_HOURS,
    POLL_JITTER_SECONDS,
    WAKE_SPREAD_SECONDS,
)
from custom_components.badegewaesser_austria.coordinator import (
    BadegewaesserCoordinator,
    async_get_coordinator,
    clamp_poll_hours,
    is_in_season,
    is_late_results_window,
    is_monitoring_window,
    next_monitoring_start,
)
from tests.test_api import NORMAL, fixture_bytes, make_session


def build_coordinator(
    hass: HomeAssistant, session: MagicMock | None = None
) -> BadegewaesserCoordinator:
    """A coordinator with jitter pinned to zero so intervals are exact."""
    client = BadegewaesserClient(session or make_session(fixture_bytes()))
    return BadegewaesserCoordinator(hass, client, jitter=lambda _spread: 0.0)


def hours(coordinator: BadegewaesserCoordinator) -> float:
    """The current interval, in hours."""
    assert coordinator.update_interval is not None
    return coordinator.update_interval.total_seconds() / 3600


# --- season ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 6, 14), False),  # day before the statute opens it
        (date(2026, 6, 15), True),  # BGewV § 4 start
        (date(2026, 8, 31), True),  # BGewV § 4 end
        (date(2026, 9, 1), False),  # day after
        (date(2026, 9, 22), False),  # the day the card wrongly said "läuft"
        (date(2026, 5, 26), False),  # earliest sample of the year — pre-season
        (date(2026, 1, 15), False),  # deep winter
    ],
)
def test_legal_bathing_season(day: date, expected: bool) -> None:
    """The `Badesaison` sensor reports the statute, nothing else.

    Badegewässerverordnung § 4: "Die Badesaison ist der Zeitraum vom 15. Juni
    bis 31. August eines jeden Kalenderjahres."

    This was 15 May to 30 September until 2026-09-22 — the GERMAN definition,
    applied to an Austrian integration by mistake. The symptom was the card
    reporting "Badesaison läuft" on 22 September, five weeks after the last
    sample of the year.
    """
    assert is_in_season(day) is expected


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 5, 14), False),
        (date(2026, 5, 15), True),  # window opens
        (date(2026, 5, 26), True),  # earliest pre-season sample observed
        (date(2026, 6, 10), True),  # latest pre-season sample observed
        (date(2026, 6, 15), True),  # legal season starts inside the window
        (date(2026, 8, 31), True),  # both end here
        (date(2026, 9, 1), False),
        (date(2027, 2, 28), False),
    ],
)
def test_monitoring_window(day: date, expected: bool) -> None:
    """The cadence follows when data can move, which is wider at the front.

    Every bathing water gets one mandated pre-season sample (Anlage 3, "Kurz
    vor Beginn jeder Badesaison ist eine Probenahme vorzunehmen"), and all 260
    of them landed between 26 May and 10 June. Polling on the legal season
    alone would sleep through every one of them at the 24-hour cadence.
    """
    assert is_monitoring_window(day) is expected


def test_the_two_windows_are_not_the_same_thing() -> None:
    """They answer different questions, and collapsing them caused the bug.

    Either the sensor lies in September, or the poll sleeps through the
    pre-season sample. Both windows end on 31 August; only the start differs.
    """
    pre_season = date(2026, 5, 26)
    assert is_monitoring_window(pre_season) is True
    assert is_in_season(pre_season) is False

    for day in (date(2026, 8, 31), date(2026, 9, 1)):
        assert is_in_season(day) == is_monitoring_window(day), day


# --- interval floor / ceiling ----------------------------------------------


@pytest.mark.parametrize(
    ("configured", "expected"),
    [
        (6, 6),
        (1, MIN_POLL_HOURS),  # below the floor
        (0, MIN_POLL_HOURS),
        (-5, MIN_POLL_HOURS),
        (9999, MAX_POLL_HOURS),  # above the ceiling
        ("12", 12),  # numeric string from a stored option
        (6.7, 6),
    ],
)
def test_clamp_poll_hours(configured: object, expected: int) -> None:
    """The floor is enforced in code, not only in the options-form hints.

    A user editing the stored entry directly must not be able to poll faster
    than MIN_POLL_HOURS.
    """
    assert clamp_poll_hours(configured, DEFAULT_SCAN_INTERVAL_SEASON_HOURS) == expected


@pytest.mark.parametrize("configured", [None, "", "abc", {}, []])
def test_clamp_falls_back_on_a_corrupt_option(configured: object) -> None:
    """A junk option must not take the integration down."""
    assert clamp_poll_hours(configured, 6) == 6


# --- cadence ---------------------------------------------------------------


async def test_in_season_uses_the_season_default(hass: HomeAssistant) -> None:
    """With no entries configured, the season default applies."""
    coordinator = build_coordinator(hass)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator.update_interval = coordinator._compute_interval()
    assert hours(coordinator) == DEFAULT_SCAN_INTERVAL_SEASON_HOURS


async def test_shortest_configured_interval_wins(hass: HomeAssistant) -> None:
    """One shared poller cannot honour several cadences at once.

    It polls at the shortest any entry asks for: that entry's freshness
    expectation is the binding one, and the others get fresher data for free
    because the request is shared anyway.
    """
    for index, configured in enumerate((12, 4, 24)):
        MockConfigEntry(
            domain=DOMAIN,
            data={CONF_SITE_ID: f"site-{index}"},
            options={CONF_SCAN_INTERVAL_SEASON_HOURS: configured},
            unique_id=f"site-{index}",
        ).add_to_hass(hass)

    coordinator = build_coordinator(hass)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator.update_interval = coordinator._compute_interval()

    assert hours(coordinator) == 4


async def test_a_below_floor_option_is_clamped_not_honoured(
    hass: HomeAssistant,
) -> None:
    """An entry asking for 1 h still gets the floor."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_SITE_ID: "x"},
        options={CONF_SCAN_INTERVAL_SEASON_HOURS: 1},
        unique_id="x",
    ).add_to_hass(hass)

    coordinator = build_coordinator(hass)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator.update_interval = coordinator._compute_interval()

    assert hours(coordinator) == MIN_POLL_HOURS


async def test_jitter_is_added_to_every_cycle(hass: HomeAssistant) -> None:
    """Spreads installs, and stops a fleet re-synchronising after an outage."""
    client = BadegewaesserClient(make_session(fixture_bytes()))
    coordinator = BadegewaesserCoordinator(hass, client, jitter=lambda _spread: 300.0)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator.update_interval = coordinator._compute_interval()
    assert coordinator.update_interval == timedelta(
        hours=DEFAULT_SCAN_INTERVAL_SEASON_HOURS, seconds=300
    )


# --- the year's schedule --------------------------------------------------
#
# 15 May - 31 Aug at the season interval, September daily for late lab
# results, and from October to 14 May nothing: the next poll is the one that
# opens the window. These run on Vienna time, frozen, because the boundaries
# are local midnights and the wake-up spans a DST change.


@pytest.fixture
async def vienna(hass: HomeAssistant) -> None:
    """Austrian time, not the test harness's default zone."""
    await hass.config.async_set_time_zone("Europe/Vienna")


def at(freezer: FrozenDateTimeFactory, *parts: int) -> None:
    """Freeze at a Vienna wall-clock time."""
    freezer.move_to(datetime(*parts, tzinfo=dt_util.get_default_time_zone()))


def lands_at(coordinator: BadegewaesserCoordinator) -> datetime:
    """The local wall-clock time the next poll is due."""
    assert coordinator.update_interval is not None
    return dt_util.as_local(dt_util.utcnow() + coordinator.update_interval)


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 8, 31), False),  # still the monitoring window
        (date(2026, 9, 1), True),
        (date(2026, 9, 30), True),
        (date(2026, 10, 1), False),
    ],
)
def test_late_results_window(day: date, expected: bool) -> None:
    """September, for the results of August's last samples."""
    assert is_late_results_window(day) is expected


@pytest.mark.usefixtures("vienna")
async def test_september_polls_daily(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    at(freezer, 2026, 9, 10, 12, 0)
    coordinator = build_coordinator(hass)
    assert hours(coordinator) == LATE_RESULTS_POLL_HOURS


@pytest.mark.usefixtures("vienna")
async def test_september_never_polls_faster_than_the_season(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Someone who set the season to every two days gets no daily tail."""
    _entry_asking_for(hass, 48)
    at(freezer, 2026, 9, 10, 12, 0)
    coordinator = build_coordinator(hass)
    assert hours(coordinator) == 48


@pytest.mark.usefixtures("vienna")
@pytest.mark.parametrize(
    ("now", "wake_year"),
    [
        ((2026, 11, 3, 12, 0), 2027),  # autumn: next year's window
        ((2027, 3, 1, 9, 30), 2027),  # spring: this year's
        ((2027, 5, 14, 23, 59), 2027),  # the last minute of it
    ],
)
async def test_dormant_months_sleep_until_the_window_opens(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    now: tuple[int, ...],
    wake_year: int,
) -> None:
    """To the minute: local midnight on 15 May, whatever DST did in between.

    Both autumn cases cross the March change to summer time. Subtracting two
    local times in one zone ignores the offset, which would land at 01:00.
    """
    at(freezer, *now)
    coordinator = build_coordinator(hass)
    assert lands_at(coordinator) == datetime(
        wake_year, 5, 15, tzinfo=dt_util.get_default_time_zone()
    )


def test_next_monitoring_start_is_always_ahead() -> None:
    zone = dt_util.get_default_time_zone()
    assert next_monitoring_start(datetime(2026, 10, 1, tzinfo=zone)).year == 2027
    assert next_monitoring_start(datetime(2027, 1, 1, tzinfo=zone)).year == 2027


@pytest.mark.usefixtures("vienna")
async def test_the_tail_ends_without_a_stray_october_poll(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A September poll whose successor would fall in October wakes in May."""
    at(freezer, 2026, 9, 30, 20, 0)
    coordinator = build_coordinator(hass)
    assert lands_at(coordinator).date() == date(2027, 5, 15)


@pytest.mark.usefixtures("vienna")
async def test_the_season_rolls_into_the_tail(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """31 August at 22:00 plus six hours is 1 September, which still polls."""
    at(freezer, 2026, 8, 31, 22, 0)
    coordinator = build_coordinator(hass)
    assert hours(coordinator) == DEFAULT_SCAN_INTERVAL_SEASON_HOURS


@pytest.mark.usefixtures("vienna")
async def test_the_wake_up_is_spread_wider_than_a_poll(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Every install wakes on 15 May, so ten minutes of jitter is not enough."""
    spreads: list[float] = []

    def record(spread: float) -> float:
        spreads.append(spread)
        return 0.0

    client = BadegewaesserClient(make_session(fixture_bytes()))
    at(freezer, 2026, 11, 3, 12, 0)
    BadegewaesserCoordinator(hass, client, jitter=record)
    at(freezer, 2026, 7, 3, 12, 0)
    BadegewaesserCoordinator(hass, client, jitter=record)

    assert spreads == [WAKE_SPREAD_SECONDS, POLL_JITTER_SECONDS]
    assert WAKE_SPREAD_SECONDS == DEFAULT_SCAN_INTERVAL_SEASON_HOURS * 3600


@pytest.mark.usefixtures("vienna")
async def test_a_failing_poll_never_goes_dormant(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Asleep while failing would leave every entity unavailable until May.

    Retries run daily in the dormant months and back off as they do in the
    season: no penalty for the first, doubling from the second, to a week.
    """
    at(freezer, 2026, 11, 3, 12, 0)
    coordinator = build_coordinator(hass)
    expectations = {1: 24, 2: 48, 3: 96, 4: MAX_POLL_HOURS, 9: MAX_POLL_HOURS}
    for failures, expected in expectations.items():
        coordinator._consecutive_failures = failures
        coordinator.update_interval = coordinator._compute_interval()
        assert hours(coordinator) == expected, f"after {failures} failures"


@pytest.mark.usefixtures("vienna")
async def test_a_failure_at_the_end_of_september_keeps_retrying(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The retry lands in October, and still happens."""
    at(freezer, 2026, 9, 30, 20, 0)
    coordinator = build_coordinator(hass)
    coordinator._consecutive_failures = 1
    coordinator.update_interval = coordinator._compute_interval()
    assert hours(coordinator) == LATE_RESULTS_POLL_HOURS


@pytest.mark.usefixtures("vienna")
async def test_the_first_success_after_a_winter_failure_goes_dormant(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    at(freezer, 2026, 12, 1, 8, 0)
    coordinator = build_coordinator(hass)
    coordinator._consecutive_failures = 3
    await coordinator._async_update_data()
    assert lands_at(coordinator).date() == date(2027, 5, 15)


@pytest.mark.usefixtures("vienna")
async def test_a_stored_offseason_option_is_ignored(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The key predates 0.2.0; entries that saved it keep it, unread."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_SITE_ID: "x"},
        options={
            CONF_SCAN_INTERVAL_SEASON_HOURS: 4,
            "scan_interval_offseason_hours": 48,
        },
        unique_id="x",
    ).add_to_hass(hass)
    at(freezer, 2026, 11, 3, 12, 0)
    coordinator = build_coordinator(hass)
    assert lands_at(coordinator).date() == date(2027, 5, 15)


@pytest.mark.usefixtures("vienna")
async def test_while_asleep_a_snapshot_older_than_a_day_is_refetched(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """A bathing water added in January must not start from October's data."""
    session = make_session(fixture_bytes(), fixture_bytes(), fixture_bytes())
    at(freezer, 2026, 11, 3, 12, 0)
    coordinator = build_coordinator(hass, session)
    assert await coordinator.async_ensure_fresh()

    freezer.tick(timedelta(hours=MAX_SNAPSHOT_AGE_HOURS - 1))
    assert await coordinator.async_ensure_fresh()
    assert session.get.call_count == 1

    freezer.tick(timedelta(hours=2))
    assert await coordinator.async_ensure_fresh()
    assert session.get.call_count == 2


# --- applying a cadence change ---------------------------------------------


def _entry_asking_for(hass: HomeAssistant, season_hours: int) -> MockConfigEntry:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_SITE_ID: "x"},
        options={CONF_SCAN_INTERVAL_SEASON_HOURS: season_hours},
        unique_id="x",
    )
    entry.add_to_hass(hass)
    return entry


async def test_a_changed_option_restarts_a_running_timer(hass: HomeAssistant) -> None:
    """An options change used to wait out one more poll at the old interval.

    Out of season that is up to a day before the new cadence applied. With
    another entry's entities subscribed, the timer is already running on the
    old interval, so applying the change has to restart it.
    """
    entry = _entry_asking_for(hass, 12)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator = build_coordinator(hass)
        unsubscribe = coordinator.async_add_listener(lambda: None)
        hass.config_entries.async_update_entry(
            entry, options={CONF_SCAN_INTERVAL_SEASON_HOURS: 3}
        )
        with patch.object(coordinator, "_schedule_refresh") as reschedule:
            coordinator.async_update_cadence()
    unsubscribe()

    assert hours(coordinator) == 3
    assert reschedule.call_count == 1


async def test_jitter_alone_does_not_restart_the_timer(hass: HomeAssistant) -> None:
    """Every entry setup applies the cadence; most change nothing.

    Two computations of the same cadence differ by their jitter only.
    Restarting the timer on that would push the next poll out every time an
    entry is added.
    """
    _entry_asking_for(hass, 12)
    jitters = iter((0.0, 300.0))
    client = BadegewaesserClient(make_session(fixture_bytes()))
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator = BadegewaesserCoordinator(
            hass, client, jitter=lambda _spread: next(jitters)
        )
        unsubscribe = coordinator.async_add_listener(lambda: None)
        with patch.object(coordinator, "_schedule_refresh") as reschedule:
            coordinator.async_update_cadence()
    unsubscribe()

    assert reschedule.call_count == 0


async def test_with_nothing_subscribed_the_cadence_waits_for_the_first_entity(
    hass: HomeAssistant,
) -> None:
    """No listeners, no timer: the first subscriber schedules with the new value."""
    entry = _entry_asking_for(hass, 12)
    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        coordinator = build_coordinator(hass)
        hass.config_entries.async_update_entry(
            entry, options={CONF_SCAN_INTERVAL_SEASON_HOURS: 3}
        )
        with patch.object(coordinator, "_schedule_refresh") as reschedule:
            coordinator.async_update_cadence()

    assert hours(coordinator) == 3
    assert reschedule.call_count == 0


# --- freshness -------------------------------------------------------------


async def test_ensure_fresh_serves_a_fresh_snapshot_from_memory(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """Within the cadence, a second caller must not cost a second request."""
    session = make_session(fixture_bytes(), fixture_bytes())
    coordinator = build_coordinator(hass, session)

    assert await coordinator.async_ensure_fresh()
    freezer.tick(timedelta(minutes=5))
    assert await coordinator.async_ensure_fresh()

    assert session.get.call_count == 1


async def test_ensure_fresh_refetches_a_snapshot_older_than_the_cadence(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory
) -> None:
    """The coordinator outlives its entries, and so does its snapshot.

    Remove the last bathing water, add one back weeks later, and the old code
    served whatever was in memory from when polling stopped.
    """
    session = make_session(fixture_bytes(), fixture_bytes())
    coordinator = build_coordinator(hass, session)
    assert await coordinator.async_ensure_fresh()
    assert coordinator.update_interval is not None

    freezer.tick(coordinator.update_interval + timedelta(minutes=1))
    assert await coordinator.async_ensure_fresh()

    assert session.get.call_count == 2


async def test_ensure_fresh_reports_a_failed_fetch(hass: HomeAssistant) -> None:
    """Callers raise their own error — a flow aborts where a setup retries."""
    coordinator = build_coordinator(hass)
    coordinator.client.async_fetch = AsyncMock(  # type: ignore[method-assign]
        side_effect=BadegewaesserApiError("cannot_connect", "boom")
    )

    assert not await coordinator.async_ensure_fresh()


# --- backoff ---------------------------------------------------------------


async def test_backoff_ladder(hass: HomeAssistant) -> None:
    """No penalty for one miss; double from the second; clamp at the ceiling.

    A lone timeout is noise, so punishing it would slow every install for no
    reason. A sustained outage is different, and doubling stops the fleet
    hammering a service that is down.
    """
    coordinator = build_coordinator(hass)
    base = DEFAULT_SCAN_INTERVAL_SEASON_HOURS

    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        expectations = {
            0: base,
            1: base,  # first failure: no penalty yet
            2: base * 2,
            3: base * 4,
            4: base * 8,
            5: base * 16,
            10: MAX_POLL_HOURS,  # clamped
            50: MAX_POLL_HOURS,
        }
        for failures, expected in expectations.items():
            coordinator._consecutive_failures = failures
            coordinator.update_interval = coordinator._compute_interval()
            assert hours(coordinator) == expected, f"after {failures} failures"


async def test_failure_raises_translated_update_failed(hass: HomeAssistant) -> None:
    """Bare-string raises fail the `exception-translations` quality-scale rule."""
    coordinator = build_coordinator(hass)
    coordinator.client.async_fetch = AsyncMock(  # type: ignore[method-assign]
        side_effect=BadegewaesserApiError("cannot_connect", "boom")
    )

    with pytest.raises(UpdateFailed) as err:
        await coordinator._async_update_data()

    assert err.value.translation_domain == DOMAIN
    assert err.value.translation_key == "cannot_connect"
    assert err.value.translation_placeholders == {"detail": "boom"}


async def test_backoff_applies_on_the_failure_path(hass: HomeAssistant) -> None:
    """The interval must widen when the fetch RAISES, not only when it returns.

    `_async_update_data` recomputes the interval in `finally`, which runs
    before the base class reaches its own `finally` and schedules the next
    refresh. Setting it only on the success path would leave a failing
    upstream polled at full cadence for the whole outage.
    """
    coordinator = build_coordinator(hass)
    coordinator.client.async_fetch = AsyncMock(  # type: ignore[method-assign]
        side_effect=BadegewaesserApiError("cannot_connect", "boom")
    )

    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        for _ in range(3):
            with pytest.raises(UpdateFailed):
                await coordinator._async_update_data()

    assert coordinator._consecutive_failures == 3
    assert hours(coordinator) == DEFAULT_SCAN_INTERVAL_SEASON_HOURS * 4


async def test_success_resets_the_backoff(hass: HomeAssistant) -> None:
    """One good poll returns the fleet to normal cadence."""
    coordinator = build_coordinator(hass)
    coordinator._consecutive_failures = 5

    with patch(
        "custom_components.badegewaesser_austria.coordinator.is_monitoring_window",
        return_value=True,
    ):
        await coordinator._async_update_data()

    assert coordinator._consecutive_failures == 0
    assert hours(coordinator) == DEFAULT_SCAN_INTERVAL_SEASON_HOURS


# --- one request for N entries ---------------------------------------------


async def test_unchanged_document_returns_the_same_object(
    hass: HomeAssistant,
) -> None:
    """Identity, not just equality — that is what suppresses listener callbacks.

    The coordinator runs with `always_update=False`, so handing back the SAME
    mapping means no entity writes a state on a poll that changed nothing.
    """
    body = fixture_bytes()
    coordinator = build_coordinator(hass, make_session(body, body))

    first = await coordinator._async_update_data()
    coordinator.data = first
    second = await coordinator._async_update_data()

    assert second is first
    assert first[NORMAL].name == "Naturbadesee Königsdorf"


async def test_one_coordinator_is_shared_across_entries(
    hass: HomeAssistant,
) -> None:
    """N config entries must produce ONE poller, hence one request per poll.

    All 260 sites arrive in a single document, so a per-entry coordinator
    would multiply the load on AGES by the number of bathing waters a
    household happens to follow, for identical bytes.
    """
    first = await async_get_coordinator(hass)
    second = await async_get_coordinator(hass)
    third = await async_get_coordinator(hass)

    assert first is second is third


async def test_a_single_refresh_makes_a_single_request(
    hass: HomeAssistant,
) -> None:
    """Three entries, one refresh, one GET."""
    session = make_session(fixture_bytes())
    coordinator = build_coordinator(hass, session)

    for index in range(3):
        MockConfigEntry(
            domain=DOMAIN,
            data={CONF_SITE_ID: f"site-{index}"},
            unique_id=f"site-{index}",
        ).add_to_hass(hass)

    await coordinator._async_update_data()

    assert session.get.call_count == 1


# --- the dev-fixture guard -------------------------------------------------


def test_dev_fixture_is_absent_by_default() -> None:
    """The hook module must never exist in the repo.

    `validate.yml`'s no-dev-fixture job is the CI half of this; the assertion
    here means a developer who forgets to delete their local copy fails the
    suite before they reach a push.
    """
    from custom_components.badegewaesser_austria import coordinator as module

    assert module._DEV_FIXTURE is None, (
        "_dev_fixture.py is present. It is a local development hook and must "
        "never be committed or shipped."
    )


def test_dev_fixture_is_a_noop_without_the_module(hass: HomeAssistant) -> None:
    """No module, no rewrite."""
    from custom_components.badegewaesser_austria.coordinator import apply_dev_fixture

    sites = {"a": object()}
    assert apply_dev_fixture(sites) is sites  # type: ignore[arg-type]


def test_dev_fixture_is_skipped_under_pytest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Even with a module present, tests must never see fixture data.

    A test that could assert on rewritten data would be asserting on something
    no user ever receives — which is worse than no test at all.
    """
    from custom_components.badegewaesser_austria import coordinator as module

    class _Fixture:
        @staticmethod
        def apply(_sites: object) -> dict[str, object]:
            return {"rewritten": object()}

    monkeypatch.setattr(module, "_DEV_FIXTURE", _Fixture)
    # PYTEST_CURRENT_TEST is set by pytest for every test, which is the guard.
    sites = {"a": object()}
    assert module.apply_dev_fixture(sites) is sites  # type: ignore[arg-type]


def test_dev_fixture_applies_when_a_developer_runs_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """And the hook does work outside pytest, or it would be dead code."""
    from custom_components.badegewaesser_austria import coordinator as module

    replacement = {"rewritten": object()}

    class _Fixture:
        @staticmethod
        def apply(_sites: object) -> dict[str, object]:
            return replacement

    monkeypatch.setattr(module, "_DEV_FIXTURE", _Fixture)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    assert module.apply_dev_fixture({"a": object()}) is replacement  # type: ignore[arg-type]
