import { SharedFoldersInvitationsAsInvitedUserResponse } from '@internxt/sdk/dist/drive/share/types';
import { CheckCircle, X } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import dayjs from 'dayjs';
import { useState } from 'react';
import { acceptSharedFolderInvite, declineSharedFolderInvite } from '../../../share/services/share.service';
import { TrackingPlan } from '../../../analytics/TrackingPlan';
import { trackSharedInvitationsAccepted } from '../../../analytics/services/analytics.service';

const Header = ({ title, isLoading, onClose }): JSX.Element => {
  return (
    <div className="flex h-full max-h-12 w-full items-center justify-between rounded-t-xl border-b border-gray-10 px-5 py-8">
      <p className="text-xl font-medium">{title}</p>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out hover:bg-black/4 active:bg-black/8">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </div>
    </div>
  );
};

const ShowInvitationsDialog = ({ onClose }): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isOpen = useAppSelector((state: RootState) => state.ui.isInvitationsDialogOpen);
  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);
  const [invitations, setInvitations] = useState<SharedFoldersInvitationsAsInvitedUserResponse[]>(pendingInvitations);
  const [deletedInvitations, setDeletedInvitations] = useState<string[]>([]);

  function formatDate(dateString) {
    const date = dayjs(dateString);
    const now = dayjs();

    if (date.isSame(now, 'day')) {
      return `${translate('modals.sharedInvitationsModal.todayAt')} ${date.format('HH:mm')}`;
    } else {
      return date.format('MMMM DD [at] HH:mm');
    }
  }

  async function onAcceptInvitation(invitationId: string) {
    setIsLoading(true);
    try {
      await acceptSharedFolderInvite({
        invitationId: invitationId,
      });

      setDeletedInvitations((prevDeletedInvitations) => [...prevDeletedInvitations, invitationId]);

      setInvitations(invitations.filter((invitation) => invitation.id !== invitationId));
      const trackSharedInvitationsAcceptedProperties: TrackingPlan.SharedInvitationsAcceptedProperties = {
        invitation_id: invitationId,
      };
      trackSharedInvitationsAccepted(trackSharedInvitationsAcceptedProperties);
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

      setDeletedInvitations((prevDeletedInvitations) => [...prevDeletedInvitations, invitationId]);

      setInvitations(invitations.filter((invitation) => invitation.id !== invitationId));
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div>
        <Modal isOpen={isOpen} onClose={onClose} className="p-0" maxWidth="max-w-xl">
          <div className="flex w-full flex-col">
            <Header isLoading={isLoading} onClose={onClose} title={translate('modals.sharedInvitationsModal.title')} />
            <div className="relative flex flex-col space-y-3 pb-24" style={{ minHeight: '377px', maxHeight: '700px' }}>
              {invitations.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center space-y-1 rounded-2xl bg-gray-5 p-6 text-lg font-medium text-gray-50">
                    <CheckCircle weight="thin" size={64} />
                    <span>{translate('modals.sharedInvitationsModal.empty')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col px-5 pt-2">
                  {invitations.map((invitation) => {
                    const IconComponent = iconService.getItemIcon(
                      invitation.itemType === 'folder',
                      invitation.itemType,
                    );

                    const isDeleted = deletedInvitations.includes(invitation.id);

                    return (
                      <div
                        key={invitation.id}
                        className={`${
                          isDeleted ? 'transition-opacity duration-300 ease-in-out' : ''
                        } flex w-full flex-col space-y-3.5`}
                        style={{ transition: 'opacity 0.3s ease' }}
                      >
                        <div className="flex flex-row justify-between pt-3.5">
                          <div className="flex w-full max-w-[263px] flex-row items-center space-x-2.5">
                            <IconComponent width={40} height={40} />
                            <div className="flex max-w-xxs flex-col truncate">
                              <p className="truncate font-medium text-gray-100">{invitation.item.plainName}</p>
                              <p className="truncate text-sm text-gray-50">
                                {translate('modals.sharedInvitationsModal.sharedWith')}{' '}
                                {formatDate(invitation.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-row items-center space-x-1.5">
                            <Button variant="secondary" onClick={() => onDeclineInvitation(invitation.id)}>
                              {translate('modals.sharedInvitationsModal.deny')}
                            </Button>
                            <Button onClick={() => onAcceptInvitation(invitation.id)}>
                              {translate('modals.sharedInvitationsModal.accept')}
                            </Button>
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
