import { useEffect, useState } from 'react';
import { IFormValues } from 'app/core/types';
import { Listbox } from '@headlessui/react';
import { CaretDown, Check, ArrowLeft } from '@phosphor-icons/react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { useForm } from 'react-hook-form';
import Button from 'app/shared/components/Button/Button';
import Avatar from 'app/shared/components/Avatar';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import Input from 'app/shared/components/Input';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import './ShareInviteDialog.scss';

interface ShareInviteDialog {
  onInviteUser: () => void;
}

interface UsersToInvite {
  email: string;
  userRole: string;
}

const ShareInviteDialog = (props: ShareInviteDialog): JSX.Element => {
  const { handleSubmit } = useForm<IFormValues>({ mode: 'onChange' });
  const { translate } = useTranslationContext();
  const [email, setEmail] = useState<string>('');
  const [emailAccent, setEmailAccent] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('editor');
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

  const onEditRole = () => {
    //   Edit user role
  };

  const onInvite = () => {
    // Ivite added users
  };

  return (
    <div>
      <div className="flex h-16 w-full items-center justify-between space-x-5 border-b border-gray-10 px-5">
        <h4
          className="flex max-w-full items-center space-x-4 overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('modals.shareModal.invite.title')}
        >
          <ArrowLeft onClick={props.onInviteUser} size={22} className="cursor-pointer" />
          <span>{translate('modals.shareModal.invite.title')}</span>
        </h4>
      </div>

      <div className="p-5">
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
                <Button variant="secondary" className="h-11">
                  <span className="capitalize">
                    {userRole === 'editor'
                      ? translate('modals.shareModal.invite.editor')
                      : translate('modals.shareModal.invite.viewer')}
                  </span>
                  <CaretDown size={24} />
                </Button>
              </Listbox.Button>
              <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out">
                <Listbox.Option
                  key="editor"
                  value="editor"
                  className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg py-2 px-3 text-base font-medium hover:bg-gray-5"
                >
                  {({ selected }) => (
                    <>
                      <span>{translate('modals.shareModal.invite.editor')}</span>
                      {selected ? <Check size={20} /> : null}
                    </>
                  )}
                </Listbox.Option>
                <Listbox.Option
                  key="viewer"
                  value="viewer"
                  className="flex h-9 w-full cursor-pointer items-center justify-between space-x-3 rounded-lg py-2 px-3 text-base font-medium hover:bg-gray-5"
                >
                  {({ selected }) => (
                    <>
                      <span>{translate('modals.shareModal.invite.viewer')}</span>
                      {selected ? <Check size={20} /> : null}
                    </>
                  )}
                </Listbox.Option>
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
                  <Listbox value={user.userRole} onChange={onEditRole}>
                    <div className="relative">
                      <Listbox.Button value={user.userRole} name={user.email}>
                        <Button variant="secondary">
                          <span className="capitalize">
                            {user.userRole === 'editor'
                              ? translate('modals.shareModal.invite.editor')
                              : translate('modals.shareModal.invite.viewer')}
                          </span>
                          <CaretDown size={24} />
                        </Button>
                      </Listbox.Button>
                      <Listbox.Options className="absolute right-0 z-10 mt-1 w-40 transform whitespace-nowrap rounded-lg border border-gray-10 bg-white p-1 shadow-subtle transition-all duration-50 ease-out">
                        <Listbox.Option
                          key="editor"
                          value="editor"
                          className="flex h-9 w-full cursor-pointer items-center justify-start justify-between space-x-3 rounded-lg py-2 px-3 px-3 text-base font-medium hover:bg-gray-5"
                        >
                          {({ selected }) => (
                            <>
                              <span>{translate('modals.shareModal.invite.editor')}</span>
                              {selected ? <Check size={20} /> : null}
                            </>
                          )}
                        </Listbox.Option>
                        <Listbox.Option
                          key="viewer"
                          value="viewer"
                          className="flex h-9 w-full cursor-pointer items-center justify-start justify-between space-x-3 rounded-lg py-2 px-3 px-3 text-base font-medium hover:bg-gray-5"
                        >
                          {({ selected }) => (
                            <>
                              <span>{translate('modals.shareModal.invite.viewer')}</span>
                              {selected ? <Check size={20} /> : null}
                            </>
                          )}
                        </Listbox.Option>
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
            <div className="flex items-center">
              <BaseCheckbox checked={notifyUser} onClick={() => setNotifyUser(!notifyUser)} />
              <p className="ml-2 text-base font-medium">{translate('modals.shareModal.invite.notifyUsers')}</p>
            </div>
            <Button variant="primary" onClick={onInvite} disabled={isInviteButtonDisabled}>
              <span>{translate('modals.shareModal.invite.invite')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareInviteDialog;
