import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function format(date: Date | string, format: string): string {
  return dayjs(date).format(format);
}

export function fromNow(date: Date | string): string {
  return dayjs(date).fromNow();
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

const dateService = {
  format,
  fromNow,
  isDateOneBefore,
  getCurrentDate,
  getExpirationDate,
  formatDefaultDate,
};

export default dateService;
