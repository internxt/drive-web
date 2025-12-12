import dateService from 'services/date.service';

export const formatVersionDate = (date: string): string => dateService.format(date, 'MMM D, h:mm A');
