import { connect, useSelector } from 'react-redux';

import { useAppDispatch } from '../../../store/hooks';
import { IFormValues, TeamsSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';

import AuthInput from '../../Inputs/AuthInput';
import { SubmitHandler, useForm } from 'react-hook-form';
import AuthButton from '../../Buttons/AuthButton';
import notify from '../../Notifications';
import BaseDialog from '../BaseDialog/BaseDialog';
import { selectShowInviteMemberModal, setShowInviteMemberModal } from '../../../store/slices/ui';
import { sendEmailTeamsMember } from '../../../services/teamsSendEmail.service';
import { setInvitation } from '../../../store/slices/team';

interface InviteMemberCreateDialogProps {
  team: TeamsSettings | undefined
}

const InviteMemberCreateDialog = ({
  team
}: InviteMemberCreateDialogProps
) => {
  const { register, formState: { errors, isValid }, handleSubmit, reset } = useForm<IFormValues>({ mode: 'onChange', defaultValues: { email: '' } });
  const dispatch = useAppDispatch();
  const isOpen = useSelector((state: RootState) => selectShowInviteMemberModal(state));

  const onClose = (): void => {
    reset();
    dispatch(setShowInviteMemberModal(false));
  };

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      if (team && team.isAdmin) {
        await sendEmailTeamsMember(formData.email);
        notify(`Invitation email sent to ${formData.email}`, 'success');
        dispatch(setInvitation(formData.email));
      }
    } catch (error) {
      notify(error.message || error, 'error');
    }

  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title='Invite a member'
      onClose={onClose}
    >
      <form className='flex flex-col mt-6' onSubmit={handleSubmit(onSubmit)}>
        <div className='w-64 self-center'>
          <AuthInput
            placeholder='Manage your team'
            label='email'
            type='email'
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            error={errors.email}
          />
        </div>

        <div className='flex justify-center items-center bg-l-neutral-20 py-6 mt-6'>
          <div className='flex w-64'>
            <button onClick={() => onClose()} className='secondary_dialog w-full mr-4'>
              Cancel
            </button>
            <AuthButton text='Invite' textWhenDisabled={isValid ? 'Inviting...' : 'Invite'} isDisabled={!isValid} />
          </div>
        </div>
      </form>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    team: state.team.team
  }))(InviteMemberCreateDialog);
