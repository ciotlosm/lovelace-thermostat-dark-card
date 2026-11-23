/**
 * Theme/skin system — one JSON file per theme in this folder.
 *
 * To add a new theme:
 * 1. Copy auto.json to <your-theme>.json (e.g. ocean.json, sunset.json)
 * 2. Change the CSS variable values
 * 3. Rebuild — the new theme is auto-discovered and available in the config
 *
 * Token names map to CSS variables: "dial-off-fill" → --dial-off-fill
 *
 * A theme file is a flat map of tokens. It may also carry a "modes" object
 * with "light" and "dark" sub-maps; those override the flat tokens for that
 * mode. A theme with "modes" follows the Home Assistant theme, one without
 * keeps the same colors in light and dark.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  [key: string]: string;
}

export interface ThemeFile {
  modes?: Partial<Record<ThemeMode, ThemeTokens>>;
  [key: string]: unknown;
}

// Vite glob import — auto-discovers all JSON theme files at build time
const themeModules = import.meta.glob('./*.json', { eager: true }) as Record<
  string,
  { default: ThemeFile }
>;

// Build the theme map: { "auto": {...}, "dark": {...}, ... }
export const themes: Record<string, ThemeFile> = {};
for (const [path, module] of Object.entries(themeModules)) {
  const name = path.replace('./', '').replace('.json', '');
  themes[name] = module.default;
}

/** The theme that follows the Home Assistant theme. Always listed first. */
export const AUTO_THEME = 'auto';

/** Get list of available theme names, with the HA-following theme first. */
export function getAvailableThemes(): string[] {
  return Object.keys(themes).sort((a, b) => {
    if (a === AUTO_THEME) return -1;
    if (b === AUTO_THEME) return 1;
    return a.localeCompare(b);
  });
}

/** Resolve the tokens of a theme for a mode, merging in the mode overrides. */
function resolveTokens(themeName: string, mode: ThemeMode): ThemeTokens {
  const theme = themes[themeName];
  if (!theme) return {};

  const tokens: ThemeTokens = {};
  for (const [key, value] of Object.entries(theme)) {
    if (key === 'modes') continue;
    if (typeof value === 'string') tokens[key] = value;
  }

  const modeTokens = theme.modes?.[mode];
  if (modeTokens) Object.assign(tokens, modeTokens);

  return tokens;
}

/** Convert theme tokens to a CSS style string for inline application */
export function themeToStyle(themeName: string, mode: ThemeMode = 'dark'): string {
  const tokens = resolveTokens(themeName, mode);
  return Object.entries(tokens)
    .filter(([key]) => key !== 'colored-ticks' && key !== 'state-text')
    .map(([key, value]) => `--${key}: ${value}`)
    .join('; ');
}

/** Check if a theme enables colored ticks */
export function themeHasColoredTicks(themeName: string, mode: ThemeMode = 'dark'): boolean {
  const theme = themes[themeName];
  if (!theme) return false;
  const value = theme.modes?.[mode]?.['colored-ticks'] ?? theme['colored-ticks'];
  return value === 'true';
}

/**
 * Check if a theme puts the HVAC state color on the center temperature
 * instead of on the disc.
 */
export function themeHasStateText(themeName: string, mode: ThemeMode = 'dark'): boolean {
  const theme = themes[themeName];
  if (!theme) return false;
  const value = theme.modes?.[mode]?.['state-text'] ?? theme['state-text'];
  return value === 'true';
}

/** Check if a theme follows the Home Assistant light/dark mode */
export function themeFollowsMode(themeName: string): boolean {
  return themes[themeName]?.modes !== undefined;
}

/**
 * Check if a name is one of the card's own skins.
 *
 * `theme` is also a Home Assistant option on every card — it overrides the
 * theme for that card. A name that is not one of our skins is therefore an
 * HA theme, not a skin.
 */
export function isSkinName(name: string): boolean {
  return Object.keys(themes).includes(name);
}
