import i18next from 'i18next';
import { getCookie } from 'app/analytics/utils';

export const handleWebsiteLanguage = () => {
  const websiteLanguage = getCookie('LOCALE');

  if (websiteLanguage && websiteLanguage === 'zh') {
    i18next.changeLanguage('cn');
  } else if (websiteLanguage && websiteLanguage != 'zh') {
    i18next.changeLanguage(websiteLanguage);
  }
};
