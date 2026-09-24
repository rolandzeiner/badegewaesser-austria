/**
 * The season track: the card's one bold element.
 *
 * A calendar-anchored axis from 15 May to 31 August with one dot per
 * sample at its true date. That choice is the point — the samples arrive
 * about every 20 days, and an evenly-spaced sequence would render a 42-day
 * gap identically to a 14-day one. Anchoring to the calendar also makes the
 * out-of-season card look finished rather than broken: the season is simply
 * complete, and the last dot sits where it ended.
 *
 * Deliberately NOT a temperature line chart. With 4 to 9 points a y-scale
 * either lies about precision or wastes the card's height. Instead every
 * sample's value is printed straight above its dot, so the season reads
 * without hovering, which a phone cannot do. A deliberate exception to the
 * dataviz rule against a number on every point: at four to nine points the
 * labels are the chart. Where dots sit too close for their labels, the
 * labels step up onto a second or third row rather than overlap; see
 * labelRows.
 *
 * Rendered as a function into the CARD's shadow root rather than as its own
 * element. Custom properties do not cross shadow boundaries, so a separate
 * element would need its own copy of the token block — the exact drift that
 * silently turned a sibling integration's warning icons white.
 */
import { css, html, nothing, svg, type TemplateResult } from "lit";

import { localize } from "./localize/localize";

/** One sample as the integration publishes it. */
export interface SeasonSample {
  date: string;
  water_temperature: number | null;
  e_coli?: number | null;
  e_coli_below_limit?: boolean;
  enterococci?: number | null;
  enterococci_below_limit?: boolean;
  secchi_depth?: number | null;
}

// Mirrors MONITORING_START_* / MONITORING_END_* in const.py — the window in
// which readings arrive, NOT the legal bathing season. The axis has to carry
// the mandated pre-season sample, which lands between 26 May and 10 June for
// all 260 sites, so an axis starting at the legal 15 June would clamp every
// site's first dot onto its left edge.
const AXIS_START = { month: 5, day: 15 };
const AXIS_END = { month: 8, day: 31 };

// No viewBox: percentages resolve against the rendered element, and r / y stay
// in CSS pixels. The first version used viewBox="0 0 300 44" with
// preserveAspectRatio="none", which stretches the coordinate system
// non-uniformly — at a rendered width of ~460px the x scale was 1.53 against a
// y scale of 1.0, so every circle came out an ellipse and the month labels
// were stretched with them.
// Value labels on top, then the track, then the month names.
const VALUE_Y = 10;
const TRACK_Y = 24;
const LABEL_Y = 44;

// How far apart two labels in one row must be, centre to centre. A label such
// as "23,2°" is ~32px wide at 12px. Turned into a fraction of the axis at
// render time, from the axis's real width. Every label is centred on its dot:
// anchoring the end ones inward moved them off the centre this gap assumes,
// and they collided. Centred, even a dot at the very end overhangs by half a
// label, ~16px, inside the 24px of body padding plus track inset.
const LABEL_PX = 36;
// The axis width to assume before the card has measured itself: the
// narrowest a sections grid allows, so the first paint errs towards two rows.
export const FALLBACK_AXIS_PX = 240;
// Height of one label row, and so how far each extra row lifts everything.
const LABEL_ROW = 14;
// Measured over all 1102 gaps between consecutive samples (2026 season): the
// median is 20 days and 14 is the most common, but 16 of 260 sites have a
// close pair, down to two days apart -- one-off re-samples, not a weekly
// rhythm. The tightest, Neue Donau stromab Reichsbrücke, takes three samples
// in four days (24, 26 and 28 August), which needs three rows even on a
// wide card.
const MAX_LABEL_ROWS = 3;
// The .track height in the styles below, with one label row.
const TRACK_HEIGHT = 48;

// dataviz: markers at least 8px. These are radii, so 4 and 6 give 8px and
// 12px marks.
const DOT_R = 4;
const LATEST_R = 6;
// Keeps the end dots off the edge now that 0% and 100% are the real edges.
export const TRACK_INSET_PX = LATEST_R + 2;
// dataviz: a pinpoint hover target is an anti-pattern; the hit area must
// reach ~24px even though the mark is 8px.
const HIT_R = 12;

