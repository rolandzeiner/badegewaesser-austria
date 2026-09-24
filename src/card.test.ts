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
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import "./badegewaesser-austria-card";
import "./editor";
import { cardStyles } from "./card-styles";
import { CARD_TAG } from "./const";
import {
  countTrend,
  mapCardConfig,
  secchiTrend,
  servesMapTiles,
  siteMapUrl,
  sitePosition,
  type BadegewaesserAustriaCard,
} from "./badegewaesser-austria-card";
import type { BadegewaesserAustriaCardEditor } from "./editor";
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
      latitude: 47.008287,
      longitude: 16.163253,
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

/** The body of the first rule for a selector. happy-dom does no layout. */
const cssRule = (selector: string): string => {
  const css = cardStyles.cssText;
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
};

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
    // HA hands the hook an entity; the card is about the bathing water that
    // entity belongs to, so the suggestion resolves to its device.
    expect(entry?.getEntitySuggestion?.(hass, "sensor.koenigsdorf_water_temperature")).toEqual({
      config: { type: `custom:${CARD_TAG}`, device: DEVICE },
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
    const card = await mount({ device: DEVICE });
    const body = text(card);
    expect(body).toContain("Naturbadesee Königsdorf");
    expect(body).toContain("Burgenland");
    expect(body).toContain("26,2");
    expect(body).toContain("Ausgezeichnet");
    expect(body).toContain("Bewertung 2025");
  });

  it("works when anchored to any entity of the bathing water", async () => {
    const card = await mount({ device: DEVICE });
    expect(text(card)).toContain("26,2");
  });

  it("renders a below-limit count as a limit, not a measurement", async () => {
    const card = await mount({ device: DEVICE });
    expect(text(card)).toContain("<15");
  });

  it("carries the CC BY attribution", async () => {
    const card = await mount({ device: DEVICE });
    expect(text(card)).toContain("AGES");
    expect(text(card)).toContain("CC BY 3.0 AT");
  });

  it("gives the track a text twin for screen readers", async () => {
    const card = await mount({ device: DEVICE });
    const hidden = card.shadowRoot?.querySelector(".visually-hidden")?.textContent ?? "";
    expect(hidden).toContain("26,2");
    expect(hidden).toContain("21,4");
  });

  it("adds no season-status line of its own when there are samples", async () => {
    // "Saison beendet" was today's date against the statutory season, not
    // anything AGES published; the Badesaison entity keeps that for automations.
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector(".season-status")).toBeNull();
    expect(text(card)).not.toContain("Saison beendet");
  });

  it("explains an empty track", async () => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_temperature"] = {
      state: "unknown",
      attributes: { unit_of_measurement: "°C", season_samples: [] },
    };
    const card = await mount({ device: DEVICE }, hass);
    expect(card.shadowRoot?.querySelector(".season-status")?.textContent).toBe(
      "Noch keine Proben in dieser Saison",
    );
  });

  it("looks finished out of season rather than empty", async () => {
    // The state the card is in for roughly nine and a half months a year.
    const card = await mount({ device: DEVICE });
    const body = text(card);
    expect(body).toContain("26,2");
    expect(body).not.toContain("unavailable");
  });

  it("shows the closure banner with its reason", async () => {
    const hass = makeHass();
    hass.states["binary_sensor.koenigsdorf_closed"] = {
      state: "on",
      attributes: { closure_reason: "Blaualgen — Badeverbot" },
    };
    const card = await mount({ device: DEVICE }, hass);
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
    const card = await mount({ device: DEVICE }, hass);
    expect(text(card)).toContain("—");
  });

  it("honours the section toggles", async () => {
    const card = await mount({
      device: DEVICE,
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
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector(".reading-row")).toBeNull();
    expect(card.shadowRoot?.querySelector(".reading-block")).not.toBeNull();
  });

  it("stands the thermometer on the digits' baseline", () => {
    // Its baseline is its bottom edge; the glyph ends 2/24 above that.
    for (const selector of [".hero-icon", ".reading-icon"]) {
      expect(cssRule(selector)).toMatch(/display:\s*(inline-)?flex/);
      expect(cssRule(selector)).toMatch(/translate:\s*0 calc\(.* \* 2 \/ 24\)/);
    }
    expect(cssRule(".reading-icon")).toMatch(/align-self:\s*baseline/);
  });

  it("is marked with a thermometer without a photo too", async () => {
    const card = await mount({ device: DEVICE });
    const icon = card.shadowRoot?.querySelector(".reading .reading-icon");
    expect(icon?.getAttribute("icon")).toBe("mdi:thermometer-water");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("the season-track tooltip", () => {
  const dots = (card: BadegewaesserAustriaCard) =>
    card.shadowRoot!.querySelectorAll<SVGGElement>(".point");

  it("uses no native SVG <title>", async () => {
    // A <title> renders as an unthemed OS tooltip box detached from the card,
    // which is what it looked like. The in-card tooltip replaces it.
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector("svg title")).toBeNull();
  });

  it("shows nothing until a point is hovered", async () => {
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector(".tip")).toBeNull();
  });

  it("shows the hovered point's date and value", async () => {
    const card = await mount({ device: DEVICE });
    const point = dots(card)[0]!;
    point.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;

    const tip = card.shadowRoot?.querySelector(".tip");
    expect(tip).not.toBeNull();
    expect(tip!.textContent).toContain("21,4");
  });

  it("hides again on pointerleave", async () => {
    const card = await mount({ device: DEVICE });
    const point = dots(card)[0]!;
    point.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;
    point.dispatchEvent(new Event("pointerleave"));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector(".tip")).toBeNull();
  });

  it("gives keyboard focus the same tooltip as hover", async () => {
    // WCAG: keyboard focus must surface what hover surfaces.
    const card = await mount({ device: DEVICE });
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
    const card = await mount({ device: DEVICE });
    for (const point of dots(card)) {
      expect(point.getAttribute("aria-label")).toMatch(/\d/);
    }
  });

  it("does not hide those labelled points inside an image", async () => {
    // ARIA makes every descendant of role="img" presentational, so focusable,
    // labelled points inside an img-role svg take keyboard focus and announce
    // nothing (axe: nested-interactive). A group keeps the axis label and
    // still exposes the points.
    const card = await mount({ device: DEVICE });
    const track = card.shadowRoot!.querySelector("svg.track")!;
    expect(track.getAttribute("role")).toBe("group");
    expect(track.getAttribute("aria-label")).toBeTruthy();
  });
});

