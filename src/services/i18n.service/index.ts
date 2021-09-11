import _ from 'lodash';
import format from 'string-template';
import { Locale } from './enums';

import locales from './locales';

class I18nService {
  defaultLocale: string = Locale.English;

  get(key: string, values = {}): string {

    let lang = this.defaultLocale;

    switch(navigator.language){
      case 'de':
      case 'de-AT':
      case 'de-CH':
      case 'de-DE':
      case 'de-LI':
      case 'de-LU':
        lang = Locale.German;
      break;
    }

    const messageTemplate = _.get(locales[lang], key) || key;
    const result = format(messageTemplate, values);

    return result;
  }
}

const i18n = new I18nService();

export default i18n;
