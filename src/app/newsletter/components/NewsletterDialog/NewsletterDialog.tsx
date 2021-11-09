import { useState } from 'react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import i18n from 'app/i18n/services/i18n.service';
import { newsletterThunks } from 'app/store/slices/newsletter';

const NewsletterDialog = (props: { isOpen: boolean }): JSX.Element => {
  const user = useAppSelector((state) => state.user.user);
  const [email, setEmail] = useState(user?.email || '');
  const isSubscribing = useAppSelector((state) => state.newsletter.isSubscribing);
  const dispatch = useAppDispatch();

  const onClose = (): void => {
    dispatch(uiActions.setIsNewsletterDialogOpen(false));
  };
  const onSubscribeButtonClicked = async (): Promise<void> => {
    await dispatch(newsletterThunks.subscribeToNewsletterThunk({ email }));
    onClose();
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
          disabled={true}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BaseButton
          disabled={isSubscribing || !email || !isValidEmail(email)}
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
