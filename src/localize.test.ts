/** Translation lookup and its fallbacks. */
import { describe, expect, it } from "vitest";

import { localize } from "./localize/localize";

describe("localize", () => {
  it("resolves a key in the requested language", () => {
    expect(localize("card.no_samples", "de")).toBe("Noch keine Proben in dieser Saison");
    expect(localize("card.no_samples", "en")).toBe("No samples yet this season");
  });

  it("is region-agnostic, so de-AT gets German", () => {
    // This integration's audience is Austrian; a catalogue that had to
    // enumerate de-AT, de-CH and de-DE would be wrong the first time it met
    // a locale nobody listed.
    expect(localize("card.no_samples", "de-AT")).toBe("Noch keine Proben in dieser Saison");
    expect(localize("card.no_samples", "de-CH")).toBe("Noch keine Proben in dieser Saison");
  });

  it("falls back to English for an unknown language", () => {
    expect(localize("card.no_samples", "fi")).toBe("No samples yet this season");
  });

  it("falls back per key, not per catalogue", () => {
    // A missing string in one translation must show English, not an empty
    // label — the failure mode that looks like a rendering bug.
    expect(localize("card.no_such_key", "de")).toBe("card.no_such_key");
  });

  it("substitutes placeholders", () => {
    expect(localize("card.sampled_on", "de", { date: "20. August" })).toContain(
      "20. August",
    );
  });

  it("substitutes every occurrence of a placeholder", () => {
    expect(localize("version.mismatch", "en", { card: "1.0.0", integration: "1.1.0" })).toBe(
      "This card is out of date (1.0.0 instead of 1.1.0).",
    );
  });
});
