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
      notificationsService.show({ text: 'Please, cancel your subscription first', type: ToastType.Info });
    } else {
      setIsDialogOpen(true);
    }
  }

  async function onConfirm() {
    try {
      setIsLoading(true);
      await authService.cancelAccount();
      notificationsService.show({ text: 'Confirmation email has been sent', type: ToastType.Success });
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text: castedError.message, type: ToastType.Error });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Section className={className} title="Delete account">
      <Card>
        <p className="text-gray-80">
          If you delete your account, your data will be gone forever. This action cannot be undone.
        </p>
        <Button className="mt-5" variant="secondary" onClick={onClick}>
          Delete account
        </Button>
      </Card>
      <Dialog
        isOpen={isDialogOpen}
        onClose={onClose}
        onSecondaryAction={onClose}
        onPrimaryAction={onConfirm}
        secondaryAction="Cancel"
        primaryAction="Confirm"
        title="Are you sure?"
        subtitle="All your files will be gone forever and you will lose access to your Internxt account."
        primaryActionColor="danger"
        isLoading={isLoading}
      />
    </Section>
  );
}
