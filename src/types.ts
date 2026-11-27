// Card configuration (user-facing YAML config)
export interface ThermostatCardConfig {
  type: string;
  entity: string;
  name?: string | false;
  hide_name?: boolean;
  /**
   * The card's own skin — how the dial draws itself.
   *
   * `auto` follows the Home Assistant theme; the other skins are fixed.
   */
  skin?: string;
  /**
   * Home Assistant's card-level theme override. Home Assistant applies the
   * theme's variables to the card; the card itself does not read this.
   */
  theme?: string;
  // Dial behavior
  step?: number;
  pending?: number; // seconds before committing temperature change
  idle_zone?: number; // minimum gap between low/high in dual mode
  // Visual options
  diameter?: number;
  show_ticks?: boolean;
  show_power_toggle?: boolean;
  show_preset_indicator?: boolean;
  readonly?: boolean;
  num_ticks?: number;
  tick_degrees?: number;
  // Color overrides (YAML only, not in visual editor)
  colors?: {
    heating?: string;
    cooling?: string;
    idle?: string;
    off?: string;
    text?: string;
  };
  // Status text entity — displayed above temperature in the dial
  status_entity?: string;
  // Preset icon mapping (YAML only) — map preset name to icon: eco, away, home, sleep, boost, comfort, activity
  preset_icons?: Record<string, string>;
  // Overrides
  range_min?: number;
  range_max?: number;
  ambient_temperature?: string; // external sensor entity
}

// HA climate entity HVAC actions (what's actually happening)
export const HVAC_ACTIONS = [
  'off',
  'heating',
  'cooling',
  'idle',
  'drying',
  'fan',
  'preheating',
  'defrosting',
] as const;

export type HvacAction = (typeof HVAC_ACTIONS)[number];

/**
 * Narrow an unknown value to an HVAC action the card knows how to draw.
 *
 * A climate entity that is unavailable reports no `hvac_action` at all, and its
 * state is then "unavailable" rather than a mode. Anything the card does not
 * know is treated as "off" instead of an unstyled state.
 */
export function isHvacAction(value: unknown): value is HvacAction {
  return typeof value === 'string' && (HVAC_ACTIONS as readonly string[]).includes(value);
}
