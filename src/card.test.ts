/**
 * @vitest-environment happy-dom
 *
 * Card behaviour. The docblock is the per-file opt-in to a DOM: importing the
 * card runs @customElement, which touches `customElements`. Only the files
 * that need a DOM pay for booting one.
 *
 * The entity-resolution path carries the most risk: it walks the registry to
 * find eight siblings, and every failure mode there renders a card that looks
 * merely empty rather than wrong.
 */
import { beforeAll, describe, expect, it } from "vitest";

import "./badegewaesser-austria-card";
import { CARD_TAG } from "./const";
import type { BadegewaesserAustriaCard } from "./badegewaesser-austria-card";
import type { HomeAssistant } from "./types";

const DEVICE = "device-1";
const PLATFORM = "badegewaesser_austria";

const SAMPLES = [
  { date: "2026-06-08", water_temperature: 21.4 },
  { date: "2026-07-08", water_temperature: 24.9 },
  { date: "2026-08-20", water_temperature: 26.2 },
];

function makeHass(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
  const entity = (key: string, state: string, attributes: Record<string, unknown> = {}) => ({
    entityId: `sensor.koenigsdorf_${key}`,
    key,
    state,
    attributes,
  });
  const rows = [
    entity("water_temperature", "26.2", {
      unit_of_measurement: "°C",
      season_samples: SAMPLES,
    }),
    entity("water_quality", "excellent", { rating_year: 2025, rating_class: "A" }),
    entity("e_coli", "15", {
      unit_of_measurement: "KBE/100ml",
      below_detection_limit: true,
    }),
    entity("enterococci", "15", {
      unit_of_measurement: "KBE/100ml",
      below_detection_limit: true,
    }),
    entity("secchi_depth", "1.05", { unit_of_measurement: "m" }),
    entity("last_sample", "2026-08-19T22:00:00+00:00", {}),
  ];
  const binaries = [
    { entityId: "binary_sensor.koenigsdorf_closed", key: "closed", state: "off", attributes: { closure_reason: null } },
    { entityId: "binary_sensor.koenigsdorf_bathing_season", key: "bathing_season", state: "off", attributes: {} },
  ];
  const all = [...rows, ...binaries];

  return {
    language: "de",
    locale: { language: "de" },
    states: Object.fromEntries(
      all.map((row) => [row.entityId, { entity_id: row.entityId, state: row.state, attributes: row.attributes }]),
    ),
    entities: Object.fromEntries(
      all.map((row) => [
        row.entityId,
        { entity_id: row.entityId, device_id: DEVICE, platform: PLATFORM, translation_key: row.key },
      ]),
    ),
    devices: { [DEVICE]: { id: DEVICE, name: "Naturbadesee Königsdorf", model: "Burgenland" } },
    ...overrides,
  };
}

