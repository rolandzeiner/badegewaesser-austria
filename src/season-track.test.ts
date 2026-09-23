/**
 * Season-axis maths.
 *
 * The whole point of a calendar-anchored track is that a 42-day gap looks
 * different from a 14-day one, so the mapping from date to position is the
 * thing worth testing.
 */
import { describe, expect, it } from "vitest";

import {
  labelledIndices,
  latestFraction,
  seasonFraction,
  seasonTrackDescription,
} from "./season-track";

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("seasonFraction", () => {
  it("puts the axis boundaries at the ends", () => {
    // The axis is the MONITORING window, 15 May to 31 August — not the legal
    // bathing season (15 June to 31 August, BGewV § 4). It has to start early
    // enough to carry the mandated pre-season sample, which lands between
    // 26 May and 10 June for all 260 sites.
    expect(seasonFraction(at("2026-05-15"))).toBe(0);
    expect(seasonFraction(at("2026-08-31"))).toBe(1);
  });

  it("places the pre-season sample inside the axis, not clamped to its edge", () => {
    // The bug this guards: an axis starting at the legal 15 June would pin
    // every site's first dot to 0 and destroy the spacing of the whole series.
    const earliest = seasonFraction(at("2026-05-26"));
    const latestPreSeason = seasonFraction(at("2026-06-10"));
    expect(earliest).toBeGreaterThan(0);
    expect(latestPreSeason).toBeGreaterThan(earliest);
  });

  it("puts a late-August sample near the end of the axis", () => {
    // 20 August is ~90% of 15 May to 31 August. It was ~69% while the axis
    // wrongly ran to 30 September.
    expect(seasonFraction(at("2026-08-20"))).toBeGreaterThan(0.85);
  });

  it("is monotonic through the season", () => {
    const dates = ["2026-05-26", "2026-06-24", "2026-07-08", "2026-08-20", "2026-08-31"];
    const positions = dates.map((iso) => seasonFraction(at(iso)));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("spaces samples by real elapsed time", () => {
    // 2026-06-01 -> 2026-06-15 is 14 days; 2026-07-01 -> 2026-08-12 is 42.
    // The second gap must be about three times the first, which is exactly
    // what an evenly-spaced sequence would destroy.
    const short = seasonFraction(at("2026-06-15")) - seasonFraction(at("2026-06-01"));
    const long = seasonFraction(at("2026-08-12")) - seasonFraction(at("2026-07-01"));
    expect(long / short).toBeCloseTo(3, 0);
  });

  it("clamps a sample taken outside the window rather than dropping it", () => {
    // AGES has published from 26 May, but nothing guarantees next season
    // starts as late. An early sample is real data and belongs at the edge.
    expect(seasonFraction(at("2026-05-01"))).toBe(0);
    // Zero of 1362 live samples fall after 31 August, but a stray one would
    // still be shown rather than silently dropped.
    expect(seasonFraction(at("2026-09-20"))).toBe(1);
  });
});

describe("latestFraction", () => {
  it("anchors to the newest sample", () => {
    const samples = [
      { date: "2026-06-01", water_temperature: 19 },
      { date: "2026-08-20", water_temperature: 26.2 },
    ];
    expect(latestFraction(samples)).toBeCloseTo(seasonFraction(at("2026-08-20")));
  });

  it("falls back to the end of the axis with no samples", () => {
    expect(latestFraction([])).toBe(1);
  });
});

describe("seasonTrackDescription", () => {
  const options = {
    now: at("2026-09-15"),
    inSeason: true,
    language: "de",
    formatDate: (date: Date) => date.toISOString().slice(0, 10),
    formatTemperature: (value: number | null) => (value === null ? "—" : `${value} °C`),
    formatLabel: (value: number) => `${value}°`,
  };

  it("lists every point as text, so a tooltip is never the only way to read one", () => {
    const text = seasonTrackDescription({
      ...options,
      samples: [
        { date: "2026-06-01", water_temperature: 19 },
        { date: "2026-08-20", water_temperature: 26.2 },
      ],
    });
    expect(text).toContain("2026-06-01: 19 °C");
    expect(text).toContain("2026-08-20: 26.2 °C");
  });

  it("says so when the season has no samples yet", () => {
    const text = seasonTrackDescription({ ...options, samples: [] });
    expect(text).toBe("Noch keine Proben in dieser Saison");
  });
});

describe("labelledIndices", () => {
  // Lunzer See, 2026: five samples, about three weeks apart.
  const lunz = [
    { fraction: 0.23, value: 16.8 },
    { fraction: 0.35, value: 19.5 },
    { fraction: 0.49, value: 21.0 },
    { fraction: 0.68, value: 23.2 },
    { fraction: 0.87, value: 21.5 },
  ];

  it("labels where the season started, how warm it got and where it ended", () => {
    expect([...labelledIndices(lunz)].sort()).toEqual([0, 3, 4]);
  });

  it("never labels every point", () => {
    // Wien sites are sampled up to nine times.
    const wien = Array.from({ length: 9 }, (_, i) => ({ fraction: i / 8, value: 20 + i }));
    expect(labelledIndices(wien).size).toBeLessThanOrEqual(3);
  });

  it("lets the latest win when the warmest sits right beside it", () => {
    const close = [
      { fraction: 0.2, value: 17 },
      { fraction: 0.8, value: 25 },
      { fraction: 0.86, value: 24 },
    ];
    expect([...labelledIndices(close)].sort()).toEqual([0, 2]);
  });

  it("labels the warmest once when it is also the latest", () => {
    const rising = [
      { fraction: 0.2, value: 17 },
      { fraction: 0.5, value: 20 },
      { fraction: 0.85, value: 24 },
    ];
    expect([...labelledIndices(rising)].sort()).toEqual([0, 2]);
  });

  it("skips samples without a temperature", () => {
    const gaps = [
      { fraction: 0.2, value: null },
      { fraction: 0.5, value: 20 },
      { fraction: 0.85, value: null },
    ];
    expect([...labelledIndices(gaps)]).toEqual([1]);
  });

  it("labels nothing when nothing was measured", () => {
    expect(labelledIndices([]).size).toBe(0);
    expect(labelledIndices([{ fraction: 0.5, value: null }]).size).toBe(0);
  });
});
