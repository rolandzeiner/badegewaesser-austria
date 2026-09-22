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

  /* Anchors the reading over the newest sample's dot rather than parking it
     at the right edge. Three grid columns -- a proportional spacer, the label
     at its natural width, another proportional spacer -- so the label tracks
     the dot and the fr units guarantee it can never overflow the card, which
     absolute positioning would not.

     The centring is approximate by design: the spacers split the space LEFT
     OVER after the label, so the label's centre lands about (0.5 - f) x its
     own width off the dot. That is roughly 20px on a typical card, against
     the ~140px it was adrift when the label was simply right-aligned. Exact
     placement would need either absolute positioning (which needs a measured
     container height) or a JS width measurement, and neither is worth it for
     20px. */
  .reading-row {
    display: grid;
    grid-template-columns: var(--before, 1fr) auto var(--after, 0fr);
  }

  .reading-block {
    grid-column: 2;
    text-align: center;
    min-width: 0;
  }

  .reading {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--bade-gap);
    white-space: nowrap;
  }

  .temperature {
    font-size: var(--ha-font-size-3xl, 1.714rem);
    font-weight: var(--ha-font-weight-bold, 700);
    line-height: var(--ha-line-height-condensed, 1.2);
    color: var(--primary-text-color);
    /* Deliberately NOT tabular-nums. Equal-width digits make a large
       standalone figure look loose; the value rows below, which do align
       vertically, get tabular-nums instead. */
  }

  .temperature.is-missing {
    color: var(--secondary-text-color);
    font-weight: var(--ha-font-weight-normal, 400);
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
