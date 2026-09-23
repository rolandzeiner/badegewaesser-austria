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
    /* The shade is the lake at dusk rather than neutral black: the accent's
       hue taken down to near-black, so the darkening reads as part of the
       photo instead of a grey film over it. */
    --bade-shade: 4 22 28;
    --bade-scrim: rgb(var(--bade-shade) / 0.62);
    /* Room the temperature column claims, the fade each scrim spends inside
       its own padding, and the band above and below the temperature that
       keeps it clear of the info button while staying exactly centred. */
    --hero-reading-w: 7.5rem;
    --hero-fade: 2.5rem;
    --hero-clear: 2.75rem;
    /* An eased fade rather than a straight one: a linear ramp from 62% to
       nothing leaves a visible edge where it starts, and the scrim reads as a
       panel laid on the photo instead of shade within it. */
    --hero-fade-stops: rgb(var(--bade-shade) / 0.46)
        calc(100% - var(--hero-fade) * 0.75),
      rgb(var(--bade-shade) / 0.28) calc(100% - var(--hero-fade) * 0.5),
      rgb(var(--bade-shade) / 0.11) calc(100% - var(--hero-fade) * 0.25),
      transparent;

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

  /* The vignette. Decoration only: none of the contrast below depends on it. */
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse 90% 115% at 38% 35%,
      transparent 55%,
      rgb(var(--bade-shade) / 0.5) 100%
    );
  }

  /* CONTRAST, for every line of text on the photo. Each text block sits on
     its own scrim, sized to the block, at 62% of the shade: a band under the
     name, a halo behind the temperature. Composited over pure
     white -- the brightest thing a photo can put underneath -- that leaves
     rgb(99 111 114), relative luminance 0.152, and white on it measures
     5.19:1. That clears the 4.5:1 floor for normal text, so it holds for the
     12px lines as well as the large figure; 0.55 would not (4.11:1). Each
     fade lies outside the text, never under it. */
  .hero-caption {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: var(--hero-fade)
      calc(var(--hero-reading-w) + var(--bade-pad-x) + var(--bade-gap))
      var(--ha-space-3, 12px) var(--bade-pad-x);
    background: linear-gradient(
      to top,
      var(--bade-scrim) calc(100% - var(--hero-fade)),
      var(--hero-fade-stops)
    );
  }

  /* Above the temperature's halo, which a long name can run into. */
  .hero-title,
  .hero-place {
    position: relative;
    z-index: 2;
  }

  .hero-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    margin: 0;
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-bold, 600);
    line-height: 1.2;
    text-wrap: balance;
  }

  .hero-place {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  /* Centred in the photo's height; the equal padding above and below keeps
     it clear of the info button without moving it off centre. */
  .hero-reading {
    position: absolute;
    inset-block: 0;
    right: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    padding: var(--hero-clear) var(--bade-pad-x);
  }

  /* A halo rather than a column, so the darkening gathers around the
     temperature and fades into the vignette instead of standing as a panel.
     It is a blurred copy of the scrim, extended past the text by twice the
     blur: a Gaussian is back to 98% of full strength two deviations in from
     its edge, so the figures themselves sit on at least 0.61 and the 4.9:1
     above holds. A box-shadow was tried first and left a visible step, since
     its blur is centred on the box edge rather than outside it. */
  .hero-reading-box {
    --halo-blur: 0.75rem;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .hero-reading-box::before {
    content: "";
    position: absolute;
    inset: calc(-2 * var(--halo-blur) - 0.25rem);
    z-index: -1;
    border-radius: 2rem;
    background: var(--bade-scrim);
    filter: blur(var(--halo-blur));
  }

  .hero-temperature {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    margin: 0;
    line-height: 1;
    white-space: nowrap;
  }

  /* The one loud element. Light weight and tabular figures, so 19,8 and 21,5
     take the same width and the column does not shift between samples. */
  .hero-value {
    font-size: var(--ha-font-size-5xl, 2.857rem);
    font-weight: var(--ha-font-weight-light, 300);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .hero-unit {
    margin-top: 0.25em;
    font-size: var(--ha-font-size-l, 1.143rem);
  }

  .hero-sampled {
    margin: 6px 0 0;
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
     disc is its own backdrop, since the corner may be bright sky: at 55% of
     the shade, over pure white, the white icon measures 4.1:1, above the
     3:1 WCAG 1.4.11 asks of a control. */
  .photo-info-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(var(--bade-shade) / 0.55);
    color: #fff;
    cursor: pointer;
    --mdc-icon-size: 22px;
  }

  .photo-info-button:hover {
    background: rgb(var(--bade-shade) / 0.8);
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

  .readings {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--ha-space-4, 16px);
    row-gap: var(--ha-space-2, 8px);
    margin-top: var(--ha-space-5, 20px);
    font-size: var(--ha-font-size-m, 1rem);
  }

  /* No tiles, no borders, no shadows. The grid alignment is the structure --
     six readings in six identical rounded boxes is the generic default and
     reads as a template. */
  .readings dt {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    align-self: baseline;
  }

  .readings dd {
    margin: 0;
    color: var(--primary-text-color);
    /* These DO align vertically row to row, so equal-width digits help. */
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    margin-left: 4px;
  }

  .qualifier {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    margin-left: var(--bade-gap);
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
    .hero {
      --hero-reading-w: 4.5rem;
    }
    .hero-value {
      font-size: var(--ha-font-size-3xl, 2rem);
    }
    .hero-sampled {
      display: none;
    }
    .reading-block.hero-fallback {
      display: block;
    }
  }

  @container (max-width: 320px) {
    .readings {
      grid-template-columns: 1fr;
      row-gap: 2px;
    }
    .readings dd {
      margin-bottom: var(--ha-space-2, 8px);
    }
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
