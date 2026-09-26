/**
 * Card editor.
 *
 * Schema-driven `ha-form`, which is the portfolio's universal editor pattern:
 * HA renders the controls, so they inherit the user's theme, the user's
 * language, dark mode and the accessibility behaviour of every other form in
 * the UI. Hand-rolled native inputs lose all four.
 */
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { normaliseConfig, resolveDeviceId, tidyConfig } from "./config";
import { localize } from "./localize/localize";
import type {
  BadegewaesserCardConfig,
  HaFormSchema,
  HomeAssistant,
  LovelaceCardConfig,
} from "./types";
import { fireEvent } from "./types";
import { PHOTO_KEY, PLATFORM, languageOf } from "./utils";

const SCHEMA: HaFormSchema[] = [
  {
    name: "device",
    required: true,
    // A DEVICE picker, not an entity one. The field is called "Badegewässer",
    // and an entity picker answered it with all eight sensors of the lake --
    // Enterokokken, Sichttiefe, Badesaison and so on -- which is an
    // unanswerable question: any of them works, and nothing on screen said so.
    // One device is one bathing water, which is the thing being chosen.
    //
    // `filter` rather than a top-level `integration`: the top-level form is
    // marked legacy in HA's selector module ("remains feature frozen").
    selector: { device: { filter: { integration: PLATFORM } } },
  },
  { name: "name", selector: { text: {} } },
  // One toggle per row, as in the portfolio's other editors. A two-column
  // grid squeezed each label and its helper text into half the width.
  { name: "show_photo", selector: { boolean: {} } },
  { name: "show_map", selector: { boolean: {} } },
  { name: "show_season_track", selector: { boolean: {} } },
  { name: "show_readings", selector: { boolean: {} } },
  { name: "show_attribution", selector: { boolean: {} } },
];

// Both need a photo: the map is the photo header's other view. Only a local
// photos/ folder creates the photo entity and no release ships one (see
// .gitignore), so without it these two rows would be switches that do nothing.
const PHOTO_OPTIONS = new Set(["show_photo", "show_map"]);
const SCHEMA_WITHOUT_PHOTO = SCHEMA.filter((row) => !PHOTO_OPTIONS.has(row.name));

@customElement("badegewaesser-austria-card-editor")
export class BadegewaesserAustriaCardEditor extends LitElement {
  // Reactive, like every other editor in the portfolio. As a plain field a new
  // `hass` never re-rendered the editor, so ha-form — and the device picker
  // inside it — kept whatever `hass` it had at the last config change.
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: BadegewaesserCardConfig;

  public setConfig(config: LovelaceCardConfig): void {
    this._config = config as BadegewaesserCardConfig;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${normaliseConfig(this._config)}
        .schema=${this._hasPhoto() ? SCHEMA : SCHEMA_WITHOUT_PHOTO}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  /** Whether the chosen bathing water has a photo entity. */
  private _hasPhoto(): boolean {
    const deviceId = resolveDeviceId(this.hass, this._config);
    if (!deviceId) return false;
    return Object.values(this.hass?.entities ?? {}).some(
      (entry) =>
        entry.device_id === deviceId &&
        entry.platform === PLATFORM &&
        entry.translation_key === PHOTO_KEY,
    );
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    localize(`editor.${schema.name}`, languageOf(this.hass));

  // Returning undefined rather than the raw key means a field with no helper
  // text renders without one, instead of showing "editor.foo_helper".
  private _computeHelper = (schema: HaFormSchema): string | undefined => {
    const key = `editor.${schema.name}_helper`;
    const text = localize(key, languageOf(this.hass));
    return text === key ? undefined : text;
  };

  private _valueChanged(event: CustomEvent<{ value: BadegewaesserCardConfig }>): void {
    // The emitted value carries every default, because `data` did (feeding
    // ha-form the raw config is what made the toggles render OFF on a freshly
    // added card). tidyConfig takes the defaults and cleared fields back out,
    // so the saved YAML holds only what the user changed.
    const next = tidyConfig(event.detail.value);
    this._config = next;
    // Must be composed to cross the Shadow DOM boundary; without it Lovelace
    // never hears the change and the editor silently discards every edit.
    fireEvent(this, "config-changed", { config: next });
  }
}

// The tag is already declared in types.ts as LovelaceCardEditor, which is what
// `getConfigElement()` promises Lovelace. Re-declaring it here with the
// concrete class is a TS2717 collision, and the interface is the honest type
// for the contract anyway.
