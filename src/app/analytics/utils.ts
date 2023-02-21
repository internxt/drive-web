import { v4 as uuidv4 } from 'uuid';
import httpService from '../../../src/app/core/services/http.service';

export function setCookie(cookieName: string, cookieValue: string, expDays = 30): void {
  const date = new Date();
  date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  window.document.cookie = `${cookieName}=${cookieValue}; ${expires}; domain=internxt.com'`;
}

export function getCookie(cookieName: string): string {
  const cookie = {};
  document.cookie.split(';').forEach((el) => {
    const [key, value] = el.split('=');
    cookie[key.trim()] = value;
  });
  return cookie[cookieName];
}

export function sendAnalyticsError(message: string) {
  httpService.post(
    `${process.env.REACT_APP_CDP_DATA_PLANE}/v1/track`,
    {
      anonymousId: uuidv4(),
      event: 'Analytics Error',
      properties: { client: 'drive-web', error_message: message },
      timestamp: Date.now().toString(),
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: process.env.REACT_APP_ANALYTICS_ERROR_REPORTING_WRITE_KEY || '',
        password: '',
      },
    },
  );
}
