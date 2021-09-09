import { connect } from 'react-redux';
import { SubmitHandler, useForm } from 'react-hook-form';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { IFormValues, TeamsSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';
import BaseInput from '../../Inputs/BaseInput';
import AuthButton from '../../Buttons/AuthButton';
import BaseDialog from '../BaseDialog/BaseDialog';
import { uiActions } from '../../../store/slices/ui';
import notificationsService, { ToastType } from '../../../services/notifications.service';
import httpService from '../../../services/http.service';

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
    return httpService.post<{ guest: string }, void>('/api/guest/invite', {
      guest: guestEmail,
    });
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      await sendGuestInvitation(formData.email);
      notificationsService.show('Invitation created for ' + formData.email, ToastType.Success);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title="Invite a Guest" panelClasses="w-156" onClose={onClose}>
      <div className="flex mt-2 items-center justify-center text-center px-12">
        <span>Here you can add members to your personal workspace.</span>
      </div>

      <div className="flex flex-col self-center my-6 items-start w-96">
        <form className="flex w-full m" onSubmit={handleSubmit(onSubmit)}>
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

          <div className="w-16 ml-2.5">
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
