#!/usr/bin/env node
/**
 * Check that all translation files have the same keys as en.json (the source of truth).
 * Outputs warnings for missing keys — does not fail the build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const langDir = join(import.meta.dirname, '../src/localize/languages');
const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

const enFile = join(langDir, 'en.json');
const enKeys = Object.keys(JSON.parse(readFileSync(enFile, 'utf-8')));

let hasWarnings = false;
const warnings = [];

for (const file of files) {
  if (file === 'en.json') continue;

  const filePath = join(langDir, file);
  const lang = basename(file, '.json');
  const translations = JSON.parse(readFileSync(filePath, 'utf-8'));
  const langKeys = Object.keys(translations);

  const missing = enKeys.filter((k) => !langKeys.includes(k));
  const extra = langKeys.filter((k) => !enKeys.includes(k));

  if (missing.length > 0) {
    hasWarnings = true;
    warnings.push(`⚠️ ${lang}: missing ${missing.length} key(s): ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    warnings.push(
      `ℹ️ ${lang}: has ${extra.length} extra key(s) not in en.json: ${extra.join(', ')}`,
    );
  }
}

if (warnings.length > 0) {
  console.log('::group::Translation check');
  for (const w of warnings) {
    if (w.startsWith('⚠️')) {
      console.log(`::warning::${w}`);
    } else {
      console.log(w);
    }
  }
  console.log('::endgroup::');
} else {
  console.log('✅ All translations are in sync with en.json');
}

// Output for GitHub Actions PR comment
if (process.env.GITHUB_OUTPUT && hasWarnings) {
  const summary = warnings.filter((w) => w.startsWith('⚠️')).join('\\n');
  readFileSync; // just to avoid unused warning
  const output = `i18n_warnings=${summary}`;
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
}
