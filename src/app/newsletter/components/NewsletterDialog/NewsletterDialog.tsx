import { useState } from 'react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { uiActions } from 'app/store/slices/ui';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { newsletterThunks } from 'app/store/slices/newsletter';
import { get } from 'app/i18n/services/i18n.service';

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
      title={get('newsletter.dialog.title')}
      panelClasses="px-6 py-8 w-156"
      onClose={onClose}
    >
      <span className="newsletter mt-2 block w-full px-8 text-center text-sm text-neutral-100">
        {get('newsletter.dialog.message')}
      </span>

      <div className="mt-6 flex">
        <input
          className="no-ring semi-dense mr-2 flex-grow border border-neutral-30"
          placeholder={get('form.fields.email.placeholder') as string}
          type="email"
          value={email}
          disabled={true}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BaseButton
          //! TODO: isValidEmail should allow user to enter an email with lowercase and uppercase letters
          disabled={isSubscribing || !email || !isValidEmail(email)}
          className="primary"
          onClick={onSubscribeButtonClicked}
        >
          {get('actions.subscribe') as string}
        </BaseButton>
      </div>
    </BaseDialog>
  );
};

export default NewsletterDialog;
