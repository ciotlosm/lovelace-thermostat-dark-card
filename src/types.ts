// Card configuration (user-facing YAML config)
export interface ThermostatCardConfig {
  type: string;
  entity: string;
  name?: string | false;
  theme?: 'dark' | 'light';
  // Dial behavior
  step?: number;
  pending?: number; // seconds before committing temperature change
  idle_zone?: number; // minimum gap between low/high in dual mode
  // Visual options
  diameter?: number;
  show_ticks?: boolean;
  show_power_toggle?: boolean;
  show_preset_indicator?: boolean;
  num_ticks?: number;
  tick_degrees?: number;
  // Overrides
  range_min?: number;
  range_max?: number;
  ambient_temperature?: string; // external sensor entity
}

// HA climate entity HVAC modes
export type HvacMode =
  | 'off'
  | 'heat'
  | 'cool'
  | 'heat_cool'
  | 'auto'
  | 'dry'
  | 'fan_only';

// HA climate entity HVAC actions (what's actually happening)
export type HvacAction =
  | 'off'
  | 'heating'
  | 'cooling'
  | 'idle'
  | 'drying'
  | 'fan'
  | 'preheating'
  | 'defrosting';

// Resolved state passed from card to dial component
export interface DialState {
  current_temperature: number;
  temperature: number | null; // single target
  target_temp_low: number | null; // dual mode
  target_temp_high: number | null; // dual mode
  min_temp: number;
  max_temp: number;
  target_temp_step: number;
  hvac_mode: HvacMode;
  hvac_action: HvacAction | null;
  preset_mode: string | null;
}
