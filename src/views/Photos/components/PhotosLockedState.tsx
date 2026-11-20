import { LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react';
import { Empty } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import navigationService from 'services/navigation.service';

const PhotosLockedState = (): JSX.Element => {
  const { translate } = useTranslationContext();

  const openPlans = () => navigationService.openPreferencesDialog({ section: 'account', subsection: 'plans' });

  return (
    <div className="flex grow flex-col justify-center">
      <Empty
        icon={<LockSimpleIcon className="text-primary" size={64} weight="fill" />}
        title={translate('views.photos.locked.title')}
        subtitle={translate('views.photos.locked.description')}
        action={{
          text: translate('views.photos.locked.upgrade'),
          icon: SparkleIcon,
          style: 'elevated',
          onClick: openPlans,
        }}
      />
    </div>
  );
};

export default PhotosLockedState;
