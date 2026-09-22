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
    CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    DOMAIN,
    MAX_POLL_HOURS,
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
    Polling on the legal season alone would sleep through all 260 of them at
    the 24-hour off-season cadence.
    """
    return _within(
        day,
        (MONITORING_START_MONTH, MONITORING_START_DAY),
        (MONITORING_END_MONTH, MONITORING_END_DAY),
    )


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
        jitter: Callable[[], float] | None = None,
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
        self._jitter = jitter or (lambda: random.uniform(0, POLL_JITTER_SECONDS))
        self._consecutive_failures = 0
        # Tracked here rather than inside the snapshot: the snapshot must stay
        # identity-stable across an unchanged fetch for `always_update=False`
        # to suppress listener callbacks, and a fetch timestamp inside it
        # would change on every poll and defeat that.
        self.last_fetch_utc: datetime | None = None
        self.update_interval = self._compute_interval()

    # -- cadence ----------------------------------------------------------

    @property
    def consecutive_failures(self) -> int:
        """How many refreshes have failed in a row. Read by diagnostics."""
        return self._consecutive_failures

    @callback
    def _base_hours(self) -> int:
        """The configured base interval for right now, in hours.

        Entries may be configured differently, and one shared poller cannot
        honour several cadences at once. It polls at the SHORTEST interval any
        entry asks for: that entry's freshness expectation is the binding one,
        and every other entry gets fresher data at no extra cost, since the
        request is shared anyway.
        """
        # The MONITORING window, not the legal season: the point of the fast
        # cadence is catching data that moves, and the pre-season sample moves
        # a month before the season opens.
        in_season = is_monitoring_window(dt_util.now().date())
        key = (
            CONF_SCAN_INTERVAL_SEASON_HOURS
            if in_season
            else CONF_SCAN_INTERVAL_OFFSEASON_HOURS
        )
        default = (
            DEFAULT_SCAN_INTERVAL_SEASON_HOURS
            if in_season
            else DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS
        )
        entries: list[ConfigEntry] = self.hass.config_entries.async_entries(DOMAIN)
        configured = [
            clamp_poll_hours(entry.options.get(key, default), default)
            for entry in entries
        ]
        return min(configured) if configured else clamp_poll_hours(default, default)

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
        """Base cadence x backoff, clamped, plus jitter."""
        hours = min(self._base_hours() * self._backoff_factor(), MAX_POLL_HOURS)
        # Jitter every cycle rather than only the first: it spreads installs
        # that were started together, and stops a fleet re-synchronising after
        # a shared outage ends.
        return timedelta(seconds=hours * 3600 + self._jitter())

    # -- refresh ----------------------------------------------------------

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
