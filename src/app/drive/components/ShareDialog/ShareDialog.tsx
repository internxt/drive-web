import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { UserPlus } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, Modal } from '@internxt/ui';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { Role } from 'app/store/slices/sharedLinks/types';
import { uiActions } from 'app/store/slices/ui';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService, { copyTextToClipboard, getSharingRoles } from 'app/share/services/share.service';
import { AdvancedSharedItem } from 'app/share/types';
import { isUserItemOwner } from 'views/Shared/utils/sharedViewUtils';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import ShareInviteDialog from '../ShareInviteDialog/ShareInviteDialog';
import './ShareDialog.scss';
import envService from 'services/env.service';
import { AccessMode, InvitedUserProps, UserRole, ViewProps, Views } from './types';
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
import { cropSharedName, filterEditorAndReader, getLocalUserData, isAdvancedShareItem } from './utils';

type ShareDialogProps = {
  user: UserSettings;
  isDriveItem?: boolean;
  onShareItem?: () => void;
  onStopSharingItem?: () => void;
  onCloseDialog?: () => void;
};

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

  const [roles, setRoles] = useState<Role[]>([]);
  const [inviteDialogRoles, setInviteDialogRoles] = useState<Role[]>([]);

  const [selectedUserListIndex, setSelectedUserListIndex] = useState<number | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>('restricted');
  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUserProps[]>([]);
  const [currentUserFolderRole, setCurrentUserFolderRole] = useState<string | undefined>('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [openPasswordInput, setOpenPasswordInput] = useState(false);
  const [openPasswordDisableDialog, setOpenPasswordDisableDialog] = useState(false);
  const [sharingMeta, setSharingMeta] = useState<SharingMeta | null>(null);
  const [isRestrictedSharingDialogOpen, setIsRestrictedSharingDialogOpen] = useState<boolean>(false);
  const [isRestrictedPasswordDialogOpen, setIsRestrictedPasswordDialogOpen] = useState<boolean>(false);

  const [userOptionsEmail, setUserOptionsEmail] = useState<InvitedUserProps>();
  const [userOptionsY, setUserOptionsY] = useState<number>(0);
  const [view, setView] = useState<Views>('general');
  const userList = useRef<HTMLDivElement>(null);
  const userOptions = useRef<HTMLButtonElement>(null);

  const isUserOwner = isUserItemOwner({
    isDriveItem: !!props?.isDriveItem,
    item: itemToShare?.item as AdvancedSharedItem,
    userEmail: props?.user?.email,
  });
  const isProtectWithPasswordOptionAvailable = accessMode === 'public' && !isLoading && isUserOwner;
  const closeSelectedUserPopover = () => setSelectedUserListIndex(null);

  const resetDialogData = () => {
    setSelectedUserListIndex(null);
    setAccessMode('public');
    setShowStopSharingConfirmation(false);
    setIsLoading(false);
    setInvitedUsers([]);
    setUserOptionsEmail(undefined);
    setUserOptionsY(0);
    setView('general');
    setIsPasswordProtected(false);
    setSharingMeta(null);
    onCloseDialog?.();
  };

  useEffect(() => {
    const OWNER_ROLE = { id: 'NONE', name: 'owner' };
    if (isOpen) {
      getSharingRoles().then((roles) => {
        const parsedRoles = filterEditorAndReader(roles);
        setRoles([...parsedRoles, OWNER_ROLE]);
        setInviteDialogRoles(parsedRoles);
      });
    }

    if (!isOpen) resetDialogData();
  }, [isOpen]);

  useEffect(() => {
    if (roles.length === 0) dispatch(sharedThunks.getSharedFolderRoles());

    if (roles.length > 0 && isOpen) loadShareInfo();
  }, [roles, isOpen]);

  useEffect(() => {
    const currentInvitedUser = invitedUsers.find((user) => user.email === props.user.email);
    setCurrentUserFolderRole(currentInvitedUser?.roleName);
  }, [invitedUsers]);

  const getAndUpdateInvitedUsers = useCallback(async () => {
    if (!itemToShare?.item) return;

    try {
      const invitedUsersList = await shareService.getUsersOfSharedFolder({
        itemType: itemToShare.item.isFolder ? 'folder' : 'file',
        folderId: itemToShare.item.uuid,
      });

      const invitedUsersListParsed = invitedUsersList['users'].map((user) => ({
        ...user,
        roleName: roles.find((role) => role.id === user.role.id)?.name.toLowerCase(),
      }));

      setInvitedUsers(invitedUsersListParsed);
    } catch {
      // the server throws an error when there are no users with shared item,
      // that means that the local user is the owner as there is nobody else with this shared file.
      if (isUserOwner) {
        const ownerData = getLocalUserData();
        setInvitedUsers([{ ...ownerData, roleName: 'owner' }]);
      }
    }
  }, [itemToShare, roles]);

  const loadShareInfo = async () => {
    if (!itemToShare?.item) return;

    setIsLoading(true);
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
        setSharingMeta(sharingData);
      } catch (error) {
        errorService.reportError(error);
      }
    }

    if (sharingType === 'private') {
      shareAccessMode = 'restricted';
    }
    setAccessMode(shareAccessMode);
    setIsPasswordProtected(isAlreadyPasswordProtected);

    try {
      await getAndUpdateInvitedUsers();
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onClose = (): void => {
    dispatch(uiActions.setIsShareDialogOpen(false));
  };

  const getPrivateShareLink = async () => {
    try {
      await copyTextToClipboard(`${envService.getVariable('hostname')}/shared/?folderuuid=${itemToShare?.item.uuid}`);
      notificationsService.show({ text: translate('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
    } catch {
      notificationsService.show({
        text: translate('modals.shareModal.errors.copy-to-clipboard'),
        type: ToastType.Error,
      });
    }
  };

  const onCopyLink = async (): Promise<void> => {
    if (accessMode === 'restricted') {
      await getPrivateShareLink();
      closeSelectedUserPopover();
      return;
    }

    if (itemToShare?.item.uuid) {
      const encryptionKey = isAdvancedShareItem(itemToShare.item) ? itemToShare?.item?.encryptionKey : undefined;
      const sharingInfo = await shareService.getPublicShareLink(
        itemToShare?.item.uuid,
        itemToShare.item.isFolder ? 'folder' : 'file',
        encryptionKey,
      );
      if (sharingInfo) {
        setSharingMeta(sharingInfo);
      }
      props.onShareItem?.();
      closeSelectedUserPopover();
    }
  };

  const onInviteUser = () => {
    setView('invite');
    closeSelectedUserPopover();
  };

  const onRemoveUser = async (user: InvitedUserProps) => {
    if (user) {
      const hasBeenRemoved = await dispatch(
        sharedThunks.removeUserFromSharedFolder({
          itemType: itemToShare?.item.isFolder ? 'folder' : 'file',
          itemId: itemToShare?.item.uuid as string,
          userId: user.uuid,
          userEmail: user.email,
        }),
      );

      if (hasBeenRemoved.payload) {
        setInvitedUsers((current) => current.filter((currentUser) => currentUser.uuid !== user.uuid));
      }
    }
    closeSelectedUserPopover();
  };

  const onPasswordCheckboxChange = useCallback(() => {
    if (!isPasswordSharingAvailable) {
      setIsRestrictedPasswordDialogOpen(true);
      return;
    }

    if (!isPasswordProtected) {
      setOpenPasswordInput(true);
    } else {
      setOpenPasswordDisableDialog(true);
    }
  }, [isPasswordProtected, isPasswordSharingAvailable]);

  const onSavePublicSharePassword = useCallback(
    async (plainPassword: string) => {
      try {
        let sharingInfo = sharingMeta;

        if (!sharingInfo?.encryptedCode) {
          const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
          const itemId = itemToShare?.item.uuid ?? '';
          sharingInfo = await shareService.createPublicShareFromOwnerUser(itemId, itemType, plainPassword);
          setSharingMeta(sharingInfo);
        } else {
          await shareService.saveSharingPassword(sharingInfo.id, plainPassword, sharingInfo.encryptedCode);
        }

        setIsPasswordProtected(true);
        props.onShareItem?.();
      } catch (error) {
        errorService.castError(error);
      } finally {
        setOpenPasswordInput(false);
      }
    },
    [sharingMeta, itemToShare],
  );

  const onDisablePassword = useCallback(async () => {
    try {
      if (sharingMeta) {
        await shareService.removeSharingPassword(sharingMeta.id);
        setIsPasswordProtected(false);
      }
    } catch (error) {
      errorService.castError(error);
    } finally {
      setOpenPasswordDisableDialog(false);
    }
  }, [sharingMeta]);

  const changeAccess = async (mode: AccessMode) => {
    closeSelectedUserPopover();

    if (!isRestrictedSharingAvailable) {
      setIsRestrictedSharingDialogOpen(true);
      return;
    }

    if (mode != accessMode) {
      setIsLoading(true);
      try {
        const sharingType = mode === 'restricted' ? 'private' : 'public';
        const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
        const itemId = itemToShare?.item.uuid ?? '';

        await shareService.updateSharingType(itemId, itemType, sharingType);
        if (sharingType === 'public') {
          const shareInfo = await shareService.createPublicShareFromOwnerUser(itemId, itemType);
          setSharingMeta(shareInfo);
          setIsPasswordProtected(false);
        }
        setAccessMode(mode);
      } catch (error) {
        errorService.reportError(error);
        notificationsService.show({
          text: translate('modals.shareModal.errors.update-sharing-access'),
          type: ToastType.Error,
        });
      }
      setIsLoading(false);
    }
  };

  const onStopSharing = async () => {
    setIsLoading(true);
    const itemName = cropSharedName(itemToShare?.item.name as string);
    await dispatch(
      sharedThunks.stopSharingItem({
        itemType: itemToShare?.item.isFolder ? 'folder' : 'file',
        itemId: itemToShare?.item.uuid as string,
        itemName,
      }),
    );
    props.onShareItem?.();
    props.onStopSharingItem?.();
    setShowStopSharingConfirmation(false);
    onClose();
    setIsLoading(false);
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

  const handleUserRoleChange = async (email: string, roleName: string) => {
    try {
      setSelectedUserListIndex(null);
      const roleId = roles.find((role) => role.name.toLowerCase() === roleName.toLowerCase())?.id;
      const sharingId = invitedUsers.find((invitedUser) => invitedUser.email === email)?.sharingId;
      if (roleId && sharingId) {
        await shareService.updateUserRoleOfSharedFolder({
          sharingId: sharingId,
          newRoleId: roleId,
        });
        const modifiedInvitedUsers = invitedUsers.map((invitedUser) => {
          if (invitedUser.email === email) {
            return { ...invitedUser, roleId, roleName: roleName as UserRole };
          }
          return invitedUser;
        });
        setInvitedUsers(modifiedInvitedUsers);
      }
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({ text: translate('modals.shareModal.errors.updatingRole'), type: ToastType.Error });
    }
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
              onChangePassword={() => setOpenPasswordInput(true)}
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
            onClose={() => setOpenPasswordInput(false)}
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
          onClose={async () => {
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
        <Header headerView={view} isLoading={isLoading} itemToShare={itemToShare} onClose={onClose} setView={setView} />
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
