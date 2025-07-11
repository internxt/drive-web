import { Listbox } from '@headlessui/react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { CaretDown, Check } from '@phosphor-icons/react';
import { AsyncThunkAction } from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import userService from '../../../auth/services/user.service';
import errorService from '../../../core/services/error.service';
import { HTTP_CODES } from '../../../core/constants';
import AppError, { IFormValues } from '../../../core/types';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { Button, Avatar, Checkbox, Input } from '@internxt/ui';
import { RootState } from '../../../store';
import { ShareFileWithUserPayload, sharedThunks } from '../../../store/slices/sharedLinks';
import { Role } from '../../../store/slices/sharedLinks/types';
import ShareUserNotRegistered from '../ShareUserNotRegistered/ShareUserNotRegistered';
import './ShareInviteDialog.scss';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

interface ShareInviteDialogProps {
  onInviteUser: () => void;
  itemToShare: any;
  onClose: () => void;
  roles: Role[];
}

interface UsersToInvite {
  email: string;
  userRole: string;
  publicKey: string;
  keys?: {
    ecc: string;
    kyber: string;
  };
  isNewUser: boolean;
}

const ShareInviteDialog = (props: ShareInviteDialogProps): JSX.Element => {
  const { handleSubmit } = useForm<IFormValues>({ mode: 'onChange' });
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const [email, setEmail] = useState<string>('');
  const [emailAccent, setEmailAccent] = useState<string>('');
  const [openNewUsersModal, setOpenNewUsersModal] = useState<boolean>(false);
  const [newUsersExists, setNewUsersExists] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>(props.roles[0]?.name);
  const [usersToInvite, setUsersToInvite] = useState<Array<UsersToInvite>>([]);
  const [notifyUser, setNotifyUser] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [isInviteButtonDisabled, setIsInviteButtonDisabled] = useState<boolean>(true);
  const [isAnyInviteLoading, setIsAnyInviteLoading] = useState<boolean>(false);

  useEffect(() => {
    isValidEmail(email) || usersToInvite.length > 0
      ? setIsInviteButtonDisabled(false)
      : setIsInviteButtonDisabled(true);

    if (email.indexOf(',') > -1) {
      onAddInviteUser();
    }

    setEmailAccent('');
  }, [email]);

  const onAddInviteUser = async () => {
    setIsAnyInviteLoading(true);
    const splitEmail = email.split(',');
    const emailToAdd = splitEmail[0];
    const userInvitedEmail = emailToAdd;
    const userInvitedRole = userRole;
    const userInvited = { email: userInvitedEmail, userRole: userInvitedRole, isNewUser: false };
    const isDuplicated = usersToInvite.find((user) => user.email === userInvited.email);

    if (!isDuplicated && isValidEmail(userInvitedEmail)) {
      const { publicKey, keys } = await getUserPublicKey(email);

      const markUserAsNew = !publicKey;

      if (markUserAsNew) {
        userInvited.isNewUser = true;
        setNewUsersExists(true);
      }

      const unique: Array<UsersToInvite> = [...usersToInvite];
      unique.push({ ...userInvited, publicKey, keys });
      setUsersToInvite(unique);
      setEmail('');
    } else {
      setEmailAccent('error');
      if (isDuplicated) {
        notificationsService.show({
          text: translate('modals.shareModal.invite.duplicatedEmail'),
          type: ToastType.Error,
        });
      }
    }
    setIsAnyInviteLoading(false);
  };

  const onEditRole = (value: Role['name'], user: UsersToInvite) => {
    const newUserToInvite = usersToInvite.map((userToInvite) => {
      if (user.email === userToInvite.email) {
        return { ...userToInvite, userRole: value };
      }
      return userToInvite;
    });
    setUsersToInvite(newUserToInvite);
  };

  const getUserPublicKey = async (
    email: string,
  ): Promise<{ publicKey: string; keys: { kyber: string; ecc: string } }> => {
    let publicKey = '';
    let keys = { kyber: '', ecc: '' };
    try {
      const publicKeyResponse = await userService.getPublicKeyByEmail(email);
      publicKey = publicKeyResponse.publicKey;
      if (publicKeyResponse.keys) {
        keys = publicKeyResponse.keys;
      }
    } catch (error) {
      if ((error as AppError)?.status !== HTTP_CODES.NOT_FOUND) {
        errorService.reportError(error);
      }
    }
    return { publicKey, keys };
  };

  const processInvites = async (usersToInvite: UsersToInvite[]) => {
    const sharingPromises = [] as AsyncThunkAction<string | void, ShareFileWithUserPayload, { state: RootState }>[];

    usersToInvite.forEach((user) => {
      const userRoleId = props.roles.find((role) => role.name === user.userRole)?.id;
      if (!userRoleId) return;

      sharingPromises.push(
        dispatch(
          sharedThunks.shareItemWithUser({
            encryptionAlgorithm: props.itemToShare.encryptionAlgorithm,
            itemId: props.itemToShare.uuid,
            itemType: props.itemToShare.isFolder ? 'folder' : 'file',
            roleId: userRoleId,
            sharedWith: user.email,
            notifyUser,
            notificationMessage: messageText,
            publicKey: user.publicKey,
            keys: user.keys,
            isNewUser: user.isNewUser,
          }),
        ),
      );
    });

    await Promise.all(sharingPromises);
  };

  //TODO: EXTRACT THIS LOGIC OUT OF THE DIALOG
  const onInvite = async ({ preCreateUsers = false }) => {
    setIsAnyInviteLoading(true);
    const usersList = [...usersToInvite];
    let isThereAnyNewUser = newUsersExists;

    if (usersList.length === 0 && isValidEmail(email)) {
      const { publicKey, keys } = await getUserPublicKey(email);
      if (!publicKey && !preCreateUsers) {
        isThereAnyNewUser = true;
      }
      usersList.push({
        email,
        userRole,
        isNewUser: !publicKey,
        publicKey,
        keys,
      });
    }

    if (isThereAnyNewUser && !preCreateUsers) {
      setOpenNewUsersModal(true);
      return;
    }

    await processInvites(usersList);
    setIsAnyInviteLoading(false);
    props.onClose();
  };

  return (
    <>
      <div>
        <form className="m flex w-full" onSubmit={handleSubmit(onAddInviteUser)}>
          <Input
            className="mr-2 w-full"
            required
            variant="email"
            onChange={(e) => setEmail(e)}
            accent={emailAccent === 'error' ? 'error' : undefined}
            name="email"
            value={email}
          />
          <Listbox value={userRole} onChange={setUserRole}>
            <div className="relative">
              <Listbox.Button value={userRole} name="userRole">
                <Button variant="secondary">
                  <span>{translate(`modals.shareModal.invite.${userRole?.toLowerCase()}`)}</span>
                  <CaretDown size={24} />
                </Button>
              </Listbox.Button>
              <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out dark:bg-gray-5">
                {props.roles.map((role) => (
                  <Listbox.Option
                    key={role.id}
                    value={role.name}
                    className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-5 dark:hover:bg-gray-10"
                  >
                    {({ selected }) => (
                      <>
                        <span>{translate(`modals.shareModal.invite.${role.name?.toLowerCase()}`)}</span>
                        {selected ? <Check size={20} /> : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </form>
        <div className="font-regular mt-1.5 text-xs text-gray-100">
          {translate('modals.shareModal.invite.instructions')}
        </div>
        {usersToInvite.length != 0 && (
          <div className="mt-4">
            <h5 className="mb-2.5 text-lg font-medium">{translate('modals.shareModal.invite.listUsers')}</h5>
            <ul>
              {usersToInvite.map((user) => (
                <li
                  key={user.email}
                  className="share-invite-user flex items-center justify-between border-b border-gray-5 py-2"
                >
                  <div className="flex items-center">
                    <Avatar src="" fullName={`${user.email}`} diameter={40} />
                    <p className="ml-2.5 break-all">{user.email}</p>
                  </div>
                  <Listbox value={user.userRole} onChange={(selectedValue) => onEditRole(selectedValue, user)}>
                    <div className="relative">
                      <Listbox.Button value={user.userRole} name={user.email}>
                        <Button variant="secondary">
                          <span>
                            {translate(`modals.shareModal.list.userItem.roles.${user.userRole?.toLowerCase()}`)}
                          </span>
                          <CaretDown size={24} />
                        </Button>
                      </Listbox.Button>
                      <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out dark:bg-gray-5">
                        {props.roles.map((role) => (
                          <Listbox.Option
                            key={role.id}
                            value={role.name}
                            className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg px-3 py-2 text-base font-medium hover:bg-gray-5 dark:hover:bg-gray-10"
                          >
                            {({ selected }) => (
                              <>
                                <span>
                                  {translate(`modals.shareModal.list.userItem.roles.${role.name?.toLowerCase()}`)}
                                </span>
                                {selected ? <Check size={20} /> : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 border-t border-gray-10 pt-4">
          {notifyUser && (
            <>
              <textarea
                value={messageText}
                placeholder={translate('modals.shareModal.invite.textarea')}
                rows={4}
                className="w-full max-w-lg resize-none rounded-md border border-gray-20 bg-transparent p-3 pl-4 outline-none"
                onChange={(e) => setMessageText(String(e.target.value))}
                maxLength={1000}
              />
              <span className="font-regular flex w-full justify-end text-xs text-gray-50">
                {messageText.length === 0 ? 0 : messageText.length}/1000
              </span>
            </>
          )}
          <div className="mt-2.5 flex w-full items-center justify-between">
            <div className="flex cursor-pointer items-center" onClick={() => setNotifyUser(!notifyUser)}>
              <Checkbox checked={notifyUser} />
              <p className="ml-2 text-base font-medium">{translate('modals.shareModal.invite.notifyUsers')}</p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                onInvite({ preCreateUsers: false });
              }}
              disabled={isInviteButtonDisabled}
              loading={isAnyInviteLoading}
            >
              <span>{translate('modals.shareModal.invite.invite')}</span>
            </Button>
          </div>
        </div>
      </div>
      <ShareUserNotRegistered
        isOpen={openNewUsersModal}
        onClose={() => {
          setOpenNewUsersModal(false);
          setIsAnyInviteLoading(false);
        }}
        onAccept={() => {
          setOpenNewUsersModal(false);
          onInvite({ preCreateUsers: true });
        }}
      />
    </>
  );
};

export default ShareInviteDialog;
