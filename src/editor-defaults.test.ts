/**
 * The editor shows the card's real defaults and saves only what changed.
 *
 * ha-form draws a missing boolean as off and a missing dropdown as blank,
 * so an editor fed the raw config lies about every default-on option. The
 * portfolio shipped that five times (ha-lovelace-card skill, gotcha "Editor
 * shows default-on toggles off"), each time in an editor that passed `_config`
 * straight to ha-form. These tests pin the fix in config.ts: the display
 * side fills every default in, the save side takes them back out.
 *
 * Pure node — no DOM. Needs vitest and a "test": "vitest run" script.
 */
import { describe, expect, it } from "vitest";

import { DEFAULTS, normaliseConfig, tidyConfig } from "./config";

const TYPE = "custom:badegewaesser-austria-card";

describe("editor defaults", () => {
  it("shows every default, so a default-on toggle is drawn on", () => {
    const shown = normaliseConfig({ type: TYPE }) as Record<string, unknown>;
    for (const [key, value] of Object.entries(DEFAULTS)) {
      expect(shown[key], key).toBe(value);
    }
  });

  it("keeps what the user set over the defaults", () => {
    const flipped = Object.fromEntries(
      Object.entries(DEFAULTS)
        .filter(([, value]) => typeof value === "boolean")
        .map(([key, value]) => [key, !value]),
    );
    expect(normaliseConfig({ type: TYPE, ...flipped })).toMatchObject(flipped);
  });

  it("treats cleared values as unset rather than blanking the default", () => {
    const cleared = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, ""]));
    expect(normaliseConfig({ type: TYPE, ...cleared })).toMatchObject(DEFAULTS);
  });

  it("saves only what differs from the defaults, with type first", () => {
    const [key, value] = Object.entries(DEFAULTS).find(([, v]) => typeof v === "boolean")!;
    const saved = tidyConfig({ ...normaliseConfig({ type: TYPE }), [key]: !value });
    expect(saved).toEqual({ type: TYPE, [key]: !value });
    expect(Object.keys(saved)[0]).toBe("type");
  });

  it("round-trips an untouched config unchanged", () => {
    const config = { type: TYPE, device: "device-1" };
    expect(tidyConfig(normaliseConfig(config))).toEqual(config);
  });
});
