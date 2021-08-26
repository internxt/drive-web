import { connect } from 'react-redux';
import { useEffect, useState } from 'react';
import { UilTrashAlt, UilUserPlus } from '@iconscout/react-unicons';
import { SubmitHandler, useForm } from 'react-hook-form';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { IFormValues, InfoInvitationsMembers, TeamsSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';
import BaseInput from '../../Inputs/BaseInput';
import AuthButton from '../../Buttons/AuthButton';
import BaseDialog from '../BaseDialog/BaseDialog';
import { getMembers, removeMember, sendEmailTeamsMember } from '../../../services/teams.service';
import { uiActions } from '../../../store/slices/ui';
import i18n from '../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../services/notifications.service';

interface InviteMemberCreateDialogProps {
  team: TeamsSettings | undefined | null
}

const InviteMemberCreateDialog = ({
  team
}: InviteMemberCreateDialogProps
) => {
  const { register, formState: { errors, isValid }, handleSubmit, reset } = useForm<IFormValues>({ mode: 'onChange' });
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

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      if (team && team.isAdmin) {
        await sendEmailTeamsMember(formData.email);
        notificationsService.show(
          i18n.get('success.teamInvitationSent', { email: formData.email }),
          ToastType.Success
        );
        const userExists = members.some(userObj => userObj.user === formData.email);

        if (!userExists) {
          members.push({
            isMember: false,
            isInvitation: true,
            user: formData.email
          });
        }

      }
    } catch (error) {
      notificationsService.show(error.message || error, ToastType.Error);
    }

  };

  const deleteMembers = async (memberToDelete: InfoInvitationsMembers) => {
    const resource = memberToDelete.isMember ? 'member' : 'invitation';

    try {
      await removeMember(memberToDelete);
      const filterRemovedMember = members.filter(member => member.user !== memberToDelete.user);

      setMembers(filterRemovedMember);
      notificationsService.show(i18n.get('success.deletedTeamMember', { resource }), ToastType.Success);
    } catch (error) {
      notificationsService.show(i18n.get('error.deleteTeamMember'), ToastType.Error);
    }
  };

  return (
    <BaseDialog
      isOpen={isOpen}
      title='Manage your team'
      panelClasses="w-156"
      onClose={onClose}
    >
      <div className='flex mt-2 items-center justify-center text-center px-12'>
        <span>
        Welcome to your Business Drive Account. Here you can add and remove team members and invitations
        </span>
      </div>

      <div className='flex flex-col self-center mt-6 items-start w-96'>
        <form className='flex w-full m' onSubmit={handleSubmit(onSubmit)}>
          <div className='flex-1'>
            <BaseInput
              placeholder='Type email: jhondoe@internxt.com'
              label='email'
              type='email'
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              error={errors.email}
            />
          </div>

          <div className='w-16 ml-2.5'>
            <AuthButton text='Invite' textWhenDisabled={isValid ? 'Inviting...' : 'Invite'} isDisabled={!isValid} />
          </div>
        </form>

        { members.length > 0 &&
          <div className='flex flex-col mt-6 w-full overflow-y-auto h-16 mb-8'>
            {
              Object.values(members).map((member) => {
                console.log(member);
                return (
                  <div className='flex justify-between mb-2.5' key={member.user}>
                    {
                      member.isInvitation ?
                        <UilUserPlus className="text-gray-50 h-5 mr-1"/>
                        :
                        <UilUserPlus className="text-green-40 h-5 mr-1" />
                    }
                    <div className='flex flex-1 justify-start px-5'>
                      <span className='truncate overflow-ellipsis w-72'>{member.user}</span>
                    </div>
                    <UilTrashAlt className="cursor-pointer text-blue-60 h-5 transition duration-300 hover:text-blue-80"
                      onClick={() => deleteMembers(member)}
                    />
                  </div>
                );
              })
            }
          </div>
        }
      </div>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    team: state.team.team
  }))(InviteMemberCreateDialog);
