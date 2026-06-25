declare const __CARD_VERSION__: string;
export const CARD_VERSION = __CARD_VERSION__;

export const DEFAULT_CONFIG = {
  pending: 3,
  idle_zone: 0,
  diameter: 400,
  show_ticks: true,
  show_power_toggle: true,
  show_preset_indicator: true,
  num_ticks: 150,
  tick_degrees: 300,
} as const;
