import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { clamp } from './svg-utils';

/** The setpoints of a climate entity, named as Home Assistant names them. */
export interface Setpoints {
  temperature: number | null;
  target_temp_low: number | null;
  target_temp_high: number | null;
}

/** The detail of the `temperature-changed` event: what to send to `climate.set_temperature`. */
export type TemperatureChange =
  | { temperature: number | null }
  | { target_temp_low: number | null; target_temp_high: number | null };

export type Direction = 1 | -1;

export interface InteractionHost extends ReactiveControllerHost, Setpoints {
  editing: boolean;
  min_temp: number;
  max_temp: number;
  target_temp_step: number;
  idle_zone: number;
  edit_timeout: number;
  dispatchEvent(event: Event): boolean;
}

const MS_PER_SECOND = 1000;

export function isDual(setpoints: Setpoints): boolean {
  return setpoints.target_temp_low !== null && setpoints.target_temp_high !== null;
}

function sameSetpoints(a: Setpoints, b: Setpoints): boolean {
  return (
    a.temperature === b.temperature &&
    a.target_temp_low === b.target_temp_low &&
    a.target_temp_high === b.target_temp_high
  );
}

/** Copy the setpoints out of `source` (the host's are accessors, which a spread would skip). */
function copySetpoints({ temperature, target_temp_low, target_temp_high }: Setpoints): Setpoints {
  return { temperature, target_temp_low, target_temp_high };
}

/**
 * Reactive controller managing tap-to-edit interaction.
 *
 * Flow:
 * 1. User taps the dial → enters editing mode
 * 2. Each arrow tap, and each finished drag on the ring, that changes a
 *    setpoint fires `temperature-changed` right away
 * 3. After `edit_timeout` seconds without interaction → leaves editing mode
 *
 * The user's setpoints are kept in a draft, apart from the entity's. While
 * editing, the dial draws the draft, so a late state update from Home
 * Assistant cannot undo a newer tap. A reported change stays drawn after
 * editing ends, until the owner calls `settle()` (Home Assistant has reported
 * back) or `exitEditMode()` (the change did not take); then the dial shows
 * what Home Assistant reports again.
 *
 * The dial reports each change as it is made and never sends anything itself:
 * when to send is up to its owner, so removing the dial from the page cannot
 * lose a change.
 */
export class DialInteractionController implements ReactiveController {
  private _host: InteractionHost;
  private _timeout: number | undefined;
  /** The setpoints the user has chosen in this edit, or null if unchanged. */
  private _draft: Setpoints | null = null;
  /** The draft when the current drag began, to compare against or restore. */
  private _draftBeforeDrag: Setpoints | null = null;
  private _dragging = false;
  /** Whether a change has been reported that the owner has not settled yet. */
  private _unsettled = false;

  constructor(host: InteractionHost) {
    this._host = host;
    host.addController(this);
  }

  /** The setpoints to draw: the user's while they are editing, otherwise the entity's. */
  get setpoints(): Setpoints {
    return this._draft ?? this._host;
  }

  get dragging(): boolean {
    return this._dragging;
  }

  hostDisconnected(): void {
    this.exitEditMode();
  }

  /** Enter editing mode and start the edit timer. */
  enterEditMode(): void {
    this._host.editing = true;
    this._host.requestUpdate();
    this._restartTimer();
  }

  /** Leave editing mode and show the entity's setpoints again. Sends nothing. */
  exitEditMode(): void {
    this._unsettled = false;
    this._closeEditing();
  }

  /**
   * The reported changes have reached Home Assistant and it has reported
   * back: once editing ends, show its setpoints again.
   */
  settle(): void {
    this._unsettled = false;
    if (!this._host.editing) this._closeEditing();
  }

  /** Leave editing mode, still showing a change the owner has not settled. */
  private _closeEditing(): void {
    this._clearTimeout();
    if (!this._unsettled) this._draft = null;
    this._draftBeforeDrag = null;
    this._dragging = false;
    this._host.editing = false;
    this._host.requestUpdate();
  }

  /** Adjust single target temperature. */
  adjustTarget(direction: Direction): void {
    this._adjust((current) => {
      const temperature = (current.temperature ?? this._host.min_temp) + this._step(direction);
      return this._withTarget(current, temperature);
    });
  }

