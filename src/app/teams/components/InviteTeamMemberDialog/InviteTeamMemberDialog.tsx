import { connect } from 'react-redux';
import { useEffect, useState } from 'react';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
import UilUserPlus from '@iconscout/react-unicons/icons/uil-user-plus';
import { SubmitHandler, useForm } from 'react-hook-form';

import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { InfoInvitationsMembers, TeamsSettings } from '../../types';
import { RootState } from 'app/store';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import AuthButton from 'app/shared/components/AuthButton';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { getMembers, removeMember, sendEmailTeamsMember } from '../../services/teams.service';
import { uiActions } from 'app/store/slices/ui';
import { get } from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';
import { IFormValues } from 'app/core/types';

interface InviteTeamMemberDialogProps {
  team: TeamsSettings | undefined | null;
}

const InviteTeamMemberDialog = ({ team }: InviteTeamMemberDialogProps) => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isInviteMemberDialogOpen);
  const [members, setMembers] = useState<InfoInvitationsMembers[]>([]);

  useEffect(() => {
    getMembers().then((member) => {
      setMembers(member);
    });
  }, []);

  const onClose = (): void => {
    reset();
    dispatch(uiActions.setIsInviteMemberDialogOpen(false));
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      if (team && team.isAdmin) {
        await sendEmailTeamsMember(formData.email);
        notificationsService.show({
          text: get('success.teamInvitationSent', { email: formData.email }),
          type: ToastType.Success,
        });
        const userExists = members.some((userObj) => userObj.user === formData.email);

        if (!userExists) {
          members.push({
            isMember: false,
            isInvitation: true,
            user: formData.email,
          });
        }
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      notificationsService.show({ text: castedError.message, type: ToastType.Error });
    }
  };

  const deleteMembers = async (memberToDelete: InfoInvitationsMembers) => {
    const resource = memberToDelete.isMember ? 'member' : 'invitation';

    try {
      await removeMember(memberToDelete);
      const filterRemovedMember = members.filter((member) => member.user !== memberToDelete.user);

      setMembers(filterRemovedMember);
      notificationsService.show({ text: get('success.deletedTeamMember', { resource }), type: ToastType.Success });
    } catch (err: unknown) {
      notificationsService.show({ text: get('error.deleteTeamMember'), type: ToastType.Error });
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title="Manage your team" panelClasses="w-156" onClose={onClose}>
      <div className="mt-2 flex items-center justify-center px-12 text-center">
        <span>Welcome to your Business Drive Account. Here you can add and remove team members and invitations</span>
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

        {members.length > 0 && (
          <div className="mt-6 mb-8 flex h-16 w-full flex-col overflow-y-auto">
            {Object.values(members).map((member) => {
              console.log(member);
              return (
                <div className="mb-2.5 flex justify-between" key={member.user}>
                  {member.isInvitation ? (
                    <UilUserPlus className="mr-1 h-5 text-gray-50" />
                  ) : (
                    <UilUserPlus className="mr-1 h-5 text-green" />
                  )}
                  <div className="flex flex-1 justify-start px-5">
                    <span className="w-72 truncate overflow-ellipsis">{member.user}</span>
                  </div>
                  <UilTrashAlt
                    className="h-5 cursor-pointer text-blue-60 transition duration-300 hover:text-blue-80"
                    onClick={() => deleteMembers(member)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BaseDialog>
  );
};

export default connect((state: RootState) => ({
  team: state.team.team,
}))(InviteTeamMemberDialog);
