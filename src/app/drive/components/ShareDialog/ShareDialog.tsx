import { MouseEvent, useEffect, useRef, useState } from 'react';
import { Popover } from '@headlessui/react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import Button from 'app/shared/components/Button/Button';
// import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import ShareInviteDialog from '../ShareInviteDialog/ShareInviteDialog';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ArrowLeft, CaretDown, Check, CheckCircle, Globe, Link, UserPlus, Users, X } from '@phosphor-icons/react';
import Avatar from 'app/shared/components/Avatar';
import Spinner from 'app/shared/components/Spinner/Spinner';
import { sharedThunks } from '../../../store/slices/sharedLinks';
import { DriveItemData } from '../../types';
import './ShareDialog.scss';

type AccessMode = 'public' | 'restricted';
type UserRole = 'owner' | 'editor' | 'viewer';
type Views = 'general' | 'invite' | 'requests';
type RequestStatus = 'pending' | 'accepted' | 'denied';
const REQUEST_STATUS = {
  PENDING: 'pending' as RequestStatus,
  ACCEPTED: 'accepted' as RequestStatus,
  DENIED: 'denied' as RequestStatus,
};

interface InvitedUserProps {
  avatar: string;
  name: string;
  lastname: string;
  email: string;
  role: UserRole;
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

type ShareDialogProps = {
  user: any;
  selectedItems: DriveItemData[];
};

const ShareDialog = (props: ShareDialogProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isShareDialogOpen);
  const isToastNotificacionOpen = useAppSelector((state: RootState) => state.ui.isToastNotificacionOpen);
  const roles = useAppSelector((state: RootState) => state.shared.roles);

  const itemToShare = useAppSelector((state) => state.storage.itemToShare);

  const owner: InvitedUserProps = {
    avatar: props.user.avatar,
    name: props.user.name,
    lastname: props.user.lastname,
    email: props.user.email,
    role: 'owner',
  };

  const [selectedUserListIndex, setSelectedUserListIndex] = useState<number | null>(null);

  const closeSelectedUserPopover = () => setSelectedUserListIndex(null);

