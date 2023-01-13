import moment from 'moment';

export function format(date: Date | string, format: string): string {
  return moment(date).format(format);
}

export function fromNow(date: Date | string): string {
  return moment(date).fromNow();
}

function isDateOneBefore({ dateOne, dateTwo }: { dateOne: Date | string; dateTwo: Date | string }): boolean {
  return moment(dateOne).isBefore(moment(dateTwo));
}

const dateService = {
  format,
  fromNow,
  isDateOneBefore,
};

export default dateService;
