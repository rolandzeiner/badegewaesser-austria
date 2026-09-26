/** Formatting and small shared helpers. */
import type { HassEntity, HomeAssistant } from "./types";

/** The integration's domain, as the entity registry reports it. */
export const PLATFORM = "badegewaesser_austria";

/** The photo entity's translation key. Shared by the card and its editor. */
export const PHOTO_KEY = "photo";

/** A state HA uses for "no value" — never render these as a number. */
const EMPTY_STATES = new Set(["unknown", "unavailable", "", "none"]);

export const hasValue = (entity: HassEntity | undefined): boolean =>
  entity !== undefined && !EMPTY_STATES.has(entity.state.toLowerCase());

export const numericState = (entity: HassEntity | undefined): number | null => {
  if (!hasValue(entity)) return null;
  const value = Number(entity?.state);
  return Number.isFinite(value) ? value : null;
};

/** The user's language, preferring the reactive `hass.locale`. */
export const languageOf = (hass: HomeAssistant | undefined): string | undefined =>
  hass?.locale?.language ?? hass?.language;

export const formatNumber = (
  value: number | null,
  language: string | undefined,
  fractionDigits = 1,
): string | null =>
  value === null
    ? null
    : new Intl.NumberFormat(language ?? "en", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);

/**
 * A sample date, written the way the reader writes dates.
 *
 * Forced to UTC because the value is a calendar date, not an instant: the
 * integration publishes midnight local time, and re-interpreting that in
 * another zone can move it a day.
 */
export const formatSampleDate = (date: Date, language: string | undefined): string =>
  new Intl.DateTimeFormat(language ?? "en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);

/**
 * A bacteriological count, honouring the detection-limit operator.
 *
 * "<15" is not decoration. Upstream reports the limit rather than a
 * measurement for 901 of 1362 samples, and printing the bare number would
 * overstate contamination at sites that are in fact clean.
 */
export const formatCount = (
  value: number | null,
  belowLimit: boolean,
  language: string | undefined,
): string | null => {
  const text = formatNumber(value, language, 0);
  if (text === null) return null;
  return belowLimit ? `<${text}` : text;
};
