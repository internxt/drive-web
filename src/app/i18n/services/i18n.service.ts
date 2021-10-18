import _ from 'lodash';
import format from 'string-template';
import { Locale } from '../types';

import locales from '../locales';

class I18nService {
  currentLocale: string = Locale.English;

  get(key: string, values = {}): string {
    const messageTemplate = _.get(locales[this.currentLocale], key) || key;
    const result = format(messageTemplate, values);

    return result;
  }
}

const i18n = new I18nService();

export default i18n;
