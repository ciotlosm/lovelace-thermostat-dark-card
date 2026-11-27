import type { HassEntity } from 'home-assistant-js-websocket';
import type { PropertyValues } from 'lit';

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
  language: string;
  /**
   * The frontend's theme state.
   *
   * `darkMode` is the effective mode — it already accounts for the theme the
   * user picked in their profile and for a theme that defines its own light
   * and dark variants. Optional so a frontend that does not report it (or the
   * standalone demo) still works.
   */
  themes?: {
    darkMode: boolean;
    theme?: string;
    default_theme?: string;
    default_dark_theme?: string | null;
  };
}

/**
 * Whether any of the given entities changed since the last update.
 *
 * The card reads more than one entity — the climate entity itself, the
 * ambient temperature sensor and the status text entity — and every one of
 * them can change what the card draws. Pass all of them, or the card keeps a
 * stale reading on screen.
 */
export function hasEntityChanged(
  element: { hass?: HomeAssistant },
  changedProps: PropertyValues,
  ...entityIds: (string | undefined)[]
): boolean {
  if (changedProps.has('_config')) return true;
  const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
  if (!oldHass) return true;
  return entityIds.some(
    (entityId) =>
      entityId !== undefined && oldHass.states[entityId] !== element.hass?.states[entityId],
  );
}

export function fireEvent(node: HTMLElement, type: string, detail?: Record<string, unknown>): void {
  node.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}
