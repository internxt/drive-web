import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function format(date: Date | string, format: string): string {
  return dayjs(date).format(format);
}

function isDateOneBefore({ dateOne, dateTwo }: { dateOne: Date | string; dateTwo: Date | string }): boolean {
  return dayjs(dateOne).isBefore(dayjs(dateTwo));
}

function getCurrentDate(format?: string): string {
  return dayjs().format(format);
}

function getExpirationDate(expiresValue: number): Dayjs {
  return dayjs.unix(expiresValue);
}

export const formatDefaultDate = (date: Date | string | number, translate: (key: string) => string): string => {
  const translatedAt = translate('general.at');
  return dayjs(date).format(`D MMM, YYYY [${translatedAt}] HH:mm`);
};

function getDaysUntilExpiration(expiresAt: Date | string): number {
  const expirationDate = dayjs(expiresAt);
  const now = dayjs();
  const diffInDays = expirationDate.diff(now, 'day', true);
  return Math.max(0, Math.ceil(diffInDays));
}

const dateService = {
  format,
  isDateOneBefore,
  getCurrentDate,
  getExpirationDate,
  formatDefaultDate,
  getDaysUntilExpiration,
};

export default dateService;
