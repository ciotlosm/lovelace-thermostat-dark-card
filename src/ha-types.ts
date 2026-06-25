import type { PropertyValues } from 'lit';
import type { HassEntity } from 'home-assistant-js-websocket';

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
  language: string;
  themes: { darkMode: boolean };
}

export function hasEntityChanged(
  element: { hass?: HomeAssistant },
  changedProps: PropertyValues,
  entityId: string,
): boolean {
  if (changedProps.has('_config')) return true;
  const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
  if (!oldHass) return true;
  return oldHass.states[entityId] !== element.hass?.states[entityId];
}

export function fireEvent(node: HTMLElement, type: string, detail?: Record<string, unknown>): void {
  node.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}
