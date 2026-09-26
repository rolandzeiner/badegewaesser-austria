/**
 * Badegewässer Austria — Lovelace card.
 *
 * Designed out-of-season first. The AGES document is frozen for roughly nine
 * and a half months a year, so "no new readings" is this card's normal state,
 * not its empty state: it has to look finished in February, not broken.
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { cardStyles } from "./card-styles";
import { normaliseConfig, resolveDeviceId } from "./config";
import { CARD_TAG, CARD_VERSION } from "./const";
import { localize } from "./localize/localize";
import {
  renderSeasonTrack,
  seasonTrackDescription,
  seasonTrackStyles,
  type SeasonSample,
  type SeasonTrackOptions,
} from "./season-track";
import type {
  BadegewaesserCardConfig,
  HassEntity,
  HomeAssistant,
  LovelaceCardConfig,
  LovelaceCardEditor,
  LovelaceCardElement,
  WindowWithCardHelpers,
  WindowWithCustomCards,
} from "./types";
import {
  PHOTO_KEY,
  PLATFORM,
  formatCount,
  formatNumber,
  formatSampleDate,
  hasValue,
  languageOf,
  numericState,
} from "./utils";

/** Entity translation keys, which are stable where entity_ids are not. */
const KEY = {
  temperature: "water_temperature",
  quality: "water_quality",
  eColi: "e_coli",
  enterococci: "enterococci",
  secchi: "secchi_depth",
  lastSample: "last_sample",
  closed: "closed",
  season: "bathing_season",
  photo: PHOTO_KEY,
} as const;

/**
 * The EU classification symbol, drawn with MDI glyphs.
 *
 * Commission Implementing Decision 2011/321/EU, Annex part 2, sets the symbols
 * Directive 2006/7/EC Art. 12(1)(a) asks for: three stars for excellent, two
 * for good, one for sufficient, a dash for poor, each beside its class in
 * words. So the words stay, and the symbol never replaces them. AGES's "NEU"
 * and "Veränderungen" are its own markers with no EU symbol, so a site
 * without a class shows only its words.
 */
const QUALITY_SYMBOL: Readonly<Record<string, { icon: string; count: number }>> = {
  excellent: { icon: "mdi:star", count: 3 },
  good: { icon: "mdi:star", count: 2 },
  sufficient: { icon: "mdi:star", count: 1 },
  poor: { icon: "mdi:minus", count: 1 },
};

/** What each reading is, in front of its value. */
const READING_ICON = {
  temperature: "mdi:thermometer-water",
  secchi: "mdi:eye-outline",
  e_coli: "mdi:bacteria",
  enterococci: "mdi:bacteria-outline",
} as const;

/**
 * How far a reading may move since the sample before it and still count as
 * steady -- an arrow for noise is a trend the water does not have.
 *
 * Secchi depth: read off a disc to about 0.1 m, so 0.2 m.
 * Bacteria: plate counts carry large method uncertainty, so a change within
 * 20% of the larger count is steady, and "<15" to "<15" is the same limit
 * twice, not a measurement.
 */
const TREND_STEADY_M = 0.2;
const TREND_STEADY_COUNT = 0.2;

/**
 * Up and down as in the bundesliga table card. Steady is an arrow too,
 * not the table's minus: the table's sits alone in a column, this one right
 * after the unit, where a minus reads as a dash in the sentence -- in a
 * narrow tile, "KBE/100ml -- unter der Nachweisgrenze".
 */
const TREND_ICON = {
  up: "mdi:arrow-up",
  down: "mdi:arrow-down",
  steady: "mdi:arrow-right",
} as const;

type Trend = { direction: keyof typeof TREND_ICON; delta: number };

/**
 * The newest sample's reading against the last earlier sample that has one.
 * Null when the newest sample has no reading, or nothing before it does.
 */
export function sampleTrend(
  samples: readonly SeasonSample[],
  read: (sample: SeasonSample) => number | null | undefined,
  isSteady: (latest: SeasonSample, previous: SeasonSample, delta: number) => boolean,
): Trend | null {
  const last = samples.at(-1);
  const latest = last ? read(last) : null;
  if (!last || latest === null || latest === undefined) return null;
  const previousSample = samples
    .slice(0, -1)
    .filter((sample) => {
      const value = read(sample);
      return value !== null && value !== undefined;
    })
    .at(-1);
  if (!previousSample) return null;
  // Rounded: readings come to a hundredth at most, and 2.0 - 1.8 is
  // 0.19999... in binary, which would fall just short of a 0.2 threshold.
  const delta = Math.round((latest - (read(previousSample) ?? latest)) * 1000) / 1000;
  const direction = isSteady(last, previousSample, delta) ? "steady" : delta > 0 ? "up" : "down";
  return { direction, delta };
}

export const secchiTrend = (samples: readonly SeasonSample[]): Trend | null =>
  sampleTrend(
    samples,
    (sample) => sample.secchi_depth,
    (_latest, _previous, delta) => Math.abs(delta) < TREND_STEADY_M,
  );