describe("tile trends", () => {
  const sample = (fields: Record<string, unknown>) => ({
    date: "2026-07-01",
    water_temperature: 20,
    ...fields,
  });

  it("reads a Secchi depth change of 0.2 m or more as a move", () => {
    const deeper = [sample({ secchi_depth: 1.8 }), sample({ secchi_depth: 2.0 })];
    expect(secchiTrend(deeper)?.direction).toBe("up");
    const same = [sample({ secchi_depth: 2.0 }), sample({ secchi_depth: 2.1 })];
    expect(secchiTrend(same)?.direction).toBe("steady");
  });

  it("treats a bacteria change within 20% as noise", () => {
    const noise = [sample({ e_coli: 30 }), sample({ e_coli: 34 })];
    expect(countTrend(noise, "e_coli")?.direction).toBe("steady");
    const rise = [sample({ e_coli: 15, e_coli_below_limit: true }), sample({ e_coli: 32 })];
    expect(countTrend(rise, "e_coli")?.direction).toBe("up");
  });

  it("reads two below-limit counts as the same limit, not a measurement", () => {
    const limits = [
      sample({ enterococci: 15, enterococci_below_limit: true }),
      sample({ enterococci: 10, enterococci_below_limit: true }),
    ];
    expect(countTrend(limits, "enterococci")?.direction).toBe("steady");
  });

  it("shows a fall to below the limit as a fall", () => {
    const fall = [sample({ e_coli: 64 }), sample({ e_coli: 15, e_coli_below_limit: true })];
    expect(countTrend(fall, "e_coli")?.direction).toBe("down");
  });

  it("puts the arrows in the three measurement tiles, not the verdict", async () => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_temperature"] = {
      state: "26.2",
      attributes: {
        unit_of_measurement: "°C",
        season_samples: [
          { date: "2026-07-08", water_temperature: 24.9, e_coli: 64, secchi_depth: 1.2, enterococci: 15, enterococci_below_limit: true },
          { date: "2026-08-20", water_temperature: 26.2, e_coli: 15, e_coli_below_limit: true, secchi_depth: 1.05, enterococci: 15, enterococci_below_limit: true },
        ],
      },
    };
    const card = await mount({ device: DEVICE }, hass);
    const tiles = [...(card.shadowRoot?.querySelectorAll(".tiles .tile") ?? [])];
    const icons = tiles.map(
      (tile) => tile.querySelector(".tile-trend")?.getAttribute("icon") ?? null,
    );
    // Order: quality, Secchi depth, E. coli, enterococci. Steady is an
    // arrow, not a minus: after the unit, a minus reads as a dash.
    expect(icons).toEqual([null, "mdi:arrow-right", "mdi:arrow-down", "mdi:arrow-right"]);
    const ecoli = tiles[2]!;
    expect(ecoli.querySelector(".visually-hidden")?.textContent).toBe(
      "Gesunken seit der Probe davor",
    );
    // Unit and arrow travel together, the arrow right after the unit.
    const tail = ecoli.querySelector(".tile-value > .tile-tail")!;
    expect([...tail.children].map((child) => child.className)).toEqual([
      "unit",
      "tile-trend",
      "visually-hidden",
    ]);
    expect(tiles[0]!.querySelector(".tile-trend")).toBeNull();
  });

  it("gives each measurement its icon in front of the value", async () => {
    const card = await mount({ device: DEVICE });
    const tiles = [...(card.shadowRoot?.querySelectorAll(".tiles .tile") ?? [])];
    const icons = tiles.map((tile) => {
      const first = tile.querySelector(".tile-value")?.firstElementChild;
      return first?.classList.contains("tile-icon") ? first.getAttribute("icon") : null;
    });
    expect(icons).toEqual([null, "mdi:eye-outline", "mdi:bacteria", "mdi:bacteria-outline"]);
    for (const icon of card.shadowRoot!.querySelectorAll(".tile-icon")) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("puts a hovered or tapped measurement's season on the track", async () => {
    const hass = makeHass();
    const temperature = hass.states["sensor.koenigsdorf_water_temperature"]!;
    hass.states["sensor.koenigsdorf_water_temperature"] = {
      ...temperature,
      attributes: {
        ...temperature.attributes,
        season_samples: [
          { date: "2026-07-08", water_temperature: 24.9, secchi_depth: 1.2, e_coli: 15, e_coli_below_limit: true },
          { date: "2026-08-20", water_temperature: 26.2, secchi_depth: 1.05, e_coli: 64 },
        ],
      },
    };
    const card = await mount({ device: DEVICE }, hass);
    const labels = () =>
      [...card.shadowRoot!.querySelectorAll(".value-label")].map((label) => label.textContent);
    const tiles = card.shadowRoot!.querySelectorAll(".tiles .tile");
    expect(labels()).toEqual(["24,9°", "26,2°"]);

    tiles[1]!.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;
    expect(labels()).toEqual(["1,2 m", "1,1 m"]);
    expect(tiles[1]!.classList.contains("is-tracked")).toBe(true);

    tiles[1]!.dispatchEvent(new Event("pointerleave"));
    await card.updateComplete;
    expect(labels()).toEqual(["24,9°", "26,2°"]);

    // A tap pins it, since touch has no hover; a second tap lets go.
    (tiles[2] as HTMLElement).click();
    await card.updateComplete;
    expect(labels()).toEqual(["<15", "64"]);
    (tiles[2] as HTMLElement).click();
    await card.updateComplete;
    expect(labels()).toEqual(["24,9°", "26,2°"]);
    expect(tiles[0]!.classList.contains("is-trackable")).toBe(false);
  });

  it("lets the quality stars wrap rather than run into the next column", () => {
    // A 300px card leaves 126px per tile; "Wasserqualität" takes about 91.
    expect(cssRule(".tile dt")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("keeps unit and arrow on one line, at the unit's size", () => {
    // At the tile's edge the arrow read as nobody's, and a narrow tile could
    // strand it on a line of its own.
    expect(cssRule(".tile-tail")).toMatch(/white-space:\s*nowrap/);
    expect(cssRule(".tile-tail")).toMatch(/font-size:\s*var\(--ha-font-size-s/);
    expect(cssRule(".tile-trend")).not.toMatch(/position:\s*absolute/);
    expect(cardStyles.cssText).not.toContain("has-trend");
  });

  it("gives the icon twice the gap the unit gets", () => {
    // 4px on top of the value's 4px column gap: the glyphs fill their box,
    // and at 4px the bacteria touched the digits.
    expect(cssRule(".tile-icon")).toMatch(/margin-inline-end:\s*4px/);
    expect(cssRule(".tile-value")).toMatch(/column-gap:\s*4px/);
  });

  it("keeps the icon when a reading is missing, and drops only the arrow", async () => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_secchi_depth"] = { state: "unknown", attributes: {} };
    const card = await mount({ device: DEVICE }, hass);
    const secchi = card.shadowRoot!.querySelectorAll(".tiles .tile")[1]!;
    expect(secchi.querySelector(".tile-icon")).not.toBeNull();
    expect(secchi.querySelector(".tile-trend")).toBeNull();
    expect(secchi.querySelector(".tile-value")?.textContent?.trim()).toBe("—");
  });
});

describe("the grid cell", () => {
  // A sections view gives the card a fixed-height cell whenever rows is
  // numeric, and the user causes that by dragging the height handle: a stored
  // grid_options overrides getGridOptions(). Only the PAIR of declarations
  // makes the card fill that cell instead of painting over the card below
  // (ha-lovelace-card, references/gotchas.md). This card shipped without
  // either, the fourth time the portfolio met the bug. happy-dom does no
  // layout, so the guard is on the CSS itself.
  const rule = (selector: string): string => {
    const css = cardStyles.cssText;
    const start = css.indexOf(`${selector} {`);
    return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
  };

  it("takes the cell's height on the host", () => {
    expect(rule(":host")).toMatch(/display:\s*block/);
    expect(rule(":host")).toMatch(/block-size:\s*100%/);
  });

  it("resolves ha-card against it and clips inside the card", () => {
    expect(rule("ha-card")).toMatch(/block-size:\s*100%/);
    expect(rule("ha-card")).toMatch(/overflow:\s*hidden/);
  });

  it("tells masonry its real height, section by section", async () => {
    // 50px units. Measured: ~9 with everything on; it returned 4 before.
    const hass = makeHass();
    const plain = await mount({ device: DEVICE }, hass);
    expect(plain.getCardSize()).toBe(5); // no photo entity in this hass
    const bare = await mount(
      { device: DEVICE, show_season_track: false, show_readings: false },
      hass,
    );
    expect(bare.getCardSize()).toBe(1);
  });

  it("scrolls the body rather than cutting it off in a short cell", () => {
    expect(rule("ha-card > .body")).toMatch(/min-block-size:\s*0/);
    expect(rule("ha-card > .body")).toMatch(/overflow-y:\s*auto/);
  });
});

describe("the readings", () => {
  const tiles = (card: BadegewaesserAustriaCard) =>
    [...(card.shadowRoot?.querySelectorAll<HTMLElement>(".tiles .tile") ?? [])];

  it("sets the verdict and the Secchi depth above the two bacteria counts", async () => {
    const card = await mount({ device: DEVICE });
    const labels = tiles(card).map((tile) => tile.querySelector("dt")?.textContent?.trim());
    expect(labels).toEqual(["Wasserqualität", "Sichttiefe", "E. coli", "Enterokokken"]);
  });

  it("keeps each label paired with its value for a screen reader", async () => {
    // A <div> may wrap each <dt>/<dd> group inside a <dl>; the pairing holds.
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector("dl.tiles")).not.toBeNull();
    for (const tile of tiles(card)) {
      expect(tile.querySelector("dt")).not.toBeNull();
      expect(tile.querySelector("dd.tile-value")).not.toBeNull();
    }
  });

  it("puts the detail under the value, not beside it", async () => {
    const card = await mount({ device: DEVICE });
    const [quality, , , enterococci] = tiles(card);
    expect(quality?.querySelector(".tile-detail")?.textContent).toContain("Bewertung 2025");
    expect(enterococci?.querySelector(".tile-value")?.textContent).toContain("<15");
    expect(enterococci?.querySelector(".tile-detail")?.textContent).toContain(
      "unter der Nachweisgrenze",
    );
  });

  it("marks the class with its EU symbol beside the words, never instead of them", async () => {
    // Decision 2011/321/EU, Annex part 2: three stars for excellent.
    const card = await mount({ device: DEVICE });
    const quality = tiles(card)[0]!;
    // After the label, so the class in words has its line to itself.
    const symbol = quality.querySelector("dt .quality-symbol");
    const nodes = [...(quality.querySelector("dt")?.childNodes ?? [])];
    const label = nodes.findIndex((node) => node.textContent?.trim() === "Wasserqualität");
    expect(label).toBeGreaterThanOrEqual(0);
    expect(nodes.indexOf(symbol as ChildNode)).toBeGreaterThan(label);
    expect(quality.querySelector(".tile-value .quality-symbol")).toBeNull();
    expect(symbol?.classList.contains("is-excellent")).toBe(true);
    expect(symbol?.getAttribute("aria-hidden")).toBe("true");
    const icons = [...(symbol?.querySelectorAll("ha-icon") ?? [])].map((icon) =>
      icon.getAttribute("icon"),
    );
    expect(icons).toEqual(["mdi:star", "mdi:star", "mdi:star"]);
    expect(quality.querySelector("dt")?.textContent?.trim()).toBe("Wasserqualität");
    expect(quality.querySelector(".tile-value")?.textContent?.trim()).toBe("Ausgezeichnet");
  });

  it.each([
    ["good", ["mdi:star", "mdi:star"]],
    ["sufficient", ["mdi:star"]],
    ["poor", ["mdi:minus"]],
  ])("mirrors the EU symbol for %s", async (state, expected) => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_quality"] = {
      state,
      attributes: { rating_year: 2025 },
    };
    const card = await mount({ device: DEVICE }, hass);
    const symbol = tiles(card)[0]!.querySelector(".quality-symbol");
    expect(symbol?.classList.contains(`is-${state}`)).toBe(true);
    expect([...(symbol?.querySelectorAll("ha-icon") ?? [])].map((i) => i.getAttribute("icon"))).toEqual(
      expected,
    );
  });

  it("shows no icon when there is no rating to mark", async () => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_quality"] = { state: "unknown", attributes: {} };
    const card = await mount({ device: DEVICE }, hass);
    const quality = tiles(card)[0]!;
    expect(quality.querySelector("ha-icon")).toBeNull();
    expect(quality.textContent).toContain("noch nicht bewertet");
  });
});

