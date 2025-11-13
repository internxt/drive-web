import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { t } from 'i18next';
import { AppView } from '../../../core/types';
import workspacesService from 'app/core/services/workspace.service';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { AppDispatch } from 'app/store';
import { wait } from 'app/utils/timeUtils';

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

  const redirectUri = urlParams.get('redirectUri');

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

  const handleWorkspaceInvitation = async (dispatch: AppDispatch) => {
    if (workspaceInvitationId && token) {
      const isDeclineAction = sharingAction === 'decline';
      try {
        await workspacesService.validateWorkspaceInvitation(workspaceInvitationId);
      } catch (error) {
        showNotification({
          text: t('linkExpired.title'),
          isError: true,
        });

        return;
      }

      try {
        await processWorkspaceInvitation(isDeclineAction, workspaceInvitationId, token);

        navigateTo(AppView.Login);
        const notificationText = isDeclineAction
          ? t('preferences.workspace.members.invitationFlow.declinedSuccessfully')
          : t('preferences.workspace.members.invitationFlow.acceptedSuccessfully');
        showNotification({ text: notificationText, isError: false });
        await wait(2000);
        dispatch(workspaceThunks.fetchWorkspaces());
      } catch (error) {
        console.error('ERROR WHILE ACCEPTING OR DECLINING WORKSPACE INVITATION: ', error);
        const notificationText = isDeclineAction
          ? t('preferences.workspace.members.invitationFlow.error.declinedError')
          : t('preferences.workspace.members.invitationFlow.error.acceptedError');
        showNotification({ text: notificationText, isError: true });
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

    if (mnemonic && options?.isSharingInvitation) {
      return navigateTo(AppView.Shared);
    }

    if (mnemonic && !options?.universalLinkMode) {
      return navigateTo(AppView.Drive);
    }

    // This is a redirect for the universal link mode.
    if (mnemonic && options?.universalLinkMode) {
      const params: Record<string, unknown> = {};
      if (redirectUri) {
        params['redirectUri'] = redirectUri;
        params['universalLink'] = true;
      }
      return navigateTo(AppView.UniversalLinkSuccess, params);
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