  const [accessMode, setAccessMode] = useState<AccessMode>('public');
  const [showStopSharingConfirmation, setShowStopSharingConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUserProps[]>([]);
  const [accessRequests, setAccessRequests] = useState<RequestProps[]>([
    {
      avatar: '',
      name: 'Juan',
      lastname: 'Mendes',
      email: 'juan@inxt.com',
      message:
        'Hey John, \nI am Juan from the sales department. I need this files to design the ads for the new sales campaign.',
      status: REQUEST_STATUS.PENDING,
    },
    {
      avatar: '',
      name: 'Eve',
      lastname: 'Korn',
      email: 'eve@inxt.com',
      status: REQUEST_STATUS.PENDING,
    },
    {
      avatar: '',
      name: 'Maria',
      lastname: 'Korn',
      email: 'maria@inxt.com',
      status: REQUEST_STATUS.PENDING,
    },
  ]);
  const [userOptionsEmail, setUserOptionsEmail] = useState<string>('');
  const [userOptionsY, setUserOptionsY] = useState<number>(0);
  const [view, setView] = useState<Views>('general');
  const userList = useRef<HTMLDivElement>(null);
  const userOptions = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) loadShareInfo();
  }, [isOpen]);

  useEffect(() => {
    const removeDeniedRequests = () => {
      setAccessRequests((prevRequests) => prevRequests.filter((request) => isRequestPending(request.status)));
    };

    let timer;
    if (accessRequests.some((req) => !isRequestPending(req.status))) timer = setTimeout(removeDeniedRequests, 500);

    return () => clearTimeout(timer);
  }, [accessRequests]);

  const loadShareInfo = async () => {
    // TODO -> Load access mode
    const shareAccessMode: AccessMode = 'public';
    setAccessMode(shareAccessMode);

    // TODO -> Load invited users
    const loadedUsers: InvitedUserProps[] = [];
    setInvitedUsers(loadedUsers);
    // TODO -> Load access requests
    const mockedAccessRequests = [
      {
        avatar: '',
        name: 'Juan',
        lastname: 'Mendes',
        email: 'juan@inxt.com',
        message:
          'Hey John, \nI am Juan from the sales department. I need this files to design the ads for the new sales campaign.',
        status: REQUEST_STATUS.PENDING,
      },
      {
        avatar: '',
        name: 'Eve',
        lastname: 'Korn',
        email: 'eve@inxt.com',
        status: REQUEST_STATUS.PENDING,
      },
      {
        avatar: '',
        name: 'Maria',
        lastname: 'Korn',
        email: 'maria@inxt.com',
        status: REQUEST_STATUS.PENDING,
      },
    ];
    setAccessRequests(mockedAccessRequests);
    dispatch(sharedThunks.getSharedFolderRoles());
  };

  const removeRequest = (email: string) => {
    setAccessRequests((request) => request.filter((request) => request.email !== email));
  };

  const onAcceptRequest = (email: string, role: UserRole) => {
    // TODO -> Accept user access request
    setAccessRequests((prevRequests) =>
      prevRequests.map((request) => {
        if (request.email === email) {
          return { ...request, status: REQUEST_STATUS.ACCEPTED };
        }
        return request;
      }),
    );
    // removeRequest(email);
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

  const onCopyLink = (): void => {
    // TODO -> Copy share link
    dispatch(sharedThunks.getSharedLinkThunk({ item: itemToShare?.item as DriveItemData }));
    closeSelectedUserPopover();
  };

  const onInviteUser = () => {
    // TODO -> Open invite user screen
    // TODO: ADD LOGIC TO SHARE LINK WHEN INVITE A USER, WAIT
    // UNTIL BACKEND LOGIC IS DONE TO KNOW IF WE NEED TO SHARE FIRST A INVITE AFTER
    // OR THAT LOGIC WILL BE DONE BY THE BACKEND
    setView('invite');
    closeSelectedUserPopover();
  };

  const onRemoveUser = (email: string) => {
    // TODO -> Use API to remove user
    // Then update frot-end
    setInvitedUsers((current) => current.filter((user) => user.email !== email));
    closeSelectedUserPopover();
  };

  const changeAccess = (mode: AccessMode) => {
    closeSelectedUserPopover();
    if (mode != accessMode) {
      setIsLoading(true);
      setAccessMode(mode);

      // TODO -> Change access
      // If error change back to the previous mode

      setIsLoading(false);
    }
  };

  const cropSharedName = (name: string) => {
    if (name.length > 32) {
      return name.substring(0, 32).concat('...');
    } else {
      return name;
    }
  };

  const onStopSharing = () => {
    setIsLoading(true);

    // TODO -> Stop sharing
    const stoppedSharing = true;
    if (stoppedSharing) {
      // If success
      notificationsService.show({
        text: translate('modals.shareModal.stopSharing.notification.success', {
          name: cropSharedName(props.selectedItems[0]?.name ?? ''),
        }),
        type: ToastType.Success,
      });
      setShowStopSharingConfirmation(false);
      setIsLoading(false);
      onClose();
    } else {
      // If error
      notificationsService.show({
        text: translate('modals.shareModal.stopSharing.notification.error'),
        type: ToastType.Error,
      });
      setIsLoading(false);
    }
  };

  const openUserOptions = (e: any, user: InvitedUserProps, selectedIndex: number | null) => {
    const buttonY: number = ((e as MouseEvent).currentTarget as HTMLElement).getBoundingClientRect().top;
    const buttonHeight: number = ((e as MouseEvent).currentTarget as HTMLElement).offsetHeight;
    const userListY: number = userList.current ? userList.current.getBoundingClientRect().top : 0;
    setUserOptionsY(buttonY + buttonHeight - userListY + 8);

    if (selectedIndex === selectedUserListIndex) closeSelectedUserPopover();
    else setSelectedUserListIndex(selectedIndex);

    setUserOptionsEmail(user.email);

    if (userOptions.current) {
      userOptions.current.click();
    }
  };

  const Header = (headerProps: ViewProps): JSX.Element => {
    const headers = {
      general: (
        <>
          <span
            className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium"
            title={translate('modals.shareModal.title', { name: props.selectedItems[0]?.name ?? '' })}
          >
            {translate('modals.shareModal.title', { name: props.selectedItems[0]?.name ?? '' })}
          </span>
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black bg-opacity-0 transition-all duration-200 ease-in-out hover:bg-opacity-4 active:bg-opacity-8">
            <X onClick={() => (isLoading ? null : onClose())} size={22} />
          </div>
        </>
      ),
      invite: (
        <div className="flex items-center space-x-4">
          <ArrowLeft className="cursor-pointer" onClick={() => setView('general')} size={24} />
          <span className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium">
            {translate('modals.shareModal.invite.title')}
          </span>
        </div>
      ),
      requests: (
        <div className="flex items-center space-x-4">
          <ArrowLeft className="cursor-pointer" onClick={() => setView('general')} size={24} />
          <span className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium">
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
                className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-medium"
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
                <Button variant="secondary" onClick={onInviteUser}>
                  <UserPlus size={24} />
                  <span>{translate('modals.shareModal.list.invite')}</span>
                </Button>
              </div>
            </div>

            {/* List of users invited to the shared item */}
            <div
              ref={userList}
              className="mt-1.5 flex flex-col overflow-y-auto"
              style={{ minHeight: '224px', maxHeight: '336px' }}
            >
              <User
                user={owner}
                listPosition={null}
                translate={translate}
                openUserOptions={openUserOptions}
                selectedUserListIndex={selectedUserListIndex}
                userOptionsY={userOptionsY}
                onRemoveUser={onRemoveUser}
                userOptionsEmail={userOptionsEmail}
              />
              {invitedUsers.map((user, index) => (
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
                />
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-gray-5" />

          <div className="flex items-end justify-between">
            <div className="flex flex-col space-y-2.5">
              <p className="font-medium">{translate('modals.shareModal.general.generalAccess')}</p>

              <Popover className="relative z-10">
                {({ open }) => (
                  <>
                    <Popover.Button as="div" className="outline-none z-1">
                      <Button variant="secondary" disabled={isLoading}>
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
                      className={`absolute bottom-full z-0 mb-1 w-80 origin-bottom-left transform rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
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
                              <p className="text-sm leading-tight text-gray-60">
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
                              <p className="text-sm leading-tight text-gray-60">
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
              {translate('modals.shareModal.stopSharing.subtitle', { name: props.selectedItems[0]?.name ?? '' })}
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
          onInviteUser={onInviteUser}
          folderUUID={props.selectedItems[0]?.uuid as string}
          roles={roles}
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
                <div className="flex flex-shrink-0 items-center space-x-2.5">
                  <Avatar src={request.avatar} fullName={`${request.name} ${request.lastname}`} diameter={40} />

                  <div className="flex flex-1 flex-col overflow-hidden">
                    <p className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap font-medium leading-tight">
                      {request.name}&nbsp;{request.lastname}
                    </p>
                    <p className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-sm leading-none text-gray-50">
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
                            className={`absolute right-0 z-10 mt-1 origin-top-right transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
                              open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                            }`}
                            style={{ minWidth: '160px' }}
                            static
                          >
                            {({ close }) => (
                              <>
                                {/* Viewer */}
                                <button
                                  className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                                  onClick={() => {
                                    onAcceptRequest(request.email, 'viewer');
                                    close();
                                  }}
                                >
                                  <p className="w-full text-left text-base font-medium leading-none">
                                    {translate('modals.shareModal.requests.actions.roles.viewer')}
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
  user: state.user.user,
  selectedItems: state.storage.selectedItems,
}))(ShareDialog);

const UserOptions = ({
  listPosition,
  selectedUserListIndex,
  userOptionsY,
  translate,
  onRemoveUser,
  userOptionsEmail,
}) => {
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
        className={`absolute right-0 z-10 origin-top-right transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
          isUserSelected ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
        style={{
          top: '44px',
          minWidth: '160px',
        }}
        static
      >
        {/* Editor */}
        <button className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5">
          <p className="w-full text-left text-base font-medium leading-none">
            {translate('modals.shareModal.list.userItem.roles.editor')}
          </p>
          <Check size={20} />
        </button>

        {/* Viewer */}
        <button className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5">
          <p className="w-full text-left text-base font-medium leading-none">
            {translate('modals.shareModal.list.userItem.roles.viewer')}
          </p>
        </button>

        <div className="mx-3 my-0.5 flex h-px bg-gray-10" />

        {/* Remove */}
        <button
          className="flex h-9 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
          onClick={() => onRemoveUser(userOptionsEmail)}
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
}) => (
  <div
    className={`group flex h-14 flex-shrink-0 items-center space-x-2.5 border-t ${
      user.role === 'owner' ? 'border-transparent' : 'border-gray-5'
    }`}
  >
    <Avatar src={user.avatar} fullName={`${user.name} ${user.lastname}`} diameter={40} />

    <div className="flex flex-1 flex-col overflow-hidden">
      <p className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap font-medium leading-tight">
        {user.name}&nbsp;{user.lastname}
      </p>
      <p className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-sm leading-none text-gray-50">
        {user.email}
      </p>
    </div>

    {user.role === 'owner' ? (
      <div className="px-3 text-gray-50">{translate('modals.shareModal.list.userItem.roles.owner')}</div>
    ) : (
      <>
        <div
          className="outline-none relative flex h-9 cursor-pointer select-none flex-row items-center justify-center space-x-2 whitespace-nowrap rounded-lg border border-black border-opacity-0 bg-white px-3 text-base font-medium text-gray-80 ring-2 ring-primary ring-opacity-0 ring-offset-2 ring-offset-transparent transition-all duration-100 ease-in-out hover:border-opacity-15 focus-visible:shadow-sm focus-visible:ring-opacity-50 active:bg-gray-1 group-hover:border-opacity-10 group-hover:shadow-sm"
          onMouseUpCapture={(event) => openUserOptions(event, user, listPosition)}
          tabIndex={-1}
        >
          <span className="pointer-events-none">{translate(`modals.shareModal.list.userItem.roles.${user.role}`)}</span>
          <CaretDown size={16} weight="bold" className="pointer-events-none" />
        </div>
        <UserOptions
          listPosition={listPosition}
          selectedUserListIndex={selectedUserListIndex}
          userOptionsY={userOptionsY}
          translate={translate}
          onRemoveUser={onRemoveUser}
          userOptionsEmail={userOptionsEmail}
        />
      </>
    )}
  </div>
);