describe("the season track's labels", () => {
  it("prints every value above its dot", async () => {
    const card = await mount({ device: DEVICE });
    const labels = [...(card.shadowRoot?.querySelectorAll(".value-label") ?? [])].map(
      (label) => label.textContent,
    );
    expect(labels).toEqual(["21,4°", "24,9°", "26,2°"]);
    expect(card.shadowRoot?.querySelector(".value-label.is-latest")?.textContent).toBe("26,2°");
  });

  it("leaves the labels to the points' own names for a screen reader", async () => {
    const card = await mount({ device: DEVICE });
    for (const label of card.shadowRoot?.querySelectorAll(".value-label") ?? []) {
      expect(label.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

describe("the photo header", () => {
  const PHOTO = "image.koenigsdorf_photo";
  const STAMP = "2016-05-12T10:38:28+00:00";
  const CREDIT = "Foto: © Amt der Burgenländischen Landesregierung";

  function withPhoto(
    state = STAMP,
    attributes: Record<string, unknown> = {
      entity_picture: `/api/image_proxy/${PHOTO}?token=first`,
      attribution: CREDIT,
    },
  ): HomeAssistant {
    const hass = makeHass();
    hass.states[PHOTO] = { entity_id: PHOTO, state, attributes };
    hass.entities![PHOTO] = {
      entity_id: PHOTO,
      device_id: DEVICE,
      platform: PLATFORM,
      translation_key: "photo",
    };
    return hass;
  }

  const q = <T extends Element = HTMLElement>(card: BadegewaesserAustriaCard, selector: string) =>
    card.shadowRoot?.querySelector<T>(selector) ?? null;
  const img = (card: BadegewaesserAustriaCard) => q<HTMLImageElement>(card, ".hero-img");
  const tip = (card: BadegewaesserAustriaCard) => q(card, ".photo-tip")!;
  const button = (card: BadegewaesserAustriaCard) => q<HTMLButtonElement>(card, ".photo-info-button")!;

  it("is absent when the bathing water has no photo", async () => {
    // AGES has none for one site, and an install without the photo folder
    // has none at all. The card then keeps its plain heading.
    const card = await mount({ device: DEVICE });
    expect(q(card, ".hero")).toBeNull();
    expect(q(card, ".body .title")?.textContent).toBe("Naturbadesee Königsdorf");
  });

  it("loads through the image proxy, described by the bathing water's name", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    expect(img(card)?.getAttribute("src")).toBe(`/api/image_proxy/${PHOTO}?token=first`);
    expect(img(card)?.getAttribute("alt")).toBe("Badestelle Naturbadesee Königsdorf");
  });

  it("puts the name, the Bundesland and the temperature on the photo", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    expect(q(card, ".hero-title")?.textContent).toBe("Naturbadesee Königsdorf");
    expect(q(card, ".hero-place")?.textContent).toBe("Burgenland");
    expect(q(card, ".hero-value")?.textContent?.trim()).toBe("26,2");
    expect(q(card, ".hero-unit")?.textContent).toBe("°C");
    expect(q(card, ".hero-sampled")?.textContent).toContain("Probe vom");
  });

  it("does not repeat them in the body", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    expect(q(card, ".body .title")).toBeNull();
    expect(q(card, ".body .temperature")).toBeNull();
    // Only the date stays, for cards too narrow to show it on the photo.
    expect(q(card, ".hero-fallback .sampled")?.textContent).toContain("Probe vom");
  });

  it("marks the temperature with a thermometer, and leaves trends to the tiles", async () => {
    // SAMPLES rise from 24,9 to 26,2; that is no longer drawn on the photo.
    const card = await mount({ device: DEVICE }, withPhoto());
    const reading = q(card, ".hero-temperature")!;
    const icon = reading.querySelector("ha-icon.hero-icon");
    expect(icon?.getAttribute("icon")).toBe("mdi:thermometer-water");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(reading.querySelector(".visually-hidden")).toBeNull();
    expect(reading.textContent?.replace(/\s+/g, "")).toBe("26,2°C");
  });

  it("keeps the credit off the photo, behind an info button", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    expect(button(card).getAttribute("aria-label")).toBe("Fotonachweis");
    expect(tip(card).hasAttribute("hidden")).toBe(true);
    expect(tip(card).textContent).toContain("Amt der Burgenländischen Landesregierung");
    expect(tip(card).textContent).toContain("Quelle: AGES Badegewässer-Monitoring");
  });

  it("announces the credit to a screen reader without opening it", async () => {
    // A hidden element still supplies an accessible description.
    const card = await mount({ device: DEVICE }, withPhoto());
    expect(button(card).getAttribute("aria-describedby")).toBe(tip(card).id);
    expect(tip(card).getAttribute("role")).toBe("tooltip");
  });

  it("opens on hover and stays open while the pointer is on it", async () => {
    // WCAG 1.4.13: the wrapper holds both the button and the tooltip, so
    // moving from one to the other never closes it.
    const card = await mount({ device: DEVICE }, withPhoto());
    const wrapper = q(card, ".photo-info")!;
    wrapper.dispatchEvent(new Event("pointerenter"));
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(false);

    wrapper.dispatchEvent(new Event("pointerleave"));
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(true);
  });

  it("opens on keyboard focus, and Escape closes it", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    button(card).dispatchEvent(new Event("focus"));
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(false);

    button(card).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(true);
  });

  it("stays open after a tap, which is all a phone can do", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    const wrapper = q(card, ".photo-info")!;
    // A touch fires pointerenter and pointerleave around the click.
    wrapper.dispatchEvent(new Event("pointerenter"));
    wrapper.dispatchEvent(new Event("pointerleave"));
    button(card).click();
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(false);

    button(card).click();
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(true);
  });

  it("closes when focus moves on, pinned or not", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    button(card).click();
    await card.updateComplete;
    button(card).dispatchEvent(new Event("blur"));
    await card.updateComplete;
    expect(tip(card).hasAttribute("hidden")).toBe(true);
  });

  it("honours the photo toggle", async () => {
    const card = await mount({ device: DEVICE, show_photo: false }, withPhoto());
    expect(q(card, ".hero")).toBeNull();
    expect(q(card, ".body .title")).not.toBeNull();
  });

  it("is absent while its entity is unavailable", async () => {
    const card = await mount({ device: DEVICE }, withPhoto("unavailable"));
    expect(q(card, ".hero")).toBeNull();
  });

  it("keeps its URL when only the access token rotates", async () => {
    // HA rotates the token every five minutes. Following it would download
    // the same photo again each time.
    const card = await mount({ device: DEVICE }, withPhoto());
    card.hass = withPhoto(STAMP, {
      entity_picture: `/api/image_proxy/${PHOTO}?token=second`,
      attribution: CREDIT,
    });
    await card.updateComplete;
    expect(img(card)?.getAttribute("src")).toContain("token=first");
  });

  it("takes the new URL when the photo itself changes", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    card.hass = withPhoto("2026-09-23T08:00:00+00:00", {
      entity_picture: `/api/image_proxy/${PHOTO}?token=second`,
      attribution: CREDIT,
    });
    await card.updateComplete;
    expect(img(card)?.getAttribute("src")).toContain("token=second");
  });

  it("retries an expired URL with the current one", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    card.hass = withPhoto(STAMP, {
      entity_picture: `/api/image_proxy/${PHOTO}?token=second`,
      attribution: CREDIT,
    });
    await card.updateComplete;
    img(card)!.dispatchEvent(new Event("error"));
    await card.updateComplete;
    expect(img(card)?.getAttribute("src")).toContain("token=second");
  });

  it("falls back to the plain heading rather than a broken image", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    img(card)!.dispatchEvent(new Event("error"));
    await card.updateComplete;
    expect(q(card, ".hero")).toBeNull();
    expect(q(card, ".body .title")?.textContent).toBe("Naturbadesee Königsdorf");
    expect(q(card, ".body .temperature")).not.toBeNull();
  });
});

