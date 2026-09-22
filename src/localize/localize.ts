/**
 * Card-side translation lookup.
 *
 * The language comes from `hass.locale.language` (falling back to
 * `hass.language`), NOT from `localStorage.getItem("selectedLanguage")`.
 * localStorage is where HA happens to persist it, but it is not reactive —
 * reading it means the card keeps the old language until a full reload, while
 * `hass.locale` is a reactive property that re-renders the card on change.
 */
import de from "./languages/de.json";
import en from "./languages/en.json";

type Catalogue = Record<string, Record<string, string>>;

const LANGUAGES: Record<string, Catalogue> = { de, en };

const DEFAULT_LANGUAGE = "en";

/**
 * Resolve `section.key`, substituting `{placeholders}`.
 *
 * Region-agnostic: "de-AT" and "de-CH" both resolve to "de", so an Austrian
 * user gets German without the catalogue having to enumerate regions.
 */
export function localize(
  key: string,
  language: string | undefined,
  placeholders: Record<string, string | number> = {},
): string {
  const base = (language ?? DEFAULT_LANGUAGE).toLowerCase().split("-")[0] ?? DEFAULT_LANGUAGE;
  const [section, name] = key.split(".");
  const catalogue = LANGUAGES[base] ?? LANGUAGES[DEFAULT_LANGUAGE];
  const fallback = LANGUAGES[DEFAULT_LANGUAGE];

  const lookup = (from: Catalogue | undefined): string | undefined =>
    section && name ? from?.[section]?.[name] : undefined;

  // Fall back key-by-key rather than catalogue-by-catalogue, so one missing
  // string in a translation shows English instead of an empty label.
  const template = lookup(catalogue) ?? lookup(fallback) ?? key;

  return Object.entries(placeholders).reduce(
    (text, [token, value]) => text.replaceAll(`{${token}}`, String(value)),
    template,
  );
}
