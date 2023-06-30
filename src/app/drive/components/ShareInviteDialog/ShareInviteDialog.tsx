import { useEffect, useState } from 'react';
import { IFormValues } from 'app/core/types';
import { Listbox } from '@headlessui/react';
import { CaretDown, Check, ArrowLeft } from '@phosphor-icons/react';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { SubmitHandler, useForm } from 'react-hook-form';
import Button from 'app/shared/components/Button/Button';
import Avatar from 'app/shared/components/Avatar';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
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
  const {
    register,
    formState: { errors },
    handleSubmit,
    watch,
    resetField,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const { translate } = useTranslationContext();
  const emailRegex =
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
  const email = watch('email');
  const [userRole, setUserRole] = useState<string>('editor');
  const [usersToInvite, setUsersToInvite] = useState<Array<UsersToInvite>>([]);
  const [notifyUser, setNotifyUser] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [isInviteButtonDisabled, setIsInviteButtonDisabled] = useState<boolean>(true);

  useEffect(() => {
    if (email) {
      isValidEmail(email) || usersToInvite.length > 0
        ? setIsInviteButtonDisabled(false)
        : setIsInviteButtonDisabled(true);
    }
  }, [email]);

  const onAddInviteUser: SubmitHandler<IFormValues> = (formData, event) => {
    event?.preventDefault();
    const userInvitedEmail = formData.email;
    const userInvitedRole = formData.userRole;
    const userInvited = { email: userInvitedEmail, userRole: userInvitedRole };
    const isDuplicated = usersToInvite.find((user) => user.email === userInvited.email);

    if (!isDuplicated) {
      const unique: Array<UsersToInvite> = [...usersToInvite];
      unique.push(userInvited);
      setUsersToInvite(unique);
    }
    resetField('email');
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
          className="flex max-w-full items-center overflow-hidden overflow-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('modals.shareModal.invite.title')}
        >
          <ArrowLeft onClick={props.onInviteUser} size={22} className="mr-2 cursor-pointer" />
          {translate('modals.shareModal.invite.title')}
        </h4>
      </div>

      <div className="p-5">
        <form className="m flex w-full" onSubmit={handleSubmit(onAddInviteUser)}>
          <input
            className="no-ring semi-dense mr-2 w-full flex-grow border border-neutral-30"
            placeholder={translate('form.fields.email.placeholder') as string}
            type="text"
            {...register('email', {
              required: true,
              pattern: emailRegex,
            })}
          />
          <Listbox value={userRole} onChange={setUserRole}>
            {({ open }) => (
              <div className="relative">
                <Listbox.Button value={userRole} {...register('userRole')} name="userRole">
                  <Button variant="secondary">
                    <span className="capitalize">{userRole}</span>
                    <CaretDown
                      size={24}
                      className={`${open ? 'rotate-180 transform transition' : 'rotate-0 transform transition'}`}
                    />
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
            )}
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
                    {({ open }) => (
                      <div className="relative">
                        <Listbox.Button value={user.userRole} name={user.email}>
                          <Button variant="secondary">
                            <span className="capitalize">{user.userRole}</span>
                            <CaretDown
                              size={24}
                              className={`${
                                open ? 'rotate-180 transform transition' : 'rotate-0 transform transition'
                              }`}
                            />
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
                    )}
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
