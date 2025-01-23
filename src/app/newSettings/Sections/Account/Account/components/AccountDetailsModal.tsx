import { useEffect, useState } from 'react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';

import { Button } from '@internxt/ui';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';

const AccountDetailsModal = ({
  isOpen,
  onClose,
  openEditEmail,
  name,
  lastname,
  email,
  onUpdateUserProfileData,
  onErrorUpdatingUserProfileData,
}: {
  isOpen: boolean;
  onClose: () => void;
  openEditEmail: () => void;
  name: string;
  lastname: string;
  email: string;
  onUpdateUserProfileData: ({ name, lastname }: { name: string; lastname: string }) => Promise<void>;
  onErrorUpdatingUserProfileData: () => void;
}) => {
  const { translate } = useTranslationContext();

  const [nameValue, setNameValue] = useState(name);
  const [lastnameValue, setLastnameValue] = useState(lastname);
  const emailValue = email;

  const [status, setStatus] = useState<
    { tag: 'ready' } | { tag: 'loading' } | { tag: 'error'; type: 'NAME_INVALID' | 'LASTNAME_INVALID' | 'UNKNOWN' }
  >({ tag: 'ready' });

  const nameIsInvalid = status.tag === 'error' && status.type === 'NAME_INVALID';
  const lastnameIsInvalid = status.tag === 'error' && status.type === 'LASTNAME_INVALID';

  useEffect(() => {
    if (isOpen) {
      setStatus({ tag: 'ready' });
    }
  }, [isOpen]);

  const validate = (value: string) => {
    return value.length > 0 && value.length < 20;
  };

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate(nameValue)) {
      setStatus({ tag: 'error', type: 'NAME_INVALID' });
    } else if (!validate(lastnameValue)) {
      setStatus({ tag: 'error', type: 'LASTNAME_INVALID' });
    } else {
      try {
        setStatus({ tag: 'loading' });
        await onUpdateUserProfileData({ name: nameValue, lastname: lastnameValue });
        onClose();
      } catch {
        setStatus({ tag: 'error', type: 'UNKNOWN' });
        onErrorUpdatingUserProfileData();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSave}>
        <div className="flex flex-col space-y-5">
          <h1 className="text-2xl font-medium text-gray-80">
            {translate('views.account.tabs.account.accountDetails.editProfile.title')}
          </h1>
          <div className="flex space-x-3">
            <Input
              disabled={status.tag === 'loading'}
              label={translate('views.account.tabs.account.accountDetails.name')}
              value={nameValue}
              onChange={setNameValue}
              accent={nameIsInvalid ? 'error' : undefined}
              message={
                nameIsInvalid ? translate('views.account.tabs.account.accountDetails.errorMsg.nameError') : undefined
              }
              name="firstName"
            />
            <Input
              disabled={status.tag === 'loading'}
              label={translate('views.account.tabs.account.accountDetails.lastname')}
              value={lastnameValue}
              onChange={setLastnameValue}
              accent={lastnameIsInvalid ? 'error' : undefined}
              message={
                lastnameIsInvalid
                  ? translate('views.account.tabs.account.accountDetails.errorMsg.lastnameError')
                  : undefined
              }
              name="lastName"
            />
          </div>

          <div className="flex items-end space-x-3">
            <Input
              disabled
              className="flex-1"
              label={translate('views.account.tabs.account.accountDetails.card.email')}
              value={emailValue}
              name="email"
            />
            <div className="flex h-11 items-center">
              <Button disabled={status.tag === 'loading'} variant="secondary" onClick={openEditEmail}>
                {translate('actions.change')}
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={status.tag === 'loading'} variant="secondary" onClick={onClose}>
              {translate('actions.cancel')}
            </Button>
            <Button type="submit" loading={status.tag === 'loading'} className="ml-2">
              {status.tag === 'loading' ? translate('actions.saving') : translate('actions.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AccountDetailsModal;
