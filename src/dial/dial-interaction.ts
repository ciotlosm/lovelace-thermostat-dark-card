import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface InteractionHost extends ReactiveControllerHost {
  editing: boolean;
  temperature: number | null;
  target_temp_low: number | null;
  target_temp_high: number | null;
  min_temp: number;
  max_temp: number;
  target_temp_step: number;
  idle_zone: number;
  pending: number;
  dual: boolean;
  dispatchEvent(event: Event): boolean;
  requestUpdate(): void;
}

/**
 * Reactive controller managing tap-to-edit interaction.
 *
 * Flow:
 * 1. User taps the dial → enters editing mode
 * 2. User taps chevrons to adjust temperature
 * 3. After `pending` seconds of inactivity → exits editing, fires change event
 */
export class DialInteractionController implements ReactiveController {
  private _host: InteractionHost;
  private _timeout: number | undefined;

  constructor(host: InteractionHost) {
    this._host = host;
    host.addController(this);
  }

  hostDisconnected(): void {
    this._clearTimeout();
  }

  /** Enter editing mode and start the pending timer. */
  enterEditMode(): void {
    this._host.editing = true;
    this._host.requestUpdate();
    this._resetTimer();
  }

  /** Adjust single target temperature. */
  adjustTarget(direction: 1 | -1): void {
    const host = this._host;
    if (!host.editing) {
      this.enterEditMode();
      return;
    }

    let temp = (host.temperature ?? host.min_temp) + direction * host.target_temp_step;
    temp = Math.min(Math.max(temp, host.min_temp), host.max_temp);
    host.temperature = temp;
    host.requestUpdate();
    this._resetTimer();
  }

  /** Adjust low setpoint (dual mode). */
  adjustLow(direction: 1 | -1): void {
    const host = this._host;
    if (!host.editing) {
      this.enterEditMode();
      return;
    }

    let temp = (host.target_temp_low ?? host.min_temp) + direction * host.target_temp_step;
    const maxAllowed = (host.target_temp_high ?? host.max_temp) - host.idle_zone;
    temp = Math.min(Math.max(temp, host.min_temp), maxAllowed);
    host.target_temp_low = temp;
    host.requestUpdate();
    this._resetTimer();
  }

  /** Adjust high setpoint (dual mode). */
  adjustHigh(direction: 1 | -1): void {
    const host = this._host;
    if (!host.editing) {
      this.enterEditMode();
      return;
    }

    let temp = (host.target_temp_high ?? host.max_temp) + direction * host.target_temp_step;
    const minAllowed = (host.target_temp_low ?? host.min_temp) + host.idle_zone;
    temp = Math.min(Math.max(temp, minAllowed), host.max_temp);
    host.target_temp_high = temp;
    host.requestUpdate();
    this._resetTimer();
  }

  private _resetTimer(): void {
    this._clearTimeout();
    this._timeout = window.setTimeout(() => {
      this._commitAndExit();
    }, this._host.pending * 1000);
  }

  private _clearTimeout(): void {
    if (this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _commitAndExit(): void {
    const host = this._host;
    host.editing = false;
    host.requestUpdate();

    // Fire the appropriate change event
    if (host.dual) {
      host.dispatchEvent(
        new CustomEvent('temperature-changed', {
          bubbles: true,
          composed: true,
          detail: {
            target_temp_low: host.target_temp_low,
            target_temp_high: host.target_temp_high,
          },
        }),
      );
    } else {
      host.dispatchEvent(
        new CustomEvent('temperature-changed', {
          bubbles: true,
          composed: true,
          detail: { temperature: host.temperature },
        }),
      );
    }
  }
}
