/**
 * Theme/skin system — one JSON file per theme in this folder.
 *
 * To add a new theme:
 * 1. Copy dark.json to <your-theme>.json (e.g. ocean.json, sunset.json)
 * 2. Change the CSS variable values
 * 3. Rebuild — the new theme is auto-discovered and available in the config
 *
 * Token names map to CSS variables: "dial-off-fill" → --dial-off-fill
 */

// Vite glob import — auto-discovers all JSON theme files at build time
const themeModules = import.meta.glob('./*.json', { eager: true }) as Record<
  string,
  { default: Record<string, string> }
>;

// Build the theme map: { "dark": {...}, "light": {...}, ... }
export const themes: Record<string, Record<string, string>> = {};
for (const [path, module] of Object.entries(themeModules)) {
  const name = path.replace('./', '').replace('.json', '');
  themes[name] = module.default;
}

/** Get list of available theme names */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}

/** Convert theme tokens to a CSS style string for inline application */
export function themeToStyle(themeName: string): string {
  const tokens = themes[themeName];
  if (!tokens) return '';
  return Object.entries(tokens)
    .map(([key, value]) => `--${key}: ${value}`)
    .join('; ');
}