// September is deliberately absent: the season ends 31 August and the live
// document contains zero September samples in 1362 rows.
const MONTHS: ReadonlyArray<number> = [5, 6, 7, 8];

const dayOfYear = (date: Date): number => {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const here = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((here - start) / 86_400_000);
};

/**
 * Where a date sits on the season axis, as 0..1.
 *
 * Clamped rather than dropped: a sample just outside the window is real data
 * and belongs at the edge, not missing. AGES has published samples from
 * 26 May, but nothing guarantees next season starts as late.
 */
export function seasonFraction(date: Date): number {
  const year = date.getUTCFullYear();
  const first = dayOfYear(new Date(Date.UTC(year, AXIS_START.month - 1, AXIS_START.day)));
  const last = dayOfYear(new Date(Date.UTC(year, AXIS_END.month - 1, AXIS_END.day)));
  const span = last - first;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (dayOfYear(date) - first) / span));
}

const parseDate = (iso: string): Date | null => {
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Which label row each sample's value goes in: 0 just above its dot, 1 and 2
 * above that. Greedy left to right: a label takes the lowest row whose last
 * label is at least minGap away. Null where the sample has no temperature,
 * or in the rare cluster with no room in any row -- that dot keeps its value
 * on hover, on focus and in the text twin rather than printing over another.
 *
 * minGap is a fraction of the axis, so the same samples stay on one row on a
 * wide card and step up only where the card is narrow enough to need it.
 */
export function labelRows(
  points: ReadonlyArray<{ fraction: number; value: number | null }>,
  minGap: number,
): Array<number | null> {
  const lastInRow = Array.from({ length: MAX_LABEL_ROWS }, () => -Infinity);
  return points.map((point) => {
    if (point.value === null) return null;
    const row = lastInRow.findIndex((last) => point.fraction - last >= minGap);
    if (row < 0) return null;
    lastInRow[row] = point.fraction;
    return row;
  });
}

/** A position on the axis as a percentage of the rendered width. */
const x = (fraction: number): string => `${(fraction * 100).toFixed(3)}%`;

export interface SeasonTrackOptions {
  samples: readonly SeasonSample[];
  /** Index of the point being hovered or focused, or null. */
  hovered?: number | null;
  /** Called on hover and on keyboard focus, so both behave identically. */
  onHover?: (index: number | null) => void;
  /** Today, for the in-season fill. */
  now: Date;
  inSeason: boolean;
  language: string | undefined;
  /** Formats a sample date for the accessible description and tooltips. */
  formatDate: (date: Date) => string;
  /** The full value, for the tooltip and a screen reader, e.g. "21,5 °C". */
  formatTemperature: (value: number | null, sample: SeasonSample) => string;
  /** The short form printed above a dot, e.g. "21,5°". */
  formatLabel: (value: number, sample: SeasonSample) => string;
  /** Which reading the track plots; the water temperature unless set. */
  read?: (sample: SeasonSample) => number | null | undefined;
  /** The axis's rendered width in px, once the card has measured it. */
  axisWidth?: number | undefined;
}

/**
 * The accessible twin of the track.
 *
 * dataviz treats a tooltip as an enhancement, never the only way to read a
 * value — so every point is also reachable as text. This doubles as the
 * screen-reader description, which otherwise gets an unlabelled graphic.
 */
export function seasonTrackDescription(options: SeasonTrackOptions): string {
  const { samples, formatDate, formatTemperature, language } = options;
  const read = readerOf(options);
  if (samples.length === 0) return localize("card.no_samples", language);
  return samples
    .map((sample) => {
      const date = parseDate(sample.date);
      const when = date ? formatDate(date) : sample.date;
      return `${when}: ${formatTemperature(read(sample), sample)}`;
    })
    .join(", ");
}

/** Fraction of the axis where the newest sample sits, for label anchoring. */
export function latestFraction(samples: readonly SeasonSample[]): number {
  const last = samples.at(-1);
  const date = last ? parseDate(last.date) : null;
  return date ? seasonFraction(date) : 1;
}

/** The plotted reading as a number or null, whatever the sample lacks. */
function readerOf(options: SeasonTrackOptions): (sample: SeasonSample) => number | null {
  const read = options.read ?? ((sample: SeasonSample) => sample.water_temperature);
  return (sample) => read(sample) ?? null;
}

export function renderSeasonTrack(options: SeasonTrackOptions): TemplateResult {
  const {
    samples,
    now,
    language,
    formatDate,
    formatTemperature,
    formatLabel,
    hovered,
    onHover,
    axisWidth,
  } = options;
  const read = readerOf(options);

  // Progress is read off the axis itself rather than the in-season flag: past
  // 31 August the axis is simply complete, which is what makes an out-of-season
  // card look finished instead of broken.
  const progress = seasonFraction(now);
  const points = samples
    .map((sample) => ({ sample, date: parseDate(sample.date) }))
    .filter((entry): entry is { sample: SeasonSample; date: Date } => entry.date !== null)
    .map((entry) => {
      const fraction = seasonFraction(entry.date);
      return { ...entry, fraction, cx: x(fraction) };
    });
  const rows = labelRows(
    points.map((point) => ({
      fraction: point.fraction,
      value: read(point.sample),
    })),
    LABEL_PX / (axisWidth && axisWidth > 0 ? axisWidth : FALLBACK_AXIS_PX),
  );
  // Each extra label row lifts the track and the month names with it.
  const lift = Math.max(0, ...rows.map((row) => row ?? 0)) * LABEL_ROW;
  const trackY = TRACK_Y + lift;

  const lastIndex = points.length - 1;
  const active = hovered !== null && hovered !== undefined ? points[hovered] : undefined;
  const year = points.at(-1)?.date.getUTCFullYear() ?? now.getUTCFullYear();
  const monthName = (month: number): string =>
    new Intl.DateTimeFormat(language ?? "en", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month - 1, 15)),
    );

  return html`
    <div class="track-wrap">
      <!-- role="group", not "img". ARIA makes every descendant of an img
           presentational, so the focusable, labelled points below would take
           keyboard focus and announce nothing (axe: nested-interactive,
           WCAG 4.1.2). A group keeps the axis label AND exposes the points. -->
      <svg
        class="track"
        style=${lift ? `height:${TRACK_HEIGHT + lift}px` : nothing}
        role="group"
        aria-label=${localize("card.season_axis_label", language, { year })}
      >
        <!-- Solid hairlines only. A dashed rule reads as a threshold or a
             projection when it is just an axis. -->
        ${svg`<line
          class="track-ground"
          x1=${x(0)} y1=${trackY} x2=${x(1)} y2=${trackY}
        />`}
        ${svg`<line
          class="track-filled"
          x1=${x(0)} y1=${trackY} x2=${x(progress)} y2=${trackY}
        />`}
        ${MONTHS.map((month, index) => {
          const tick = seasonFraction(
            new Date(Date.UTC(year, month - 1, index === 0 ? AXIS_START.day : 1)),
          );
          return svg`<text
            class="month"
            x=${x(tick)}
            y=${LABEL_Y + lift}
            text-anchor=${index === 0 ? "start" : "middle"}
          >${monthName(month)}</text>`;
        })}
        ${points.map((point, index) => {
          const value = read(point.sample);
          // aria-hidden: each point already announces its own value.
          const row = rows[index];
          return row !== null && row !== undefined && value !== null
            ? svg`<text
                class=${index === lastIndex ? "value-label is-latest" : "value-label"}
                x=${point.cx}
                y=${VALUE_Y + lift - row * LABEL_ROW}
                text-anchor="middle"
                aria-hidden="true"
              >${formatLabel(value, point.sample)}</text>`
            : nothing;
        })}
        ${points.map(
          (point, index) => svg`
            <g
              class=${index === lastIndex ? "point is-latest" : "point"}
              tabindex="0"
              role="img"
              aria-label=${`${formatDate(point.date)}: ${formatTemperature(
                read(point.sample),
                point.sample,
              )}`}
              @pointerenter=${() => onHover?.(index)}
              @pointerleave=${() => onHover?.(null)}
              @focus=${() => onHover?.(index)}
              @blur=${() => onHover?.(null)}
            >
              <circle
                class="dot"
                cx=${point.cx}
                cy=${trackY}
                r=${index === lastIndex ? LATEST_R : DOT_R}
              />
              <circle class="hit" cx=${point.cx} cy=${trackY} r=${HIT_R} />
            </g>
          `,
        )}
      </svg>
      ${active
        ? html`<div
            class="tip"
            role="status"
            style=${`--tip-x:${active.cx}`}
          >
            <span class="tip-date">${formatDate(active.date)}</span>
            <span class="tip-value"
              >${formatTemperature(read(active.sample), active.sample)}</span
            >
          </div>`
        : nothing}
    </div>
  `;
}

