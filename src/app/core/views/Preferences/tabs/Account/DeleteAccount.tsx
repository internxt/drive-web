import { get } from 'app/i18n/services/i18n.service';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import authService from '../../../../../auth/services/auth.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Dialog from '../../../../../shared/components/Dialog/Dialog';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';
import errorService from '../../../../services/error.service';
import Section from '../../components/Section';

export default function DeleteAccount({ className = '' }: { className?: string }): JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  function onClose() {
    setIsDialogOpen(false);
  }

  function onClick() {
    if (plan.subscription?.type === 'subscription') {
      notificationsService.show({
        text: get('views.account.tabs.account.deleteAccount.isSubscribed'),
        type: ToastType.Info,
      });
    } else {
      setIsDialogOpen(true);
    }
  }

  async function onConfirm() {
    try {
      setIsLoading(true);
      await authService.cancelAccount();
      notificationsService.show({
        text: get('views.account.tabs.account.deleteAccount.confirmationEmail'),
        type: ToastType.Success,
      });
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text: castedError.message, type: ToastType.Error });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Section className={className} title={get('views.account.tabs.account.deleteAccount.head')}>
      <Card>
        <p className="text-gray-80">{get('views.account.tabs.account.deleteAccount.description')}</p>
        <Button className="mt-5" variant="secondary" onClick={onClick}>
          {get('views.account.tabs.account.deleteAccount.head')}
        </Button>
      </Card>
      <Dialog
        isOpen={isDialogOpen}
        onClose={onClose}
        onSecondaryAction={onClose}
        onPrimaryAction={onConfirm}
        secondaryAction={get('modals.deleteAccountModal.cancel')}
        primaryAction={get('modals.deleteAccountModal.confirm')}
        title={get('modals.deleteAccountModal.title')}
        subtitle={get('modals.deleteAccountModal.subtitle')}
        primaryActionColor="danger"
        isLoading={isLoading}
      />
    </Section>
  );
}
