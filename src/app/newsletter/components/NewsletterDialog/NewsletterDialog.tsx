import { useState } from 'react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch } from 'app/store/hooks';
import i18n from 'app/i18n/services/i18n.service';
import newsletterService from 'app/newsletter/services/newsletterService';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

const NewsletterDialog = (props: { isOpen: boolean }): JSX.Element => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsNewsletterDialogOpen(false));
  };
  const onSubscribeButtonClicked = async (): Promise<void> => {
    try {
      setIsLoading(true);

      await newsletterService.subscribe(email);

      setEmail('');
      setIsLoading(false);
      onClose();
      notificationsService.show(i18n.get('success.subscribeToNewsletter', { email }), ToastType.Info);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      notificationsService.show(
        i18n.get('error.subscribeToNewsletter', { message: castedError.message }),
        ToastType.Error,
      );
    }
  };

  return (
    <BaseDialog
      isOpen={props.isOpen}
      title={i18n.get('newsletter.dialog.title')}
      panelClasses="px-6 py-8 w-156"
      onClose={onClose}
    >
      <span className="newsletter text-center block w-full text-sm px-8 text-m-neutral-100 mt-2">
        {i18n.get('newsletter.dialog.message')}
      </span>

      <div className="mt-6 flex">
        <input
          className="flex-grow no-ring mr-2 border border-l-neutral-30 semi-dense"
          placeholder={i18n.get('form.fields.email.placeholder')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BaseButton
          disabled={isLoading || !email || !isValidEmail(email)}
          className="primary"
          onClick={onSubscribeButtonClicked}
        >
          {i18n.get('actions.subscribe')}
        </BaseButton>
      </div>
    </BaseDialog>
  );
};

export default NewsletterDialog;
