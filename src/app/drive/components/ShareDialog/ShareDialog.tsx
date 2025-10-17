import { Popover } from '@headlessui/react';
import { SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import {
  ArrowLeft,
  CaretDown,
  Check,
  CheckCircle,
  Globe,
  Link,
  Question,
  UserPlus,
  Users,
  X,
} from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { SharePasswordDisableDialog } from 'app/share/components/SharePasswordDisableDialog/SharePasswordDisableDialog';
import { SharePasswordInputDialog } from 'app/share/components/SharePasswordInputDialog/SharePasswordInputDialog';
import { MAX_SHARED_NAME_LENGTH } from 'app/share/views/SharedLinksView/SharedView';
import { Avatar, Button, Checkbox, Loader, Modal } from '@internxt/ui';
import { DELAY_SHOW_MS } from 'app/shared/components/Tooltip/Tooltip';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { Role } from 'app/store/slices/sharedLinks/types';
import { uiActions } from 'app/store/slices/ui';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Tooltip } from 'react-tooltip';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import shareService, { copyTextToClipboard, getSharingRoles } from '../../../share/services/share.service';
import { AdvancedSharedItem } from '../../../share/types';
import { isUserItemOwner } from '../../../share/views/SharedLinksView/sharedViewUtils';
import { sharedThunks } from '../../../store/slices/sharedLinks';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import { DriveItemData } from '../../types';
import ShareInviteDialog from '../ShareInviteDialog/ShareInviteDialog';
import StopSharingItemDialog from '../StopSharingItemDialog/StopSharingItemDialog';
import './ShareDialog.scss';
import envService from 'app/core/services/env.service';
import { User } from './components/User';
import { InvitedUsersSkeletonLoader } from './components/InvitedUsersSkeletonLoader';
import {
  AccessMode,
  InvitedUserProps,
  REQUEST_STATUS,
  RequestProps,
  RequestStatus,
  UserRole,
  ViewProps,
  Views,
} from './types';
import navigationService from 'app/core/services/navigation.service';
import { Service } from '@internxt/sdk/dist/drive/payments/types/tiers';
import { UpgradeDialog } from '../UpgradeDialog/UpgradeDialog';

const isRequestPending = (status: RequestStatus): boolean =>
  status !== REQUEST_STATUS.DENIED && status !== REQUEST_STATUS.ACCEPTED;

const cropSharedName = (name: string) => {
  if (name.length > MAX_SHARED_NAME_LENGTH) {
    return name.substring(0, 32).concat('...');
  } else {
    return name;
  }
};

type ShareDialogProps = {
  user: UserSettings;
  isDriveItem?: boolean;
  onShareItem?: () => void;
  onStopSharingItem?: () => void;
  onCloseDialog?: () => void;
};

const isAdvancedShareItem = (item: DriveItemData | AdvancedSharedItem): item is AdvancedSharedItem => {
  return item['encryptionKey'];
};

const getLocalUserData = () => {
  const user = localStorageService.getUser() as UserSettings;
  const ownerData = {
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    sharingId: '',
    avatar: user.avatar,
    uuid: user.uuid,
    role: {
      id: 'NONE',
      name: 'OWNER',
      createdAt: '',
      updatedAt: '',
    },
  };
  return ownerData;
};

