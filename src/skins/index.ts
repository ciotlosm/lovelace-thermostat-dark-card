/**
 * Skin system — one JSON file per skin in this folder.
 *
 * A skin is how the card draws itself. It is not the same thing as a Home
 * Assistant theme: the HA theme belongs to the dashboard, and the skin is the
 * card's own option (`skin:`). The `auto` skin is the one that follows the
 * HA theme.
 *
 * To add a new skin:
 * 1. Copy auto.json to <your-skin>.json (e.g. ocean.json, sunset.json)
 * 2. Change the CSS variable values
 * 3. Rebuild — the new skin is auto-discovered and available in the config
 *
 * Token names map to CSS variables: "dial-off-fill" → --dial-off-fill
 *
 * A skin file is a flat map of tokens. It may also carry a "modes" object
 * with "light" and "dark" sub-maps; those override the flat tokens for that
 * mode. A skin with "modes" follows the Home Assistant theme, one without
 * keeps the same colors in light and dark.
 */

export type SkinMode = 'light' | 'dark';

export interface SkinTokens {
  [key: string]: string;
}

export interface SkinFile {
  modes?: Partial<Record<SkinMode, SkinTokens>>;
  [key: string]: unknown;
}

// Vite glob import — auto-discovers all JSON skin files at build time
const skinModules = import.meta.glob('./*.json', { eager: true }) as Record<
  string,
  { default: SkinFile }
>;

// Build the skin map: { "auto": {...}, "dark": {...}, ... }
export const skins: Record<string, SkinFile> = {};
for (const [path, module] of Object.entries(skinModules)) {
  const name = path.replace('./', '').replace('.json', '');
  skins[name] = module.default;
}

/** The skin that follows the Home Assistant theme. Always listed first. */
export const AUTO_SKIN = 'auto';

/** Get list of available skin names, with the HA-following skin first. */
export function getAvailableSkins(): string[] {
  return Object.keys(skins).sort((a, b) => {
    if (a === AUTO_SKIN) return -1;
    if (b === AUTO_SKIN) return 1;
    return a.localeCompare(b);
  });
}

/** Check if a name is one of the card's own skins */
export function isSkinName(name: string): boolean {
  return Object.keys(skins).includes(name);
}

/** Resolve the tokens of a skin for a mode, merging in the mode overrides. */
function resolveTokens(skinName: string, mode: SkinMode): SkinTokens {
  const skin = skins[skinName];
  if (!skin) return {};

  const tokens: SkinTokens = {};
  for (const [key, value] of Object.entries(skin)) {
    if (key === 'modes') continue;
    if (typeof value === 'string') tokens[key] = value;
  }

  const modeTokens = skin.modes?.[mode];
  if (modeTokens) Object.assign(tokens, modeTokens);

  return tokens;
}

/** Convert skin tokens to a CSS style string for inline application */
export function skinToStyle(skinName: string, mode: SkinMode = 'dark'): string {
  const tokens = resolveTokens(skinName, mode);
  return Object.entries(tokens)
    .filter(([key]) => key !== 'colored-ticks' && key !== 'state-text')
    .map(([key, value]) => `--${key}: ${value}`)
    .join('; ');
}

/** Check if a skin enables colored ticks */
export function skinHasColoredTicks(skinName: string, mode: SkinMode = 'dark'): boolean {
  const skin = skins[skinName];
  if (!skin) return false;
  const value = skin.modes?.[mode]?.['colored-ticks'] ?? skin['colored-ticks'];
  return value === 'true';
}

/**
 * Check if a skin puts the HVAC state color on the center temperature
 * instead of on the disc.
 */
export function skinHasStateText(skinName: string, mode: SkinMode = 'dark'): boolean {
  const skin = skins[skinName];
  if (!skin) return false;
  const value = skin.modes?.[mode]?.['state-text'] ?? skin['state-text'];
  return value === 'true';
}

/** Check if a skin follows the Home Assistant light/dark mode */
export function skinFollowsMode(skinName: string): boolean {
  return skins[skinName]?.modes !== undefined;
}
