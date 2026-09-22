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
import { css, html, svg, type TemplateResult } from "lit";

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

// Mirrors SEASON_START_* / SEASON_END_* in const.py. The two must agree, or
// an in-season card draws a dot outside its own axis.
const SEASON_START = { month: 5, day: 15 };
const SEASON_END = { month: 9, day: 30 };

const VIEW_W = 300;
const VIEW_H = 44;
const TRACK_Y = 14;
const LABEL_Y = 38;

// dataviz: markers at least 8px. These are radii, so 4 and 6 give 8px and
// 12px marks.
const DOT_R = 4;
const LATEST_R = 6;
// dataviz: a pinpoint hover target is an anti-pattern; the hit area must
// reach ~24px even though the mark is 8px.
const HIT_R = 12;

const MONTHS: ReadonlyArray<{ month: number; key: string }> = [
  { month: 5, key: "May" },
  { month: 6, key: "Jun" },
  { month: 7, key: "Jul" },
  { month: 8, key: "Aug" },
  { month: 9, key: "Sep" },
];

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
  const first = dayOfYear(new Date(Date.UTC(year, SEASON_START.month - 1, SEASON_START.day)));
  const last = dayOfYear(new Date(Date.UTC(year, SEASON_END.month - 1, SEASON_END.day)));
  const span = last - first;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (dayOfYear(date) - first) / span));
}

const parseDate = (iso: string): Date | null => {
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const x = (fraction: number): number =>
  DOT_R + LATEST_R + fraction * (VIEW_W - 2 * (DOT_R + LATEST_R));

export interface SeasonTrackOptions {
  samples: readonly SeasonSample[];
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
  const { samples, now, inSeason, language, formatDate, formatTemperature } = options;

  const progress = inSeason ? seasonFraction(now) : 1;
  const points = samples
    .map((sample) => ({ sample, date: parseDate(sample.date) }))
    .filter((entry): entry is { sample: SeasonSample; date: Date } => entry.date !== null)
    .map((entry) => ({ ...entry, cx: x(seasonFraction(entry.date)) }));

  const lastIndex = points.length - 1;
  const year = points.at(-1)?.date.getUTCFullYear() ?? now.getUTCFullYear();

  return html`
    <svg
      class="track"
      viewBox="0 0 ${VIEW_W} ${VIEW_H}"
      preserveAspectRatio="none"
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
      ${MONTHS.map((entry, index) => {
        const tick = seasonFraction(
          new Date(Date.UTC(year, entry.month - 1, index === 0 ? SEASON_START.day : 1)),
        );
        return svg`<text
          class="month"
          x=${x(tick)}
          y=${LABEL_Y}
          text-anchor=${index === 0 ? "start" : index === MONTHS.length - 1 ? "end" : "middle"}
        >${new Intl.DateTimeFormat(language ?? "en", { month: "short", timeZone: "UTC" }).format(
          new Date(Date.UTC(year, entry.month - 1, 15)),
        )}</text>`;
      })}
      ${points.map(
        (point, index) => svg`
          <g class=${index === lastIndex ? "point is-latest" : "point"}>
            <title>
              ${formatDate(point.date)}: ${formatTemperature(point.sample.water_temperature)}
            </title>
            <circle
              class="dot"
              cx=${point.cx}
              cy=${TRACK_Y}
              r=${index === lastIndex ? LATEST_R : DOT_R}
            />
            <circle
              class="hit"
              cx=${point.cx}
              cy=${TRACK_Y}
              r=${HIT_R}
            />
          </g>
        `,
      )}
    </svg>
  `;
}

export const seasonTrackStyles = css`
  .track {
    display: block;
    width: 100%;
    /* Sized to include the month labels. A container that fits only the plot
       gives the card a tiny nested scrollbar instead of an axis. */
    height: 44px;
    margin-top: var(--ha-space-1, 4px);
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
