export type Translate = (key: string, props?: Record<string, unknown>) => string;
export type TranslateArray = (key: string, props?: Record<string, unknown>) => string[];

export enum Locale {
  German = 'de',
  English = 'en',
  Spanish = 'es',
  French = 'fr',
  Italian = 'it',
  Russian = 'ru',
  Chinese = 'zh',
  Taiwanese = 'zh-tw',
}
