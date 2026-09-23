"""Config and options flow.

Two ways in, because they answer two different questions a person actually
has: "I know the lake, where is it in the list?" and "what can I swim in near
me?". Both end at the same place — one config entry per bathing water, keyed
on the AGES site id.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)
from homeassistant.util.location import distance

from .api import BadegewaesserApiError, BathingSite
from .const import (
    CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
    CONF_SCAN_INTERVAL_SEASON_HOURS,
    CONF_SITE_ID,
    DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS,
    DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
    DOMAIN,
    MAX_POLL_HOURS,
    MIN_POLL_HOURS,
)
from .coordinator import async_get_coordinator

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

CONF_BUNDESLAND = "bundesland"

# How many "near me" candidates to offer. Enough that a household on the edge
# of a lake district still sees real choices, few enough that the dropdown
# stays a decision rather than a list.
NEAREST_COUNT = 12


def _format_distance(metres: float, language: str) -> str:
    """Render a distance the way the reader writes numbers.

    German uses a decimal comma, and this integration's audience is
    overwhelmingly German-speaking, so "4,2 km" is the correct rendering for
    them. One decimal below 10 km, none above — past that the extra digit is
    noise for choosing between lakes.
    """
    km = metres / 1000
    text = f"{km:.1f}" if km < 10 else f"{km:.0f}"
    return f"{text.replace('.', ',')} km" if language.startswith("de") else f"{text} km"


def _site_label(site: BathingSite) -> str:
    """Name plus municipality, which is how people disambiguate lakes.

    Site names are unique across all 260 (measured), but "Seebad" alone tells
    you nothing about where it is.
    """
    return f"{site.name} ({site.municipality})" if site.municipality else site.name


class BadegewaesserConfigFlow(ConfigFlow, domain=DOMAIN):
    """Pick one bathing water."""

    VERSION = 1

    def __init__(self) -> None:
        """Start with no Bundesland chosen."""
        self._bundesland: str | None = None

    async def _async_sites(self) -> dict[str, BathingSite]:
        """Fetch the document, satisfying `test-before-configure`.

        Goes through the shared coordinator rather than a private client, so
        finishing the flow does not cost a second request: setup finds the
        snapshot already in memory.
        """
        coordinator = await async_get_coordinator(self.hass)
        if not await coordinator.async_ensure_fresh():
            raise BadegewaesserApiError(
                "cannot_connect", str(coordinator.last_exception)
            )
        return coordinator.data

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Offer the two ways of finding a bathing water."""
        return self.async_show_menu(
            step_id="user", menu_options=["bundesland", "nearby"]
        )

    async def async_step_bundesland(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose a Bundesland, which narrows 260 sites to between 16 and 43."""
        try:
            sites = await self._async_sites()
        except BadegewaesserApiError:
            return self.async_abort(reason="cannot_connect")

        if user_input is not None:
            self._bundesland = user_input[CONF_BUNDESLAND]
            return await self.async_step_site()

        options = sorted(
            {site.bundesland for site in sites.values() if site.bundesland}
        )
        return self.async_show_form(
            step_id="bundesland",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_BUNDESLAND): SelectSelector(
                        SelectSelectorConfig(
                            options=[
                                SelectOptionDict(value=name, label=name)
                                for name in options
                            ],
                            mode=SelectSelectorMode.DROPDOWN,
                        )
                    )
                }
            ),
        )

    async def async_step_site(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose a bathing water within the chosen Bundesland."""
        try:
            sites = await self._async_sites()
        except BadegewaesserApiError:
            return self.async_abort(reason="cannot_connect")

        if user_input is not None:
            return await self._async_create(sites, user_input[CONF_SITE_ID])

        candidates = sorted(
            (site for site in sites.values() if site.bundesland == self._bundesland),
            key=lambda site: site.name,
        )
        return self.async_show_form(
            step_id="site",
            description_placeholders={"bundesland": self._bundesland or ""},
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SITE_ID): SelectSelector(
                        SelectSelectorConfig(
                            options=[
                                SelectOptionDict(
                                    value=site.site_id, label=_site_label(site)
                                )
                                for site in candidates
                            ],
                            mode=SelectSelectorMode.DROPDOWN,
                            custom_value=False,
                            sort=False,
                        )
                    )
                }
            ),
        )

    async def async_step_nearby(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Offer the bathing waters closest to this Home Assistant."""
        try:
            sites = await self._async_sites()
        except BadegewaesserApiError:
            return self.async_abort(reason="cannot_connect")

        if user_input is not None:
            return await self._async_create(sites, user_input[CONF_SITE_ID])

        home_lat = self.hass.config.latitude
        home_lon = self.hass.config.longitude
        if not home_lat and not home_lon:
            return self.async_abort(reason="no_home_location")

        # Sites whose position upstream does not have are excluded rather than
        # ranked. One of the 260 ships "0"/"0", and taken literally that is
        # Null Island — roughly 5000 km away, which would make it the single
        # most distant entry rather than an obviously broken one. The parser
        # already turned it into None; this is where that pays off.
        located = [
            site
            for site in sites.values()
            if site.latitude is not None and site.longitude is not None
        ]
        ranked = sorted(
            (
                (
                    distance(home_lat, home_lon, site.latitude, site.longitude) or 0.0,
                    site,
                )
                for site in located
            ),
            key=lambda pair: pair[0],
        )[:NEAREST_COUNT]

        language = self.hass.config.language
        return self.async_show_form(
            step_id="nearby",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SITE_ID): SelectSelector(
                        SelectSelectorConfig(
                            options=[
                                SelectOptionDict(
                                    value=site.site_id,
                                    label=(
                                        f"{_site_label(site)} – "
                                        f"{_format_distance(metres, language)}"
                                    ),
                                )
                                for metres, site in ranked
                            ],
                            mode=SelectSelectorMode.DROPDOWN,
                            custom_value=False,
                            # Already ordered by distance; alphabetical sorting
                            # would throw away the only thing this list is for.
                            sort=False,
                        )
                    )
                }
            ),
        )

    async def _async_create(
        self, sites: dict[str, BathingSite], site_id: str
    ) -> ConfigFlowResult:
        """Create the entry, keyed on the AGES site id.

        The site id is the frozen identity of this entry. Changing the formula
        later would orphan every existing install's entities.
        """
        site = sites.get(site_id)
        if site is None:
            return self.async_abort(reason="unknown_site")

        await self.async_set_unique_id(site_id)
        # `reload_on_update=False` keeps a single reload owner: the update
        # listener in __init__.py. Pairing this with a reloading flow method is
        # deprecated in HA 2026.6 and a hard error in 2026.12.
        self._abort_if_unique_id_configured(reload_on_update=False)
        return self.async_create_entry(title=site.name, data={CONF_SITE_ID: site_id})

    @staticmethod
    def async_get_options_flow(entry: ConfigEntry) -> BadegewaesserOptionsFlow:
        """Return the options flow."""
        return BadegewaesserOptionsFlow()


class BadegewaesserOptionsFlow(OptionsFlow):
    """Tune how often the shared poll runs."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show and store the two intervals."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        options = self.config_entry.options
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_SCAN_INTERVAL_SEASON_HOURS,
                        default=options.get(
                            CONF_SCAN_INTERVAL_SEASON_HOURS,
                            DEFAULT_SCAN_INTERVAL_SEASON_HOURS,
                        ),
                    ): NumberSelector(
                        NumberSelectorConfig(
                            min=MIN_POLL_HOURS,
                            max=MAX_POLL_HOURS,
                            step=1,
                            mode=NumberSelectorMode.BOX,
                            unit_of_measurement="h",
                        )
                    ),
                    vol.Required(
                        CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
                        default=options.get(
                            CONF_SCAN_INTERVAL_OFFSEASON_HOURS,
                            DEFAULT_SCAN_INTERVAL_OFFSEASON_HOURS,
                        ),
                    ): NumberSelector(
                        NumberSelectorConfig(
                            min=MIN_POLL_HOURS,
                            max=MAX_POLL_HOURS,
                            step=1,
                            mode=NumberSelectorMode.BOX,
                            unit_of_measurement="h",
                        )
                    ),
                }
            ),
        )