  /** Adjust low setpoint (dual mode). */
  adjustLow(direction: Direction): void {
    this._adjust((current) => {
      const low = (current.target_temp_low ?? this._host.min_temp) + this._step(direction);
      return this._withLow(current, low);
    });
  }

  /** Adjust high setpoint (dual mode). */
  adjustHigh(direction: Direction): void {
    this._adjust((current) => {
      const high = (current.target_temp_high ?? this._host.max_temp) + this._step(direction);
      return this._withHigh(current, high);
    });
  }

  /** Start a drag on the ring. Editing stays open until the drag ends. */
  beginDrag(): void {
    this._clearTimeout();
    this._draftBeforeDrag = this._draft;
    this._dragging = true;
  }

  /** Move the setpoint nearest to `temperature` there. Reported when the drag ends. */
  dragTo(temperature: number): void {
    if (!this._dragging) return;
    const current = copySetpoints(this.setpoints);
    this._setDraft(
      isDual(current)
        ? this._withNearestOfRange(current, temperature)
        : this._withTarget(current, temperature),
    );
  }

  /** Finish a drag: report where it ended, if that is a change. */
  endDrag(): void {
    if (!this._dragging) return;
    const before = this._draftBeforeDrag ?? this._host;
    this._dragging = false;
    if (this._draft && !sameSetpoints(this._draft, before)) {
      this._submit(this._draft);
    }
    this._restartTimer();
  }

  /** Abandon a drag: put the setpoints back where the drag found them. */
  cancelDrag(): void {
    if (!this._dragging) return;
    this._dragging = false;
    this._draft = this._draftBeforeDrag;
    this._host.requestUpdate();
    this._restartTimer();
  }

  private _adjust(change: (current: Setpoints) => Setpoints): void {
    if (!this._host.editing) {
      this.enterEditMode();
      return;
    }
    this._restartTimer();
    const current = copySetpoints(this.setpoints);
    const next = change(current);
    if (sameSetpoints(next, current)) return;
    this._setDraft(next);
    this._submit(next);
  }

  private _step(direction: Direction): number {
    return direction * this._host.target_temp_step;
  }

  private _withTarget(current: Setpoints, temperature: number): Setpoints {
    const { min_temp, max_temp } = this._host;
    return { ...current, temperature: clamp(temperature, min_temp, max_temp) };
  }

  /** Low may not come closer to high than the idle zone. */
  private _withLow(current: Setpoints, low: number): Setpoints {
    const { min_temp, max_temp, idle_zone } = this._host;
    const maxAllowed = (current.target_temp_high ?? max_temp) - idle_zone;
    return { ...current, target_temp_low: clamp(low, min_temp, maxAllowed) };
  }

  /** High may not come closer to low than the idle zone. */
  private _withHigh(current: Setpoints, high: number): Setpoints {
    const { min_temp, max_temp, idle_zone } = this._host;
    const minAllowed = (current.target_temp_low ?? min_temp) + idle_zone;
    return { ...current, target_temp_high: clamp(high, minAllowed, max_temp) };
  }

  private _withNearestOfRange(current: Setpoints, temperature: number): Setpoints {
    const { min_temp, max_temp } = this._host;
    const distanceToLow = Math.abs(temperature - (current.target_temp_low ?? min_temp));
    const distanceToHigh = Math.abs(temperature - (current.target_temp_high ?? max_temp));
    return distanceToLow < distanceToHigh
      ? this._withLow(current, temperature)
      : this._withHigh(current, temperature);
  }

  private _setDraft(next: Setpoints): void {
    this._draft = next;
    this._host.requestUpdate();
  }

  private _submit(setpoints: Setpoints): void {
    this._unsettled = true;
    const detail: TemperatureChange = isDual(setpoints)
      ? {
          target_temp_low: setpoints.target_temp_low,
          target_temp_high: setpoints.target_temp_high,
        }
      : { temperature: setpoints.temperature };
    this._host.dispatchEvent(
      new CustomEvent<TemperatureChange>('temperature-changed', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  private _restartTimer(): void {
    this._clearTimeout();
    this._timeout = window.setTimeout(
      () => this._closeEditing(),
      this._host.edit_timeout * MS_PER_SECOND,
    );
  }

  private _clearTimeout(): void {
    if (this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }
}
