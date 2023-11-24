import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Popover } from '@headlessui/react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import ShareInviteDialog from '../ShareInviteDialog/ShareInviteDialog';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ArrowLeft, CaretDown, Check, CheckCircle, Globe, Link, UserPlus, Users, X } from '@phosphor-icons/react';
import Avatar from 'app/shared/components/Avatar';
import Spinner from 'app/shared/components/Spinner/Spinner';
import { sharedThunks } from '../../../store/slices/sharedLinks';
import './ShareDialog.scss';
import shareService, { getSharingRoles } from '../../../share/services/share.service';
import errorService from '../../../core/services/error.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { Role } from 'app/store/slices/sharedLinks/types';
import copy from 'copy-to-clipboard';
import { AdvancedSharedItem } from '../../../share/types';
import { DriveItemData } from '../../types';
import { TrackingPlan } from '../../../analytics/TrackingPlan';
import { trackPublicShared } from '../../../analytics/services/analytics.service';

type AccessMode = 'public' | 'restricted';
type UserRole = 'owner' | 'editor' | 'reader';
type Views = 'general' | 'invite' | 'requests';
type RequestStatus = 'pending' | 'accepted' | 'denied';

const REQUEST_STATUS = {
  PENDING: 'pending' as RequestStatus,
  ACCEPTED: 'accepted' as RequestStatus,
  DENIED: 'denied' as RequestStatus,
};

interface InvitedUserProps {
  avatar: string | null;
  name: string;
  lastname: string;
  email: string;
  roleName: UserRole;
  uuid: string;
  sharingId: string;
}

interface RequestProps {
  avatar: string;
  name: string;
  lastname: string;
  email: string;
  message?: string;
  status: RequestStatus;
}

interface ViewProps {
  view: Views;
}

const isRequestPending = (status: RequestStatus): boolean =>
  status !== REQUEST_STATUS.DENIED && status !== REQUEST_STATUS.ACCEPTED;

const cropSharedName = (name: string) => {
  if (name.length > 32) {
    return name.substring(0, 32).concat('...');
  } else {
    return name;
  }
};

type ShareDialogProps = {
  user: UserSettings;
  isDriveItem?: boolean;
  onShareItem?: () => void;
};

const isAdvanchedShareItem = (item: DriveItemData | AdvancedSharedItem): item is AdvancedSharedItem => {
  return item['encryptionKey'];
};