describe("the map link", () => {
  const TEMPERATURE = "sensor.koenigsdorf_water_temperature";
  const OSM =
    "https://www.openstreetmap.org/?mlat=47.008287&mlon=16.163253#map=16/47.008287/16.163253";

  const link = (card: BadegewaesserAustriaCard) =>
    card.shadowRoot?.querySelector<HTMLAnchorElement>(".map-link") ?? null;

  /** The temperature sensor's position replaced; undefined removes it. */
  function positioned(
    latitude: unknown,
    longitude: unknown,
    hass: HomeAssistant = makeHass(),
  ): HomeAssistant {
    const state = hass.states[TEMPERATURE]!;
    const attributes: Record<string, unknown> = { ...state.attributes, latitude, longitude };
    if (latitude === undefined) delete attributes["latitude"];
    if (longitude === undefined) delete attributes["longitude"];
    hass.states[TEMPERATURE] = { ...state, attributes };
    return hass;
  }

  function withPhoto(): HomeAssistant {
    const hass = makeHass();
    const photo = "image.koenigsdorf_photo";
    hass.states[photo] = {
      entity_id: photo,
      state: "2016-05-12T10:38:28+00:00",
      attributes: { entity_picture: `/api/image_proxy/${photo}?token=t`, attribution: "Foto: x" },
    };
    hass.entities![photo] = {
      entity_id: photo,
      device_id: DEVICE,
      platform: PLATFORM,
      translation_key: "photo",
    };
    return hass;
  }

  it("links to the bathing water on OpenStreetMap", async () => {
    const card = await mount({ device: DEVICE });
    expect(link(card)?.getAttribute("href")).toBe(OSM);
  });

  it("opens in a new tab, handing the map neither the opener nor a referrer", async () => {
    const card = await mount({ device: DEVICE });
    expect(link(card)?.getAttribute("target")).toBe("_blank");
    expect(link(card)?.getAttribute("rel")?.split(" ")).toEqual(
      expect.arrayContaining(["noopener", "noreferrer"]),
    );
  });

  it("is named after the bathing water, with the pin itself hidden", async () => {
    const card = await mount({ device: DEVICE });
    expect(link(card)?.getAttribute("aria-label")).toBe(
      "Naturbadesee Königsdorf auf der Karte zeigen",
    );
    const icon = link(card)?.querySelector("ha-icon");
    expect(icon?.getAttribute("icon")).toBe("mdi:map-marker");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(link(card)?.textContent?.trim()).toBe("");
  });

  it("takes the title the user set, and the user's language", async () => {
    const hass = makeHass({ language: "en", locale: { language: "en" } });
    const card = await mount({ device: DEVICE, name: "Unser See" }, hass);
    expect(link(card)?.getAttribute("aria-label")).toBe("Show Unser See on the map");
  });

  it("follows the name in the plain heading, outside the h2", async () => {
    // Inside the h2, its name would join the heading's, and a list of
    // headings would read the lake's name twice.
    const card = await mount({ device: DEVICE });
    const heading = card.shadowRoot?.querySelector(".body .heading");
    expect(heading?.querySelector("h2.title + a.map-link")).not.toBeNull();
    expect(heading?.querySelector("h2")?.textContent).toBe("Naturbadesee Königsdorf");
    expect(heading?.querySelector("h2 a")).toBeNull();
  });

  it("sits right after the name, with no space that could break the line there", async () => {
    const card = await mount({ device: DEVICE });
    // Lit leaves a comment marker for the binding; any text node here would
    // be whitespace, and a line could break on it.
    let node = card.shadowRoot?.querySelector("h2.title")?.nextSibling ?? null;
    while (node?.nodeType === Node.COMMENT_NODE) node = node.nextSibling;
    expect(node).toBe(link(card));
  });

  it("follows the name on the photo too, and only there", async () => {
    const card = await mount({ device: DEVICE }, withPhoto());
    const heading = card.shadowRoot?.querySelector(".hero-caption .hero-heading");
    expect(heading?.querySelector("h2.hero-title + a.map-link")).not.toBeNull();
    expect(heading?.querySelector("h2")?.textContent).toBe("Naturbadesee Königsdorf");
    expect(card.shadowRoot?.querySelectorAll(".map-link")).toHaveLength(1);
  });

  it("still shows when the photo is switched off", async () => {
    const card = await mount({ device: DEVICE, show_photo: false }, withPhoto());
    expect(card.shadowRoot?.querySelector(".hero")).toBeNull();
    expect(card.shadowRoot?.querySelector(".body .heading .map-link")?.getAttribute("href")).toBe(
      OSM,
    );
  });

  it("is absent without a position, in both layouts", async () => {
    const plain = await mount({ device: DEVICE }, positioned(undefined, undefined));
    expect(link(plain)).toBeNull();
    const photo = await mount({ device: DEVICE }, positioned(undefined, undefined, withPhoto()));
    expect(photo.shadowRoot?.querySelector(".hero-heading")).not.toBeNull();
    expect(link(photo)).toBeNull();
  });

  it("never links to 0,0", async () => {
    // Upstream's "0" means "no position". The integration drops it; the card
    // does not trust that it always will.
    for (const [latitude, longitude] of [
      [0, 0],
      [0, 16.163253],
      [47.008287, 0],
    ]) {
      const card = await mount({ device: DEVICE }, positioned(latitude, longitude));
      expect(link(card)).toBeNull();
    }
  });

  it("ignores a position that is not a pair of real coordinates", () => {
    const at = (latitude: unknown, longitude: unknown) =>
      siteMapUrl({ state: "20", attributes: { latitude, longitude } });
    expect(at("47.008287", "16.163253")).toBeUndefined();
    expect(at(47.008287, undefined)).toBeUndefined();
    expect(at(Number.NaN, 16.163253)).toBeUndefined();
    expect(at(47.008287, Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(at(91, 16.163253)).toBeUndefined();
    expect(at(47.008287, -181)).toBeUndefined();
    expect(siteMapUrl(undefined)).toBeUndefined();
  });

  it("rounds to six decimals, about ten centimetres", () => {
    // Gamsjaga, whose position comes from its bathing-water profile.
    expect(
      siteMapUrl({ state: "20", attributes: { latitude: 47.7489768867, longitude: 13.4191829076 } }),
    ).toBe(
      "https://www.openstreetmap.org/?mlat=47.748977&mlon=13.419183#map=16/47.748977/13.419183",
    );
  });

  describe("styles", () => {
    // happy-dom does no layout, so these guard the CSS itself.
    const rule = (selector: string): string => {
      const css = cardStyles.cssText;
      const start = css.indexOf(`${selector} {`);
      return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
    };

    it("gives the pin a target over the 24px minimum", () => {
      expect(rule(".map-link")).toMatch(/inline-size:\s*32px/);
      expect(rule(".map-link")).toMatch(/block-size:\s*32px/);
    });

    it("gives the line back the pin's extra height, so the baseline stays put", () => {
      expect(rule(".map-link")).toMatch(/margin-block:\s*calc\(\(1\.2em - 32px\) \/ 2\)/);
      expect(rule(".hero-heading")).toMatch(/line-height:\s*1\.2/);
    });

    it("raises the pin onto the capitals without moving the line", () => {
      // A transform, so the baseline the temperature aligns to stays put.
      expect(rule(".map-link")).toMatch(/translate:\s*0 -0\.12em/);
    });

    it("rings the pin in white on the photo", () => {
      expect(rule(".hero .map-link:focus-visible")).toMatch(/outline:\s*2px solid #fff/);
    });

    it("draws the ring inside the target, clear of the last word", () => {
      // The global ring sits 2px outside; beside a word it would touch it.
      expect(rule(".map-link:focus-visible")).toMatch(/outline-offset:\s*-2px/);
      expect(rule(".hero .map-link:focus-visible")).toMatch(/outline-offset:\s*-2px/);
      expect(rule(".map-link")).toMatch(/margin-inline:\s*2px/);
    });

    it("keeps the name a plain block that balances its lines", () => {
      // A line clamp has no baseline for the grid; balance keeps the pin
      // from ending up alone on the last line.
      expect(rule(".hero-heading")).not.toMatch(/display:/);
      expect(rule(".hero-heading")).toMatch(/text-wrap:\s*balance/);
      expect(rule(".heading")).toMatch(/text-wrap:\s*balance/);
    });
  });
});

describe("the map view", () => {
  const TEMPERATURE = "sensor.koenigsdorf_water_temperature";
  const PHOTO = "image.koenigsdorf_photo";

  type MapElement = HTMLElement & {
    hass?: HomeAssistant;
    layout?: string;
    setConfig?: (config: Record<string, unknown>) => void;
  };
  type Created = { config: Record<string, unknown>; element: MapElement; configs: unknown[] };

  const win = window as unknown as { loadCardHelpers?: () => Promise<unknown> };
  let created: Created[] = [];
  let helperCalls = 0;

  // HA's card helpers, as far as the card uses them. hui-map-card is not
  // defined here, which is how HA hands one over before its lazy chunk
  // has arrived: a plain element that is upgraded later.
  beforeEach(() => {
    created = [];
    helperCalls = 0;
    win.loadCardHelpers = async () => {
      helperCalls += 1;
      return {
        createCardElement: (config: Record<string, unknown>) => {
          const element = document.createElement("hui-map-card") as MapElement;
          const entry: Created = { config, element, configs: [] };
          element.setConfig = (next) => entry.configs.push(next);
          created.push(entry);
          return element;
        },
      };
    };
  });

  afterEach(() => {
    delete win.loadCardHelpers;
    vi.restoreAllMocks();
  });

  /** A photo, a position, and an HA of 2026.9 or newer, by default. */
  function mapHass({ photo = true, tiles = true, position = true } = {}): HomeAssistant {
    const hass = makeHass({
      config: { components: tiles ? ["frontend", "map_tiles"] : ["frontend"] },
    });
    if (photo) {
      hass.states[PHOTO] = {
        entity_id: PHOTO,
        state: "2016-05-12T10:38:28+00:00",
        attributes: { entity_picture: `/api/image_proxy/${PHOTO}?token=t`, attribution: "Foto: x" },
      };
      hass.entities![PHOTO] = {
        entity_id: PHOTO,
        device_id: DEVICE,
        platform: PLATFORM,
        translation_key: "photo",
      };
    }
    if (!position) {
      const state = hass.states[TEMPERATURE]!;
      const { latitude: _lat, longitude: _lon, ...attributes } = state.attributes;
      hass.states[TEMPERATURE] = { ...state, attributes };
    }
    return hass;
  }

  const q = <T extends Element = HTMLElement>(card: BadegewaesserAustriaCard, selector: string) =>
    card.shadowRoot?.querySelector<T>(selector) ?? null;
  const toggle = (card: BadegewaesserAustriaCard) => q<HTMLButtonElement>(card, ".map-toggle");

  /** Click the toggle, then let the helpers' promise and the re-render land. */
  async function press(card: BadegewaesserAustriaCard): Promise<void> {
    toggle(card)!.click();
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;
  }

  it("is offered on a photo with a position, where HA serves the tiles", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    const button = toggle(card)!;
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Karte zeigen");
    expect(button.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:map-outline");
    expect(button.querySelector("ha-icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(q(card, ".hero")?.classList.contains("has-map")).toBe(true);
  });

  it("is absent without a position, and the credit keeps the corner", async () => {
    const card = await mount({ device: DEVICE }, mapHass({ position: false }));
    expect(toggle(card)).toBeNull();
    expect(q(card, ".hero-map")).toBeNull();
    expect(q(card, ".hero")?.classList.contains("has-map")).toBe(false);
    expect(q(card, ".photo-info-button")).not.toBeNull();
  });

  it("is absent without a photo, where the heading keeps only the pin", async () => {
    const card = await mount({ device: DEVICE }, mapHass({ photo: false }));
    expect(toggle(card)).toBeNull();
    expect(q(card, ".body .map-link")).not.toBeNull();
  });

  it("is absent with the photo switched off", async () => {
    const card = await mount({ device: DEVICE, show_photo: false }, mapHass());
    expect(toggle(card)).toBeNull();
  });

  it("is absent where the browser would fetch the tiles from a third party", async () => {
    // Before 2026.9 HA's map card loaded CARTO's tiles in the browser. The
    // pin is a plain link and stays.
    const card = await mount({ device: DEVICE }, mapHass({ tiles: false }));
    expect(toggle(card)).toBeNull();
    expect(q(card, ".hero .map-link")).not.toBeNull();
  });

  it("can be switched off in the card editor", async () => {
    const card = await mount({ device: DEVICE, show_map: false }, mapHass());
    expect(toggle(card)).toBeNull();
    expect(q(card, ".hero .map-link")).not.toBeNull();
  });

  it("loads nothing until the first click", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    expect(helperCalls).toBe(0);
    expect(q(card, "hui-map-card")).toBeNull();
    expect(q(card, ".hero-map")?.children.length).toBe(0);
  });

  it("creates HA's map card on the first click, for the temperature sensor", async () => {
    const hass = mapHass();
    const card = await mount({ device: DEVICE }, hass);
    await press(card);
    expect(helperCalls).toBe(1);
    expect(created[0]?.config).toEqual({
      type: "map",
      entities: [{ entity: TEMPERATURE, label_mode: "icon" }],
      theme_mode: "auto",
      hours_to_show: 0,
      default_zoom: 13,
    });
    expect(created[0]?.config).toEqual(mapCardConfig(TEMPERATURE));
    const element = created[0]!.element;
    expect(element.parentElement).toBe(q(card, ".hero-map"));
    expect(element.classList.contains("hero-map-card")).toBe(true);
    // The sections-view layout, so it fills the box rather than padding
    // itself out to an aspect ratio of its own.
    expect(element.layout).toBe("grid");
    expect(element.hass).toBe(hass);
  });

  it("swaps the photo for the map, and back", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    const hero = q(card, ".hero")!;

    await press(card);
    expect(hero.classList.contains("is-map")).toBe(true);
    expect(q(card, ".hero-photo")?.hasAttribute("inert")).toBe(true);
    expect(q(card, ".hero-map")?.hasAttribute("inert")).toBe(false);
    expect(q(card, ".photo-info")?.hasAttribute("hidden")).toBe(true);
    expect(toggle(card)?.getAttribute("aria-label")).toBe("Foto zeigen");
    expect(toggle(card)?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:image-outline");

    await press(card);
    expect(hero.classList.contains("is-map")).toBe(false);
    expect(q(card, ".hero-photo")?.hasAttribute("inert")).toBe(false);
    expect(q(card, ".hero-map")?.hasAttribute("inert")).toBe(true);
    expect(q(card, ".photo-info")?.hasAttribute("hidden")).toBe(false);
    expect(toggle(card)?.getAttribute("aria-label")).toBe("Karte zeigen");
    expect(toggle(card)?.querySelector("ha-icon")?.getAttribute("icon")).toBe("mdi:map-outline");
  });

  it("names the next view rather than claiming a pressed state", async () => {
    // A toggle button keeps one name; this one's changes. Having both would
    // say the same thing twice, in contradicting words.
    const card = await mount({ device: DEVICE }, mapHass());
    expect(toggle(card)?.hasAttribute("aria-pressed")).toBe(false);
    await press(card);
    expect(toggle(card)?.hasAttribute("aria-pressed")).toBe(false);
  });

  it("keeps the map it made", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    await press(card);
    await press(card);
    await press(card);
    expect(helperCalls).toBe(1);
    expect(created).toHaveLength(1);
    expect(q(card, ".hero-map")?.contains(created[0]!.element)).toBe(true);
  });

  it("keeps focus on the button through each swap", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    const button = toggle(card)!;
    button.focus();
    await press(card);
    expect(toggle(card)).toBe(button);
    expect(card.shadowRoot?.activeElement).toBe(button);
    await press(card);
    expect(toggle(card)).toBe(button);
    expect(card.shadowRoot?.activeElement).toBe(button);
  });

  it("keeps the name as the card's heading while the map shows", async () => {
    // The photo's heading is inert with the photo; a hidden copy stands in.
    const card = await mount({ device: DEVICE }, mapHass());
    expect(q(card, ".hero > h2.visually-hidden")).toBeNull();
    await press(card);
    expect(q(card, ".hero > h2.visually-hidden")?.textContent).toBe("Naturbadesee Königsdorf");
    await press(card);
    expect(q(card, ".hero > h2.visually-hidden")).toBeNull();
  });

  it("closes an open credit tooltip along with the photo", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    q<HTMLButtonElement>(card, ".photo-info-button")!.click();
    await card.updateComplete;
    expect(q(card, ".photo-tip")?.hasAttribute("hidden")).toBe(false);
    await press(card);
    await press(card);
    expect(q(card, ".photo-tip")?.hasAttribute("hidden")).toBe(true);
  });

  it("hands a new hass on to the map", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    await press(card);
    const next = mapHass();
    card.hass = next;
    await card.updateComplete;
    expect(created[0]?.element.hass).toBe(next);
  });

  it("follows the card to another temperature sensor", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    await press(card);

    // The same bathing water again changes nothing on the map.
    card.setConfig({ type: `custom:${CARD_TAG}`, device: DEVICE, name: "Anders" });
    await card.updateComplete;
    expect(created[0]?.configs).toEqual([]);

    // Its temperature sensor under another entity_id: the map follows.
    const hass = mapHass();
    const renamed = "sensor.renamed_water_temperature";
    hass.states[renamed] = { ...hass.states[TEMPERATURE]!, entity_id: renamed };
    hass.entities![renamed] = { ...hass.entities![TEMPERATURE]!, entity_id: renamed };
    delete hass.states[TEMPERATURE];
    delete hass.entities![TEMPERATURE];
    card.hass = hass;
    card.setConfig({ type: `custom:${CARD_TAG}`, device: DEVICE });
    await card.updateComplete;
    expect(created[0]?.configs).toEqual([mapCardConfig(renamed)]);
  });

  it("lets the wheel scroll the page, and zoom only with Ctrl", async () => {
    const card = await mount({ device: DEVICE }, mapHass());
    await press(card);
    const element = created[0]!.element;
    let reached = 0;
    element.addEventListener("wheel", () => {
      reached += 1;
    });
    const wheel = (ctrlKey: boolean): WheelEvent => {
      const event = new WheelEvent("wheel", { bubbles: true, composed: true, ctrlKey });
      // happy-dom's WheelEvent lacks the modifier keys a browser's inherits.
      Object.defineProperty(event, "ctrlKey", { value: ctrlKey });
      return event;
    };
    element.dispatchEvent(wheel(false));
    expect(reached).toBe(0);
    element.dispatchEvent(wheel(true));
    expect(reached).toBe(1);
  });

  it("goes back to the photo, button and all, without HA's card helpers", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    delete win.loadCardHelpers;
    const card = await mount({ device: DEVICE }, mapHass());
    await press(card);
    expect(toggle(card)).toBeNull();
    expect(q(card, ".hero")?.classList.contains("is-map")).toBe(false);
    expect(q(card, ".hero-img")).not.toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("asks whether core serves the tiles, not which version it is", () => {
    expect(servesMapTiles(undefined)).toBe(false);
    expect(servesMapTiles(makeHass())).toBe(false);
    expect(servesMapTiles(makeHass({ config: { components: ["frontend"] } }))).toBe(false);
    expect(servesMapTiles(makeHass({ config: { components: ["map_tiles"] } }))).toBe(true);
  });

  it("takes its position from the same check as the pin", () => {
    expect(sitePosition({ state: "20", attributes: { latitude: 47.5, longitude: 13.4 } })).toEqual(
      { latitude: 47.5, longitude: 13.4 },
    );
    expect(sitePosition({ state: "20", attributes: { latitude: 0, longitude: 13.4 } })).toBeUndefined();
  });

  describe("styles", () => {
    const css = cardStyles.cssText;

    it("sits in the corner the map card leaves free", () => {
      // The map card's zoom and reset buttons run down the top-left edge.
      expect(css).toMatch(
        /\.map-toggle \{[^}]*position:\s*absolute;[^}]*top:\s*var\(--bade-gap\);[^}]*right:\s*var\(--bade-gap\);/,
      );
    });

    it("is the credit's 32px disc, with its white ring", () => {
      expect(css).toMatch(/\.photo-info-button,\s*\.map-toggle \{[^}]*width:\s*32px;[^}]*height:\s*32px;/);
      expect(css).toMatch(
        /\.photo-info-button:focus-visible,\s*\.map-toggle:focus-visible \{[^}]*outline:\s*2px solid #fff;/,
      );
    });

    it("moves the credit one disc to the left of it", () => {
      expect(cssRule(".has-map .photo-info")).toMatch(/right:\s*calc\(2 \* var\(--bade-gap\) \+ 32px\)/);
      expect(cssRule(".photo-info[hidden]")).toMatch(/display:\s*none/);
    });

    it("fills the photo's box exactly and switches the map card's chrome off", () => {
      const rule = cssRule(".hero-map");
      expect(rule).toMatch(/position:\s*absolute/);
      expect(rule).toMatch(/inset:\s*0/);
      expect(rule).toMatch(/--ha-card-border-radius:\s*0/);
      expect(rule).toMatch(/--ha-card-border-width:\s*0/);
      expect(rule).toMatch(/--ha-card-box-shadow:\s*none/);
      expect(cssRule(".hero-map-card")).toMatch(/inset:\s*0/);
    });

    it("keeps the photo's shading off the map", () => {
      expect(cssRule(".hero-photo::before")).toMatch(/linear-gradient/);
      expect(css).not.toContain(".hero::before");
    });

    it("clips the slide at the sides only, so the credit's tooltip can overhang", () => {
      expect(cssRule(".hero")).toMatch(/overflow-x:\s*clip/);
      expect(cssRule(".hero")).not.toMatch(/overflow:\s*hidden/);
    });

    it("slides by transition, which reduced motion switches off", () => {
      expect(cssRule(".hero.is-map .hero-photo")).toMatch(/translate:\s*-100% 0/);
      expect(cssRule(".hero.is-map .hero-map")).toMatch(/translate:\s*0/);
      expect(cssRule(".hero-map")).toMatch(/translate:\s*100% 0/);
      expect(css).not.toMatch(/\.hero[^{]*\{[^}]*animation:/);
      expect(css).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{[^@]*transition:\s*none !important;/,
      );
    });
  });
});

