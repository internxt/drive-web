import dateService from 'services/date.service';

export const formatVersionDate = (date: Date): string => dateService.format(date, 'MMM D, h:mm A');
