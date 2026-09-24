/**
 * Badegewässer Austria — Lovelace card.
 *
 * Designed out-of-season first. The AGES document is frozen for roughly nine
 * and a half months a year, so "no new readings" is this card's normal state,
 * not its empty state: it has to look finished in February, not broken.
 */
import { LitElement, html, nothing, type TemplateResult } from "lit";
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
} from "./season-track";
import type {
  BadegewaesserCardConfig,
  HassEntity,
  HomeAssistant,
  LovelaceCardEditor,
  WindowWithCustomCards,
} from "./types";
import {
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
  photo: "photo",
} as const;

/**
 * Status icon for the water-quality verdict, in the tile's label row. It sits
 * beside words, never in place of them: colour and shape say "fine" or
 * "careful" at a glance, the verdict below says which of the four classes it
 * is. In the label row rather than beside the verdict because "Ausgezeichnet"
 * plus an icon does not fit half a sidebar-width card.
 */
const QUALITY_ICON: Readonly<Record<string, string>> = {
  excellent: "mdi:check-circle",
  good: "mdi:check-circle",
  sufficient: "mdi:alert-circle",
  poor: "mdi:close-circle",
};

/**
 * How far a reading may move since the sample before it and still count as
 * steady -- an arrow for noise is a trend the water does not have.
 *
 * Temperature: readings come to a tenth, so half a degree.
 * Secchi depth: read off a disc to about 0.1 m, so 0.2 m.
 * Bacteria: plate counts carry large method uncertainty, so a change within
 * 20% of the larger count is steady, and "<15" to "<15" is the same limit
 * twice, not a measurement.
 */
const TREND_STEADY_C = 0.5;
const TREND_STEADY_M = 0.2;
const TREND_STEADY_COUNT = 0.2;

