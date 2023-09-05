import { X } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useEffect, useState } from 'react';
import {
  acceptSharedFolderInvite,
  getSharedFolderInvitationsAsInvitedUser,
} from '../../../share/services/share.service';

const ShowInvitationsDialog = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const [invitations, setInvitations] = useState<any[]>([]);
  const isOpen = useAppSelector((state: RootState) => state.ui.isInvitationsDialogOpen);

  function onClose() {
    dispatch(uiActions.setIsInvitationsDialogOpen(false));
  }

  async function onAcceptInvitation(invitationId: string) {
    try {
      await acceptSharedFolderInvite({
        invitationId: invitationId,
      });
      onClose();
    } catch (err) {
      const error = errorService.castError(err);
      console.error('ERROR ACCEPTING INVITATION: ', error);
    }
  }

  useEffect(() => {
    getSharedFolderInvitationsAsInvitedUser({})
      .then(({ invites }: any) => {
        setInvitations(invites);
        console.log('res', invites);
      })
      .catch((err) => {
        console.log('error', err);
      });
  }, []);
  return (
    <div>
      <div>
        <Modal isOpen={isOpen} onClose={onClose}>
          <div className="flex w-full flex-col">
            <div className="flex h-10 w-full justify-center border-b border-gray-10">
              <p className="text-2xl font-semibold">Invitations</p>
              <div className="absolute right-3 flex h-9 w-9 cursor-pointer justify-center rounded-md bg-black bg-opacity-0 transition-all duration-200 ease-in-out hover:bg-opacity-4 active:bg-opacity-8">
                <X onClick={() => onClose()} size={22} />
              </div>
            </div>
            <div className="mt-1.5 flex flex-col overflow-y-auto" style={{ minHeight: '224px', maxHeight: '336px' }}>
              {invitations?.length === 0 ? (
                <p>
                  You have no invitations. <br /> You can send an invitation to a user by clicking on the "Share" button
                  in the top right corner of the screen.
                </p>
              ) : (
                invitations.map((item, index) => (
                  <div className="group flex h-14 flex-shrink-0 items-center justify-between space-x-2.5 border-b border-gray-20">
                    <p>{item.item.plainName}</p>
                    <Button onClick={() => onAcceptInvitation(item.id)}>Accept</Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ShowInvitationsDialog;
