import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import dateService from 'services/date.service';
import { DayKey } from '../types';
import { SIDE_PADDING } from '../utils/photoTimeline';

const getDayLabel = (day: DayKey, translate: Translate): string => {
  if (dateService.isToday(day)) return translate('views.photos.timeline.today');
  if (dateService.isYesterday(day)) return translate('views.photos.timeline.yesterday');
  return dateService.format(day, 'ddd, D MMM YYYY');
};

const PhotosDayHeader = ({ day }: { day: DayKey }): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <h2 className="bg-surface pb-2 text-sm font-medium text-gray-80" style={{ paddingInline: SIDE_PADDING }}>
      {getDayLabel(day, translate)}
    </h2>
  );
};

export default PhotosDayHeader;
