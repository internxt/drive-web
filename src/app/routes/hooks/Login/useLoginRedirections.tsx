import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { t } from 'i18next';
import { AppView } from '../../../core/types';
import workspacesService from 'app/core/services/workspace.service';

const useLoginRedirections = ({
  navigateTo,
  processInvitation,
  processWorkspaceInvitation,
  showNotification,
}: {
  navigateTo: (viewId: AppView, queryMap?: Record<string, unknown>) => void;
  processInvitation: (isDeclineAction: boolean, sharingId: string, sharingToken: string) => Promise<void>;
  processWorkspaceInvitation: (isDeclineAction: boolean, invitationId: string, token: string) => Promise<void>;
  showNotification: ({ text, isError }: { text: string; isError: boolean }) => void;
}) => {
  const urlParams = new URLSearchParams(window.location.search);

  const sharingId = urlParams.get('sharingId');
  const folderuuidToRedirect = urlParams.get('folderuuid');
  const workspaceInvitationId = urlParams.get('invitationId');

  const token = urlParams.get('token');
  const sharingAction = urlParams.get('action');
  const isSharingInvitation = !!sharingId;
  const isUniversalLinkMode = urlParams.get('universalLink') === 'true';

  const handleShareInvitation = () => {
    if (isSharingInvitation && sharingId && token) {
      const isDeclineAction = sharingAction === 'decline';

      processInvitation(isDeclineAction, sharingId, token)
        .then(() => {
          navigateTo(AppView.Login);
          const notificationText = isDeclineAction
            ? t('modals.shareModal.invite.declinedSuccessfully')
            : t('modals.shareModal.invite.acceptedSuccessfully');
          showNotification({ text: notificationText, isError: false });
        })
        .catch(() => {
          const notificationText = isDeclineAction
            ? t('modals.shareModal.invite.error.declinedError')
            : t('modals.shareModal.invite.error.acceptedError');
          showNotification({ text: notificationText, isError: true });
        });
    }
  };

  const handleWorkspaceInvitation = async () => {
    if (workspaceInvitationId && token) {
      const isDeclineAction = sharingAction === 'decline';
      try {
        await workspacesService.validateWorkspaceInvitation(workspaceInvitationId);
        processWorkspaceInvitation(isDeclineAction, workspaceInvitationId, token)
          .then(() => {
            navigateTo(AppView.Login);
            const notificationText = isDeclineAction
              ? t('preferences.workspace.members.invitationFlow.declinedSuccessfully')
              : t('preferences.workspace.members.invitationFlow.acceptedSuccessfully');
            showNotification({ text: notificationText, isError: false });
          })
          .catch(() => {
            const notificationText = isDeclineAction
              ? t('preferences.workspace.members.invitationFlow.error.declinedError')
              : t('preferences.workspace.members.invitationFlow.error.acceptedError');
            showNotification({ text: notificationText, isError: true });
          });
      } catch (error) {
        showNotification({
          text: t('linkExpired.title'),
          isError: true,
        });
      }
    }
  };

  const redirectWithCredentials = (
    user: UserSettings,
    mnemonic: string,
    options?: { universalLinkMode: boolean; isSharingInvitation: boolean },
  ) => {
    if (folderuuidToRedirect) {
      return navigateTo(AppView.Shared, { folderuuid: folderuuidToRedirect });
    }

    if (user.registerCompleted === false) {
      return navigateTo(AppView.Login);
    }

    if (user?.registerCompleted && mnemonic && options?.isSharingInvitation) {
      return navigateTo(AppView.Shared);
    }

    if (user?.registerCompleted && mnemonic && !options?.universalLinkMode) {
      return navigateTo(AppView.Drive);
    }

    // This is a redirect for universal link for Desktop MacOS
    if (user?.registerCompleted && mnemonic && options?.universalLinkMode) {
      return navigateTo(AppView.UniversalLinkSuccess);
    }
  };

  return {
    redirectWithCredentials,
    handleShareInvitation,
    isUniversalLinkMode,
    isSharingInvitation,
    handleWorkspaceInvitation,
  };
};

export default useLoginRedirections;
