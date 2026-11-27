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
  pending?: number; // seconds after the last change before it is sent to Home Assistant
  edit_timeout?: number; // seconds without interaction before the dial leaves edit mode (at least `pending`)
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

// The HVAC modes Home Assistant defines (ClimateMode). The state of a climate
// entity is its mode.
export const HVAC_MODES = ['off', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'] as const;

export type HvacMode = (typeof HVAC_MODES)[number];

/**
 * Narrow an unknown value to an HVAC mode.
 *
 * A climate entity that is unavailable reports the state "unavailable" rather
 * than a mode, and one that has not reported yet reports "unknown".
 */
export function isHvacMode(value: unknown): value is HvacMode {
  return typeof value === 'string' && (HVAC_MODES as readonly string[]).includes(value);
}

/**
 * The bits of a climate entity's `supported_features`.
 *
 * The values are Home Assistant's `ClimateEntityFeature` flags. An entity
 * publishes the setpoint attributes only for the features it has, and the
 * `climate.set_temperature` service rejects a setpoint the entity does not
 * support — a single target for a device that only has a range, or the other
 * way round.
 */
export const TARGET_TEMPERATURE = 1;
export const TARGET_TEMPERATURE_RANGE = 2;
export const TURN_OFF = 128;
export const TURN_ON = 256;

/** Which setpoint a device follows. */
export type SetpointKind = 'single' | 'range' | 'none';

/**
 * The setpoint an HVAC mode follows.
 *
 * `heat_cool` is the mode that uses a target range; every other mode uses a
 * single target. A device that supports neither has no setpoint at all.
 *
 * The mode says which setpoint the device *has*, not whether it may be
 * changed: a device that is off still reports the target it will use, and
 * Home Assistant's own card lets the user change a target in `auto`, where the
 * device follows a schedule of its own.
 */
export function setpointKind(mode: string, supportedFeatures: number): SetpointKind {
  const single = (supportedFeatures & TARGET_TEMPERATURE) !== 0;
  const range = (supportedFeatures & TARGET_TEMPERATURE_RANGE) !== 0;
  if (!single && !range) return 'none';
  if (mode === 'heat_cool') return range ? 'range' : 'none';
  return single ? 'single' : 'none';
}

/**
 * Whether Home Assistant's own card would let the user change the setpoint.
 *
 * Its climate control is disabled when the entity is off or not reporting:
 * an off device does nothing until its mode changes, so a target has no
 * effect yet.
 */
export function setpointIsAdjustable(mode: string): boolean {
  return mode !== 'off' && mode !== 'unavailable' && mode !== 'unknown';
}

/**
 * Whether the device can be turned off or on.
 *
 * Home Assistant refuses the call for a device that does not support that
 * turn, so the power button is only offered when the turn it would make is
 * one the device has.
 */
export function canTogglePower(mode: string, supportedFeatures: number): boolean {
  if (mode === 'off') return (supportedFeatures & TURN_ON) !== 0;
  return (supportedFeatures & TURN_OFF) !== 0;
}
