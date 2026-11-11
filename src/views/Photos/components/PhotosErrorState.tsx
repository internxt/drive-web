import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Empty } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface PhotosErrorStateProps {
  onRetry: () => void;
}

const PhotosErrorState = ({ onRetry }: PhotosErrorStateProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex grow flex-col justify-center">
      <Empty
        icon={<WarningCircleIcon className="text-red" size={64} weight="fill" />}
        title={translate('views.photos.error.title')}
        subtitle={translate('views.photos.error.description')}
        action={{
          text: translate('views.photos.error.retry'),
          icon: ArrowClockwiseIcon,
          style: 'elevated',
          onClick: onRetry,
        }}
      />
    </div>
  );
};

export default PhotosErrorState;
