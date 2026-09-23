/**
 * Season-axis maths.
 *
 * The whole point of a calendar-anchored track is that a 42-day gap looks
 * different from a 14-day one, so the mapping from date to position is the
 * thing worth testing.
 */
import { describe, expect, it } from "vitest";

import {
  labelRows,
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

describe("labelRows", () => {
  // Lunzer See, 2026: five samples, 13 to 21 days apart.
  const lunz = [0.23, 0.35, 0.49, 0.68, 0.87].map((fraction, i) => ({
    fraction,
    value: 17 + i,
  }));
  const gapAt = (axisPx: number) => 36 / axisPx;

  it("keeps every label on one row where the card is wide enough", () => {
    expect(labelRows(lunz, gapAt(460))).toEqual([0, 0, 0, 0, 0]);
  });

  it("steps a crowded label up a row on a narrow card instead of overlapping", () => {
    // 9 and 22 June are 29px apart on a 240px axis: too close for two labels.
    expect(labelRows(lunz, gapAt(240))).toEqual([0, 1, 0, 0, 0]);
  });

  it("stacks the one real cluster instead of overlapping it", () => {
    // Neue Donau, stromab Reichsbrücke, 2026: fortnightly, then 24, 26 and
    // 28 August -- the tightest spacing in all 260 sites.
    const days = [17, 31, 45, 59, 73, 87, 101, 103, 105];
    const donau = days.map((day, i) => ({ fraction: day / 108, value: 20 + i }));
    expect(labelRows(donau, gapAt(460))).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 2]);
    expect(labelRows(donau, gapAt(240))).toEqual([0, 1, 0, 1, 0, 1, 0, 2, 1]);
  });

  it("leaves a label off rather than print it over another", () => {
    const pileUp = [0.5, 0.505, 0.51, 0.515].map((fraction) => ({ fraction, value: 20 }));
    expect(labelRows(pileUp, gapAt(240))).toEqual([0, 1, 2, null]);
  });

  it("labels every sample that has a temperature, and none that has not", () => {
    const gaps = [
      { fraction: 0.2, value: 18 },
      { fraction: 0.5, value: null },
      { fraction: 0.85, value: 22 },
    ];
    expect(labelRows(gaps, gapAt(240))).toEqual([0, null, 0]);
  });
});