export const seasonTrackStyles = css`
  /* The inset the end dots need now that 0% and 100% are the real edges of
     the element rather than padded coordinates inside a viewBox. */
  .track-wrap {
    position: relative;
    padding-inline: 8px;
    margin-top: var(--ha-space-1, 4px);
  }

  /* An in-card tooltip rather than an SVG <title>. The native one renders as
     an OS tooltip box outside the card, unthemed and detached from the point
     it describes. This one sits above its dot, inherits the theme, and
     appears on keyboard focus as well as hover — the values also stay
     reachable as text in the visually-hidden twin, so it enhances rather than
     gates. */
  .tip {
    position: absolute;
    /* Over the dot and its value label, which it stands in for. */
    bottom: 34px;
    left: clamp(0px, var(--tip-x), 100%);
    translate: -50% 0;
    display: flex;
    gap: var(--ha-space-2, 8px);
    align-items: baseline;
    white-space: nowrap;
    padding: 4px 8px;
    border-radius: var(--bade-radius-sm, 4px);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.25));
    font-size: var(--ha-font-size-s, 0.857rem);
    pointer-events: none;
    z-index: 1;
  }

  .tip-date {
    color: var(--secondary-text-color);
  }

  .tip-value {
    color: var(--primary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .point {
    cursor: default;
  }

  .point:focus-visible {
    outline: 2px solid var(--bade-accent);
    outline-offset: 2px;
    border-radius: var(--bade-radius-sm, 4px);
  }

  .track {
    display: block;
    width: 100%;
    /* Sized to include the month labels. A container that fits only the plot
       gives the card a tiny nested scrollbar instead of an axis.

       There is no viewBox on purpose, so one CSS pixel is one user unit: r=4
       draws a 8px CIRCLE at any card width. With a viewBox plus
       preserveAspectRatio="none" the x and y scales differ and every dot
       renders as a horizontally stretched ellipse. */
    height: 48px;
    overflow: visible;
  }

  .track-ground {
    stroke: var(--bade-track);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .track-filled {
    stroke: var(--bade-accent);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .dot {
    fill: var(--bade-accent);
    /* A 2px surface ring rather than a border, so overlapping dots separate
       without drawing an outline around every mark. */
    stroke: var(--ha-card-background, var(--card-background-color, #fff));
    stroke-width: 2;
  }

  .hit {
    fill: transparent;
    /* Pointer only; the group carries the accessible name. */
    pointer-events: all;
  }

  .month {
    fill: var(--secondary-text-color);
    font-size: 10px;
    font-family: var(--ha-font-family-body, inherit);
  }

  /* Text tokens, never the mark's colour: the dot carries identity, the
     label only the value. The latest reads in full ink, the others quieter. */
  .value-label {
    fill: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    font-family: var(--ha-font-family-body, inherit);
  }

  .value-label.is-latest {
    fill: var(--primary-text-color);
    font-weight: var(--ha-font-weight-medium, 500);
  }

  @media (forced-colors: active) {
    .track-filled,
    .dot {
      forced-color-adjust: none;
    }
  }
`;
