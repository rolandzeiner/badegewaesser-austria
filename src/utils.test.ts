/**
 * Formatting helpers.
 *
 * No DOM here on purpose — these are pure functions, so they run in vitest's
 * default node environment and pay nothing for a happy-dom boot.
 */
import { describe, expect, it } from "vitest";

import { formatCount, formatNumber, formatSampleDate, hasValue, numericState } from "./utils";

describe("numericState", () => {
  it.each(["unknown", "unavailable", "", "none"])(
    "treats %s as no value rather than zero",
    (state) => {
      expect(numericState({ state, attributes: {} })).toBeNull();
      expect(hasValue({ state, attributes: {} })).toBe(false);
    },
  );

  it("reads a real number", () => {
    expect(numericState({ state: "26.2", attributes: {} })).toBeCloseTo(26.2);
  });

  it("rejects a non-numeric state instead of returning NaN", () => {
    expect(numericState({ state: "warm", attributes: {} })).toBeNull();
  });
});

describe("formatCount", () => {
  it("prefixes the detection-limit operator", () => {
    // 901 of 1362 live samples are below the limit, so "<15" is the common
    // case, not an edge case. Printing "15" would overstate contamination at
    // sites that are in fact clean.
    expect(formatCount(15, true, "de")).toBe("<15");
  });

  it("prints a measured count plainly", () => {
    expect(formatCount(240, false, "de")).toBe("240");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatCount(null, true, "de")).toBeNull();
  });
});

describe("formatNumber", () => {
  it("uses the reader's decimal separator", () => {
    expect(formatNumber(26.2, "de")).toBe("26,2");
    expect(formatNumber(26.2, "en")).toBe("26.2");
  });

  it("keeps a trailing zero so values line up row to row", () => {
    expect(formatNumber(26, "de")).toBe("26,0");
  });
});

describe("formatSampleDate", () => {
  it("renders the calendar date, not a timezone-shifted one", () => {
    // The integration publishes midnight local time for a calendar date.
    // Re-interpreting that in another zone can move it a day, which is why
    // the formatter pins UTC.
    const date = new Date("2026-08-20T00:00:00Z");
    expect(formatSampleDate(date, "de")).toContain("20");
    expect(formatSampleDate(date, "de")).toContain("August");
    expect(formatSampleDate(date, "en")).toContain("August");
  });
});
