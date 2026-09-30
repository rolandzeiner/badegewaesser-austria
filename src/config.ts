/**
 * One table of defaults, shared by the card and its editor.
 *
 * It exists because the card and the editor disagreed. The card applied its
 * defaults inside `setConfig`, so it rendered both sections; the editor fed
 * Lovelace's raw config straight to `ha-form`, which has no idea what the
 * card's defaults are — so a freshly added card showed both toggles OFF while
 * both sections were plainly visible. The UI was lying about its own state.
 *
 * The rule: every optional field's default lives in DEFAULTS and nowhere
 * else. The card reads its config through normaliseConfig() and never writes
 * an inline default (a `!== false` or `=== false` read of a toggle) — an
 * inline default is invisible to the editor, which is how the two drift
 * apart. The editor shows normaliseConfig(config) and saves tidyConfig(next).
 *
 * Not in the table: `device` and `entity` (no default; the card asks for
 * one) and `name`, which falls back to the device's own name — only the
 * registry knows that.
 */
import type { BadegewaesserCardConfig, HomeAssistant } from "./types";

export const DEFAULTS = {
  show_photo: true,
  show_map: true,
  show_season_track: true,
  show_readings: true,
  show_attribution: true,
} as const satisfies Partial<BadegewaesserCardConfig>;

/** The config as the card reads it: every DEFAULTS key is present. */
export type NormalisedConfig = BadegewaesserCardConfig &
  Required<Pick<BadegewaesserCardConfig, keyof typeof DEFAULTS>>;

/** "" is what a cleared text field hands back. */
const isUnset = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

/**
 * The config with every default filled in: what the card renders and what
 * the editor shows. Unset values (undefined, null, "") fall back to the
 * default instead of blanking it out — a cleared name used to leave the card
 * with an empty title rather than the bathing water's own name. The user's
 * keys keep their order and the defaults follow them: ha-form saves back in
 * this order, so filling defaults in first would move every changed option
 * above `device` in the saved YAML.
 */
export function normaliseConfig(
  config: Partial<BadegewaesserCardConfig>,
): NormalisedConfig {
  const out: Record<string, unknown> = { type: config.type ?? "" };
  for (const [key, value] of Object.entries(config)) {
    if (!isUnset(value)) out[key] = value;
  }
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!(key in out)) out[key] = value;
  }
  return out as NormalisedConfig;
}

/**
 * The config as the editor saves it: only what differs from DEFAULTS, cleared
 * fields dropped, `type` first. Two reasons to leave defaults out: the YAML
 * stays as short as the user wrote it, and a default saved into the config is
 * pinned — a later change to DEFAULTS would never reach that card.
 */
export function tidyConfig(config: BadegewaesserCardConfig): BadegewaesserCardConfig {
  const defaults: Record<string, unknown> = DEFAULTS;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (isUnset(value)) continue;
    if (key in defaults && defaults[key] === value) continue;
    out[key] = value;
  }
  const { type, ...rest } = out;
  return { type, ...rest } as BadegewaesserCardConfig;
}

/**
 * The device this card is about.
 *
 * `device` is what the editor writes now. `entity` is the original shape and
 * is still honoured, because a card configured before the switch must keep
 * working — it resolves to the same device either way.
 */
export function resolveDeviceId(
  hass: HomeAssistant | undefined,
  config: BadegewaesserCardConfig | undefined,
): string | undefined {
  if (!config) return undefined;
  if (config.device) return config.device;
  if (config.entity) return hass?.entities?.[config.entity]?.device_id;
  return undefined;
}
