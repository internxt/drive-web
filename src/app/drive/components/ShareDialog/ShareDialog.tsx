import { useEffect, useRef, useState } from 'react';
import { Popover } from '@headlessui/react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import Button from 'app/shared/components/Button/Button';
// import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { CaretDown, Check, Globe, Link, UserPlus, Users, X } from '@phosphor-icons/react';
import Avatar from 'app/shared/components/Avatar';
import AvatarWrapper from 'app/core/views/Preferences/tabs/Account/AvatarWrapper';
import Spinner from 'app/shared/components/Spinner/Spinner';

type AccessMode = 'public' | 'restricted';
type UserRole = 'owner' | 'editor' | 'viewer';

interface InvitedUserProps {
  avatar: string;
  name: string;
  lastname: string;
  email: string;
  role: UserRole;
}

const ShareDialog = (props) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isShareDialogOpen);
  const owner: InvitedUserProps = {
    avatar: props.user.avatar,
    name: props.user.name,
    lastname: props.user.lastname,
    email: props.user.email,
    role: 'owner',
  };

  const [accessMode, setAccessMode] = useState<AccessMode>('public');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUserProps[]>([]);

  const [userOptionsEmail, setUserOptionsEmail] = useState<string>('');
  const [userOptionsY, setUserOptionsY] = useState<number>(0);
  const userList = useRef<HTMLDivElement>(null);
  const userOptions = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) loadShareInfo();
  }, [isOpen]);

  const loadShareInfo = () => {
    // TODO -> Load access mode
    const shareAccessMode: AccessMode = 'public';
    setAccessMode(shareAccessMode);

    // TODO -> Load invited users
    const loadedUsers: InvitedUserProps[] = [];
    setInvitedUsers(loadedUsers);
  };

  const onClose = (): void => {
    dispatch(uiActions.setIsShareDialogOpen(false));
  };

  const onCopyLink = (): void => {
    // TODO -> Copy share link
  };

  const onInviteUser = () => {
    // TODO -> Open invite user screen
  };

  const onRemoveUser = (email: string) => {
    // TODO -> Use API to remove user
    // Then update frot-end
    setInvitedUsers((current) => current.filter((user) => user.email !== email));
  };

  const changeAccess = (mode: AccessMode) => {
    if (mode != accessMode) {
      setIsLoading(true);
      setAccessMode(mode);

      // TODO -> Change access
      // If error change back to the previous mode

      setIsLoading(false);
    }
  };

  const onStopSharing = () => {
    setIsLoading(true);

    // TODO -> Stop sharing

    setIsLoading(false);
  };

  const openUserOptions = (e: any, user: InvitedUserProps) => {
    const buttonY: number = ((e as MouseEvent).currentTarget as HTMLElement).getBoundingClientRect().top;
    const buttonHeight: number = ((e as MouseEvent).currentTarget as HTMLElement).offsetHeight;
    const userListY: number = userList.current ? userList.current.getBoundingClientRect().top : 0;
    setUserOptionsY(buttonY + buttonHeight - userListY + 8);

    setUserOptionsEmail(user.email);

    if (userOptions.current) {
      userOptions.current.click();
    }
  };

  const UserOptions = () => (
    <Popover className="relative z-10 h-0 max-h-0 w-full">
      {({ open }) => (
        <>
          <Popover.Button as="button" ref={userOptions} className="outline-none z-1" />

          <Popover.Panel
            className={`absolute right-0 z-10 origin-top-right transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out ${
              open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
            }`}
            style={{
              top: `${userOptionsY}px`,
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
        </>
      )}
    </Popover>
  );

  const User = ({ user }: { user: InvitedUserProps }) => (
    <div
      className={`group flex h-14 flex-shrink-0 items-center space-x-2.5 border-t ${
        user.role === 'owner' ? 'border-transparent' : 'border-gray-5'
      }`}
    >
      {user.role === 'owner' ? (
        <AvatarWrapper avatarSrcURL={user.avatar} fullName={`${user.name} ${user.lastname}`} diameter={40} />
      ) : (
        <Avatar src={user.avatar} fullName={`${user.name} ${user.lastname}`} diameter={40} />
      )}

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
        <div
          className="outline-none relative flex h-9 cursor-pointer select-none flex-row items-center justify-center space-x-2 whitespace-nowrap rounded-lg border border-black border-opacity-0 bg-white px-3 text-base font-medium text-gray-80 ring-2 ring-primary ring-opacity-0 ring-offset-2 ring-offset-transparent transition-all duration-100 ease-in-out hover:border-opacity-15 focus-visible:shadow-sm focus-visible:ring-opacity-50 active:bg-gray-1 group-hover:border-opacity-10 group-hover:shadow-sm"
          onMouseUpCapture={(event) => openUserOptions(event, user)}
          tabIndex={-1}
        >
          <span className="pointer-events-none">{translate(`modals.shareModal.list.userItem.roles.${user.role}`)}</span>
          <CaretDown size={16} weight="bold" className="pointer-events-none" />
        </div>
      )}
    </div>
  );

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose} preventClosing={isLoading}>
      <div className="flex h-16 w-full items-center justify-between space-x-5 border-b border-gray-10 px-5">
        <span
          className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('modals.shareModal.title', { name: props.selectedItems[0]?.name ?? '' })}
        >
          {translate('modals.shareModal.title', { name: props.selectedItems[0]?.name ?? '' })}
        </span>
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black bg-opacity-0 transition-all duration-200 ease-in-out hover:bg-opacity-4 active:bg-opacity-8">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </div>

      <div className="flex flex-col space-y-5 p-5">
        <div className="relative flex flex-col">
          <div className="flex items-center justify-between space-x-1.5">
            <span className="text-base font-medium">{translate('modals.shareModal.list.peopleWithAccess')}</span>
            <Button variant="secondary" onClick={onInviteUser}>
              <UserPlus size={24} />
              <span>{translate('modals.shareModal.list.invite')}</span>
            </Button>
          </div>

          <UserOptions />

          {/* List of users invited to the shared item */}
          <div
            ref={userList}
            className="mt-1.5 flex flex-col overflow-y-auto"
            style={{ minHeight: '224px', maxHeight: '336px' }}
          >
            <User user={owner} />

            {invitedUsers.map((user) => (
              <User user={user} key={user.email} />
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-gray-5" />

        <div className="flex h-16 items-end justify-between">
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
                      onClick={onStopSharing}
                    >
                      <p className="text-base font-medium">
                        {translate('modals.shareModal.general.accessOptions.stopSharing')}
                      </p>
                    </button>
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
      </div>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  selectedItems: state.storage.selectedItems,
}))(ShareDialog);
