/**
 * The season track: the card's one bold element.
 *
 * A calendar-anchored axis from 15 May to 30 September with one dot per
 * sample at its true date. That choice is the point — the samples arrive
 * about every 20 days, and an evenly-spaced sequence would render a 42-day
 * gap identically to a 14-day one. Anchoring to the calendar also makes the
 * out-of-season card look finished rather than broken: the season is simply
 * complete, and the last dot sits where it ended.
 *
 * Deliberately NOT a temperature line chart. With 4 to 9 points a y-scale
 * either lies about precision or wastes the card's height; the value the
 * reader wants is the newest one, and it is labelled directly.
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
const TRACK_Y = 14;
const LABEL_Y = 38;

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
  formatTemperature: (value: number | null) => string;
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
  if (samples.length === 0) return localize("card.no_samples", language);
  return samples
    .map((sample) => {
      const date = parseDate(sample.date);
      const when = date ? formatDate(date) : sample.date;
      return `${when}: ${formatTemperature(sample.water_temperature)}`;
    })
    .join(", ");
}

/** Fraction of the axis where the newest sample sits, for label anchoring. */
export function latestFraction(samples: readonly SeasonSample[]): number {
  const last = samples.at(-1);
  const date = last ? parseDate(last.date) : null;
  return date ? seasonFraction(date) : 1;
}

export function renderSeasonTrack(options: SeasonTrackOptions): TemplateResult {
  const { samples, now, language, formatDate, formatTemperature, hovered, onHover } =
    options;

  // Progress is read off the axis itself rather than the in-season flag: past
  // 31 August the axis is simply complete, which is what makes an out-of-season
  // card look finished instead of broken.
  const progress = seasonFraction(now);
  const points = samples
    .map((sample) => ({ sample, date: parseDate(sample.date) }))
    .filter((entry): entry is { sample: SeasonSample; date: Date } => entry.date !== null)
    .map((entry) => ({ ...entry, cx: x(seasonFraction(entry.date)) }));

  const lastIndex = points.length - 1;
  const active = hovered !== null && hovered !== undefined ? points[hovered] : undefined;
  const year = points.at(-1)?.date.getUTCFullYear() ?? now.getUTCFullYear();
  const monthName = (month: number): string =>
    new Intl.DateTimeFormat(language ?? "en", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month - 1, 15)),
    );

  return html`
    <div class="track-wrap">
      <svg
        class="track"
        role="img"
        aria-label=${localize("card.season_axis_label", language, { year })}
      >
        <!-- Solid hairlines only. A dashed rule reads as a threshold or a
             projection when it is just an axis. -->
        ${svg`<line
          class="track-ground"
          x1=${x(0)} y1=${TRACK_Y} x2=${x(1)} y2=${TRACK_Y}
        />`}
        ${svg`<line
          class="track-filled"
          x1=${x(0)} y1=${TRACK_Y} x2=${x(progress)} y2=${TRACK_Y}
        />`}
        ${MONTHS.map((month, index) => {
          const tick = seasonFraction(
            new Date(Date.UTC(year, month - 1, index === 0 ? AXIS_START.day : 1)),
          );
          return svg`<text
            class="month"
            x=${x(tick)}
            y=${LABEL_Y}
            text-anchor=${index === 0 ? "start" : "middle"}
          >${monthName(month)}</text>`;
        })}
        ${points.map(
          (point, index) => svg`
            <g
              class=${index === lastIndex ? "point is-latest" : "point"}
              tabindex="0"
              role="img"
              aria-label=${`${formatDate(point.date)}: ${formatTemperature(
                point.sample.water_temperature,
              )}`}
              @pointerenter=${() => onHover?.(index)}
              @pointerleave=${() => onHover?.(null)}
              @focus=${() => onHover?.(index)}
              @blur=${() => onHover?.(null)}
            >
              <circle
                class="dot"
                cx=${point.cx}
                cy=${TRACK_Y}
                r=${index === lastIndex ? LATEST_R : DOT_R}
              />
              <circle class="hit" cx=${point.cx} cy=${TRACK_Y} r=${HIT_R} />
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
              >${formatTemperature(active.sample.water_temperature)}</span
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
    bottom: 26px;
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
    height: 44px;
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

  @media (forced-colors: active) {
    .track-filled,
    .dot {
      forced-color-adjust: none;
    }
  }
`;
