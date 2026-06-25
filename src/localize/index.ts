/**
 * i18n system — one JSON file per language in ./languages/
 *
 * To add a new language:
 * 1. Copy languages/en.json to languages/<your-locale>.json (e.g. fr.json, de.json)
 * 2. Translate all values (keep keys unchanged)
 * 3. Rebuild — the new language is auto-discovered at compile time
 */

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
if (languages['zh-CN']) {
  languages['zh'] = languages['zh-CN'];
  languages['zh-Hans'] = languages['zh-CN'];
}

/**
 * Get a localized string. Falls back to English if the language is not supported.
 */
export function localize(key: string, language?: string): string {
  const lang = language ?? 'en';
  const translations =
    languages[lang] ?? languages[lang.split('-')[0]] ?? languages['en'];
  return translations?.[key] ?? languages['en']?.[key] ?? key;
}

/** Get list of available languages */
export function getAvailableLanguages(): string[] {
  return Object.keys(languages);
}
