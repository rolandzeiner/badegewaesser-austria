/**
 * Badegewässer Austria — Lovelace card.
 *
 * PHASE-1 PLACEHOLDER. This file exists so the card half of the
 * verification gate (`tsc --noEmit`, `npm run build`, `npm test`) is a real
 * check from the first commit rather than something switched on later. It is
 * replaced wholesale in Phase 4, after the design pass.
 */
import { LitElement, css, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { CARD_TAG, CARD_VERSION } from "./const";

interface BadegewaesserCardConfig {
  type: string;
  entity?: string;
}

/** The slice of `hass` this placeholder needs. Widened in Phase 4. */
interface HomeAssistantLike {
  states: Record<string, { state: string } | undefined>;
}

@customElement(CARD_TAG)
export class BadegewaesserAustriaCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .body {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `;

  @property({ attribute: false }) public hass?: HomeAssistantLike;

  @state() private _config?: BadegewaesserCardConfig;

  /**
   * HA catches a throw here and renders `hui-error-card` with the message,
   * so an invalid config must throw rather than fail quietly.
   */
  public setConfig(config: BadegewaesserCardConfig): void {
    if (!config) {
      throw new Error("Ungültige Konfiguration");
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return nothing;
    }
    return html`
      <ha-card>
        <div class="body">Badegewässer Austria ${CARD_VERSION}</div>
      </ha-card>
    `;
  }
}

// The key must be a string literal — TypeScript does not accept a const
// string as a computed property name in an interface, only a unique symbol.
declare global {
  interface HTMLElementTagNameMap {
    "badegewaesser-austria-card": BadegewaesserAustriaCard;
  }
}
