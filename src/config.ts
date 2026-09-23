/**
 * The single normaliser for this card's config.
 *
 * It exists because the card and the editor disagreed. The card applied its
 * defaults inside `setConfig`, so it rendered both sections; the editor fed
 * Lovelace's raw config straight to `ha-form`, which has no idea what the
 * card's defaults are — so a freshly added card showed both toggles OFF while
 * both sections were plainly visible. The UI was lying about its own state.
 *
 * Anything that needs a complete config goes through here.
 */
import type { BadegewaesserCardConfig, HomeAssistant } from "./types";

export const DEFAULTS = {
  show_photo: true,
  show_season_track: true,
  show_readings: true,
  show_attribution: true,
} as const;

export function normaliseConfig(
  config: Partial<BadegewaesserCardConfig>,
): BadegewaesserCardConfig {
  return { type: "", ...DEFAULTS, ...config };
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
