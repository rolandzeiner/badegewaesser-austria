/** Translation lookup and its fallbacks. */
import { describe, expect, it } from "vitest";

import { localize } from "./localize/localize";

describe("localize", () => {
  it("resolves a key in the requested language", () => {
    expect(localize("card.season_over", "de")).toBe("Saison beendet");
    expect(localize("card.season_over", "en")).toBe("Season over");
  });

  it("is region-agnostic, so de-AT gets German", () => {
    // This integration's audience is Austrian; a catalogue that had to
    // enumerate de-AT, de-CH and de-DE would be wrong the first time it met
    // a locale nobody listed.
    expect(localize("card.season_over", "de-AT")).toBe("Saison beendet");
    expect(localize("card.season_over", "de-CH")).toBe("Saison beendet");
  });

  it("falls back to English for an unknown language", () => {
    expect(localize("card.season_over", "fi")).toBe("Season over");
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