// TODO: THIS IS TEMPORARY, REMOVE WHEN NEED TO SHOW OTHER ROLES
const filterEditorAndReader = (users: Role[]): Role[] => {
  return users.filter((user) => user.name === 'EDITOR' || user.name === 'READER');
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

  const [accessRequests, setAccessRequests] = useState<RequestProps[]>([]);
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
  const closeSelectedUserPopover = () => setSelectedUserListIndex(null);

  const resetDialogData = () => {
    setSelectedUserListIndex(null);
    setAccessMode('public');
    setShowStopSharingConfirmation(false);
    setIsLoading(false);
    setInvitedUsers([]);
    setAccessRequests([]);
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
    const removeDeniedRequests = () => {
      setAccessRequests((prevRequests) => prevRequests.filter((request) => isRequestPending(request.status)));
    };

    let timer;
    if (accessRequests.some((req) => !isRequestPending(req.status))) timer = setTimeout(removeDeniedRequests, 500);

    return () => clearTimeout(timer);
  }, [accessRequests]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onAcceptRequest = (email: string, roleName: UserRole) => {
    // TODO -> Accept user access request
    setAccessRequests((prevRequests) =>
      prevRequests.map((request) => {
        if (request.email === email) {
          return { ...request, status: REQUEST_STATUS.ACCEPTED };
        }
        return request;
      }),
    );
  };

  const handleDenyRequest = (email: string) => {
    setAccessRequests((prevRequests) =>
      prevRequests.map((request) => {
        if (request.email === email) {
          return { ...request, status: REQUEST_STATUS.DENIED };
        }
        return request;
      }),
    );
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

  const onRemoveUser = async (user) => {
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

  const Header = (headerProps: ViewProps): JSX.Element => {
    const headers = {
      general: (
        <>
          <span
            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
            title={translate('modals.shareModal.title', { name: itemToShare?.item.name })}
          >
            {translate('modals.shareModal.title', { name: itemToShare?.item.name })}
          </span>
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out hover:bg-black/4 active:bg-black/8">
            <X onClick={() => (isLoading ? null : onClose())} size={22} />
          </div>
        </>
      ),
      invite: (
        <div className="flex items-center space-x-4">
          <ArrowLeft className="cursor-pointer" onClick={() => setView('general')} size={24} />
          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium">
            {translate('modals.shareModal.invite.title')}
          </span>
        </div>
      ),
      requests: (
        <div className="flex items-center space-x-4">
          <ArrowLeft className="cursor-pointer" onClick={() => setView('general')} size={24} />
          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium">
            {translate('modals.shareModal.requests.title')}
          </span>
        </div>
      ),
    };

    return headers[headerProps.view];
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
                {accessRequests.length > 0 && (
                  <Button variant="secondary" onClick={() => setView('requests')}>
                    <span>{translate('modals.shareModal.requests.button')}</span>
                    <div
                      className="flex h-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-white"
                      style={{ minWidth: '20px' }}
                    >
                      {accessRequests.length}
                    </div>
                  </Button>
                )}
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
            <div
              ref={userList}
              className="mt-1.5 flex flex-col overflow-y-auto"
              style={{ minHeight: '224px', maxHeight: '336px' }}
            >
              {invitedUsers.length === 0 && isLoading ? (
                <>
                  {Array.from({ length: 4 }, (_, i) => (
                    <InvitedUsersSkeletonLoader key={`loader-${i}`} />
                  ))}
                </>
              ) : (
                invitedUsers
                  .sort((a, b) => {
                    if (a.email === props.user.email && b.email !== props.user.email) return -1;
                    return 0;
                  })
                  .map((user, index) => (
                    <User
                      user={user}
                      key={user.email}
                      listPosition={index}
                      translate={translate}
                      openUserOptions={openUserOptions}
                      selectedUserListIndex={selectedUserListIndex}
                      userOptionsY={userOptionsY}
                      onRemoveUser={onRemoveUser}
                      userOptionsEmail={userOptionsEmail}
                      onChangeRole={handleUserRoleChange}
                      disableUserOptionsPanel={currentUserFolderRole !== 'owner' && user.email !== props.user.email}
                      disableRoleChange={currentUserFolderRole !== 'owner'}
                    />
                  ))
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gray-5" />

          {accessMode === 'public' && !isLoading && isUserOwner && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-2.5">
                <div className="flex items-center">
                  <Checkbox checked={isPasswordProtected} onClick={onPasswordCheckboxChange} />
                  <p
                    className={`ml-2 select-none text-base font-medium ${isPasswordSharingAvailable ? '' : 'text-gray-50'}`}
                  >
                    {translate('modals.shareModal.protectSharingModal.protect')}
                  </p>
                  {isPasswordSharingAvailable ? (
                    <>
                      <Question
                        size={20}
                        className="ml-2 flex items-center justify-center font-medium text-gray-50"
                        data-tooltip-id="uploadFolder-tooltip"
                        data-tooltip-place="top"
                      />
                      <Tooltip id="uploadFolder-tooltip" delayShow={DELAY_SHOW_MS} className="z-40 rounded-md">
                        <p className="break-word w-60 text-center text-white">
                          {translate('modals.shareModal.protectSharingModal.protectTooltipText')}
                        </p>
                      </Tooltip>
                    </>
                  ) : (
                    <div className="py-1 px-2 ml-2 rounded-md bg-gray-5">
                      <p className="text-xs font-semibold">{translate('actions.locked')}</p>
                    </div>
                  )}
                </div>
              </div>
              {isPasswordProtected && (
                <Button variant="secondary" onClick={() => setOpenPasswordInput(true)}>
                  <span>{translate('modals.shareModal.protectSharingModal.buttons.changePassword')}</span>
                </Button>
              )}
            </div>
          )}
          <div className="flex items-end justify-between">
            <div className="flex flex-col space-y-2.5">
              <p className="font-medium">{translate('modals.shareModal.general.generalAccess')}</p>

              <Popover className="relative z-10">
                {({ open }) => (
                  <>
                    <Popover.Button as="div" className="z-1 outline-none">
                      <Button variant="secondary" disabled={isLoading || !isUserOwner}>
                        {accessMode === 'public' ? <Globe size={24} /> : <Users size={24} />}
                        <span>
                          {accessMode === 'public'
                            ? translate('modals.shareModal.general.accessOptions.public.title')
                            : translate('modals.shareModal.general.accessOptions.restricted.title')}
                        </span>
                        {isLoading ? (
                          <div className="flex h-6 w-6 items-center justify-center">
                            <Loader classNameLoader="h-5 w-5" />
                          </div>
                        ) : (
                          <CaretDown size={24} />
                        )}
                      </Button>
                    </Popover.Button>

                    <Popover.Panel
                      className={`absolute bottom-full z-0 mb-1 w-80 origin-bottom-left rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out ${
                        open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                      }`}
                      static
                    >
                      {({ close }) => (
                        <>
                          {/* Public */}
                          <button
                            className="flex h-16 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                            onClick={() => changeAccess('public')}
                          >
                            <Globe size={32} weight="light" />
                            <div className="flex flex-1 flex-col items-start">
                              <p className="text-base font-medium leading-none">
                                {translate('modals.shareModal.general.accessOptions.public.title')}
                              </p>
                              <p className="text-left text-sm leading-tight text-gray-60">
                                {translate('modals.shareModal.general.accessOptions.public.subtitle')}
                              </p>
                            </div>
                            <div className="flex h-full w-5 items-center justify-center">
                              {accessMode === 'public' ? (
                                isLoading ? (
                                  <Loader classNameLoader="h-5 w-5" />
                                ) : (
                                  <Check size={20} />
                                )
                              ) : null}
                            </div>
                          </button>
                          {/* Restricted */}
                          {!isWorkspace && (
                            <button
                              className="flex h-16 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                              onClick={() => changeAccess('restricted')}
                            >
                              <Users size={32} weight="light" />
                              <div className="flex flex-1 flex-col items-start">
                                <div className="flex flex-row gap-2 items-center">
                                  <p
                                    className={`text-base font-medium leading-none ${isRestrictedSharingAvailable ? '' : 'text-gray-70'}`}
                                  >
                                    {translate('modals.shareModal.general.accessOptions.restricted.title')}
                                  </p>
                                  {!isRestrictedSharingAvailable && (
                                    <div className="py-1 px-2 ml-2 rounded-md bg-gray-5">
                                      <p className="text-xs font-semibold">{translate('actions.locked')}</p>
                                    </div>
                                  )}
                                </div>
                                <p
                                  className={`text-left text-sm leading-tight ${isRestrictedSharingAvailable ? 'text-gray-60' : 'text-gray-70'}`}
                                >
                                  {translate('modals.shareModal.general.accessOptions.restricted.subtitle')}
                                </p>
                              </div>
                              <div className="flex h-full w-5 items-center justify-center">
                                {accessMode === 'restricted' ? (
                                  isLoading ? (
                                    <Loader classNameLoader="h-5 w-5" />
                                  ) : (
                                    <Check size={20} />
                                  )
                                ) : null}
                              </div>
                            </button>
                          )}
                          {/* Stop sharing */}
                          {(currentUserFolderRole === 'owner' || isUserOwner || props?.isDriveItem) && (
                            <button
                              className="flex h-11 w-full cursor-pointer items-center justify-start rounded-lg pl-14 pr-3 hover:bg-gray-5"
                              onClick={() => {
                                setShowStopSharingConfirmation(true);
                                close();
                              }}
                            >
                              <p className="text-base font-medium">
                                {translate('modals.shareModal.general.accessOptions.stopSharing')}
                              </p>
                            </button>
                          )}
                        </>
                      )}
                    </Popover.Panel>
                  </>
                )}
              </Popover>
            </div>

            <Button variant="primary" onClick={onCopyLink}>
              <Link size={24} />
              <span>{translate('modals.shareModal.general.copyLink')}</span>
            </Button>
          </div>

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

          {/* Stop sharing confirmation dialog */}
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
      requests: (
        <div className="relative flex flex-col space-y-3 pb-24" style={{ minHeight: '377px', maxHeight: '640px' }}>
          {accessRequests.length > 0 ? (
            accessRequests.map((request, index) => (
              <div
                className={`flex flex-col space-y-3 ${
                  index > 0 && isRequestPending(request.status) && 'border-t border-gray-5 pt-3'
                } ${!isRequestPending(request.status) && 'hide-request'}`}
                key={request.email + index}
              >
                <div className="flex shrink-0 items-center space-x-2.5">
                  <Avatar src={request.avatar} fullName={`${request.name} ${request.lastname}`} diameter={40} />

                  <div className="flex flex-1 flex-col overflow-hidden">
                    <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-tight">
                      {request.name}&nbsp;{request.lastname}
                    </p>
                    <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-none text-gray-50">
                      {request.email}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Popover className="relative">
                      {({ open }) => (
                        <>
                          <Popover.Button tabIndex={-1} className="relative">
                            <Button variant="primary">
                              <span>{translate('modals.shareModal.requests.actions.accept')}</span>
                              <CaretDown size={24} />
                            </Button>
                          </Popover.Button>

                          <Popover.Panel
                            className={`absolute right-0 z-10 mt-1 origin-top-right whitespace-nowrap rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out ${
                              open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                            }`}
                            style={{ minWidth: '160px' }}
                            static
                          >
                            {({ close }) => (
                              <>
                                {/* Reader */}
                                <button
                                  className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                                  onClick={() => {
                                    onAcceptRequest(request.email, 'reader');
                                    close();
                                  }}
                                >
                                  <p className="w-full text-left text-base font-medium leading-none">
                                    {translate('modals.shareModal.requests.actions.roles.reader')}
                                  </p>
                                </button>

                                {/* Editor */}
                                <button
                                  className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                                  onClick={() => {
                                    onAcceptRequest(request.email, 'editor');
                                    close();
                                  }}
                                >
                                  <p className="w-full text-left text-base font-medium leading-none">
                                    {translate('modals.shareModal.requests.actions.roles.editor')}
                                  </p>
                                </button>
                              </>
                            )}
                          </Popover.Panel>
                        </>
                      )}
                    </Popover>
                    <Button variant="secondary" onClick={() => handleDenyRequest(request.email)}>
                      <span>{translate('modals.shareModal.requests.actions.deny')}</span>
                    </Button>
                  </div>
                </div>

                {request.message ? (
                  <div className="mb-3 flex flex-col space-y-1 rounded-lg bg-gray-5 p-4 text-base leading-tight">
                    {request.message.split('\n').map((line) => (
                      <p>{line}</p>
                    ))}
                  </div>
                ) : (
                  <></>
                )}
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-1 rounded-2xl bg-gray-5 p-6 text-lg font-medium text-gray-50">
                <CheckCircle weight="thin" size={64} />
                <span>{translate('modals.shareModal.requests.empty')}</span>
              </div>
            </div>
          )}
        </div>
      ),
    };

    return view[viewProps.view];
  };

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
        <Header view={view} />
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
