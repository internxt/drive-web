import moment from 'moment';

export function format(date: Date | string, format: string): string {
  return moment(date).format(format);
}

export function fromNow(date: Date | string): string {
  return moment(date).fromNow();
}

const dateService = {
  format,
  fromNow
};

export default dateService;