import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { UserPlus } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, Modal } from '@internxt/ui';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { MouseEvent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import errorService from 'services/error.service';
import shareService, { getSharingRoles } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { isUserItemOwner } from 'views/Shared/utils/sharedViewUtils';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import ShareInviteDialog from '../ShareInviteDialog/ShareInviteDialog';
import './ShareDialog.scss';
import { AccessMode, InvitedUserProps, ViewProps } from './types';
import navigationService from 'services/navigation.service';
import { Service } from '@internxt/sdk/dist/drive/payments/types/tiers';
import { SharePasswordInputDialog } from 'app/share/components/SharePasswordInputDialog/SharePasswordInputDialog';
import { UpgradeDialog } from '../UpgradeDialog/UpgradeDialog';
import { SharePasswordDisableDialog } from 'app/share/components/SharePasswordDisableDialog/SharePasswordDisableDialog';
import StopSharingItemDialog from '../StopSharingItemDialog/StopSharingItemDialog';
import { ProtectWithPassword } from './components/GeneralView/ProtectWithPassword';
import { UserRoleSelection } from './components/GeneralView/UserRoleSelection';
import { InvitedUsersList } from './components/GeneralView/InvitedUsersList';
import { Header } from './components/Header';
import { useShareDialogContext } from './context';
import {
  resetDialogData,
  setAccessMode,
  setCurrentUserFolderRole,
  setInviteDialogRoles,
  setIsLoading,
  setIsPasswordProtected,
  setIsRestrictedPasswordDialogOpen,
  setIsRestrictedSharingDialogOpen,
  setOpenPasswordDisableDialog,
  setOpenPasswordInput,
  setRoles,
  setSelectedUserListIndex,
  setSharingMeta,
  setShowStopSharingConfirmation,
  setUserOptionsEmail,
  setUserOptionsY,
  setView,
} from './context/ShareDialogContext.actions';
import { filterEditorAndReader, isAdvancedShareItem } from './utils';
import { useShareItemActions } from './hooks/useShareItemActions';
import { useShareItemInvitations } from './hooks/useShareItemInvitations';
import { useShareItemUserRoles } from './hooks/useShareItemUserRoles';

export interface ShareDialogProps {
  user: UserSettings;
  isDriveItem?: boolean;
  onShareItem?: () => void;
  onStopSharingItem?: () => void;
  onCloseDialog?: () => void;
}

const OWNER_ROLE = { id: 'NONE', name: 'owner' };

const ShareDialog = (props: ShareDialogProps): JSX.Element => {
  const { onCloseDialog } = props;

  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isShareDialogOpen);
  const isWorkspace = !!useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const itemToShare = useAppSelector((state) => state.storage.itemToShare);
  const userFeatures = useAppSelector((state) => state.user.userTierFeatures);
  const isRestrictedSharingAvailable = userFeatures?.[Service.Drive].restrictedItemsSharing.enabled ?? false;
  const isPasswordSharingAvailable = userFeatures?.[Service.Drive].passwordProtectedSharing.enabled ?? false;

  const { state, dispatch: actionDispatch } = useShareDialogContext();

  const {
    accessMode,
    accessRequests,
    inviteDialogRoles,
    invitedUsers,
    isLoading,
    isPasswordProtected,
    isRestrictedSharingDialogOpen,
    isRestrictedPasswordDialogOpen,
    selectedUserListIndex,
    showStopSharingConfirmation,
    userOptionsEmail,
    userOptionsY,
    view,
    openPasswordDisableDialog,
    openPasswordInput,
    roles,
    currentUserFolderRole,
  } = state;

  const userList = useRef<HTMLDivElement>(null);
  const userOptions = useRef<HTMLButtonElement>(null);

  const isUserOwner = isUserItemOwner({
    isDriveItem: !!props?.isDriveItem,
    item: itemToShare?.item as AdvancedSharedItem,
    userEmail: props?.user?.email,
  });
  const isProtectWithPasswordOptionAvailable = accessMode === 'public' && !isLoading && isUserOwner;
  const closeSelectedUserPopover = () => actionDispatch(setSelectedUserListIndex(null));
  const {
    onCopyLink,
    onDisablePassword,
    onPasswordCheckboxChange,
    onSavePublicSharePassword,
    onStopSharing,
    onRemoveUser,
  } = useShareItemActions({
    itemToShare,
    isPasswordSharingAvailable,
    dispatch,
    onClose: () => dispatch(uiActions.setIsShareDialogOpen(false)),
    onShareItem: props.onShareItem,
    onStopSharingItem: props.onStopSharingItem,
  });

  const { getAndUpdateInvitedUsers, handleDenyRequest, onAcceptRequest, onInviteUser } = useShareItemInvitations({
    isUserOwner,
    itemToShare,
  });

  const { changeAccess, handleUserRoleChange } = useShareItemUserRoles({
    isRestrictedSharingAvailable,
    itemToShare,
  });

  useEffect(() => {
    if (isOpen) {
      getSharingRoles().then((roles) => {
        const parsedRoles = filterEditorAndReader(roles);
        actionDispatch(setRoles([...parsedRoles, OWNER_ROLE]));
        actionDispatch(setInviteDialogRoles(parsedRoles));
      });
    }

    if (!isOpen) {
      actionDispatch(resetDialogData());
      onCloseDialog?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (roles.length === 0) dispatch(sharedThunks.getSharedFolderRoles());

    if (roles.length > 0 && isOpen) loadShareInfo();
  }, [roles, isOpen]);

  useEffect(() => {
    const currentInvitedUser = invitedUsers.find((user) => user.email === props.user.email);
    actionDispatch(setCurrentUserFolderRole(currentInvitedUser?.roleName));
  }, [invitedUsers]);

  const loadShareInfo = async () => {
    if (!itemToShare?.item) return;

    actionDispatch(setIsLoading(true));
    // Change object type of itemToShare to AdvancedSharedItem
    let shareAccessMode: AccessMode = 'public';

    const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
    const itemId = itemToShare?.item.uuid ?? '';

    const isItemNotSharedYet = !isAdvancedShareItem(itemToShare?.item) && !itemToShare.item.sharings?.length;

    const sharingInfo = await shareService.getSharingInfo(itemId, itemType).catch(() => {
      return null;
    });

    const sharingType = sharingInfo?.type ?? 'public';
    const isAlreadyPasswordProtected = sharingInfo?.publicSharing?.isPasswordProtected ?? false;

    if (!isItemNotSharedYet) {
      try {
        const sharingData = await shareService.getSharingType(itemId, itemType);
        actionDispatch(setSharingMeta(sharingData));
      } catch (error) {
        errorService.reportError(error);
      }
    }

    if (sharingType === 'private') {
      shareAccessMode = 'restricted';
    }
    actionDispatch(setAccessMode(shareAccessMode));
    actionDispatch(setIsPasswordProtected(isAlreadyPasswordProtected));

    try {
      await getAndUpdateInvitedUsers();
    } catch (error) {
      errorService.reportError(error);
    } finally {
      actionDispatch(setIsLoading(false));
    }
  };

  const onClose = (): void => {
    dispatch(uiActions.setIsShareDialogOpen(false));
  };

  const onUpgradePlan = () => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
    });
    setIsRestrictedPasswordDialogOpen(false);
    setIsRestrictedSharingDialogOpen(false);
    onClose();
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
  };

  const openUserOptions = (e: any, user: InvitedUserProps, selectedIndex: number | null) => {
    const buttonY: number = ((e as MouseEvent).currentTarget as HTMLElement).getBoundingClientRect().top;
    const buttonHeight: number = ((e as MouseEvent).currentTarget as HTMLElement).offsetHeight;
    const userListY: number = userList.current ? userList.current.getBoundingClientRect().top : 0;
    setUserOptionsY(buttonY + buttonHeight - userListY + 8);

    if (selectedIndex === selectedUserListIndex) closeSelectedUserPopover();
    else setSelectedUserListIndex(selectedIndex);

    setUserOptionsEmail(user);

    if (userOptions.current) {
      userOptions.current.click();
    }
  };

  const View = (viewProps: ViewProps): JSX.Element => {
    const view = {
      general: (
        <>
          <div className="relative flex flex-col">
            <div className="flex items-center space-x-4">
              <span
                className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium"
                title={translate('modals.shareModal.list.peopleWithAccess')}
              >
                {translate('modals.shareModal.list.peopleWithAccess')}
              </span>
              <div className="flex items-center space-x-1.5">
                {currentUserFolderRole !== 'reader' && !isWorkspace ? (
                  <Button variant="secondary" onClick={onInviteUser}>
                    <UserPlus size={24} />
                    <span>{translate('modals.shareModal.list.invite')}</span>
                  </Button>
                ) : (
                  <div className="h-10"></div>
                )}
              </div>
            </div>

            {/* List of users invited to the shared item */}
            <InvitedUsersList
              areInvitedUsersLoading={isLoading}
              currentUserFolderRole={currentUserFolderRole}
              invitedUsers={invitedUsers}
              userList={userList}
              user={props.user}
              openUserOptions={openUserOptions}
              selectedUserListIndex={selectedUserListIndex}
              userOptionsY={userOptionsY}
              onRemoveUser={onRemoveUser}
              userOptionsEmail={userOptionsEmail}
              handleUserRoleChange={handleUserRoleChange}
            />
          </div>

          <div className="h-px w-full bg-gray-5" />

          {isProtectWithPasswordOptionAvailable && (
            <ProtectWithPassword
              isPasswordProtected={isPasswordProtected}
              isPasswordSharingAvailable={isPasswordSharingAvailable}
              onChangePassword={() => actionDispatch(setOpenPasswordInput(true))}
              onPasswordCheckboxChange={onPasswordCheckboxChange}
            />
          )}

          <UserRoleSelection
            isStopSharingAvailable={(currentUserFolderRole === 'owner' || isUserOwner || props.isDriveItem) ?? false}
            accessMode={accessMode}
            isUserOwner={isUserOwner}
            isWorkspace={isWorkspace}
            isRestrictedSharingAvailable={isRestrictedSharingAvailable}
            isLoading={isLoading}
            onCopyLink={onCopyLink}
            changeAccess={changeAccess}
            setShowStopSharingConfirmation={setShowStopSharingConfirmation}
          />

          <SharePasswordInputDialog
            onClose={() => actionDispatch(setOpenPasswordInput(false))}
            isOpen={openPasswordInput}
            onSavePassword={onSavePublicSharePassword}
            isAlreadyProtected={isPasswordProtected}
          />
          <UpgradeDialog
            isDialogOpen={isRestrictedSharingDialogOpen}
            onAccept={onUpgradePlan}
            onCloseDialog={() => setIsRestrictedSharingDialogOpen(false)}
            title={translate('modals.restrictedSharingModal.title')}
            subtitle={translate('modals.restrictedSharingModal.subtitle')}
            primaryAction={translate('actions.upgrade')}
            secondaryAction={translate('actions.cancel')}
          />
          <UpgradeDialog
            isDialogOpen={isRestrictedPasswordDialogOpen}
            onAccept={onUpgradePlan}
            onCloseDialog={() => setIsRestrictedPasswordDialogOpen(false)}
            title={translate('modals.restrictedPasswordModal.title')}
            subtitle={translate('modals.restrictedPasswordModal.subtitle')}
            primaryAction={translate('actions.upgrade')}
            secondaryAction={translate('actions.cancel')}
          />
          <SharePasswordDisableDialog
            isOpen={openPasswordDisableDialog}
            onClose={() => setOpenPasswordDisableDialog(false)}
            onConfirmHandler={onDisablePassword}
          />

          <StopSharingItemDialog
            showStopSharingConfirmation={showStopSharingConfirmation}
            onClose={() => setShowStopSharingConfirmation(false)}
            itemToShareName={itemToShare?.item.name ?? ''}
            isLoading={isLoading}
            onStopSharing={onStopSharing}
          />
        </>
      ),
      invite: (
        <ShareInviteDialog
          onClose={() => {
            setView('general');
          }}
          onInviteUser={onInviteUser}
          itemToShare={itemToShare?.item}
          roles={inviteDialogRoles}
        />
      ),
    };

    return view[viewProps.view];
  };

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <Header itemToShare={itemToShare} onClose={onClose} />
      </div>
      <div className="flex flex-col space-y-4 p-5">
        <View view={view} />
      </div>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user as UserSettings,
}))(ShareDialog);
