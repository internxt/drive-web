import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { t } from 'i18next';
import { useSelector } from 'react-redux';
import userService from '../../../../../auth/services/user.service';
import errorService from '../../../../../core/services/error.service';
import navigationService from '../../../../../core/services/navigation.service';
import workspacesService from '../../../../../core/services/workspace.service';
import { AppView } from '../../../../../core/types';
import { encryptMessageWithPublicKey } from '../../../../../crypto/services/pgp.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { RootState } from '../../../../../store';
import UserInviteDialog from '../InviteDialog';

const InviteDialogContainer = ({ isOpen, onClose }) => {
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const user = useSelector((state: RootState) => state.user.user);

  const processWorkspaceInvitation = async (emailList: string[], messageText: string) => {
    if (selectedWorkspace && user) {
      const invitePromises = emailList.map((email) => {
        return processInvitation(user, email, selectedWorkspace.workspace.id, messageText);
      });

      await Promise.all(invitePromises);
    }
  };

  return <UserInviteDialog isOpen={isOpen} onClose={onClose} processInvitation={processWorkspaceInvitation} />;
};

const processInvitation = async (
  user: UserSettings | null,
  email: string,
  workspaceId: string,
  messageText: string,
) => {
  try {
    if (!user) {
      navigationService.push(AppView.Login);
      return;
    }
    const { mnemonic } = user;
    let publicKey;
    try {
      const publicKeyResponse = await userService.getPublicKeyByEmail(email);
      publicKey = publicKeyResponse.publicKey;
    } catch (err) {
      console.log(err);
    }
    const isNewUser = !publicKey;

    if (isNewUser) {
      const preCreatedUserResponse = await userService.preCreateUser(email);
      publicKey = preCreatedUserResponse.publicKey;
    }

    const encryptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: publicKey,
    });

    const encryptedMnemonicInBase64 = btoa(encryptedMnemonic as string);
    await workspacesService.inviteUserToTeam({
      workspaceId: workspaceId,
      invitedUserEmail: email,
      encryptedMnemonicInBase64: encryptedMnemonicInBase64,
      encryptionAlgorithm: 'aes-256-gcm',
      message: messageText,
    });

    notificationsService.show({
      text: t('preferences.workspace.members.invitationFlow.invitationSent'),
      type: ToastType.Success,
    });
  } catch (err) {
    const castedError = errorService.castError(err);
    errorService.reportError(err, { extra: { thunk: 'inviteToWorkspace', email: email } });
    if (castedError.message === 'unauthenticated') {
      return navigationService.push(AppView.Login);
    }
    notificationsService.show({
      text: castedError.message,
      type: ToastType.Error,
    });
  }
};

export default InviteDialogContainer;
