/**
 * Season-axis maths.
 *
 * The whole point of a calendar-anchored track is that a 42-day gap looks
 * different from a 14-day one, so the mapping from date to position is the
 * thing worth testing.
 */
import { describe, expect, it } from "vitest";

import { latestFraction, seasonFraction, seasonTrackDescription } from "./season-track";

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("seasonFraction", () => {
  it("puts the season boundaries at the ends", () => {
    expect(seasonFraction(at("2026-05-15"))).toBe(0);
    expect(seasonFraction(at("2026-09-30"))).toBe(1);
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
    expect(seasonFraction(at("2026-10-20"))).toBe(1);
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