describe("attribution", () => {
  it("shows the data source by default", async () => {
    const card = await mount({ device: DEVICE });
    expect(card.shadowRoot?.querySelector(".attribution")).not.toBeNull();
  });

  it("can be hidden from the card editor", async () => {
    const card = await mount({ device: DEVICE, show_attribution: false });
    expect(card.shadowRoot?.querySelector(".attribution")).toBeNull();
    expect(text(card)).not.toContain("CC BY 3.0 AT");
  });

  it("names the source and the licence, without the full legal name", async () => {
    // CC BY 3.0 AT asks for attribution in the manner specified; AGES plus the
    // licence does that. The full legal name lives in the README, where it
    // does not wrap the footer onto two lines.
    const card = await mount({ device: DEVICE });
    const footer = card.shadowRoot?.querySelector(".attribution")?.textContent ?? "";
    expect(footer).toContain("AGES");
    expect(footer).toContain("CC BY 3.0 AT");
    expect(footer).not.toContain("Ernährungssicherheit");
  });
});

describe("editor defaults", () => {
  it("normalises a raw config the same way the card renders it", async () => {
    // The bug: the card applied its defaults inside setConfig, but the editor
    // handed Lovelace's RAW config to ha-form — which knows nothing about the
    // card's defaults. So a freshly added card showed both toggles OFF while
    // both sections were plainly visible. One normaliser now serves both.
    const { normaliseConfig, DEFAULTS } = await import("./config");

    const raw = { type: `custom:${CARD_TAG}`, device: DEVICE };
    expect(normaliseConfig(raw).show_photo).toBe(DEFAULTS.show_photo);
    expect(normaliseConfig(raw).show_map).toBe(true);
    expect(normaliseConfig(raw).show_attribution).toBe(true);
    expect(normaliseConfig(raw).show_season_track).toBe(DEFAULTS.show_season_track);
    expect(normaliseConfig(raw).show_readings).toBe(DEFAULTS.show_readings);
  });

  it("does not override a value the user actually set", async () => {
    const { normaliseConfig } = await import("./config");
    const raw = { type: "x", device: DEVICE, show_readings: false };
    expect(normaliseConfig(raw).show_readings).toBe(false);
    expect(normaliseConfig(raw).show_season_track).toBe(true);
  });
});