/** A count trend; a below-limit count reads as its limit, e.g. "<15" as 15. */
export function countTrend(
  samples: readonly SeasonSample[],
  key: "e_coli" | "enterococci",
): Trend | null {
  const below = (sample: SeasonSample): boolean => sample[`${key}_below_limit`] === true;
  return sampleTrend(
    samples,
    (sample) => sample[key],
    (latest, previous, delta) => {
      if (below(latest) && below(previous)) return true;
      const larger = Math.max(latest[key] ?? 0, previous[key] ?? 0);
      return Math.abs(delta) <= TREND_STEADY_COUNT * larger;
    },
  );
}

/**
 * The position the water-temperature sensor carries, if it is a usable one.
 * Without it there is no pin and no map.
 *
 * A zero on either axis is refused as the integration refuses it --
 * upstream's "0" means "no position", and no Austrian lake lies on the
 * equator or at Greenwich.
 */
export function sitePosition(
  entity: HassEntity | undefined,
): { latitude: number; longitude: number } | undefined {
  const latitude = entity?.attributes["latitude"];
  const longitude = entity?.attributes["longitude"];
  if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (latitude === 0 || longitude === 0) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return { latitude, longitude };
}

/**
 * The bathing water on OpenStreetMap, at its sitePosition.
 *
 * A plain link: nothing loads from OpenStreetMap until someone follows it, so
 * the card itself still talks to nobody but Home Assistant.
 */
