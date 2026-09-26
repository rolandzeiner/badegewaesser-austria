"""The shared, domain-wide data coordinator.

One AGES request returns all 260 bathing waters, so N config entries must
produce exactly ONE request per poll, not N. That is why this coordinator is
domain-wide rather than per-entry: it is created once per HA instance, cached
in `hass.data`, and every entry's entities subscribe to it.

Because it belongs to no single config entry it is constructed with
`config_entry=None` and shut down via `async_register_shutdown()`, which Home
Assistant provides for exactly this case ("Should only be used by coordinators
that are not linked to a config entry"). One consequence:
`async_config_entry_first_refresh()` refuses an entry-less coordinator, so
setup does the first refresh explicitly and raises `ConfigEntryNotReady`
itself — see `__init__.py`.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import random
from collections.abc import Callable
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util
from homeassistant.util.hass_dict import HassKey

from .api import BadegewaesserApiError, BadegewaesserClient, BathingSite
from .const import (
    BACKOFF_AFTER_FAILURES,
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    DOMAIN,
    LATE_RESULTS_END_DAY,
    LATE_RESULTS_END_MONTH,
    LATE_RESULTS_POLL_HOURS,
    LATE_RESULTS_START_DAY,
    LATE_RESULTS_START_MONTH,
    MAX_POLL_HOURS,
    MAX_SNAPSHOT_AGE_HOURS,
    MIN_POLL_HOURS,
    MONITORING_END_DAY,
    MONITORING_END_MONTH,
    MONITORING_START_DAY,
    MONITORING_START_MONTH,
    POLL_JITTER_SECONDS,
    SEASON_END_DAY,
    SEASON_END_MONTH,
    SEASON_START_DAY,
    SEASON_START_MONTH,
    WAKE_SPREAD_SECONDS,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

_LOGGER = logging.getLogger(__name__)

# Dev-only fixture hook.
#
# `TGESPERRT` is "0" on all 260 bathing waters and `SPERRGRUND` is empty
# everywhere, so the closure banner and the `problem` binary sensor have no
# live data to render against. This lets a developer drop a gitignored
# `_dev_fixture.py` next to this module to rewrite a snapshot locally.
#
# Four pieces keep it out of production: the file is gitignored, the import is
# suppressed when absent, the call is skipped under pytest so no test can ever
# depend on it, and `validate.yml`'s `no-dev-fixture` job hard-fails if the
# file is ever committed.
_DEV_FIXTURE: Any = None
with contextlib.suppress(ImportError):
    # The module is absent by design, so mypy is right that the attribute
    # does not exist — that is the whole point of the suppress.
    from . import (  # type: ignore[attr-defined,no-redef,unused-ignore]
        _dev_fixture as _DEV_FIXTURE,
    )


COORDINATOR_KEY: HassKey[BadegewaesserCoordinator] = HassKey(DOMAIN)

type SiteMap = dict[str, BathingSite]


@callback
def _within(day: date, start: tuple[int, int], end: tuple[int, int]) -> bool:
    """Is `day` inside a window that does not cross a year boundary?"""
    return start <= (day.month, day.day) <= end


@callback
def is_in_season(day: date) -> bool:
    """Is `day` inside the LEGAL Austrian bathing season?

    15 June to 31 August, per Badegewässerverordnung § 4. This is what the
    `Badesaison` sensor reports, and it is the answer to "may one swim" — not
    "is there fresh data", which is `is_monitoring_window` below.
    """
    return _within(
        day,
        (SEASON_START_MONTH, SEASON_START_DAY),
        (SEASON_END_MONTH, SEASON_END_DAY),
    )


@callback
def is_monitoring_window(day: date) -> bool:
    """Can a new reading plausibly arrive on `day`?

    Wider than the legal season at the front, because every bathing water gets
    one mandated pre-season sample and those land between 26 May and 10 June.
    Polling on the legal season alone would sleep through all 260 of them.
    """
    return _within(
        day,
        (MONITORING_START_MONTH, MONITORING_START_DAY),
        (MONITORING_END_MONTH, MONITORING_END_DAY),
    )


@callback
def is_late_results_window(day: date) -> bool:
    """Can a result for a sample already taken still arrive on `day`?

    September: sampling has stopped, but the lab results for the last samples
    of August may still be published.
    """
    return _within(
        day,
        (LATE_RESULTS_START_MONTH, LATE_RESULTS_START_DAY),
        (LATE_RESULTS_END_MONTH, LATE_RESULTS_END_DAY),
    )


@callback
def next_monitoring_start(now: datetime) -> datetime:
    """Local midnight on the next day the monitoring window opens.

    Only asked for while polling sleeps, from October to 14 May, so the
    window opens later this year or in the next one.
    """
    start = now.replace(
        month=MONITORING_START_MONTH,
        day=MONITORING_START_DAY,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    return start if start > now else start.replace(year=start.year + 1)


@callback
def clamp_poll_hours(hours: object, default: int) -> int:
    """Clamp a configured interval into [MIN_POLL_HOURS, MAX_POLL_HOURS].

    Enforced here rather than only in the options-flow selector, so a user who
    edits the stored entry directly still cannot poll faster than the floor.
    A value that is not a number at all falls back to `default` instead of
    raising — a corrupt option should not take the integration down.
    """
    try:
        value = int(float(hours))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(MIN_POLL_HOURS, min(MAX_POLL_HOURS, value))


@callback
def apply_dev_fixture(sites: SiteMap) -> SiteMap:
    """Let a local `_dev_fixture.py` rewrite a snapshot, never in production.

    Returns the snapshot untouched when the module is absent, and always when
    running under pytest — a test that could see fixture data would be
    asserting on something users never get.
    """
    if _DEV_FIXTURE is None or os.environ.get("PYTEST_CURRENT_TEST"):
        return sites
    _LOGGER.warning(
        "Applying _dev_fixture.py — this is a development hook and must never "
        "be present in an installed integration"
    )
    applied: SiteMap = _DEV_FIXTURE.apply(sites)
    return applied


class BadegewaesserCoordinator(DataUpdateCoordinator[SiteMap]):
    """Polls the AGES document once for every config entry on this instance."""

    def __init__(
        self,
        hass: HomeAssistant,
        client: BadegewaesserClient,
        *,
        jitter: Callable[[float], float] | None = None,
    ) -> None:
        """Create the shared coordinator.

        `always_update=False` matters here: on an unchanged document
        `_async_update_data` returns the *same* mapping object it returned
        last time, so the base class skips notifying listeners entirely and no
        entity writes a state. That is the saving the content digest exists
        for.
        """
        super().__init__(
            hass,
            _LOGGER,
            config_entry=None,
            name=DOMAIN,
            always_update=False,
        )
        self.client = client
        # Takes the spread in seconds and returns a delay within it: the
        # poll's own jitter, or the wider one for waking from dormancy.
        self._jitter = jitter or (lambda spread: random.uniform(0, spread))
        self._consecutive_failures = 0
        # Tracked here rather than inside the snapshot: the snapshot must stay
        # identity-stable across an unchanged fetch for `always_update=False`
        # to suppress listener callbacks, and a fetch timestamp inside it
        # would change on every poll and defeat that.
        self.last_fetch_utc: datetime | None = None
        # The readiness fetch under way, which concurrent callers join. See
        # `async_ensure_fresh`.
        self._fresh_fetch: asyncio.Task[None] | None = None
        self.update_interval = self._compute_interval()

    # -- cadence ----------------------------------------------------------

    @property
    def consecutive_failures(self) -> int:
        """How many refreshes have failed in a row. Read by diagnostics."""
        return self._consecutive_failures

    @callback
    def _season_hours(self) -> int:
        """The configured in-season interval, in hours.

        Entries may be configured differently, and one shared poller cannot
        honour several cadences at once. It polls at the SHORTEST interval any
        entry asks for: that entry's freshness expectation is the binding one,
        and every other entry gets fresher data at no extra cost, since the
        request is shared anyway.
        """
        default = DEFAULT_SCAN_INTERVAL_SEASON_HOURS
        entries: list[ConfigEntry] = self.hass.config_entries.async_entries(DOMAIN)
        configured = [
            clamp_poll_hours(
                entry.options.get(CONF_SCAN_INTERVAL_SEASON_HOURS, default), default
            )
            for entry in entries
        ]
        return min(configured) if configured else default

    @callback
    def _active_hours(self, day: date) -> int | None:
        """The poll interval on `day`, or None while polling sleeps.

        The MONITORING window, not the legal season, sets the fast cadence:
        the point of it is catching data that moves, and the pre-season
        sample moves a month before the season opens. September polls daily
        for late results, and never faster than the season does. From
        October to 14 May nothing is polled at all; see const.py.
        """
        if is_monitoring_window(day):
            return self._season_hours()
        if is_late_results_window(day):
            return max(LATE_RESULTS_POLL_HOURS, self._season_hours())
        return None

    @callback
    def _backoff_factor(self) -> int:
        """Interval multiplier for the current failure streak.

        No penalty for a single miss — a lone timeout is noise. From the
        second consecutive failure the interval doubles each time, so a
        genuinely down upstream is not hammered at full cadence for the whole
        outage. Reset to 1 on the next success.
        """
        if self._consecutive_failures < BACKOFF_AFTER_FAILURES:
            return 1
        return int(2 ** (self._consecutive_failures - BACKOFF_AFTER_FAILURES + 1))

    @callback
    def _compute_interval(self) -> timedelta:
        """Until the next poll: the cadence for today, or until May.

        Jitter goes on every cycle rather than only the first: it spreads
        installs that were started together, and stops a fleet
        re-synchronising after a shared outage ends.
        """
        now = dt_util.now()
        hours = self._active_hours(now.date())
        if self._consecutive_failures:
            # Never asleep while failing: the entities stay unavailable until
            # a poll succeeds, and going dormant after a failure in late
            # September would leave them so until May. Retries run at today's
            # cadence, daily in the dormant months, and back off from there.
            retry = hours if hours is not None else LATE_RESULTS_POLL_HOURS
            retry = min(retry * self._backoff_factor(), MAX_POLL_HOURS)
            return timedelta(seconds=retry * 3600 + self._jitter(POLL_JITTER_SECONDS))
        if hours is not None:
            interval = timedelta(hours=hours)
            # A poll that would land in the dormant months is skipped for the
            # wake-up in May, so the tail does not end on a stray 1 October poll.
            if self._active_hours((now + interval).date()) is not None:
                return interval + timedelta(seconds=self._jitter(POLL_JITTER_SECONDS))
        # In UTC, because subtracting two local times in the same zone ignores
        # their offsets and would be an hour out across the DST change.
        wake = dt_util.as_utc(next_monitoring_start(now)) - dt_util.utcnow()
        return wake + timedelta(seconds=self._jitter(WAKE_SPREAD_SECONDS))

    @callback
    def async_update_cadence(self) -> None:
        """Apply the entries' current options to the poll interval now.

        Called on every entry setup, which is also what an options change
        triggers via the reload listener. Without it the new interval only
        took effect after one more poll at the old one.

        With no subscribed entities there is no timer, and the first entity
        to subscribe schedules with the new value anyway. With other entries
        already subscribed, their timer is running on the old interval, so it
        is restarted — but only for a real change. Two computations of the
        same cadence differ by their jitter alone, and restarting on that
        would push the next poll out every time an entry is added.
        """
        previous = self.update_interval
        self.update_interval = self._compute_interval()
        if (
            self._listeners
            and previous is not None
            and abs((self.update_interval - previous).total_seconds())
            > POLL_JITTER_SECONDS
        ):
            self._schedule_refresh()

    # -- refresh ----------------------------------------------------------

    @callback
    def _snapshot_is_stale(self) -> bool:
        """Is the snapshot older than the cadence, or than a day, allows?

        The day matters while polling sleeps: the interval then runs to May,
        and a bathing water added in January would start from October's
        document.
        """
        if self.last_fetch_utc is None or self.update_interval is None:
            return True
        limit = min(self.update_interval, timedelta(hours=MAX_SNAPSHOT_AGE_HOURS))
        return dt_util.utcnow() - self.last_fetch_utc > limit

    async def async_ensure_fresh(self) -> bool:
        """Make sure the snapshot is worth serving, fetching first if not.

        The one readiness check for both the config flow and entry setup. It
        fetches when there is no snapshot yet, and also when the one held is
        older than the cadence: this coordinator outlives its entries (see
        `async_unload_entry`), so removing the last bathing water and adding
        one back weeks later would otherwise serve the snapshot from whenever
        polling stopped until the next scheduled poll.

        A caller that arrives while that fetch is under way joins it rather
        than starting its own. Home Assistant sets up every entry of a domain
        at once at startup, and each saw no snapshot yet: twenty bathing
        waters made twenty identical requests per restart. Measured with six
        entries, six requests. The fetch is shielded, so one caller being
        cancelled does not cancel it for the others.

        Returns whether the latest refresh succeeded. Callers raise their own
        error, because a flow aborts where a setup retries.
        """
        fetch = self._fresh_fetch
        # A finished fetch is not one to join: the next caller decides afresh.
        if fetch is None or fetch.done():
            if self.data and not self._snapshot_is_stale():
                return self.last_update_success
            fetch = self._fresh_fetch = self.hass.async_create_task(
                self.async_refresh(), f"{DOMAIN} readiness fetch"
            )
        await asyncio.shield(fetch)
        return self.last_update_success

    async def _async_update_data(self) -> SiteMap:
        """Fetch once, or keep the previous snapshot if nothing changed.

        The interval is recomputed in `finally` so the backoff applies to the
        failure path too: `_async_update_data` raising propagates through its
        own `finally` first, and only then does the base class reach the
        `_schedule_refresh()` in its own `finally`. Setting the interval in
        the success path alone would leave a failing upstream polled at full
        cadence.
        """
        try:
            sites = await self.client.async_fetch()
        except BadegewaesserApiError as err:
            self._consecutive_failures += 1
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key=err.translation_key,
                translation_placeholders={"detail": err.detail},
            ) from err
        else:
            if self._consecutive_failures:
                _LOGGER.debug(
                    "Upstream recovered after %d consecutive failures; "
                    "poll interval returns to the configured cadence",
                    self._consecutive_failures,
                )
            self._consecutive_failures = 0
            self.last_fetch_utc = dt_util.utcnow()
            if sites is not None:
                sites = apply_dev_fixture(sites)
            if sites is None:
                # Unchanged document: hand back the SAME object so
                # `always_update=False` suppresses the listener callbacks.
                # `self.data` is populated because a None can only follow a
                # previous successful parse — the client's digest starts unset.
                return self.data
            return sites
        finally:
            previous = self.update_interval
            self.update_interval = self._compute_interval()
            if (
                previous is not None
                and abs((self.update_interval - previous).total_seconds())
                > POLL_JITTER_SECONDS
            ):
                _LOGGER.info(
                    "Poll interval now %s (consecutive failures: %d)",
                    self.update_interval,
                    self._consecutive_failures,
                )


async def async_get_coordinator(hass: HomeAssistant) -> BadegewaesserCoordinator:
    """Return the one shared coordinator, creating it on first use.

    Memoised in `hass.data` so adding a second config entry reuses the first
    entry's poller instead of starting a second one. This is the whole reason
    N entries cost one request.
    """
    if (coordinator := hass.data.get(COORDINATOR_KEY)) is not None:
        return coordinator

    coordinator = BadegewaesserCoordinator(
        hass, BadegewaesserClient(async_get_clientsession(hass))
    )
    # Entry-less coordinators do not get the `config_entry.async_on_unload`
    # shutdown wiring, so this is how the refresh timer is cancelled when HA
    # stops. It raises if a config entry is ever attached.
    await coordinator.async_register_shutdown()
    hass.data[COORDINATOR_KEY] = coordinator
    return coordinator
