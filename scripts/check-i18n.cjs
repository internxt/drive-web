/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/app/i18n/locales');
const baseLocale = 'en';
const baseFile = path.join(localesDir, `${baseLocale}.json`);

function getDotNotationKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getDotNotationKeys(value, fullKey);
    }
    return [fullKey];
  });
}

const base = JSON.parse(fs.readFileSync(baseFile, 'utf-8'));
const baseKeys = getDotNotationKeys(base);

const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== `${baseLocale}.json`);

let hasErrors = false;

for (const file of localeFiles) {
  const locale = file.replace('.json', '');
  const target = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
  const targetKeys = new Set(getDotNotationKeys(target));

  const missing = baseKeys.filter((key) => !targetKeys.has(key));

  if (missing.length > 0) {
    console.error(`\x1b[31m✖ Missing keys in ${locale}.json:\x1b[0m`);
    missing.forEach((key) => console.error(`  - ${key}`));
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\x1b[31m\nAdd the missing keys before committing.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ All i18n keys are in sync.\x1b[0m');
}
