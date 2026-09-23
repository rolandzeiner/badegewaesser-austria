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
import "./editor";
import { cardStyles } from "./card-styles";
import { CARD_TAG } from "./const";
import {
  countTrend,
  secchiTrend,
  temperatureTrend,
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

  it("looks finished out of season rather than empty", async () => {
    // The state the card is in for roughly nine and a half months a year.
    const card = await mount({ device: DEVICE });
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

describe("temperatureTrend", () => {
  const s = (...temps: Array<number | null>) =>
    temps.map((water_temperature, i) => ({ date: `2026-07-0${i + 1}`, water_temperature }));

  it.each([
    [[20, 21.5], "up"],
    [[22, 20.1], "down"],
    [[21.4, 21.5], "steady"],
    [[21.5, 21.1], "steady"],
  ] as const)("reads %j as %s", (temps, direction) => {
    expect(temperatureTrend(s(...temps))?.direction).toBe(direction);
  });

  it("compares against the last sample that was actually measured", () => {
    expect(temperatureTrend(s(18, null, 21))).toEqual({ direction: "up", delta: 3 });
  });

  it("has nothing to say without two measured samples", () => {
    expect(temperatureTrend(s(21))).toBeNull();
    expect(temperatureTrend(s(20, null))).toBeNull();
    expect(temperatureTrend([])).toBeNull();
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
    const icons = [...(card.shadowRoot?.querySelectorAll(".tiles .tile") ?? [])].map(
      (tile) => tile.querySelector(".tile-trend")?.getAttribute("icon") ?? null,
    );
    // Order: quality, Secchi depth, E. coli, enterococci.
    expect(icons).toEqual([null, "mdi:trending-neutral", "mdi:trending-down", "mdi:trending-neutral"]);
    const ecoli = card.shadowRoot!.querySelectorAll(".tiles .tile")[2]!;
    expect(ecoli.querySelector(".visually-hidden")?.textContent).toBe(
      "Gesunken seit der Probe davor",
    );
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
    expect(plain.getCardSize()).toBe(6); // no photo entity in this hass
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

  it("marks the verdict with an icon beside words, never instead of them", async () => {
    const card = await mount({ device: DEVICE });
    const quality = tiles(card)[0]!;
    const icon = quality.querySelector("dt ha-icon");
    expect(icon?.getAttribute("icon")).toBe("mdi:check-circle");
    expect(icon?.classList.contains("is-excellent")).toBe(true);
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(quality.querySelector("dt")?.textContent).toContain("Wasserqualität");
    expect(quality.querySelector(".tile-value")?.textContent?.trim()).toBe("Ausgezeichnet");
  });

  it.each([
    ["sufficient", "mdi:alert-circle"],
    ["poor", "mdi:close-circle"],
  ])("warns with a different shape for %s", async (state, icon) => {
    const hass = makeHass();
    hass.states["sensor.koenigsdorf_water_quality"] = {
      state,
      attributes: { rating_year: 2025 },
    };
    const card = await mount({ device: DEVICE }, hass);
    expect(tiles(card)[0]!.querySelector("ha-icon")?.getAttribute("icon")).toBe(icon);
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

  it("shows which way the temperature moved since the sample before", async () => {
    // SAMPLES: 24,9 then 26,2 -- up 1,3 degrees.
    const card = await mount({ device: DEVICE }, withPhoto());
    const reading = q(card, ".hero-temperature")!;
    expect(reading.querySelector("ha-icon.hero-trend")?.getAttribute("icon")).toBe(
      "mdi:trending-up",
    );
    expect(reading.querySelector(".visually-hidden")?.textContent).toBe(
      "1,3 °C wärmer als bei der Probe davor",
    );
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