describe("editor", () => {
  it("hands a new hass on to ha-form", async () => {
    // The bug: `hass` was a plain field, so replacing it never re-rendered the
    // editor, and ha-form — with the device picker inside it — kept the hass
    // it had at the last config change.
    const editor = document.createElement(
      "badegewaesser-austria-card-editor",
    ) as unknown as BadegewaesserAustriaCardEditor;
    editor.hass = makeHass();
    editor.setConfig({ type: `custom:${CARD_TAG}`, device: DEVICE });
    document.body.append(editor);
    await editor.updateComplete;

    const next = makeHass();
    editor.hass = next;
    await editor.updateComplete;

    const form = editor.shadowRoot?.querySelector("ha-form") as
      | (HTMLElement & { hass?: HomeAssistant })
      | null;
    expect(form?.hass).toBe(next);
  });

  it("lists the toggles one per row, as the portfolio's other editors do", async () => {
    const editor = document.createElement(
      "badegewaesser-austria-card-editor",
    ) as unknown as BadegewaesserAustriaCardEditor;
    editor.hass = makeHass();
    editor.setConfig({ type: `custom:${CARD_TAG}`, device: DEVICE });
    document.body.append(editor);
    await editor.updateComplete;

    const form = editor.shadowRoot?.querySelector("ha-form") as
      | (HTMLElement & { schema?: { name: string; type?: string }[] })
      | null;
    expect(form?.schema?.some((row) => row.type === "grid")).toBe(false);
    expect(form?.schema?.map((row) => row.name)).toEqual([
      "device",
      "name",
      "show_photo",
      "show_map",
      "show_season_track",
      "show_readings",
      "show_attribution",
    ]);
  });
});

describe("legacy entity-shaped configs", () => {
  it("still resolves a card configured before the device picker", async () => {
    // Somebody's dashboard already has one of these. It must keep working.
    const card = await mount({ entity: "sensor.koenigsdorf_water_temperature" });
    expect(text(card)).toContain("26,2");
    expect(text(card)).toContain("Naturbadesee Königsdorf");
  });

  it("still names a deleted entity rather than rendering blank", async () => {
    const card = await mount({ entity: "sensor.gone" });
    expect(text(card)).toContain("sensor.gone");
  });

  it("reports a bathing water that no longer exists", async () => {
    const card = await mount({ device: "device-that-went-away" });
    expect(text(card)).toContain("gibt es nicht mehr");
  });
});
