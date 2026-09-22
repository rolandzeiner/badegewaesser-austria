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
import { CARD_TAG, CARD_VERSION } from "./const";
import { localize } from "./localize/localize";
import {
  latestFraction,
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
} as const;

type SiteEntities = Partial<Record<string, HassEntity>>;

@customElement(CARD_TAG)
export class BadegewaesserAustriaCard extends LitElement {
  static override styles = [cardStyles, seasonTrackStyles];

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BadegewaesserCardConfig;
  @state() private _staleVersion?: string;

  private _versionChecked = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./editor");
    return document.createElement("badegewaesser-austria-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
  ): Record<string, unknown> {
    const first = Object.values(hass.entities ?? {}).find(
      (entry) => entry.platform === PLATFORM,
    );
    return { entity: first?.entity_id ?? "" };
  }

  public setConfig(config: BadegewaesserCardConfig): void {
    if (!config) {
      throw new Error(localize("error.no_entity", undefined));
    }
    this._config = {
      show_season_track: true,
      show_readings: true,
      ...config,
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public getGridOptions(): Record<string, unknown> {
    // The season track needs horizontal room to be worth drawing; below about
    // six columns the container query collapses the readings to one per line
    // and the card is still usable, so that is the honest minimum.
    return { columns: 12, min_columns: 6, rows: "auto" };
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
    const configured = this._config?.entity;
    if (!hass || !configured) return undefined;

    const registry = hass.entities ?? {};
    const anchor = registry[configured];
    if (!anchor?.device_id) return undefined;

    const found: SiteEntities = {};
    for (const entry of Object.values(registry)) {
      if (entry.device_id !== anchor.device_id) continue;
      if (entry.platform !== PLATFORM) continue;
      if (!entry.translation_key) continue;
      found[entry.translation_key] = hass.states[entry.entity_id];
    }
    return found;
  }

  private _deviceName(): string | undefined {
    const configured = this._config?.entity;
    const deviceId = configured ? this.hass?.entities?.[configured]?.device_id : undefined;
    const device = deviceId ? this.hass?.devices?.[deviceId] : undefined;
    return device?.name_by_user ?? device?.name;
  }

  protected override render(): TemplateResult | typeof nothing {
    const config = this._config;
    const hass = this.hass;
    if (!config || !hass) return nothing;

    const language = languageOf(hass);

    if (!config.entity) {
      return this._renderAlert(localize("error.no_entity", language));
    }
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

    const entities = this._siteEntities() ?? {};
    const temperature = entities[KEY.temperature];
    const closed = entities[KEY.closed];
    const season = entities[KEY.season];

    const samples = (temperature?.attributes["season_samples"] ?? []) as SeasonSample[];
    const inSeason = season?.state === "on";
    const isClosed = closed?.state === "on";

    return html`
      <ha-card>
        ${this._renderVersionBanner(language)}
        ${isClosed ? this._renderClosure(closed, language) : nothing}
        <div class="body">
          <h2 class="title">${config.name ?? this._deviceName() ?? ""}</h2>
          ${this._renderPlace()}
          ${config.show_season_track === false
            ? nothing
            : this._renderSeason(temperature, samples, inSeason, language)}
          ${config.show_readings === false
            ? nothing
            : this._renderReadings(entities, language)}
          <p class="attribution">${localize("card.attribution", language)}</p>
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

  private _renderPlace(): TemplateResult | typeof nothing {
    const configured = this._config?.entity;
    const deviceId = configured ? this.hass?.entities?.[configured]?.device_id : undefined;
    const model = deviceId ? this.hass?.devices?.[deviceId]?.model : undefined;
    return model ? html`<p class="place">${model}</p>` : nothing;
  }

  private _renderSeason(
    temperature: HassEntity | undefined,
    samples: SeasonSample[],
    inSeason: boolean,
    language: string | undefined,
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
      formatTemperature: (temp: number | null) =>
        formatNumber(temp, language) === null
          ? localize("card.not_measured", language)
          : `${formatNumber(temp, language)} ${typeof unit === "string" ? unit : "°C"}`,
    };

    // Anchor the reading over the newest dot, clamped so a very early or very
    // late sample cannot push the label out of the card.
    const anchor = Math.min(0.88, Math.max(0.12, latestFraction(samples)));

    return html`
      <div class="season">
        <div class="reading" style=${`--last-x:${(anchor * 100).toFixed(1)}%`}>
          <span class=${formatted === null ? "temperature is-missing" : "temperature"}>
            ${formatted ?? "—"}
          </span>
          ${formatted !== null && typeof unit === "string"
            ? html`<span class="unit">${unit}</span>`
            : nothing}
        </div>
        ${latestDate
          ? html`<p class="sampled">
              ${localize("card.sampled_on", language, {
                date: formatSampleDate(latestDate, language),
              })}
            </p>`
          : nothing}
        ${renderSeasonTrack(options)}
        <p class="season-status">
          <ha-icon
            icon=${inSeason ? "mdi:swim" : "mdi:calendar-check"}
            aria-hidden="true"
          ></ha-icon>
          <span
            >${samples.length === 0
              ? localize("card.no_samples", language)
              : localize(inSeason ? "card.in_season" : "card.season_over", language)}</span
          >
        </p>
        <p class="visually-hidden">${seasonTrackDescription(options)}</p>
      </div>
    `;
  }

  private _renderReadings(
    entities: SiteEntities,
    language: string | undefined,
  ): TemplateResult {
    const quality = entities[KEY.quality];
    const eColi = entities[KEY.eColi];
    const enterococci = entities[KEY.enterococci];
    const secchi = entities[KEY.secchi];

    const ratingYear = quality?.attributes["rating_year"];
    const qualityText = hasValue(quality)
      ? localize(`quality.${quality?.state}`, language)
      : localize("card.no_rating", language);

    return html`
      <dl class="readings">
        <dt>${localize("card.water_quality", language)}</dt>
        <dd>
          ${qualityText}
          ${typeof ratingYear === "number"
            ? html`<span class="qualifier"
                >${localize("card.rating_year", language, { year: ratingYear })}</span
              >`
            : nothing}
        </dd>
        ${this._renderCount(KEY.eColi, eColi, language)}
        ${this._renderCount(KEY.enterococci, enterococci, language)}
        <dt>${localize("card.secchi_depth", language)}</dt>
        <dd>
          ${formatNumber(numericState(secchi), language, 2) ?? "—"}
          ${hasValue(secchi) && typeof secchi?.attributes["unit_of_measurement"] === "string"
            ? html`<span class="unit">${secchi.attributes["unit_of_measurement"]}</span>`
            : nothing}
        </dd>
      </dl>
    `;
  }

  private _renderCount(
    key: string,
    entity: HassEntity | undefined,
    language: string | undefined,
  ): TemplateResult {
    const below = entity?.attributes["below_detection_limit"] === true;
    const text = formatCount(numericState(entity), below, language);
    const unit = entity?.attributes["unit_of_measurement"];
    return html`
      <dt>${localize(`card.${key}`, language)}</dt>
      <dd>
        ${text ?? "—"}
        ${text !== null && typeof unit === "string"
          ? html`<span class="unit">${unit}</span>`
          : nothing}
        ${below
          ? html`<span class="qualifier">${localize("card.below_limit", language)}</span>`
          : nothing}
      </dd>
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
    if (hass.entities?.[entityId]?.platform !== PLATFORM) return null;
    return { config: { type: `custom:${CARD_TAG}`, entity: entityId } };
  },
});

declare global {
  interface HTMLElementTagNameMap {
    "badegewaesser-austria-card": BadegewaesserAustriaCard;
  }
}
