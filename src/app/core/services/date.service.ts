import dayjs from 'dayjs';
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

const dateService = {
  format,
  fromNow,
  isDateOneBefore,
};

export default dateService;
