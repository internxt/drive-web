import { useEffect, useRef } from 'react';
import { LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react';
import { Empty } from '@internxt/ui';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppSelector } from 'app/store/hooks';
import navigationService from 'services/navigation.service';

const getPlanKey = (subscription: UserSubscription | null): string | null => {
  if (!subscription) return null;
  if (subscription.type === 'subscription') return `subscription:${subscription.priceId}`;
  if (subscription.type === 'lifetime') return `lifetime:${subscription.productId ?? ''}`;
  return subscription.type;
};

interface PhotosLockedStateProps {
  onPlanChanged: () => void;
}

const PhotosLockedState = ({ onPlanChanged }: PhotosLockedStateProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const plan = useAppSelector((state) => getPlanKey(state.plan.individualSubscription));
  const planWhenLocked = useRef(plan);

  useEffect(() => {
    if (planWhenLocked.current === null) {
      planWhenLocked.current = plan;
      return;
    }
    if (plan !== planWhenLocked.current) onPlanChanged();
  }, [plan]);

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
