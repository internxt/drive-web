import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { AppView } from '../../../core/types';
import { t } from 'i18next';
import { useHistory } from 'react-router-dom';

const useLoginRedirections = ({
  navigateTo,
  processInvitation,
  showNotification,
}: {
  navigateTo: (viewId: AppView, queryMap?: Record<string, unknown>) => void;
  processInvitation: (isDeclineAction: boolean, sharingId: string, sharingToken: string) => Promise<void>;
  showNotification: ({ text, isError }: { text: string; isError: boolean }) => void;
}) => {
  const urlParams = new URLSearchParams(window.location.search);
  const history = useHistory();
  const sharingId = urlParams.get('sharingId');
  const folderuuidToRedirect = urlParams.get('folderuuid');

  const sharingToken = urlParams.get('token');
  const sharingAction = urlParams.get('action');
  const isSharingInvitation = !!sharingId;
  const isUniversalLinkMode = urlParams.get('universalLink') === 'true';

  const handleShareInvitation = () => {
    if (isSharingInvitation && sharingId && sharingToken) {
      const isDeclineAction = sharingAction === 'decline';

      processInvitation(isDeclineAction, sharingId, sharingToken)
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

  const redirectWithCredentials = (
    user: UserSettings,
    mnemonic: string,
    options?: { universalLinkMode: boolean; isSharingInvitation: boolean },
  ) => {
    if (folderuuidToRedirect) {
      return navigateTo(AppView.Shared, { folderuuid: folderuuidToRedirect });
    }

    if (user.registerCompleted === false) {
      return history.push('/appsumo/' + user.email);
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

  return { redirectWithCredentials, handleShareInvitation, isUniversalLinkMode, isSharingInvitation };
};

export default useLoginRedirections;
