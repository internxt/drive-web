import { Button } from '@internxt/ui';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import dateService from 'services/date.service';
import { MonthKey } from '../types';

interface PhotosMonthErrorProps {
  month: MonthKey;
  onRetry: () => void;
}

const PhotosMonthError = ({ month, onRetry }: PhotosMonthErrorProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red/10 py-2 pl-4 pr-2 text-sm">
      <WarningCircleIcon size={20} weight="fill" className="shrink-0 text-red" />
      <span className="grow">
        {translate('views.photos.timeline.monthError', { month: dateService.format(month, 'MMMM YYYY') })}
      </span>
      <Button variant="ghost" className="text-red" onClick={onRetry}>
        {translate('views.photos.error.retry')}
      </Button>
    </div>
  );
};

export default PhotosMonthError;
