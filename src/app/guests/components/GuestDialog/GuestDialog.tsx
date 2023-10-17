import { connect } from 'react-redux';
import { SubmitHandler, useForm } from 'react-hook-form';

import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { IFormValues } from 'app/core/types';
import { RootState } from 'app/store';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import AuthButton from 'app/shared/components/AuthButton';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { uiActions } from 'app/store/slices/ui';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import httpService from 'app/core/services/http.service';
import { AxiosError } from 'axios';
import localStorageService from '../../../core/services/local-storage.service';

const GuestInviteDialog = () => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isGuestInviteDialogOpen);

  const onClose = (): void => {
    reset();
    dispatch(uiActions.setIsGuestInvitationDialogOpen(false));
  };

  const sendGuestInvitation = (guestEmail: string) => {
    const mnemonic = localStorageService.get('xMnemonic') || '';
    const headers = {
      'internxt-mnemonic': mnemonic,
    };

    return httpService
      .post<{ guest: string }, void>(
        '/api/guest/invite',
        {
          guest: guestEmail,
        },
        { headers },
      )
      .catch((err: AxiosError) => {
        if (err.isAxiosError) {
          throw Error(err.response?.data.error);
        }
        throw err;
      });
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    try {
      await sendGuestInvitation(formData.email);
      notificationsService.show({ text: 'Invitation created for ' + formData.email, type: ToastType.Success });
      onClose();
    } catch (e) {
      const err = e as Error;
      notificationsService.show({ text: err.message, type: ToastType.Error });
      console.error(err);
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title="Invite a Guest" panelClasses="w-156" onClose={onClose}>
      <div className="mt-2 flex items-center justify-center px-12 text-center">
        <span>Here you can add members to your personal workspace.</span>
      </div>

      <div className="my-6 flex w-96 flex-col items-start self-center">
        <form className="m flex w-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex-1">
            <BaseInput
              placeholder="Type email: jhondoe@internxt.com"
              label="email"
              type="email"
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              error={errors.email}
            />
          </div>

          <div className="ml-2.5 w-16">
            <AuthButton text="Invite" textWhenDisabled={isValid ? 'Inviting...' : 'Invite'} isDisabled={!isValid} />
          </div>
        </form>
      </div>
    </BaseDialog>
  );
};

export default connect((state: RootState) => ({
  team: state.team.team,
}))(GuestInviteDialog);
