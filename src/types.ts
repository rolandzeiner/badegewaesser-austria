/**
 * Local mirror of the HA / Lovelace types this card actually uses.
 *
 * Replaces the `custom-card-helpers` dependency, which the portfolio dropped
 * in 2026-05: the package is effectively unmaintained and HA's bundled types
 * drift faster than its release cadence. Only the fields this card touches
 * are declared; anything else is read with a cast at the call site.
 */

/** One entity in `hass.states`. */
export interface HassEntity {
  entity_id?: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

/**
 * One entry in `hass.entities`.
 *
 * Mirrors `EntityRegistryDisplayEntry` in the HA frontend
 * (`src/data/entity/entity_registry.ts`). Three fields carry this card:
 * `device_id` groups the eight entities of one bathing water, `platform`
 * proves they are ours, and `translation_key` names which reading each one
 * is — which is stable, unlike an entity_id the user is free to rename.
 */
export interface HassEntityRegistryDisplayEntry {
  entity_id: string;
  device_id?: string;
  platform?: string;
  translation_key?: string;
  has_entity_name?: boolean;
  name?: string;
  [key: string]: unknown;
}

/** One device in `hass.devices`. */
export interface HassDeviceRegistryEntry {
  id: string;
  name?: string;
  name_by_user?: string;
  model?: string;
  [key: string]: unknown;
}

/** The slice of `hass` this card reads. */
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities?: Record<string, HassEntityRegistryDisplayEntry>;
  devices?: Record<string, HassDeviceRegistryEntry>;
  language?: string;
  locale?: { language?: string } & Record<string, unknown>;
  /** `components` lists the integrations core has loaded. */
  config?: { time_zone?: string; components?: string[] } & Record<string, unknown>;
  themes?: { darkMode?: boolean } & Record<string, unknown>;
  callWS?<T = unknown>(msg: { type: string; [key: string]: unknown }): Promise<T>;
}

/** Marker every card config extends. */
export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

/** This card's config. */
export interface BadegewaesserCardConfig extends LovelaceCardConfig {
  /** Device id of the bathing water — what the editor writes. */
  device?: string;
  /**
   * Any one entity of the bathing water. The original shape, kept working for
   * cards configured before the editor moved to a device picker.
   */
  entity?: string;
  name?: string;
  show_photo?: boolean;
  show_map?: boolean;
  show_season_track?: boolean;
  show_readings?: boolean;
  show_attribution?: boolean;
}

/** Lovelace's editor contract: an element with `setConfig` that reads `hass`. */
export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}

export type LovelaceCard = HTMLElement;

/**
 * A card element as HA's `createCardElement` returns it. `layout` is what a
 * sections view sets on every card it places; `setConfig` is optional
 * because a lazily loaded card type is not upgraded yet when it arrives.
 */
export interface LovelaceCardElement extends HTMLElement {
  hass?: HomeAssistant;
  layout?: string;
  setConfig?(config: LovelaceCardConfig): void;
}

/** What `window.loadCardHelpers()` resolves to; only the one helper used. */
export interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCardElement;
}

export interface WindowWithCardHelpers extends Window {
  loadCardHelpers?: () => Promise<CardHelpers>;
}

/** One `ha-form` schema row. Open-ended — HA owns the full grammar. */
export interface HaFormSchema {
  name: string;
  required?: boolean;
  selector?: Record<string, unknown>;
  type?: string;
  schema?: HaFormSchema[];
  [key: string]: unknown;
}

export interface HaFormElement extends HTMLElement {
  hass?: HomeAssistant;
  data?: Record<string, unknown>;
  schema?: HaFormSchema[];
  computeLabel?: (schema: HaFormSchema) => string;
  computeHelper?: (schema: HaFormSchema) => string | undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    "badegewaesser-austria-card-editor": LovelaceCardEditor;
    "hui-error-card": LovelaceCard;
    "ha-form": HaFormElement;
  }
}

/** One descriptor in `window.customCards`. */
export interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
  getEntitySuggestion?: (
    hass: HomeAssistant,
    entityId: string,
  ) => { config: Record<string, unknown> } | null;
}

export interface WindowWithCustomCards extends Window {
  customCards?: CustomCardEntry[];
}

/**
 * Dispatch a composed CustomEvent so it crosses the Shadow DOM boundary.
 * Without `composed: true` the event never leaves the card and the editor's
 * changes are silently dropped.
 */
export const fireEvent = <T>(
  node: HTMLElement,
  type: string,
  detail?: T,
): void => {
  node.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
};