export function siteMapUrl(entity: HassEntity | undefined): string | undefined {
  const position = sitePosition(entity);
  if (!position) return undefined;
  // Six decimals is about 10 cm: all the precision a zoom-16 map can use.
  const lat = position.latitude.toFixed(6);
  const lon = position.longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

/**
 * Whether this Home Assistant serves its maps' tiles itself.
 *
 * Core ships the `map_tiles` proxy from 2026.9, as a dependency of
 * `frontend`, and every map then fetches its tiles through it. Before that,
 * HA's map card had the browser fetch CARTO's tiles directly. The card talks
 * to nobody but Home Assistant, so its map exists only where that stays
 * true. Asking for the loaded component rather than parsing the version is
 * the direct question, and it has no beta or dev version strings to misread.
 */
export function servesMapTiles(hass: HomeAssistant | undefined): boolean {
  const components = hass?.config?.components;
  return Array.isArray(components) && components.includes("map_tiles");
}

/**
 * The zoom level for the one marker. ha-map fits its markers when it loads,
 * and one marker has no extent, so the fit ends at this level, its maximum.
 * At 13 a 600px header spans about 7.7 by 2.7 km at 47.5° N: the whole of a
 * small lake, or a stretch of a large one's shore.
 */
const MAP_ZOOM = 13;

/**
 * HA's own map card, for the one bathing water.
 *
 * `hours_to_show: 0` keeps it from subscribing to history, since the marker
 * never moves. The marker shows the sensor's own icon instead of initials,
 * which for "Naturbadesee Königsdorf Wassertemperatur" would be "NKW".
 */
export function mapCardConfig(entityId: string): LovelaceCardConfig {
  return {
    type: "map",
    entities: [{ entity: entityId, label_mode: "icon" }],
    theme_mode: "auto",
    hours_to_show: 0,
    default_zoom: MAP_ZOOM,
  };
}

type SiteEntities = Partial<Record<string, HassEntity>>;

/** The readings whose season the track can show in place of the temperature. */
type TrackReading = typeof KEY.secchi | typeof KEY.eColi | typeof KEY.enterococci;

@customElement(CARD_TAG)
export class BadegewaesserAustriaCard extends LitElement {
  static override styles = [cardStyles, seasonTrackStyles];

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BadegewaesserCardConfig;
  @state() private _staleVersion?: string;
  @state() private _hoveredPoint: number | null = null;
  // Which reading the season track shows: the hovered tile's, else the one
  // a tap pinned (touch has no hover), else the temperature.
  @state() private _trackHover: TrackReading | null = null;
  @state() private _trackPinned: TrackReading | null = null;
  @state() private _photoTip = false;
  @state() private _photoFailed?: string;
  // The card's rendered width, for spacing the season track's labels.
  @state() private _width: number | undefined;
  private _resizeObserver: ResizeObserver | undefined;
  // Why the credit tooltip is open. Hover and focus open it for as long as
  // they last; a click or tap pins it, because touch has no hover.
  private _photoTipHovered = false;
  private _photoTipPinned = false;

  private _versionChecked = false;
  // The photo URL in use, and the photo state it belongs to. See _photoUrl.
  private _photo: { state: string; url: string } | undefined;

  // The header's second view, HA's map. The card is created on the first
  // click and kept; see _toggleMap.
  @state() private _showMap = false;
  @state() private _mapCard: LovelaceCardElement | undefined;
  @state() private _mapFailed = false;
  private _mapEntityId: string | undefined;
  private _mapLoading = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./editor");
    return document.createElement("badegewaesser-austria-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): Record<string, unknown> {
    // Seed with a real bathing water so the picker preview shows data rather
    // than an error card.
    const first = Object.values(hass.entities ?? {}).find(
      (entry) => entry.platform === PLATFORM && entry.device_id,
    );
    return { device: first?.device_id ?? "" };
  }

  public setConfig(config: BadegewaesserCardConfig): void {
    if (!config) {
      throw new Error(localize("error.no_device", undefined));
    }
    // Through the shared normaliser, so the editor cannot show a different
    // set of defaults than the card renders.
    this._config = normaliseConfig(config);
  }

  /**
   * Height in masonry units of 50px, per section actually shown.
   *
   * Measured in a browser on 2026-09-23 with every section on: 445px at
   * 500px wide, 430px at 300px, so about 9 -- the photo 174px, the season
   * track 74px, the readings 143px, padding and footer the rest. This
   * returned 4 until then, less than half the card. The photo grows with
   * width (it is 20:7), so its 4 is generous at a typical column.
   */
  public getCardSize(): number {
    const config = this._config;
    let size = 1; // padding and the attribution footer
    const photo = this.hass ? this._siteEntities()?.[KEY.photo] : undefined;
    if (config?.show_photo !== false && (!this.hass || hasValue(photo))) size += 4;
    if (config?.show_season_track !== false) size += 1;
    if (config?.show_readings !== false) size += 3;
    return size;
  }

  public getGridOptions(): Record<string, unknown> {
    // The season track needs horizontal room to be worth drawing; below about
    // six columns the container query collapses the readings to one per line
    // and the card is still usable, so that is the honest minimum.
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver === "undefined") return;
    this._resizeObserver = new ResizeObserver((entries) => {
      // Rounded, so sub-pixel jitter does not re-render the card.
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width > 0 && width !== this._width) this._width = width;
    });
    this._resizeObserver.observe(this);
  }

  public override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    const map = this._mapCard;
    if (!map) return;
    // A new hass reaches the map from here, as a dashboard hands it to each
    // of its cards.
    if (changed.has("hass") && this.hass) map.hass = this.hass;
    // The editor's preview keeps this element when another bathing water is
    // picked, so the map has to follow it there.
    if (changed.has("_config")) {
      const entityId = this._siteEntities()?.[KEY.temperature]?.entity_id;
      if (entityId && entityId !== this._mapEntityId) {
        map.setConfig?.(mapCardConfig(entityId));
        this._mapEntityId = entityId;
      }
    }
  }

  protected override updated(): void {
    void this._checkVersion();
  }

  /**
   * Compare the bundle's version against the integration's.
   *
   * The `?v=` query on the resource URL is not enough on its own — a browser
   * or a service worker can serve a cached bundle anyway. This asks the
   * integration directly, which is the only answer that cannot be stale.
   */
  private async _checkVersion(): Promise<void> {
    if (this._versionChecked || !this.hass?.callWS) return;
    this._versionChecked = true;
    try {
      const result = await this.hass.callWS<{ version: string }>({
        type: `${PLATFORM}/card_version`,
      });
      if (result?.version && result.version !== CARD_VERSION) {
        this._staleVersion = result.version;
      }
    } catch {
      // An older integration has no such command. Not knowing the version is
      // not a reason to bother the user, so this stays silent by design.
    }
  }

  private async _reload(): Promise<void> {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Clearing the cache is best-effort; reload regardless.
    }
    location.reload();
  }

  /**
   * Find every entity belonging to the configured bathing water.
   *
   * Resolves through the device rather than by string-munging entity_ids:
   * users rename entity_ids, and a card that assumed a suffix would break
   * silently the first time somebody did. `device_id`, `platform` and
   * `translation_key` are all published in `hass.entities`.
   */
  private _siteEntities(): SiteEntities | undefined {
    const hass = this.hass;
    const deviceId = resolveDeviceId(hass, this._config);
    if (!hass || !deviceId) return undefined;

    const found: SiteEntities = {};
    for (const entry of Object.values(hass.entities ?? {})) {
      if (entry.device_id !== deviceId) continue;
      if (entry.platform !== PLATFORM) continue;
      if (!entry.translation_key) continue;
      found[entry.translation_key] = hass.states[entry.entity_id];
    }
    return found;
  }

  private _deviceName(): string | undefined {
    const deviceId = resolveDeviceId(this.hass, this._config);
    const device = deviceId ? this.hass?.devices?.[deviceId] : undefined;
    return device?.name_by_user ?? device?.name;
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const language = languageOf(hass);

    if (!config.device && !config.entity) {
      return this._renderAlert(localize("error.no_device", language));
    }
    // A legacy entity-shaped config must still say something useful when the
    // entity it names has been deleted or belongs elsewhere.
    if (!config.device && config.entity) {
      const registryEntry = hass.entities?.[config.entity];
      if (!registryEntry || !hass.states[config.entity]) {
        return this._renderAlert(
          localize("error.entity_missing", language, { entity: config.entity }),
        );
      }
      if (registryEntry.platform !== PLATFORM) {
        return this._renderAlert(
          localize("error.not_this_integration", language, { entity: config.entity }),
        );
      }
    }

    const entities = this._siteEntities() ?? {};
    if (Object.keys(entities).length === 0) {
      return this._renderAlert(localize("error.device_missing", language));
    }
    const temperature = entities[KEY.temperature];
    const closed = entities[KEY.closed];
    const season = entities[KEY.season];
    const title = config.name ?? this._deviceName() ?? "";

    const samples = (temperature?.attributes["season_samples"] ?? []) as SeasonSample[];
    const inSeason = season?.state === "on";
    const isClosed = closed?.state === "on";

    const photo = entities[KEY.photo];
    const photoSrc = config.show_photo === false ? undefined : this._photoUrl(photo);
    const hero = photoSrc !== undefined && this._photoFailed !== photoSrc;
    const mapLink = this._renderMapLink(title, siteMapUrl(temperature), language);
    // The map is the photo's other view, so without a photo there is none:
    // it would either load for everyone or push the card down when opened.
    const mapEntity =
      hero &&
      config.show_map !== false &&
      !this._mapFailed &&
      sitePosition(temperature) !== undefined &&
      servesMapTiles(hass)
        ? temperature?.entity_id
        : undefined;

    return html`
      <ha-card>
        ${hero
          ? this._renderHero(
              photoSrc,
              photo,
              title,
              mapLink,
              mapEntity,
              temperature,
              samples,
              language,
            )
          : nothing}
        ${this._renderVersionBanner(language)}
        ${isClosed ? this._renderClosure(closed, language) : nothing}
        <div class="body">
          ${hero ? nothing : this._renderHeader(title, mapLink, temperature, samples, language)}
          ${config.show_season_track === false
            ? nothing
            : this._renderSeason(temperature, entities, samples, inSeason, language, hero)}
          ${config.show_readings === false
            ? nothing
            : this._renderReadings(entities, samples, language)}
          ${config.show_attribution === false
            ? nothing
            : html`<p class="attribution">${localize("card.attribution", language)}</p>`}
        </div>
      </ha-card>
    `;
  }

  private _renderAlert(message: string): TemplateResult {
    // ha-alert carries role="alert" and the themed error styling, so the
    // message reaches a screen reader instead of being colour-only.
    return html`
      <ha-card>
        <div class="body"><ha-alert alert-type="error">${message}</ha-alert></div>
      </ha-card>
    `;
  }

  private _renderVersionBanner(language: string | undefined): TemplateResult | typeof nothing {
    if (!this._staleVersion) return nothing;
    return html`
      <div class="version-banner">
        <ha-icon icon="mdi:refresh" aria-hidden="true"></ha-icon>
        <span
          >${localize("version.mismatch", language, {
            card: CARD_VERSION,
            integration: this._staleVersion,
          })}</span
        >
        <button type="button" @click=${this._reload}>
          ${localize("version.reload", language)}
        </button>
      </div>
    `;
  }

  private _renderClosure(
    closed: HassEntity | undefined,
    language: string | undefined,
  ): TemplateResult {
    const reason = closed?.attributes["closure_reason"];
    return html`
      <div class="closure">
        <ha-icon icon="mdi:close-octagon" aria-hidden="true"></ha-icon>
        <span>${localize("card.closed", language)}</span>
        ${typeof reason === "string" && reason
          ? html`<span class="closure-reason">${reason}</span>`
          : nothing}
      </div>
    `;
  }

  /**
   * The photo as the card's header, with the bathing water's name, its
   * Bundesland and the water temperature laid over it.
   *
   * The picture comes from the site's `image` entity through Home Assistant's
   * image proxy, so the browser talks to nobody but Home Assistant. Name and
   * temperature share one row along the bottom, on a band sized to that row,
   * so the contrast holds however bright the picture is underneath: see the
   * hero section of card-styles.ts for the measurement.
   *
   * With a map entity the header has a second view, HA's map of the bathing
   * water, and a button in the corner to swap between the two. The inactive
   * view is inert, so its links and buttons leave the tab order and a screen
   * reader hears only the view on screen. The heading stays either way: in
   * the map view a hidden copy stands in for the one on the photo.
   *
   * Source order is also focus order. On the photo that is name, pin,
   * credit, then the map button; on the map it is the button, then the map
   * it just opened.
   */
  private _renderHero(
    src: string,
    photo: HassEntity | undefined,
    title: string,
    mapLink: TemplateResult | typeof nothing,
    mapEntity: string | undefined,
    temperature: HassEntity | undefined,
    samples: SeasonSample[],
    language: string | undefined,
  ): TemplateResult {
    const attribution = photo?.attributes["attribution"];
    const credit = typeof attribution === "string" ? attribution : "";
    const deviceId = resolveDeviceId(this.hass, this._config);
    const place = deviceId ? this.hass?.devices?.[deviceId]?.model : undefined;
    const formatted = formatNumber(numericState(temperature), language);
    const unit = temperature?.attributes["unit_of_measurement"];
    const latest = samples.at(-1);
    const showMap = this._showMap && mapEntity !== undefined;
    const heroClass = ["hero", mapEntity ? "has-map" : "", showMap ? "is-map" : ""]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${heroClass}>
        <div class="hero-photo" ?inert=${showMap}>
          <img
            class="hero-img"
            src=${src}
            alt=${localize("card.photo_alt", language, { name: title })}
            width="600"
            height="210"
            decoding="async"
            @error=${() => this._onPhotoError(src)}
          />
          <div class="hero-caption">
            <div class="hero-heading"><h2 class="hero-title">${title}</h2>${mapLink}</div>
            ${place ? html`<p class="hero-place">${place}</p>` : nothing}
            <p class=${formatted === null ? "hero-temperature is-missing" : "hero-temperature"}>
              <ha-icon
                class="hero-icon"
                icon=${READING_ICON.temperature}
                aria-hidden="true"
              ></ha-icon
              ><span class="hero-value">${formatted ?? "—"}</span>${formatted !== null &&
              typeof unit === "string"
                ? html`<span class="hero-unit">${unit}</span>`
                : nothing}
            </p>
            ${latest
              ? html`<p class="hero-sampled">
                  ${localize("card.sampled_on", language, {
                    date: formatSampleDate(new Date(`${latest.date}T00:00:00Z`), language),
                  })}
                </p>`
              : nothing}
          </div>
        </div>
        ${credit ? this._renderPhotoCredit(credit, language, showMap) : nothing}
        ${mapEntity
          ? html`${showMap ? html`<h2 class="visually-hidden">${title}</h2>` : nothing}
              ${this._renderMapToggle(mapEntity, showMap, language)}
              <div class="hero-map" ?inert=${!showMap} @wheel=${this._mapWheel}>
                ${this._mapCard ?? nothing}
              </div>`
          : nothing}
      </div>
    `;
  }

  /**
   * The button that swaps the photo for the map and back.
   *
   * Its name says what it does next and changes with the view, like its
   * icon. No aria-pressed: a toggle button's name has to stay the same while
   * its state flips, and a name that changes and a pressed state together
   * would tell a screen reader the same thing twice, in contradicting words.
   * It is one element in both views, so focus stays on it across the swap.
   */
  private _renderMapToggle(
    entityId: string,
    showMap: boolean,
    language: string | undefined,
  ): TemplateResult {
    const label = localize(showMap ? "card.show_photo" : "card.show_map", language);
    return html`<button
      type="button"
      class="map-toggle"
      aria-label=${label}
      title=${label}
      @click=${() => this._toggleMap(entityId)}
    >
      <ha-icon icon=${showMap ? "mdi:image-outline" : "mdi:map-outline"} aria-hidden="true"></ha-icon>
    </button>`;
  }

  /**
   * Swap the photo for the map, or back.
   *
   * The map card is created on the first click, never before, so a user who
   * never opens the map never loads it or its map library. Once created it
   * is kept: it holds a WebGL context and its loaded tiles, and building it
   * again on every swap would pay for both each time.
   */
  private _toggleMap(entityId: string): void {
    this._showMap = !this._showMap;
    // The credit belongs to the photo, so an open tooltip closes with it.
    this._photoTipHovered = false;
    this._photoTipPinned = false;
    this._photoTip = false;
    if (this._showMap) void this._createMap(entityId);
  }

  private async _createMap(entityId: string): Promise<void> {
    if (this._mapCard || this._mapLoading) return;
    this._mapLoading = true;
    try {
      const helpers = await (window as WindowWithCardHelpers).loadCardHelpers?.();
      if (!helpers) throw new Error("window.loadCardHelpers is not available");
      const card = helpers.createCardElement(mapCardConfig(entityId));
      // What a sections view sets: the map card then fills the box it is
      // placed in, instead of sizing itself to an aspect ratio of its own.
      card.layout = "grid";
      if (this.hass) card.hass = this.hass;
      card.classList.add("hero-map-card");
      this._mapEntityId = entityId;
      this._mapCard = card;
    } catch (error) {
      // No helpers means no map to show. Back to the photo, and no button
      // left that does nothing.
      console.warn("badegewaesser-austria-card: the map could not be created", error);
      this._mapFailed = true;
      this._showMap = false;
    } finally {
      this._mapLoading = false;
    }
  }

  /**
   * Leaflet zooms on the mouse wheel and swallows the page's scroll while
   * the pointer is over the map, so on a dashboard the page stops scrolling
   * under the card. Stopped here on its way down to the map, the wheel
   * scrolls the page instead. With Ctrl, which is also what a trackpad pinch
   * sends, it goes through and zooms. So do the map's own buttons.
   */
  private _mapWheel = {
    handleEvent: (event: WheelEvent): void => {
      if (!event.ctrlKey) event.stopPropagation();
    },
    capture: true,
    passive: true,
  };

  /**
   * The photo credit, behind an info button in the photo's corner, or just
   * left of the map button when there is one. Hidden while the map shows:
   * it credits a photo that is not on screen, and the map credits its own.
   *
   * The tooltip follows the WAI-ARIA tooltip pattern and WCAG 1.4.13: it
   * opens on hover and on keyboard focus, stays open while the pointer is on
   * it, and Escape closes it. A click or tap pins it open, which is the only
   * way to reach it on a phone. It stays in the DOM while closed, so a screen
   * reader announces the credit as the button's description either way.
   */
  private _renderPhotoCredit(
    credit: string,
    language: string | undefined,
    hidden: boolean,
  ): TemplateResult {
    const update = (): void => {
      this._photoTip = this._photoTipHovered || this._photoTipPinned;
    };
    const close = (): void => {
      this._photoTipHovered = false;
      this._photoTipPinned = false;
      update();
    };
    return html`
      <div
        class="photo-info"
        ?hidden=${hidden}
        @pointerenter=${() => {
          this._photoTipHovered = true;
          update();
        }}
        @pointerleave=${() => {
          this._photoTipHovered = false;
          update();
        }}
      >
        <button
          type="button"
          class="photo-info-button"
          aria-label=${localize("card.photo_credit", language)}
          aria-describedby="photo-tip"
          @click=${() => {
            this._photoTipPinned = !this._photoTipPinned;
            update();
          }}
          @focus=${() => {
            this._photoTipHovered = true;
            update();
          }}
          @blur=${close}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Escape") close();
          }}
        >
          <ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon>
        </button>
        <div class="photo-tip" id="photo-tip" role="tooltip" ?hidden=${!this._photoTip}>
          <span>${credit}</span>
          <span class="photo-tip-source">${localize("card.photo_source", language)}</span>
        </div>
      </div>
    `;
  }

  /**
   * The photo's proxy URL, renewed only when the photo itself changes.
   *
   * `entity_picture` carries an access token that Home Assistant rotates every
   * five minutes. Following it would download the same photo again every five
   * minutes for as long as a dashboard stays open. The state — the photo's
   * timestamp — is what says the picture changed, so the URL is kept until it
   * moves. A new card always starts from the current URL.
   */
  private _photoUrl(entity: HassEntity | undefined): string | undefined {
    const url = entity?.attributes["entity_picture"];
    if (!entity || !hasValue(entity) || typeof url !== "string") return undefined;
    if (this._photo?.state !== entity.state) {
      this._photo = { state: entity.state, url };
    }
    return this._photo.url;
  }

  private _onPhotoError(src: string): void {
    // A kept URL can outlive its token (HA honours only the last two), for
    // instance when the photo toggle re-creates the image. Retry once with the
    // current URL before concluding that the photo itself is the problem.
    const current = this._siteEntities()?.[KEY.photo]?.attributes["entity_picture"];
    if (typeof current === "string" && current !== src) {
      this._photo = undefined;
      this.requestUpdate();
      return;
    }
    this._photoFailed = src;
  }

  /**
   * The map pin after the bathing water's name, in both headings.
   *
   * A sibling of the h2, not a child: inside, its name would join the
   * heading's, and a screen reader's list of headings would read the lake's
   * name twice. Placed with no whitespace after the h2 so the pin shares the
   * name's last line; see the heading rules in card-styles.ts.
   */
  private _renderMapLink(
    title: string,
    url: string | undefined,
    language: string | undefined,
  ): TemplateResult | typeof nothing {
    if (!url) return nothing;
    const label = localize("card.map_link", language, { name: title });
    return html`<a
      class="map-link"
      href=${url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label=${label}
      title=${label}
      ><ha-icon icon="mdi:map-marker" aria-hidden="true"></ha-icon
    ></a>`;
  }

  /**
   * A tile's trend arrow, right after the unit, so it reads as part of the
   * reading: "32 KBE/100ml" and which way it went. Secondary ink: up and down are facts
   * about the reading, not verdicts on the water -- more bacteria is bad news
   * and a deeper Secchi disc good news, and a rise from "<15" to 30 is still
   * excellent water -- so neither direction gets a status colour. The
   * sentence beside it is for screen readers.
   */
  private _renderTrend(
    trend: Trend | null,
    language: string | undefined,
  ): TemplateResult | typeof nothing {
    if (!trend) return nothing;
    return html`<ha-icon
        class="tile-trend"
        icon=${TREND_ICON[trend.direction]}
        aria-hidden="true"
      ></ha-icon
      ><span class="visually-hidden"
        >${localize(`card.tile_trend_${trend.direction}`, language)}</span
      >`;
  }

  /**
   * The heading without a photo, laid out like the photo's caption: the name
   * and the temperature on one row, the Bundesland and the sample date on
   * the next. Two rows where the plain card used to spend four.
   *
   * The Bundesland and the date share one row under both columns, so only
   * the temperature sizes the right column: as a grid cell of its own the
   * date took 130px there and squeezed a long name onto three lines at
   * 300px. The temperature is inline text, not a flex row, so the grid
   * aligns the digits' baseline with the name's (see .reading).
   */
  private _renderHeader(
    title: string,
    mapLink: TemplateResult | typeof nothing,
    temperature: HassEntity | undefined,
    samples: SeasonSample[],
    language: string | undefined,
  ): TemplateResult {
    const formatted = formatNumber(numericState(temperature), language);
    const unit = temperature?.attributes["unit_of_measurement"];
    const latest = samples.at(-1);
    return html`
      <div class="header">
        <div class="heading"><h2 class="title">${title}</h2>${mapLink}</div>
        <p class="reading">
          <ha-icon
            class="reading-icon"
            icon=${READING_ICON.temperature}
            aria-hidden="true"
          ></ha-icon
          ><span class=${formatted === null ? "temperature is-missing" : "temperature"}
            >${formatted ?? "—"}</span
          >${formatted !== null && typeof unit === "string"
            ? html`<span class="unit">${unit}</span>`
            : nothing}
        </p>
        <div class="meta">
          ${this._renderPlace()}
          ${latest
            ? html`<p class="sampled">
                ${localize("card.sampled_on", language, {
                  date: formatSampleDate(new Date(`${latest.date}T00:00:00Z`), language),
                })}
              </p>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderPlace(): TemplateResult | typeof nothing {
    const deviceId = resolveDeviceId(this.hass, this._config);
    const model = deviceId ? this.hass?.devices?.[deviceId]?.model : undefined;
    return model ? html`<p class="place">${model}</p>` : nothing;
  }

  private _renderSeason(
    temperature: HassEntity | undefined,
    entities: SiteEntities,
    samples: SeasonSample[],
    inSeason: boolean,
    language: string | undefined,
    hero = false,
  ): TemplateResult {
    const unit = temperature?.attributes["unit_of_measurement"];
    const latest = samples.at(-1);
    const latestDate = latest ? new Date(`${latest.date}T00:00:00Z`) : null;

    const options = {
      samples,
      now: new Date(),
      inSeason,
      language,
      formatDate: (date: Date) => formatSampleDate(date, language),
      hovered: this._hoveredPoint,
      onHover: (index: number | null) => {
        this._hoveredPoint = index;
      },
      formatLabel: (temp: number) => `${formatNumber(temp, language) ?? ""}°`,
      // The body's side padding and the track's own inset, off the card width.
      axisWidth: this._width ? this._width - 48 : undefined,
      formatTemperature: (temp: number | null) =>
        formatNumber(temp, language) === null
          ? localize("card.not_measured", language)
          : `${formatNumber(temp, language)} ${typeof unit === "string" ? unit : "°C"}`,
      ...this._trackMetric(this._trackHover ?? this._trackPinned, entities, language),
    };

    // The temperature and the date head the card, on the photo or in the
    // plain header. With the photo the date keeps a copy here, shown only
    // where the card is too narrow for it on the photo.
    return html`
      <div class="season">
        ${hero && latestDate
          ? html`<div class="reading-block hero-fallback">
              <p class="sampled">
                ${localize("card.sampled_on", language, {
                  date: formatSampleDate(latestDate, language),
                })}
              </p>
            </div>`
          : nothing}
        ${renderSeasonTrack(options)}
        ${
          // Only an empty track gets a line. "Season over" / "season under way"
          // used to sit here, but that was today's date against the statutory
          // season, not anything AGES published -- the Badesaison entity carries
          // it for automations, and the card now shows only what was measured.
          samples.length === 0
            ? html`<p class="season-status">${localize("card.no_samples", language)}</p>`
            : nothing
        }
        <p class="visually-hidden">${seasonTrackDescription(options)}</p>
      </div>
    `;
  }

  /**
   * How the track reads and prints another reading than the temperature.
   * Counts keep their "<15" for a below-limit sample; the unit goes into the
   * tooltip, since the hovered tile already names the reading.
   */
  private _trackMetric(
    reading: TrackReading | null,
    entities: SiteEntities,
    language: string | undefined,
  ): Partial<Pick<SeasonTrackOptions, "read" | "formatLabel" | "formatTemperature">> {
    if (!reading) return {};
    const unit = entities[reading]?.attributes["unit_of_measurement"];
    const suffix = typeof unit === "string" ? ` ${unit}` : "";
    const missing = localize("card.not_measured", language);
    if (reading === KEY.secchi) {
      return {
        read: (sample) => sample.secchi_depth,
        formatLabel: (value) => `${formatNumber(value, language) ?? ""}${suffix}`,
        formatTemperature: (value) =>
          value === null ? missing : `${formatNumber(value, language, 2) ?? ""}${suffix}`,
      };
    }
    const count = (value: number | null, sample: SeasonSample): string | null =>
      formatCount(value, sample[`${reading}_below_limit`] === true, language);
    return {
      read: (sample) => sample[reading],
      formatLabel: (value, sample) => count(value, sample) ?? "",
      formatTemperature: (value, sample) => {
        const text = count(value, sample);
        return text === null ? missing : `${text}${suffix}`;
      },
    };
  }

  /** The tile's class, and whether the track shows its reading. */
  private _tileClass(reading: TrackReading): string {
    const shown = (this._trackHover ?? this._trackPinned) === reading;
    return shown ? "tile is-trackable is-tracked" : "tile is-trackable";
  }

  private _pinTrack(reading: TrackReading): void {
    this._trackPinned = this._trackPinned === reading ? null : reading;
  }

  /**
   * The readings as a two-by-two grid: the verdict and the Secchi depth on
   * top, the two bacteria counts, which share a unit, underneath.
   *
   * Each tile is label, value, detail -- the label small above so the eye
   * lands on the number, the reading's icon in front of it and its trend at
   * the right edge. Still a description list, so a screen reader hears each
   * label with its value. No boxes: the grid and the type carry the
   * structure.
   */
  private _renderReadings(
    entities: SiteEntities,
    samples: readonly SeasonSample[],
    language: string | undefined,
  ): TemplateResult {
    const quality = entities[KEY.quality];
    const secchi = entities[KEY.secchi];
    const ratingYear = quality?.attributes["rating_year"];
    const hasQuality = hasValue(quality);
    const state = quality?.state ?? "";
    const symbol = hasQuality ? QUALITY_SYMBOL[state] : undefined;
    const secchiUnit = secchi?.attributes["unit_of_measurement"];
    const secchiMove = hasValue(secchi) ? secchiTrend(samples) : null;

    return html`
      <dl class="tiles">
        <div class="tile">
          <dt>
            ${localize("card.water_quality", language)}${symbol
              ? html`<span class=${`quality-symbol is-${state}`} aria-hidden="true"
                  >${Array.from(
                    { length: symbol.count },
                    () => html`<ha-icon icon=${symbol.icon}></ha-icon>`,
                  )}</span
                >`
              : nothing}
          </dt>
          <dd class="tile-value">
            ${hasQuality
              ? localize(`quality.${state}`, language)
              : localize("card.no_rating", language)}
          </dd>
          ${typeof ratingYear === "number"
            ? html`<dd class="tile-detail">
                ${localize("card.rating_year", language, { year: ratingYear })}
              </dd>`
            : nothing}
        </div>
        <div
          class=${this._tileClass(KEY.secchi)}
          @pointerenter=${() => {
            this._trackHover = KEY.secchi;
          }}
          @pointerleave=${() => {
            this._trackHover = null;
          }}
          @click=${() => this._pinTrack(KEY.secchi)}
        >
          <dt>${localize("card.secchi_depth", language)}</dt>
          <dd class="tile-value">
            ${this._renderReadingIcon(READING_ICON.secchi)}${formatNumber(
              numericState(secchi),
              language,
              2,
            ) ?? "—"}${this._renderTail(
              hasValue(secchi) && typeof secchiUnit === "string" ? secchiUnit : undefined,
              secchiMove,
              language,
            )}
          </dd>
        </div>
        ${this._renderCount(KEY.eColi, entities[KEY.eColi], countTrend(samples, "e_coli"), language)}
        ${this._renderCount(
          KEY.enterococci,
          entities[KEY.enterococci],
          countTrend(samples, "enterococci"),
          language,
        )}
      </dl>
    `;
  }

  /**
   * The unit and the trend after a value, as one piece that wraps as a
   * whole. A narrow tile then moves both to the next line together instead
   * of leaving the arrow alone on one of its own.
   */
  private _renderTail(
    unit: string | undefined,
    trend: Trend | null,
    language: string | undefined,
  ): TemplateResult | typeof nothing {
    if (unit === undefined && !trend) return nothing;
    return html`<span class="tile-tail"
      >${unit === undefined ? nothing : html`<span class="unit">${unit}</span>`}${this._renderTrend(
        trend,
        language,
      )}</span
    >`;
  }

  private _renderReadingIcon(icon: string): TemplateResult {
    return html`<ha-icon class="tile-icon" icon=${icon} aria-hidden="true"></ha-icon>`;
  }

  private _renderCount(
    key: typeof KEY.eColi | typeof KEY.enterococci,
    entity: HassEntity | undefined,
    trend: Trend | null,
    language: string | undefined,
  ): TemplateResult {
    const below = entity?.attributes["below_detection_limit"] === true;
    const text = formatCount(numericState(entity), below, language);
    const unit = entity?.attributes["unit_of_measurement"];
    const move = text === null ? null : trend;
    return html`
      <div
        class=${this._tileClass(key)}
        @pointerenter=${() => {
          this._trackHover = key;
        }}
        @pointerleave=${() => {
          this._trackHover = null;
        }}
        @click=${() => this._pinTrack(key)}
      >
        <dt>${localize(`card.${key}`, language)}</dt>
        <dd class="tile-value">
          ${this._renderReadingIcon(READING_ICON[key])}${text ?? "—"}${this._renderTail(
            text !== null && typeof unit === "string" ? unit : undefined,
            move,
            language,
          )}
        </dd>
        ${below
          ? html`<dd class="tile-detail">${localize("card.below_limit", language)}</dd>`
          : nothing}
      </div>
    `;
  }
}

const cards = window as unknown as WindowWithCustomCards;
cards.customCards = cards.customCards ?? [];
cards.customCards.push({
  type: CARD_TAG,
  name: "Badegewässer Austria",
  description: "Wasserqualität und Temperatur eines österreichischen Badegewässers",
  preview: true,
  documentationURL: "https://github.com/rolandzeiner/badegewaesser-austria",
  // HA 2026.6 entity-first picker. Gated on the registry platform so this
  // card is only ever suggested for its own entities; suggesting for every
  // sensor is the documented anti-pattern.
  getEntitySuggestion: (hass, entityId) => {
    const entry = hass.entities?.[entityId];
    if (entry?.platform !== PLATFORM || !entry.device_id) return null;
    // HA hands us an entity; the card is about the bathing water it belongs to.
    return { config: { type: `custom:${CARD_TAG}`, device: entry.device_id } };
  },
});

declare global {
  interface HTMLElementTagNameMap {
    "badegewaesser-austria-card": BadegewaesserAustriaCard;
  }
}