async function mount(
  config: Record<string, unknown>,
  hass: HomeAssistant = makeHass(),
): Promise<BadegewaesserAustriaCard> {
  const card = document.createElement(CARD_TAG) as BadegewaesserAustriaCard;
  card.setConfig({ type: `custom:${CARD_TAG}`, ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

const text = (card: BadegewaesserAustriaCard): string =>
  card.shadowRoot?.textContent?.replace(/\s+/g, " ").trim() ?? "";

beforeAll(() => {
  document.body.innerHTML = "";
});

describe("registration", () => {
  it("registers under its tag", () => {
    expect(customElements.get(CARD_TAG)).toBeDefined();
  });

  it("advertises itself to the card picker", () => {
    const cards = (window as { customCards?: { type: string }[] }).customCards ?? [];
    expect(cards.some((entry) => entry.type === CARD_TAG)).toBe(true);
  });

  it("suggests itself only for its own entities", () => {
    // Suggesting for every entity is the documented anti-pattern — it makes
    // the entity-first picker noisy for everyone.
    const entry = (window as { customCards?: { type: string; getEntitySuggestion?: Function }[] })
      .customCards?.find((row) => row.type === CARD_TAG);
    const hass = makeHass();
    expect(entry?.getEntitySuggestion?.(hass, "sensor.koenigsdorf_water_temperature")).toEqual({
      config: { type: `custom:${CARD_TAG}`, entity: "sensor.koenigsdorf_water_temperature" },
    });
    expect(entry?.getEntitySuggestion?.(hass, "sensor.someone_elses_thing")).toBeNull();
  });
});

describe("config", () => {
  it("throws on a missing config so HA renders hui-error-card", () => {
    const card = document.createElement(CARD_TAG) as BadegewaesserAustriaCard;
    expect(() => card.setConfig(undefined as never)).toThrow();
  });

  it("defaults both sections on", () => {
    const card = document.createElement(CARD_TAG) as BadegewaesserAustriaCard;
    card.setConfig({ type: "x", entity: "sensor.a" });
    expect(card.getGridOptions()).toEqual({ columns: 12, min_columns: 6, rows: "auto" });
  });
});

describe("rendering", () => {
  it("finds all eight siblings through the device, not the entity_id", async () => {
    // Users rename entity_ids. A card that string-munged a suffix would break
    // silently the first time somebody did.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const body = text(card);
    expect(body).toContain("Naturbadesee Königsdorf");
    expect(body).toContain("Burgenland");
    expect(body).toContain("26,2");
    expect(body).toContain("Ausgezeichnet");
    expect(body).toContain("Bewertung 2025");
  });

  it("works when anchored to any entity of the bathing water", async () => {
    const card = await mount({ entity: "binary_sensor.koenigsdorf_closed" });
    expect(text(card)).toContain("26,2");
  });

  it("renders a below-limit count as a limit, not a measurement", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(text(card)).toContain("<15");
  });

  it("carries the CC BY attribution", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(text(card)).toContain("AGES");
    expect(text(card)).toContain("CC BY 3.0 AT");
  });

  it("gives the track a text twin for screen readers", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const hidden = card.shadowRoot?.querySelector(".visually-hidden")?.textContent ?? "";
    expect(hidden).toContain("26,2");
    expect(hidden).toContain("21,4");
  });

  it("looks finished out of season rather than empty", async () => {
    // The state the card is in for roughly nine and a half months a year.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const body = text(card);
    expect(body).toContain("Saison beendet");
    expect(body).toContain("26,2");
    expect(body).not.toContain("unavailable");
  });

  it("shows the closure banner with its reason", async () => {
    const hass = makeHass();
    hass.states["binary_sensor.koenigsdorf_closed"] = {
      state: "on",
      attributes: { closure_reason: "Blaualgen — Badeverbot" },
    };
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" }, hass);
    const body = text(card);
    expect(body).toContain("Baden verboten");
    expect(body).toContain("Blaualgen");
  });

  it("renders an em dash, not a zero, for an unmeasured temperature", async () => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_temperature"] = {
      state: "unknown",
      attributes: { unit_of_measurement: "°C", season_samples: SAMPLES },
    };
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" }, hass);
    expect(text(card)).toContain("—");
  });

  it("honours the section toggles", async () => {
    const card = await mount({
      entity: "sensor.koenigsdorf_water_temperature",
      show_readings: false,
    });
    expect(text(card)).not.toContain("Enterokokken");
  });
});

describe("configuration errors", () => {
  it("asks for an entity when none is set", async () => {
    const card = await mount({});
    expect(text(card)).toContain("Karteneditor");
  });

  it("names a deleted entity instead of rendering blank", async () => {
    const card = await mount({ entity: "sensor.gone" });
    expect(text(card)).toContain("sensor.gone");
  });

  it("rejects an entity from another integration", async () => {
    const hass = makeHass();
    hass.states["sensor.foreign"] = { state: "1", attributes: {} };
    hass.entities!["sensor.foreign"] = {
      entity_id: "sensor.foreign",
      platform: "other_integration",
    };
    const card = await mount({ entity: "sensor.foreign" }, hass);
    expect(text(card)).toContain("gehört nicht");
  });
});

describe("reading anchoring", () => {
  it("positions the reading over the newest sample, not at the card edge", async () => {
    // Regression guard. The first version set a --last-x custom property that
    // no CSS rule ever consumed, so the reading simply right-aligned: for
    // Lunzer See the newest sample sits at 68.8% of the axis and the label
    // rendered at 100%, about 140px adrift on a real card. The design
    // decision this card is built on is that the number IS the endpoint of
    // the season, so an unconsumed variable was the whole point going
    // missing.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const row = card.shadowRoot?.querySelector<HTMLElement>(".reading-row");
    expect(row).not.toBeNull();

    const before = Number.parseFloat(row!.style.getPropertyValue("--before"));
    const after = Number.parseFloat(row!.style.getPropertyValue("--after"));
    expect(Number.isFinite(before)).toBe(true);
    expect(Number.isFinite(after)).toBe(true);
    // The two spacers must span the axis, or the label is not proportionally
    // placed at all.
    expect(before + after).toBeCloseTo(100, 1);

    // Newest fixture sample is 20 August, which is past the middle of a
    // 15 May - 30 September season but nowhere near its end.
    expect(before).toBeGreaterThan(50);
    expect(before).toBeLessThan(85);
  });

  it("keeps the reading inside the card for an early-season sample", async () => {
    // fr units cannot produce a negative track, which is why this needs no
    // clamping — absolute positioning would have.
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_temperature"] = {
      state: "19.0",
      attributes: {
        unit_of_measurement: "°C",
        season_samples: [{ date: "2026-05-20", water_temperature: 19 }],
      },
    };
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" }, hass);
    const row = card.shadowRoot?.querySelector<HTMLElement>(".reading-row");
    const before = Number.parseFloat(row!.style.getPropertyValue("--before"));
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThan(10);
  });
});
