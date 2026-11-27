/**
 * i18n system — one JSON file per language in ./languages/
 *
 * To add a new language:
 * 1. Copy languages/en.json to languages/<your-locale>.json (e.g. fr.json, de.json)
 * 2. Translate all values (keep keys unchanged)
 * 3. Rebuild — the new language is auto-discovered at compile time
 */

/**
 * The language the card's own strings are rendered in.
 *
 * The card picker entry is built while this module loads, before Home
 * Assistant has handed the card a `hass` object, so the browser language is
 * the best guess at that point. As soon as the card receives a `hass` object,
 * the language Home Assistant reports wins: that is the language of the
 * dashboard, which does not have to be the browser's.
 */
function detectLanguage(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

let currentLanguage = detectLanguage();

/**
 * Set the language Home Assistant reports for the dashboard.
 *
 * Ignores an empty value, so a frontend that does not report a language keeps
 * the browser's one.
 */
export function setLanguage(language: string | undefined): void {
  if (language) currentLanguage = language;
}

// Vite glob import — auto-discovers all JSON files in languages/ at build time
const languageModules = import.meta.glob('./languages/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, string> }
>;

// Build the language map: { "en": {...}, "zh-CN": {...}, ... }
const languages: Record<string, Record<string, string>> = {};
for (const [path, module] of Object.entries(languageModules)) {
  // Extract locale from path: "./languages/zh-CN.json" → "zh-CN"
  const locale = path.replace('./languages/', '').replace('.json', '');
  languages[locale] = module.default;
}

// Alias common variants
if (languages['zh-Hans']) {
  languages['zh'] = languages['zh-Hans'];
  languages['zh-CN'] = languages['zh-Hans'];
}

/**
 * Get a localized string. Falls back to English if the language is not supported.
 */
export function localize(key: string, language?: string): string {
  const lang = language ?? currentLanguage;
  const translations = languages[lang] ?? languages[lang.split('-')[0]] ?? languages['en'];
  return translations?.[key] ?? languages['en']?.[key] ?? key;
}
