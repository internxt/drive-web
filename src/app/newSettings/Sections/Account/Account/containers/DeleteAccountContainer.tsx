import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import authService from '../../../../../auth/services/auth.service';
import errorService from '../../../../../core/services/error.service';
import Section from '../../../../../newSettings/Sections/General/components/Section';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { Button } from '@internxt/ui';
import Modal from '../../../../../shared/components/Modal';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';

const DeleteAccountContainer = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const onClose = () => {
    setIsDialogOpen(false);
  };

  const onClick = () => {
    if (plan.individualSubscription?.type === 'subscription' || plan.businessSubscription?.type === 'subscription') {
      notificationsService.show({
        text: translate('views.account.tabs.account.deleteAccount.isSubscribed'),
        type: ToastType.Info,
      });
    } else {
      setIsDialogOpen(true);
    }
  };

  const onConfirm = async () => {
    try {
      setIsLoading(true);
      await authService.cancelAccount();
      notificationsService.show({
        text: translate('views.account.tabs.account.deleteAccount.confirmationEmail'),
        type: ToastType.Success,
      });
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text: castedError.message, type: ToastType.Error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section title={translate('views.account.tabs.account.deleteAccount.head')}>
      <div className="max-w-sm">
        <p className="mt-1 text-sm font-normal text-gray-60">
          {translate('views.account.tabs.account.deleteAccount.description')}
        </p>
        <Button className="mt-5" variant="secondary" onClick={onClick}>
          {translate('views.account.tabs.account.deleteAccount.head')}
        </Button>
      </div>

      <Modal isOpen={isDialogOpen} className="max-w-sm space-y-5 p-5" onClose={onClose}>
        <div className="flex flex-col space-y-2">
          <p className="text-2xl font-medium text-gray-100">{translate('modals.deleteAccountModal.title')}</p>
          <p className="text-base font-normal leading-5 text-gray-80">
            {translate('modals.deleteAccountModal.subtitle')}
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {translate('modals.deleteAccountModal.cancel')}
          </Button>
          <Button onClick={onConfirm} loading={isLoading} variant={'destructive'}>
            {translate('modals.deleteAccountModal.confirm')}
          </Button>
        </div>
      </Modal>
    </Section>
  );
};

export default DeleteAccountContainer;
