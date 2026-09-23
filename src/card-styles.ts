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
    --bade-pad-y: var(--ha-space-4, 16px);
    --bade-gap: var(--ha-space-2, 8px);
    --bade-radius-sm: var(--ha-border-radius-sm, 4px);
    --bade-radius-md: var(--ha-border-radius-md, 8px);

    display: block;
  }

  ha-card {
    /* The card can sit in a 280px sidebar column or a full-width section, and
       it must reflow to its own width rather than the viewport's. */
    container-type: inline-size;
    overflow: hidden;
  }

  .body {
    padding: var(--bade-pad-y) var(--bade-pad-x);
  }

  /* -- photo header ----------------------------------------------------- */

  .hero {
    --bade-scrim: rgb(0 0 0 / 0.55);
    /* How far above the text the bottom band spends fading out. Short on
       purpose: the fade is decoration, and at 2.5rem the band covered half
       the photo. */
    --hero-fade: 1.25rem;

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

  /* The shading: black from the right edge fading out towards the left, and
     a soft vignette at the corners. Both are atmosphere; the contrast the
     text needs comes from the band below, not from these. */
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to left,
        rgb(0 0 0 / 0.7),
        rgb(0 0 0 / 0.42) 25%,
        rgb(0 0 0 / 0.14) 50%,
        transparent 70%
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
    background: linear-gradient(
      to top,
      var(--bade-scrim) calc(100% - var(--hero-fade)),
      rgb(0 0 0 / 0.41) calc(100% - var(--hero-fade) * 0.75),
      rgb(0 0 0 / 0.25) calc(100% - var(--hero-fade) * 0.5),
      rgb(0 0 0 / 0.1) calc(100% - var(--hero-fade) * 0.25),
      transparent
    );
  }

  /* A plain block on purpose. A line clamp (display: -webkit-box) has no
     baseline to offer the grid, which then top-aligns the name and leaves
     it floating above the temperature. */
  .hero-title {
    grid-area: title;
    margin: 0;
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-bold, 600);
    line-height: 1.2;
    text-wrap: balance;
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

  .title {
    margin: 0;
    font-size: var(--ha-font-size-l, 1.143rem);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: var(--ha-line-height-condensed, 1.2);
    color: var(--primary-text-color);
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
    margin-top: var(--ha-space-5, 20px);
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
    margin-top: var(--ha-space-2, 8px);
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
    gap: var(--ha-space-5, 20px) var(--ha-space-4, 16px);
    margin: var(--ha-space-5, 20px) 0 0;
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
  .tile-value {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    margin-top: 2px;
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: 1.2;
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

  /* Status colour on the icon only; the words beside it stay in text ink. */
  .quality-icon {
    --mdc-icon-size: 1.15em;
  }

  .quality-icon.is-excellent,
  .quality-icon.is-good {
    color: var(--bade-ok);
  }

  .quality-icon.is-sufficient {
    color: var(--bade-warn);
  }

  .quality-icon.is-poor {
    color: var(--bade-alert);
  }

  /* -- attribution ------------------------------------------------------ */

  .attribution {
    margin-top: var(--ha-space-5, 20px);
    padding-top: var(--ha-space-3, 12px);
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    font-size: var(--ha-font-size-xs, 0.786rem);
    line-height: var(--ha-line-height-normal, 1.6);
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
    .hero-title {
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
