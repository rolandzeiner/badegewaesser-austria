import { css } from "lit";

/**
 * Card styles.
 *
 * Two-tier custom properties: HA Design System tokens on the outside (they
 * pierce the Shadow DOM, so themes apply automatically), domain-namespaced
 * tokens on the inside. Every namespaced token falls back to an HA token
 * rather than a bare value, so the card moves with the design system.
 *
 * Watch for stray backticks inside this template. A backtick in a comment or
 * a class reference terminates the tagged template early, the rest parses as
 * JavaScript, the build still succeeds, and the card dies at module load.
 * CI greps for exactly that.
 */
export const cardStyles = css`
  :host {
    /* Required for light-dark() below to resolve against HA's active theme. */
    color-scheme: light dark;

    /* Brand accent. Deep lake teal rather than pool blue: Austrian bathing
       lakes read green-teal, and this hue also has to sit beside the success
       green without being confusable with it. Validated, not eyeballed --
       an earlier #0e7c6b was only delta-E 7.8 from --success-color in normal
       vision, which is below the readable floor. #0a7ea4 measures 16.6. */
    --bade-accent: #0a7ea4;

    /* Semantic states layered over HA's flat semantic colours, so a theme
       author recolours the whole portfolio at once. */
    --bade-ok: var(--success-color, #2e7d32);
    --bade-warn: var(--warning-color, #f57c00);
    --bade-alert: var(--error-color, #c62828);

    /* A FILLED danger surface needs a fill + foreground pair, not the flat
       semantic colour above. Measured on the live box: the flat
       --error-color is #db4437, and white on it is 4.29:1 -- under the 4.5:1
       WCAG 1.4.3 floor for normal text. Our own #c62828 fallback is 5.62:1,
       so testing against the fallback said everything was fine while every
       themed install shipped failing contrast.

       HA's design system has a matched pair for exactly this. Light mode
       resolves to red-50 #dc3146 (white -> 4.59:1) and dark to red-40
       #b30532 (white -> 7.04:1), so the contrast becomes HA's problem to
       keep correct rather than ours to re-measure per theme. */
    --bade-alert-fill: var(--ha-color-fill-danger-loud-resting, #c62828);
    --bade-on-alert: var(--ha-color-on-danger-loud, #fff);

    /* The unsampled part of the season track. */
    --bade-track: light-dark(#e4e9ea, #262b2d);

    --bade-pad-x: var(--ha-space-4, 16px);
    /* 12px, not 16: every section below adds its own gap, and at 16 the
       card spent more height on air than on readings. */
    --bade-pad-y: var(--ha-space-3, 12px);
    --bade-section-gap: var(--ha-space-3, 12px);
    --bade-gap: var(--ha-space-2, 8px);
    --bade-radius-sm: var(--ha-border-radius-sm, 4px);
    --bade-radius-md: var(--ha-border-radius-md, 8px);

    display: block;
    /* Fill the grid cell the dashboard gives us. A sections view puts a fixed
       height on the cell wrapper whenever rows is numeric -- and the user
       causes that by dragging the height handle, since a stored grid_options
       overrides getGridOptions(). Because of display: block above, this
       element is ha-card's containing block, so ha-card's block-size: 100%
       resolves against this line; without it the percentage computes to auto
       and the card paints over the card below. Resolves to auto in an
       auto-height cell, so it costs nothing there. The two declarations only
       work as a pair: ha-lovelace-card, references/gotchas.md. */
    block-size: 100%;
  }

  ha-card {
    /* The card can sit in a 280px sidebar column or a full-width section, and
       it must reflow to its own width rather than the viewport's. */
    container-type: inline-size;
    /* Takes the height :host took from the cell. In a cell shorter than the
       content, the photo and banners keep their size and the body scrolls,
       instead of the card spilling over its neighbour. */
    block-size: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  ha-card > * {
    flex-shrink: 0;
  }

  .body {
    padding: var(--bade-pad-y) var(--bade-pad-x);
  }

  /* min-block-size: 0 is what lets a flex child shrink below its content,
     without which overflow-y never engages. */
  ha-card > .body {
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
  }

  /* -- photo header ----------------------------------------------------- */

  .hero {
    --bade-scrim: rgb(0 0 0 / 0.55);
    /* How far above the text the bottom band spends fading out. The dark
       part stays exactly behind the text; this is only the dissolve above
       it, on an eased curve so it has no visible top edge. A short straight
       ramp (1.25rem) read as a hard band. */
    --hero-fade: 3rem;

    position: relative;
    isolation: isolate;
    color: #fff;
  }

  /* Every photo is built at 600x210 (20:7). The ratio is pinned here too, so
     the card keeps its height while the image loads; the minimum height gives
     the overlay room in a narrow column, where the sides are cropped instead. */
  .hero-img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 20 / 7;
    min-height: 8.5rem;
    object-fit: cover;
    background: var(--bade-track);
  }

  /* The shading: black from the right edge dissolving towards the left on
     the same eased curve as the band, and a soft vignette at the corners. Both are atmosphere; the contrast the
     text needs comes from the band below, not from these. */
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to left,
        rgb(0 0 0 / 0.7) 0%,
        rgb(0 0 0 / 0.517) 14.25%,
        rgb(0 0 0 / 0.379) 25.5%,
        rgb(0 0 0 / 0.267) 35.25%,
        rgb(0 0 0 / 0.195) 42.375%,
        rgb(0 0 0 / 0.136) 48.75%,
        rgb(0 0 0 / 0.088) 54.75%,
        rgb(0 0 0 / 0.052) 60.15%,
        rgb(0 0 0 / 0.029) 64.575%,
        rgb(0 0 0 / 0.015) 68.25%,
        rgb(0 0 0 / 0.006) 71.4%,
        rgb(0 0 0 / 0.001) 73.65%,
        transparent 75%
      ),
      radial-gradient(
        ellipse 90% 115% at 38% 35%,
        transparent 55%,
        rgb(0 0 0 / 0.4) 100%
      );
  }

  /* One row along the bottom: the name on the left and the temperature on
     the right share a baseline, and the Bundesland and the sample date share
     the one below it.

     CONTRAST: the row sits on a band that is 55% black wherever there is
     text, fading out only above it. Over pure white -- the brightest thing a
     photo can put underneath -- that leaves rgb(115 115 115), relative
     luminance 0.171, and white on it measures 4.7:1: over the 4.5:1 floor
     for normal text, so it holds for the 12px lines as well as the large
     figure. This is the floor, not a starting point: 50% fails the small
     lines (3.9:1). */
  .hero-caption {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "title temperature"
      "place sampled";
    column-gap: var(--bade-pad-x);
    align-items: last baseline;
    padding: var(--hero-fade) var(--bade-pad-x) var(--ha-space-3, 12px);
    /* Eased "scrim" stops (opacity falls fast, then trails off), which is
       what makes a gradient dissolve instead of ending on a line. */
    background: linear-gradient(
      to top,
      var(--bade-scrim) calc(100% - var(--hero-fade)),
      rgb(0 0 0 / 0.406) calc(100% - var(--hero-fade) * 0.81),
      rgb(0 0 0 / 0.298) calc(100% - var(--hero-fade) * 0.66),
      rgb(0 0 0 / 0.21) calc(100% - var(--hero-fade) * 0.53),
      rgb(0 0 0 / 0.153) calc(100% - var(--hero-fade) * 0.435),
      rgb(0 0 0 / 0.107) calc(100% - var(--hero-fade) * 0.35),
      rgb(0 0 0 / 0.069) calc(100% - var(--hero-fade) * 0.27),
      rgb(0 0 0 / 0.041) calc(100% - var(--hero-fade) * 0.198),
      rgb(0 0 0 / 0.023) calc(100% - var(--hero-fade) * 0.139),
      rgb(0 0 0 / 0.012) calc(100% - var(--hero-fade) * 0.09),
      rgb(0 0 0 / 0.004) calc(100% - var(--hero-fade) * 0.048),
      rgb(0 0 0 / 0.001) calc(100% - var(--hero-fade) * 0.018),
      transparent 100%
    );
  }

  /* The name and its map pin, as one run of text. A plain block on purpose:
     a line clamp (display: -webkit-box) has no baseline to offer the grid,
     which then top-aligns the name and leaves it floating above the
     temperature. The grid aligns this block's last line, and the pin keeps
     that line's baseline where the text puts it (see .map-link). */
  .hero-heading {
    grid-area: title;
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-bold, 600);
    line-height: 1.2;
    /* Also what keeps the pin off a line of its own: balancing spreads the
       words over the lines, so the last one keeps a word beside the pin. */
    text-wrap: balance;
  }

  /* Inline, so the pin after it continues the same line. */
  .hero-title,
  .title {
    display: inline;
    margin: 0;
    font: inherit;
  }

  .hero-place {
    grid-area: place;
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  /* Inline text rather than a flex row: the row's baseline then comes from
     the figures. As flex items, the raised unit supplied the baseline and
     the name lined up with the degree sign instead of the digits. */
  .hero-temperature {
    grid-area: temperature;
    justify-self: end;
    margin: 0;
    line-height: 1;
    white-space: nowrap;
  }

  /* The one loud element, in light weight. Proportional figures: tabular
     ones give every digit the width of a 0, which makes "21,5" look loose at
     this size (dataviz: tabular only where numbers stack in a column). */
  .hero-value {
    font-size: var(--ha-font-size-5xl, 2.857rem);
    font-weight: var(--ha-font-weight-light, 300);
    letter-spacing: -0.02em;
  }

  /* What the figure is. Sits on the text baseline, as tall as the digits;
     no colour, because warmer water is not good or bad news in itself. */
  .hero-icon {
    --mdc-icon-size: 1.75rem;
    margin-right: 4px;
  }

  .hero-unit {
    margin-left: 3px;
    font-size: var(--ha-font-size-l, 1.143rem);
    vertical-align: top;
  }

  .hero-sampled {
    grid-area: sampled;
    justify-self: end;
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    white-space: nowrap;
  }

  /* The date lives on the photo; the body keeps a copy for narrow cards. */
  .reading-block.hero-fallback {
    display: none;
  }

  /* -- photo credit ----------------------------------------------------- */

  .photo-info {
    position: absolute;
    top: var(--bade-gap);
    right: var(--bade-gap);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    max-width: calc(100% - 2 * var(--bade-gap));
  }

  /* 32px: over the 24px WCAG 2.5.8 minimum, and about a fingertip. The
     disc is its own backdrop, since the corner may be bright sky: at 55%
     black, over pure white, the white icon measures 4.7:1, above the 3:1
     WCAG 1.4.11 asks of a control. */
  .photo-info-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    cursor: pointer;
    --mdc-icon-size: 22px;
  }

  .photo-info-button:hover {
    background: rgb(0 0 0 / 0.8);
  }

  /* The body's teal ring would disappear against the dark corner. */
  .photo-info-button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 0;
  }

  /* Same look as the season-track tooltip. Not pointer-events: none, unlike
     that one: WCAG 1.4.13 asks that the pointer can move onto the tooltip
     without it closing, and the wrapper's hover covers both. */
  .photo-tip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 18rem;
    margin-top: 4px;
    padding: 6px 10px;
    border-radius: var(--bade-radius-sm);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.25));
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    line-height: 1.4;
  }

  .photo-tip[hidden] {
    display: none;
  }

  .photo-tip-source {
    color: var(--secondary-text-color);
  }

  /* The body opens with whatever the photo header did not take. */
  .body > :first-child {
    margin-top: 0;
  }

  /* -- heading ---------------------------------------------------------- */

  /* Without a photo. The same run of name and pin as .hero-heading, and
     balanced for the same reason. */
  .heading {
    font-size: var(--ha-font-size-l, 1.143rem);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: var(--ha-line-height-condensed, 1.2);
    color: var(--primary-text-color);
    text-wrap: balance;
  }

  /* -- map link --------------------------------------------------------- */

  /* 32px, like the photo credit's button: over the 24px WCAG 2.5.8 minimum,
     and about a fingertip. The negative block margins give the line back
     what the box takes beyond one line of text (1.2em), so the name's last
     line keeps its height and its baseline, which is what the temperature
     aligns to. The box's own padding makes the gap to the last word; the
     2px before it keeps the focus ring off that word, and the padding after
     the icon is handed back, so a short name on a narrow card does not wrap
     for the sake of empty space. */
  .map-link {
    --mdc-icon-size: 1.1em;
    display: inline-grid;
    place-items: center;
    inline-size: 32px;
    block-size: 32px;
    margin-block: calc((1.2em - 32px) / 2);
    margin-inline: 2px calc((1.1em - 32px) / 2);
    vertical-align: middle;
    /* Middle is half the x-height, which left the pin's head level with
       the lowercase letters and its point well below the line. Raised to
       sit on the capitals, the point just under the baseline. A transform,
       so the line itself does not move. */
    translate: 0 -0.12em;
    border-radius: 50%;
    color: var(--secondary-text-color);
    text-decoration: none;
  }

  .map-link:hover {
    color: var(--primary-text-color);
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  /* Inside the target rather than around it: the ring then marks exactly
     what a tap hits, and stays clear of the name. */
  .map-link:focus-visible {
    outline-offset: -2px;
  }

  /* On the photo the pin is white on the band: 4.7:1 over pure white, above
     the 3:1 WCAG 1.4.11 asks of an icon. Hover darkens rather than tints, as
     on the credit button, so the contrast only goes up. */
  .hero .map-link {
    color: inherit;
  }

  .hero .map-link:hover {
    background: rgb(0 0 0 / 0.3);
  }

  /* The body's teal ring would disappear against the band. */
  .hero .map-link:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -2px;
  }

  .place {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  /* -- closure banner --------------------------------------------------- */

  .closure {
    display: flex;
    align-items: center;
    gap: var(--bade-gap);
    padding: var(--ha-space-3, 12px) var(--bade-pad-x);
    background: var(--bade-alert-fill);
    color: var(--bade-on-alert);
    font-size: var(--ha-font-size-m, 1rem);
    font-weight: var(--ha-font-weight-medium, 500);
  }

  .closure ha-icon {
    flex: 0 0 auto;
  }

  .closure-reason {
    font-weight: var(--ha-font-weight-normal, 400);
    opacity: 0.92;
  }

  /* -- season track ----------------------------------------------------- */

  .season {
    margin-top: var(--bade-section-gap);
  }

  /* Right-aligned, and deliberately so after a detour.
     
     An earlier version tried to anchor the reading exactly over the newest
     sample's dot. Exact anchoring is not achievable here: the newest sample
     is always near the end of the axis (the season closes 31 August), so a
     centred label at that position overflows the card and gets clipped. The
     proportional-spacer approximation that avoided clipping landed about
     60px short — too close to read as alignment, too far to read as an
     anchor, i.e. it just looked like a mistake.
     
     Right alignment lands near the newest dot anyway, for the same reason
     exact anchoring failed, and it reads as a deliberate edge rather than an
     accident. The date line underneath ties it to the series. */
  .reading-block {
    text-align: right;
  }

  .reading-icon {
    --mdc-icon-size: 1.15em;
    align-self: center;
    color: var(--secondary-text-color);
  }

  .reading {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: var(--bade-gap);
    white-space: nowrap;
  }

  .sampled {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  .season-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: var(--ha-space-1, 4px);
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  /* -- readings --------------------------------------------------------- */

  /* Two by two at every width, and still no boxes: four readings in four
     identical rounded tiles is the generic default and reads as a template.
     Whitespace and the type scale carry the grid. */
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--bade-section-gap) var(--ha-space-4, 16px);
    margin: var(--bade-section-gap) 0 0;
  }

  .tile {
    min-width: 0;
  }

  /* The label is the detail, the value the point: small and quiet above, so
     the eye lands on the number. */
  .tile dt {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  .tile dd {
    margin: 0;
  }

  /* Proportional figures: these are standalone values, not a column of
     numbers that has to line up. */
  /* A gap rather than margins between arrow, value and unit: where a narrow
     tile wraps the unit to a second line, a gap vanishes at the break and
     the unit starts flush left, where a margin would leave it indented. */
  .tile-value {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    column-gap: 4px;
    margin-top: 2px;
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: 1.2;
  }

  /* What the reading is, in front of its value. */
  .tile-icon {
    --mdc-icon-size: 0.9em;
    align-self: center;
    color: var(--secondary-text-color);
  }

  /* The trend at the tile's right edge, at the size of the bundesliga
     table's trend column. Out of the flow with its room held open, so a
     narrow tile wraps the unit rather than pushing the arrow onto a line of
     its own; centred on the value's first line (line-height 1.2). */
  .tile-value.has-trend {
    position: relative;
    padding-inline-end: 20px;
  }

  .tile-trend {
    --mdc-icon-size: 15px;
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    display: flex;
    align-items: center;
    block-size: 1.2em;
    color: var(--secondary-text-color);
  }

  .tile-value .unit {
    margin-left: 0;
  }

  .tile-detail {
    margin-top: 2px;
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  .unit {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    font-weight: var(--ha-font-weight-normal, 400);
    margin-left: 4px;
  }

  /* The EU symbol in front of the class (Decision 2011/321/EU): stars, or a
     dash for poor. Status colour on the symbol only; the words beside it
     stay in text ink. Where the words do not fit beside it, they wrap below
     and the symbol keeps its line. */
  .quality-symbol {
    --mdc-icon-size: 0.85em;
    display: inline-flex;
    align-self: center;
  }

  .quality-symbol.is-excellent,
  .quality-symbol.is-good {
    color: var(--bade-ok);
  }

  .quality-symbol.is-sufficient {
    color: var(--bade-warn);
  }

  .quality-symbol.is-poor {
    color: var(--bade-alert);
  }

  /* -- attribution ------------------------------------------------------ */

  .attribution {
    margin: var(--bade-section-gap) 0 0;
    padding-top: var(--ha-space-2, 8px);
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    font-size: var(--ha-font-size-xs, 0.786rem);
    line-height: var(--ha-line-height-condensed, 1.2);
    color: var(--secondary-text-color);
  }

  /* -- banners ---------------------------------------------------------- */

  .version-banner {
    display: flex;
    align-items: center;
    gap: var(--bade-gap);
    padding: var(--ha-space-2, 8px) var(--bade-pad-x);
    background: color-mix(in srgb, var(--bade-warn) 16%, transparent);
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  .version-banner button {
    margin-left: auto;
    font: inherit;
    color: var(--primary-text-color);
    background: transparent;
    border: 1px solid currentColor;
    border-radius: var(--bade-radius-sm);
    padding: 4px 10px;
    cursor: pointer;
    /* WCAG 2.5.8: the minimum target is 24px, and this one clears it. */
    min-height: 24px;
  }

  /* The table-view twin of the season track: every plotted value is also
     reachable as text, so a tooltip is never the only way to read one. Not
     display:none -- that would hide it from screen readers too. */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  :focus-visible {
    outline: 2px solid var(--bade-accent);
    outline-offset: 2px;
  }

  /* -- narrow columns --------------------------------------------------- */

  /* A sidebar column: a smaller figure, and the date moves off the photo to
     the body, where there is room for it. */
  @container (max-width: 360px) {
    .tile-value {
      font-size: var(--ha-font-size-l, 1.143rem);
    }
    .hero-value {
      font-size: var(--ha-font-size-3xl, 2rem);
    }
    .hero-icon {
      --mdc-icon-size: 1.25rem;
    }
    .hero-heading {
      font-size: var(--ha-font-size-l, 1.143rem);
    }
    .hero-sampled {
      display: none;
    }
    .reading-block.hero-fallback {
      display: block;
    }
  }

  @container (max-width: 320px) {
    .temperature {
      font-size: var(--ha-font-size-2xl, 1.429rem);
    }
  }

  /* WCAG 2.3.3. HA's own theme already collapses its animation-duration
     tokens under this query, but the card must not rely on the theme doing
     it -- a custom theme may not. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Windows High Contrast: keep the track readable when the theme colours
     are replaced wholesale. */
  @media (forced-colors: active) {
    .closure {
      border: 1px solid CanvasText;
    }
  }
`;