const TREND_ICON = {
  up: "mdi:trending-up",
  down: "mdi:trending-down",
  steady: "mdi:trending-neutral",
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

export const temperatureTrend = (samples: readonly SeasonSample[]): Trend | null =>
  sampleTrend(
    samples,
    (sample) => sample.water_temperature,
    (_latest, _previous, delta) => Math.abs(delta) < TREND_STEADY_C,
  );

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
 * The bathing water on OpenStreetMap, from the position the water-temperature
 * sensor carries. Undefined without a usable one, and then there is no pin.
 *
 * A plain link: nothing loads from OpenStreetMap until someone follows it, so
 * the card itself still talks to nobody but Home Assistant. A zero on either
 * axis is refused as the integration refuses it -- upstream's "0" means "no
 * position", and no Austrian lake lies on the equator or at Greenwich.
 */
export function siteMapUrl(entity: HassEntity | undefined): string | undefined {
  const latitude = entity?.attributes["latitude"];
  const longitude = entity?.attributes["longitude"];
  if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (latitude === 0 || longitude === 0) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  // Six decimals is about 10 cm: all the precision a zoom-16 map can use.
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

type SiteEntities = Partial<Record<string, HassEntity>>;

@customElement(CARD_TAG)
export class BadegewaesserAustriaCard extends LitElement {
  static override styles = [cardStyles, seasonTrackStyles];

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BadegewaesserCardConfig;
  @state() private _staleVersion?: string;
  @state() private _hoveredPoint: number | null = null;
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

    return html`
      <ha-card>
        ${hero
          ? this._renderHero(photoSrc, photo, title, mapLink, temperature, samples, language)
          : nothing}
        ${this._renderVersionBanner(language)}
        ${isClosed ? this._renderClosure(closed, language) : nothing}
        <div class="body">
          ${hero
            ? nothing
            : html`<div class="heading"><h2 class="title">${title}</h2>${mapLink}</div>
                ${this._renderPlace()}`}
          ${config.show_season_track === false
            ? nothing
            : this._renderSeason(temperature, samples, inSeason, language, hero)}
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
   */
  private _renderHero(
    src: string,
    photo: HassEntity | undefined,
    title: string,
    mapLink: TemplateResult | typeof nothing,
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
    const trend = formatted === null ? null : temperatureTrend(samples);

    return html`
      <div class="hero">
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
            ${trend
              ? html`<ha-icon
                    class="hero-trend"
                    icon=${TREND_ICON[trend.direction]}
                    aria-hidden="true"
                  ></ha-icon
                  ><span class="visually-hidden"
                    >${localize(`card.trend_${trend.direction}`, language, {
                      delta: `${formatNumber(Math.abs(trend.delta), language) ?? ""} °C`,
                    })}</span
                  >`
              : nothing}<span class="hero-value">${formatted ?? "—"}</span>${formatted !== null &&
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
        ${credit ? this._renderPhotoCredit(credit, language) : nothing}
      </div>
    `;
  }

  /**
   * The photo credit, behind an info button in the photo's corner.
   *
   * The tooltip follows the WAI-ARIA tooltip pattern and WCAG 1.4.13: it
   * opens on hover and on keyboard focus, stays open while the pointer is on
   * it, and Escape closes it. A click or tap pins it open, which is the only
   * way to reach it on a phone. It stays in the DOM while closed, so a screen
   * reader announces the credit as the button's description either way.
   */
  private _renderPhotoCredit(credit: string, language: string | undefined): TemplateResult {
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
   * A tile's trend arrow, in secondary ink: up and down are facts about the
   * reading, not verdicts on the water, so neither gets a status colour. The
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

  private _renderPlace(): TemplateResult | typeof nothing {
    const deviceId = resolveDeviceId(this.hass, this._config);
    const model = deviceId ? this.hass?.devices?.[deviceId]?.model : undefined;
    return model ? html`<p class="place">${model}</p>` : nothing;
  }

  private _renderSeason(
    temperature: HassEntity | undefined,
    samples: SeasonSample[],
    inSeason: boolean,
    language: string | undefined,
    hero = false,
  ): TemplateResult {
    const value = numericState(temperature);
    const formatted = formatNumber(value, language);
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
    };

    // With the photo header the temperature sits on the photo. The date stays
    // here too, shown only where the card is too narrow for it on the photo.
    return html`
      <div class="season">
        <div class=${hero ? "reading-block hero-fallback" : "reading-block"}>
          ${hero
            ? nothing
            : html`<div class="reading">
                <span class=${formatted === null ? "temperature is-missing" : "temperature"}>
                  ${formatted ?? "—"}
                </span>
                ${formatted !== null && typeof unit === "string"
                  ? html`<span class="unit">${unit}</span>`
                  : nothing}
              </div>`}
          ${latestDate
            ? html`<p class="sampled">
                ${localize("card.sampled_on", language, {
                  date: formatSampleDate(latestDate, language),
                })}
              </p>`
            : nothing}
        </div>
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
   * The readings as a two-by-two grid: the verdict and the Secchi depth on
   * top, the two bacteria counts, which share a unit, underneath.
   *
   * Each tile is label, value, detail -- the label small above so the eye
   * lands on the number. Still a description list, so a screen reader hears
   * each label with its value. No boxes: the grid and the type carry the
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
    const secchiUnit = secchi?.attributes["unit_of_measurement"];

    return html`
      <dl class="tiles">
        <div class="tile">
          <dt>
            ${hasQuality && state in QUALITY_ICON
              ? html`<ha-icon
                  class=${`quality-icon is-${state}`}
                  icon=${QUALITY_ICON[state]}
                  aria-hidden="true"
                ></ha-icon>`
              : nothing}${localize("card.water_quality", language)}
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
        <div class="tile">
          <dt>${localize("card.secchi_depth", language)}</dt>
          <dd class="tile-value">
            ${hasValue(secchi) ? this._renderTrend(secchiTrend(samples), language) : nothing}${formatNumber(
              numericState(secchi),
              language,
              2,
            ) ?? "—"}${hasValue(secchi) &&
            typeof secchiUnit === "string"
              ? html`<span class="unit">${secchiUnit}</span>`
              : nothing}
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

  private _renderCount(
    key: string,
    entity: HassEntity | undefined,
    trend: Trend | null,
    language: string | undefined,
  ): TemplateResult {
    const below = entity?.attributes["below_detection_limit"] === true;
    const text = formatCount(numericState(entity), below, language);
    const unit = entity?.attributes["unit_of_measurement"];
    return html`
      <div class="tile">
        <dt>${localize(`card.${key}`, language)}</dt>
        <dd class="tile-value">
          ${text !== null ? this._renderTrend(trend, language) : nothing}${text ??
          "—"}${text !== null && typeof unit === "string"
            ? html`<span class="unit">${unit}</span>`
            : nothing}
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
