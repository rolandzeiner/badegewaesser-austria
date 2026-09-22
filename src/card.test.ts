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

describe("the reading", () => {
  it("is right-aligned rather than proportionally anchored", async () => {
    // A detour worth recording. An earlier version tried to place the reading
    // exactly over the newest sample's dot. That cannot work here: the newest
    // sample is always near the end of the axis (the season closes 31 August),
    // so a centred label there overflows the card, and the overflow-safe
    // approximation landed ~60px short — close enough to look like a bug.
    // Right alignment lands near the dot for the same reason exact anchoring
    // failed, and reads as a deliberate edge.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(card.shadowRoot?.querySelector(".reading-row")).toBeNull();
    expect(card.shadowRoot?.querySelector(".reading-block")).not.toBeNull();
  });
});

describe("the season-track tooltip", () => {
  const dots = (card: BadegewaesserAustriaCard) =>
    card.shadowRoot!.querySelectorAll<SVGGElement>(".point");

  it("uses no native SVG <title>", async () => {
    // A <title> renders as an unthemed OS tooltip box detached from the card,
    // which is what it looked like. The in-card tooltip replaces it.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(card.shadowRoot?.querySelector("svg title")).toBeNull();
  });

  it("shows nothing until a point is hovered", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(card.shadowRoot?.querySelector(".tip")).toBeNull();
  });

  it("shows the hovered point's date and value", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const point = dots(card)[0]!;
    point.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;

    const tip = card.shadowRoot?.querySelector(".tip");
    expect(tip).not.toBeNull();
    expect(tip!.textContent).toContain("21,4");
  });

  it("hides again on pointerleave", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const point = dots(card)[0]!;
    point.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;
    point.dispatchEvent(new Event("pointerleave"));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector(".tip")).toBeNull();
  });

  it("gives keyboard focus the same tooltip as hover", async () => {
    // WCAG: keyboard focus must surface what hover surfaces.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const point = dots(card)[1]!;
    expect(point.getAttribute("tabindex")).toBe("0");

    point.dispatchEvent(new Event("focus"));
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector(".tip")).not.toBeNull();

    point.dispatchEvent(new Event("blur"));
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector(".tip")).toBeNull();
  });

  it("labels every point for a screen reader", async () => {
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    for (const point of dots(card)) {
      expect(point.getAttribute("aria-label")).toMatch(/\d/);
    }
  });
});

describe("attribution", () => {
  it("names the source and the licence, without the full legal name", async () => {
    // CC BY 3.0 AT asks for attribution in the manner specified; AGES plus the
    // licence does that. The full legal name lives in the README, where it
    // does not wrap the footer onto two lines.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    const footer = card.shadowRoot?.querySelector(".attribution")?.textContent ?? "";
    expect(footer).toContain("AGES");
    expect(footer).toContain("CC BY 3.0 AT");
    expect(footer).not.toContain("Ernährungssicherheit");
  });
});
