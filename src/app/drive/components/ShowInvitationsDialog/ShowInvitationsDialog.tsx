import { CheckCircle, X } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { uiActions } from 'app/store/slices/ui';
import { useState } from 'react';
import {
  acceptSharedFolderInvite,
  declineSharedFolderInvite,
  getReceivedSharedFolders,
} from '../../../share/services/share.service';

const ShowInvitationsDialog = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isOpen = useAppSelector((state: RootState) => state.ui.isInvitationsDialogOpen);
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);

  function onClose() {
    setTimeout(async () => {
      await getReceivedSharedFolders(0, 15);
    }, 1000);
    dispatch(uiActions.setIsInvitationsDialogOpen(false));
  }

  async function onAcceptInvitation(invitationId: string) {
    setIsLoading(true);
    try {
      await acceptSharedFolderInvite({
        invitationId: invitationId,
      });

      setTimeout(() => {
        dispatch(sharedThunks.getPendingInvitations()).catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
      }, 1000);
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onDeclineInvitation(invitationId: string) {
    setIsLoading(true);
    try {
      await declineSharedFolderInvite({
        invitationId: invitationId,
      });

      setTimeout(() => {
        dispatch(sharedThunks.getPendingInvitations()).catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
      }, 1000);
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  const Header = () => {
    return (
      <div className="flex h-full max-h-12 w-full items-center justify-between rounded-t-xl border-b border-gray-10 py-8 px-5">
        <p className="text-xl font-medium">Pending invitations</p>
        <div className="flex h-full flex-col items-center justify-center">
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black bg-opacity-0 transition-all duration-200 ease-in-out hover:bg-opacity-4 active:bg-opacity-8">
            <X onClick={() => (isLoading ? null : onClose())} size={22} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div>
        <Modal isOpen={isOpen} onClose={onClose} className="p-0">
          <div className="flex w-full flex-col">
            <Header />
            <div className="relative flex flex-col space-y-3 pb-24" style={{ minHeight: '377px', maxHeight: '640px' }}>
              {pendingInvitations.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center space-y-1 rounded-2xl bg-gray-5 p-6 text-lg font-medium text-gray-50">
                    <CheckCircle weight="thin" size={64} />
                    <span>{translate('modals.shareModal.requests.empty')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col px-5 pt-2">
                  {pendingInvitations.invites?.map((invitation) => {
                    const IconComponent = iconService.getItemIcon(
                      invitation.itemType === 'folder',
                      invitation.itemType,
                    );
                    return (
                      <div className="flex w-full flex-col space-y-3.5">
                        <div className="flex flex-row justify-between pt-3.5">
                          <div className="flex w-full max-w-[263px] flex-row items-center space-x-2.5">
                            <IconComponent width={40} height={40} />
                            <p className="truncate font-medium text-gray-100">{invitation.item.plainName}</p>
                          </div>
                          <div className="flex flex-row items-center space-x-1.5">
                            <Button variant="secondary" onClick={() => onDeclineInvitation(invitation.id)}>
                              Decline
                            </Button>
                            <Button onClick={() => onAcceptInvitation(invitation.id)}>Accept</Button>
                          </div>
                        </div>
                        <div className="flex w-full border border-gray-5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ShowInvitationsDialog;