const ShareDialog = (props: ShareDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isShareDialogOpen);
  const isToastNotificacionOpen = useAppSelector((state: RootState) => state.ui.isToastNotificacionOpen);
  const itemToShare = useAppSelector((state) => state.storage.itemToShare);

  const [roles, setRoles] = useState<Role[]>([]);
  const [inviteDialogRoles, setInviteDialogRoles] = useState<Role[]>([]);
  const [showLoader, setShowLoader] = useState(true);

  const [selectedUserListIndex, setSelectedUserListIndex] = useState<number | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>('restricted');
  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUserProps[]>([]);
  const [currentUserFolderRole, setCurrentUserFolderRole] = useState<string | undefined>('');

  const [accessRequests, setAccessRequests] = useState<RequestProps[]>([]);
  const [userOptionsEmail, setUserOptionsEmail] = useState<InvitedUserProps>();
  const [userOptionsY, setUserOptionsY] = useState<number>(0);
  const [view, setView] = useState<Views>('general');
  const userList = useRef<HTMLDivElement>(null);
  const userOptions = useRef<HTMLButtonElement>(null);
  const itemOwnerEmail = (itemToShare?.item as any)?.user?.email;
  const isUserOwner = !!itemOwnerEmail && itemOwnerEmail === props?.user?.email;

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
    setShowLoader(true);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const OWNER_ROLE = { id: 'NONE', name: 'owner' };
    if (isOpen) {
      getSharingRoles().then((roles) => {
        setRoles([...roles, OWNER_ROLE]);
        setInviteDialogRoles(roles);
      });
    }

    if (!isOpen) resetDialogData();
  }, [isOpen]);

  useEffect(() => {
    if (roles.length === 0) dispatch(sharedThunks.getSharedFolderRoles());

    if (roles.length > 0) loadShareInfo();
  }, [roles]);

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
        folderId: itemToShare.item.uuid as string,
      });

      const invitedUsersListParsed = invitedUsersList['users'].map((user) => ({
        ...user,
        roleName: roles.find((role) => role.id === user.role.id)?.name.toLowerCase(),
      }));

      setInvitedUsers(invitedUsersListParsed);
    } catch (error) {
      errorService.reportError(error);
    }
  }, [itemToShare, roles]);

  const loadShareInfo = async () => {
    setIsLoading(true);
    // Change object type of itemToShare to AdvancedSharedItem
    let shareAccessMode: AccessMode = 'public';
    let sharingType: string;

    if (props.isDriveItem) {
      sharingType = (itemToShare?.item as DriveItemData & { sharings: { type: string; id: string }[] }).sharings?.[0]
        ?.type;
    } else {
      const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
      const itemId = itemToShare?.item.uuid || '';
      const sharingData = await shareService.getSharingType(itemId, itemType);
      sharingType = sharingData.type;
    }

    if (sharingType === 'private') {
      shareAccessMode = 'restricted';
    }
    setAccessMode(shareAccessMode);

    // TODO -> Load invited users
    if (!itemToShare?.item) return;

    try {
      await getAndUpdateInvitedUsers();
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeRequest = (email: string) => {
    setAccessRequests((request) => request.filter((request) => request.email !== email));
  };

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

  const onDenyrequest = (email: string) => {
    // TODO -> Deny user access request
    removeRequest(email);
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

  const getPrivateShareLink = () => {
    try {
      copy(`${process.env.REACT_APP_HOSTNAME}/app/shared/?folderuuid=${itemToShare?.item.uuid}`);
      notificationsService.show({ text: translate('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
    } catch (error) {
      notificationsService.show({
        text: translate('modals.shareModal.errors.copy-to-clipboard'),
        type: ToastType.Error,
      });
    }
  };

  const onCopyLink = async (): Promise<void> => {
    if (accessMode === 'restricted') {
      getPrivateShareLink();
      closeSelectedUserPopover();
      return;
    }

    if (itemToShare?.item.uuid) {
      const trackingPublicSharedProperties: TrackingPlan.PublicSharedProperties = {
        is_folder: itemToShare.item.isFolder,
        share_type: 'public',
        user_id: itemToShare.item.userId,
        item_id: itemToShare.item.id,
      };

      trackPublicShared(trackingPublicSharedProperties);
      const encryptionKey = isAdvanchedShareItem(itemToShare.item) ? itemToShare?.item?.encryptionKey : undefined;
      await shareService.getPublicShareLink(
        itemToShare?.item.uuid,
        itemToShare.item.isFolder ? 'folder' : 'file',
        encryptionKey,
      );
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

  const changeAccess = async (mode: AccessMode) => {
    closeSelectedUserPopover();
    if (mode != accessMode) {
      setIsLoading(true);
      try {
        const sharingType = mode === 'restricted' ? 'private' : 'public';
        const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
        const itemId = itemToShare?.item.uuid || '';

        await shareService.updateSharingType(itemId, itemType, sharingType);
        if (sharingType === 'public') {
          await shareService.createPublicShareFromOwnerUser(itemId, itemType);
        }
        setAccessMode(mode);
      } catch (error) {
        errorService.reportError(error);
        notificationsService.show({
          text: translate('modals.shareModal.errors.update-sharing-acces'),
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
    setShowStopSharingConfirmation(false);
    onClose();
    setIsLoading(false);
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
                {currentUserFolderRole !== 'reader' ? (
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
              {invitedUsers.length === 0 && showLoader ? (
                <>
                  {Array.from({ length: 4 }, (_, i) => (
                    <InvitedUsersSkeletonLoader key={`loader-${i}`} />
                  ))}
                </>
              ) : (
                invitedUsers.map((user, index) => (
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

          <div className="flex items-end justify-between">
            <div className="flex flex-col space-y-2.5">
              <p className="font-medium">{translate('modals.shareModal.general.generalAccess')}</p>

              <Popover className="relative z-10">
                {({ open }) => (
                  <>
                    <Popover.Button as="div" className="z-1 outline-none">
                      <Button variant="secondary" disabled={isLoading || (!props.isDriveItem && !isUserOwner)}>
                        {accessMode === 'public' ? <Globe size={24} /> : <Users size={24} />}
                        <span>
                          {accessMode === 'public'
                            ? translate('modals.shareModal.general.accessOptions.public.title')
                            : translate('modals.shareModal.general.accessOptions.restricted.title')}
                        </span>
                        {isLoading ? (
                          <div className="flex h-6 w-6 items-center justify-center">
                            <Spinner className="h-5 w-5" />
                          </div>
                        ) : (
                          <CaretDown size={24} />
                        )}
                      </Button>
                    </Popover.Button>

                    <Popover.Panel
                      className={`absolute bottom-full z-0 mb-1 w-80 origin-bottom-left rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
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
                                  <Spinner className="h-5 w-5" />
                                ) : (
                                  <Check size={20} />
                                )
                              ) : null}
                            </div>
                          </button>
                          {/* Restricted */}
                          <button
                            className="flex h-16 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                            onClick={() => changeAccess('restricted')}
                          >
                            <Users size={32} weight="light" />
                            <div className="flex flex-1 flex-col items-start">
                              <p className="text-base font-medium leading-none">
                                {translate('modals.shareModal.general.accessOptions.restricted.title')}
                              </p>
                              <p className="text-left text-sm leading-tight text-gray-60">
                                {translate('modals.shareModal.general.accessOptions.restricted.subtitle')}
                              </p>
                            </div>
                            <div className="flex h-full w-5 items-center justify-center">
                              {accessMode === 'restricted' ? (
                                isLoading ? (
                                  <Spinner className="h-5 w-5" />
                                ) : (
                                  <Check size={20} />
                                )
                              ) : null}
                            </div>
                          </button>
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

          {/* Stop sharing confirmation dialog */}
          <Modal
            maxWidth="max-w-sm"
            className="space-y-5 p-5"
            isOpen={showStopSharingConfirmation}
            onClose={() => setShowStopSharingConfirmation(false)}
            preventClosing={showStopSharingConfirmation && isLoading}
          >
            <p className="text-2xl font-medium">{translate('modals.shareModal.stopSharing.title')}</p>
            <p className="text-lg text-gray-80">
              {translate('modals.shareModal.stopSharing.subtitle', { name: itemToShare?.item.name ?? '' })}
            </p>
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => setShowStopSharingConfirmation(false)}
                disabled={showStopSharingConfirmation && isLoading}
              >
                {translate('modals.shareModal.stopSharing.cancel')}
              </Button>
              <Button variant="accent" onClick={onStopSharing} disabled={showStopSharingConfirmation && isLoading}>
                {isLoading && <Spinner className="h-4 w-4" />}
                <span>{translate('modals.shareModal.stopSharing.confirm')}</span>
              </Button>
            </div>
          </Modal>
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
                            className={`absolute right-0 z-10 mt-1 origin-top-right whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
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
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading || isToastNotificacionOpen}>
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

export const UserOptions = ({
  listPosition,
  selectedUserListIndex,
  userOptionsY,
  translate,
  onRemoveUser,
  userOptionsEmail,
  selectedRole,
  onChangeRole,
  disableRoleChange,
}): JSX.Element => {
  const isUserSelected = selectedUserListIndex === listPosition;

  return isUserSelected ? (
    <Popover
      className="absolute z-10 h-0 max-h-0 w-full"
      style={{
        top: `${userOptionsY}px`,
        right: 0,
        minWidth: '160px',
      }}
    >
      <Popover.Panel
        className={`absolute right-0 z-10 origin-top-right whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
          isUserSelected ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
        style={{
          top: '44px',
          minWidth: '160px',
        }}
        static
      >
        {disableRoleChange ? (
          <></>
        ) : (
          <>
            {/* Editor */}
            <button
              className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
              onClick={() => {
                onChangeRole('editor');
              }}
            >
              <p className="w-full text-left text-base font-medium leading-none">
                {translate('modals.shareModal.list.userItem.roles.editor')}
              </p>
              {selectedRole === 'editor' && <Check size={20} />}
            </button>

            {/* Reader */}
            <button
              className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
              onClick={() => {
                onChangeRole('reader');
              }}
            >
              <p className="w-full text-left text-base font-medium leading-none">
                {translate('modals.shareModal.list.userItem.roles.reader')}
              </p>
              {selectedRole === 'reader' && <Check size={20} />}
            </button>

            <div className="mx-3 my-0.5 flex h-px bg-gray-10" />
          </>
        )}
        {/* Remove */}
        <button
          className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
          onClick={() => {
            onRemoveUser(userOptionsEmail);
          }}
        >
          <p className="w-full text-left text-base font-medium leading-none">
            {translate('modals.shareModal.list.userItem.remove')}
          </p>
        </button>
      </Popover.Panel>
    </Popover>
  ) : (
    <></>
  );
};

const User = ({
  user,
  listPosition,
  translate,
  openUserOptions,
  selectedUserListIndex,
  userOptionsY,
  onRemoveUser,
  userOptionsEmail,
  onChangeRole,
  disableUserOptionsPanel,
  disableRoleChange,
}: {
  user: InvitedUserProps;
  listPosition: number | null;
  translate: (key: string, props?: Record<string, unknown>) => string;
  openUserOptions: (
    event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
    user: InvitedUserProps,
    listPosition: number | null,
  ) => void;
  selectedUserListIndex;
  userOptionsY;
  onRemoveUser;
  userOptionsEmail;
  onChangeRole: (email: string, roleName: string) => void;
  disableUserOptionsPanel: boolean;
  disableRoleChange: boolean;
}) => (
  <div
    className={`group flex h-14 shrink-0 items-center space-x-2.5 border-t ${
      user.roleName === 'owner' ? 'border-transparent' : 'border-gray-5'
    }`}
  >
    <Avatar src={user.avatar} fullName={`${user.name} ${user.lastname}`} diameter={40} />

    <div className="flex flex-1 flex-col overflow-hidden">
      <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-tight">
        {user.name}&nbsp;{user.lastname}
      </p>
      <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-none text-gray-50">
        {user.email}
      </p>
    </div>

    {user.roleName === 'owner' || disableUserOptionsPanel ? (
      <div className="px-3 text-gray-50">{translate(`modals.shareModal.list.userItem.roles.${user.roleName}`)}</div>
    ) : (
      <>
        <div
          className="relative flex h-9 cursor-pointer select-none flex-row items-center justify-center space-x-2 whitespace-nowrap rounded-lg border border-black/0 bg-white px-3 text-base font-medium text-gray-80 outline-none ring-2 ring-primary/0 ring-offset-2 ring-offset-transparent transition-all duration-100 ease-in-out hover:border-black/15 focus-visible:shadow-sm focus-visible:ring-primary/50 active:bg-gray-1 group-hover:border-black/10 group-hover:shadow-sm"
          onMouseUpCapture={(event) => openUserOptions(event, user, listPosition)}
          tabIndex={-1}
        >
          <span className="pointer-events-none">
            {translate(`modals.shareModal.list.userItem.roles.${user.roleName}`)}
          </span>
          <CaretDown size={16} weight="bold" className="pointer-events-none" />
        </div>
        <UserOptions
          listPosition={listPosition}
          selectedUserListIndex={selectedUserListIndex}
          userOptionsY={userOptionsY}
          translate={translate}
          onRemoveUser={onRemoveUser}
          userOptionsEmail={userOptionsEmail}
          selectedRole={user.roleName}
          onChangeRole={(roleName) => onChangeRole(user.email, roleName)}
          disableRoleChange={disableRoleChange}
        />
      </>
    )}
  </div>
);

const InvitedUsersSkeletonLoader = () => {
  const skinSkeleton = [
    <div className="flex flex-row items-center space-x-4">
      <div className="h-9 w-9 rounded-md bg-gray-5" />
    </div>,
    <div className="h-4 w-72 rounded bg-gray-5" />,
    <div className="ml-3 h-4 w-24 rounded bg-gray-5" />,
  ];

  const columnsWidth = [
    {
      width: 'flex w-1/12 cursor-pointer items-center',
    },
    {
      width: 'flex grow cursor-pointer items-center pl-4',
    },
    {
      width: 'hidden w-3/12 lg:flex pl-4',
    },
  ].map((column) => column.width);

  return (
    <div className="group relative flex h-14 w-full shrink-0 animate-pulse flex-row items-center pl-2 pr-2">
      {new Array(5).fill(0).map((col, i) => (
        <div
          key={`${col}-${i}`}
          className={`relative flex h-full shrink-0 flex-row items-center overflow-hidden whitespace-nowrap border-b border-gray-5 ${columnsWidth[i]}`}
        >
          {skinSkeleton?.[i]}
        </div>
      ))}
      <div className="h-full w-12" />
    </div>
  );
};
