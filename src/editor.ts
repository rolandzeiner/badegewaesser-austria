/**
 * Card editor.
 *
 * Schema-driven `ha-form`, which is the portfolio's universal editor pattern:
 * HA renders the controls, so they inherit the user's theme, the user's
 * language, dark mode and the accessibility behaviour of every other form in
 * the UI. Hand-rolled native inputs lose all four.
 */
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import { localize } from "./localize/localize";
import type {
  BadegewaesserCardConfig,
  HaFormSchema,
  HomeAssistant,
  LovelaceCardConfig,
} from "./types";
import { fireEvent } from "./types";
import { PLATFORM, languageOf } from "./utils";

const SCHEMA: HaFormSchema[] = [
  {
    name: "entity",
    required: true,
    // Pinned to this integration. Without the filter the picker offers every
    // entity in the instance, and picking a wrong one produces a card that
    // renders an error instead of data.
    selector: { entity: { integration: PLATFORM } },
  },
  { name: "name", selector: { text: {} } },
  {
    type: "grid",
    name: "",
    // `flatten: true` is mandatory for a flat config: without it the grid
    // nests its children under its own name and the values never reach the
    // saved config.
    flatten: true,
    schema: [
      { name: "show_season_track", selector: { boolean: {} } },
      { name: "show_readings", selector: { boolean: {} } },
    ],
  },
];

@customElement("badegewaesser-austria-card-editor")
export class BadegewaesserAustriaCardEditor extends LitElement {
  public hass?: HomeAssistant;

  @state() private _config?: BadegewaesserCardConfig;

  public setConfig(config: LovelaceCardConfig): void {
    this._config = config as BadegewaesserCardConfig;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
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
    // Must be composed to cross the Shadow DOM boundary; without it Lovelace
    // never hears the change and the editor silently discards every edit.
    fireEvent(this, "config-changed", { config: event.detail.value });
  }
}

// The tag is already declared in types.ts as LovelaceCardEditor, which is what
// `getConfigElement()` promises Lovelace. Re-declaring it here with the
// concrete class is a TS2717 collision, and the interface is the honest type
// for the contract anyway.
