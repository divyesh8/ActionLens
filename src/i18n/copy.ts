import { getLocales } from 'expo-localization';

const english = {
  navHome: 'Home',
  navVault: 'Vault',
  navTimeline: 'Timeline',
  navSettings: 'Settings',
  welcomeTagline: 'Turn anything important into action.',
  welcomeSummary: 'Scan it. Understand it. Get it done—without losing sight of the original document.',
  welcomeImport: 'Import a notice, screenshot, photo, or PDF',
  welcomeUnderstand: 'See deadlines, requirements, and next steps',
  welcomeVerify: 'Verify every important detail before it is saved',
  createAccount: 'Create account',
  existingAccount: 'I already have an account',
} as const;

type CopyKey = keyof typeof english;
type Catalog = Record<CopyKey, string>;

const catalogs: Record<string, Catalog> = { en: english };
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const activeCatalog = catalogs[deviceLanguage] ?? english;

export function t(key: CopyKey): string {
  return activeCatalog[key];
}
