import { useEffect, useState } from 'react';
import { IFormValues } from 'app/core/types';
import { Listbox } from '@headlessui/react';
import { CaretDown, Check } from '@phosphor-icons/react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { useForm } from 'react-hook-form';
import Button from 'app/shared/components/Button/Button';
import Avatar from 'app/shared/components/Avatar';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import Input from 'app/shared/components/Input';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import './ShareInviteDialog.scss';
import { useDispatch } from 'react-redux';
import { ShareFileWithUserPayload, sharedThunks } from '../../../store/slices/sharedLinks';
import { PrivateSharingRole } from '@internxt/sdk/dist/drive/share/types';
import { AsyncThunkAction } from '@reduxjs/toolkit';
import { RootState } from '../../../store';

interface ShareInviteDialogProps {
  onInviteUser: () => void;
  folderUUID: string;
  roles: PrivateSharingRole[];
  onClose: () => void;
}

interface UsersToInvite {
  email: string;
  userRole: string;
}

const ShareInviteDialog = (props: ShareInviteDialogProps): JSX.Element => {
  const { handleSubmit } = useForm<IFormValues>({ mode: 'onChange' });
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const [email, setEmail] = useState<string>('');
  const [emailAccent, setEmailAccent] = useState<string>('');
  const [userRole, setUserRole] = useState<string>(props.roles[0]?.role);
  const [usersToInvite, setUsersToInvite] = useState<Array<UsersToInvite>>([]);
  const [notifyUser, setNotifyUser] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [isInviteButtonDisabled, setIsInviteButtonDisabled] = useState<boolean>(true);

  useEffect(() => {
    isValidEmail(email) || usersToInvite.length > 0
      ? setIsInviteButtonDisabled(false)
      : setIsInviteButtonDisabled(true);

    if (email.indexOf(',') > -1) {
      onAddInviteUser();
    }

    setEmailAccent('');
  }, [email]);

  const onAddInviteUser = () => {
    const splitEmail = email.split(',');
    const emailToAdd = splitEmail[0];
    const userInvitedEmail = emailToAdd;
    const userInvitedRole = userRole;
    const userInvited = { email: userInvitedEmail, userRole: userInvitedRole };
    const isDuplicated = usersToInvite.find((user) => user.email === userInvited.email);

    if (!isDuplicated && isValidEmail(userInvitedEmail)) {
      const unique: Array<UsersToInvite> = [...usersToInvite];
      unique.push(userInvited);
      setUsersToInvite(unique);
      setEmail('');
    } else {
      setEmailAccent('error');
    }
  };

  const onEditRole = (value: PrivateSharingRole['role'], user: UsersToInvite) => {
    const newUserToInvite = usersToInvite.map((userToInvite) => {
      if (user.email === userToInvite.email) {
        return { ...userToInvite, userRole: value };
      }
      return userToInvite;
    });
    setUsersToInvite(newUserToInvite);
  };

  const onInvite = async () => {
    const sharingPromises = [] as AsyncThunkAction<string | void, ShareFileWithUserPayload, { state: RootState }>[];
    usersToInvite.forEach((user) => {
      const userRoleId = props.roles.find((role) => role.role === user.userRole)?.id;
      if (!userRoleId) return;

      sharingPromises.push(
        dispatch(
          sharedThunks.shareFileWithUser({ email: user.email, roleId: userRoleId, folderUUID: props.folderUUID }),
        ),
      );
    });
    await Promise.all(sharingPromises);
    props.onClose();
  };

  return (
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
                <span className="capitalize">{userRole}</span>
                <CaretDown size={24} />
              </Button>
            </Listbox.Button>
            <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out">
              {props.roles.map((role) => (
                <Listbox.Option
                  key={role.id}
                  value={role.role}
                  className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg py-2 px-3 text-base font-medium hover:bg-gray-5"
                >
                  {({ selected }) => (
                    <>
                      <span>{translate(`modals.shareModal.invite.${role.role}`)}</span>
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
                  <p className="ml-2.5">{user.email}</p>
                </div>
                <Listbox value={user.userRole} onChange={(selectedValue) => onEditRole(selectedValue, user)}>
                  <div className="relative">
                    <Listbox.Button value={user.userRole} name={user.email}>
                      <Button variant="secondary">
                        <span className="capitalize">{user.userRole}</span>
                        <CaretDown size={24} />
                      </Button>
                    </Listbox.Button>
                    <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out">
                      {props.roles.map((role) => (
                        <Listbox.Option
                          key={role.id}
                          value={role.role}
                          className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg py-2 px-3 text-base font-medium hover:bg-gray-5"
                        >
                          {({ selected }) => (
                            <>
                              <span>{translate(`modals.shareModal.invite.${role.role}`)}</span>
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
              className="outline-none w-full max-w-lg resize-none rounded-6px border border-gray-20 p-3 pl-4"
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
            <BaseCheckbox checked={notifyUser} />
            <p className="ml-2 text-base font-medium">{translate('modals.shareModal.invite.notifyUsers')}</p>
          </div>
          <Button variant="primary" onClick={onInvite} disabled={isInviteButtonDisabled}>
            <span>{translate('modals.shareModal.invite.invite')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareInviteDialog;
