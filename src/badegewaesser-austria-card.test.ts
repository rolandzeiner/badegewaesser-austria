/**
 * @vitest-environment happy-dom
 *
 * Phase-1 smoke test for the card entrypoint.
 *
 * The docblock above is the per-file opt-in to a DOM environment. It is
 * required here — and for any future test that imports a card module —
 * because importing the card runs `@customElement`, which touches
 * `customElements`. There is deliberately no global `environment` setting
 * and no vitest.config.ts, so only the files that need a DOM pay for
 * booting one.
 */
import { describe, expect, it } from "vitest";

import { CARD_TAG, CARD_VERSION } from "./const";
import { BadegewaesserAustriaCard } from "./badegewaesser-austria-card";

describe("badegewaesser-austria-card", () => {
  it("registers itself under the expected tag", () => {
    expect(customElements.get(CARD_TAG)).toBe(BadegewaesserAustriaCard);
  });

  it("carries a semver-shaped version", () => {
    expect(CARD_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("throws on a missing config so HA renders hui-error-card", () => {
    const card = new BadegewaesserAustriaCard();
    expect(() =>
      card.setConfig(undefined as unknown as { type: string }),
    ).toThrow();
  });
});
