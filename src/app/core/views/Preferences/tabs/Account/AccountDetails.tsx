import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import userService from '../../../../../auth/services/user.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';
import Tooltip from '../../../../../shared/components/Tooltip';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { updateUserProfileThunk } from '../../../../../store/slices/user';
import Section from '../../components/Section';
import { areCredentialsCorrect } from 'app/auth/services/auth.service';

export default function AccountDetails({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState(false);

  async function onResend() {
    setIsSendingVerificationEmail(true);
    await userService.sendVerificationEmail();
    notificationsService.show({ text: translate('notificationMessages.verificationEmail'), type: ToastType.Success });
    setIsSendingVerificationEmail(false);
  }

  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');

  const isVerified = user.emailVerified;

  return (
    <Section className={className} title={translate('views.account.tabs.account.accountDetails.head')}>
      <Card>
        <div className="flex justify-between">
          <div className="flex min-w-0">
            <Detail label={translate('views.account.tabs.account.accountDetails.card.name')} value={user.name} />
            <Detail
              label={translate('views.account.tabs.account.accountDetails.card.lastname')}
              value={user.lastname}
              className="ml-8 pr-2"
            />
          </div>
          <Button className="flex-shrink-0" variant="secondary" onClick={() => setIsDetailsModalOpen(true)}>
            {translate('actions.edit')}
          </Button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <Detail label={translate('views.account.tabs.account.accountDetails.card.email')} value={user.email} />
            {!isVerified && (
              <button
                onClick={onResend}
                disabled={isSendingVerificationEmail}
                className="font-medium text-primary hover:text-primary-dark disabled:text-gray-60"
              >
                {translate('views.account.tabs.account.accountDetails.card.resendEmail')}
              </button>
            )}
          </div>
          <Tooltip
            style="dark"
            title={
              isVerified
                ? translate('views.account.tabs.account.accountDetails.verify.verified')
                : translate('views.account.tabs.account.accountDetails.verify.verify')
            }
            popsFrom="top"
            subtitle={
              isVerified
                ? undefined
                : (translate('views.account.tabs.account.accountDetails.verify.description') as string)
            }
          >
            {isVerified ? (
              <CheckCircle weight="fill" className="text-green" size={24} />
            ) : (
              <Warning weight="fill" className="text-yellow" size={24} />
            )}
          </Tooltip>
        </div>
      </Card>

      <AccountDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        openEditEmail={() => {
          setIsDetailsModalOpen(false);
          setIsEmailModalOpen(true);
        }}
        name={user.name}
        lastname={user.lastname}
        email={user.email}
      />
      <ChangeEmailModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} email={user.email} />
    </Section>
  );
}

function Detail({ className = '', label, value }: { className?: string; label: string; value: string }): JSX.Element {
  return (
    <div className={`${className} min-w-0 text-gray-80`}>
      <h2 className="truncate text-sm">{label}</h2>
      <h1 className="truncate text-lg font-medium">{value}</h1>
    </div>
  );
}

function AccountDetailsModal({
  isOpen,
  onClose,
  openEditEmail,
  name,
  lastname,
  email,
}: {
  isOpen: boolean;
  onClose: () => void;
  openEditEmail: () => void;
  name: string;
  lastname: string;
  email: string;
}) {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
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

  function validate(value: string) {
    return value.length > 0 && value.length < 20;
  }

  async function onSave() {
    if (!validate(nameValue)) {
      setStatus({ tag: 'error', type: 'NAME_INVALID' });
    } else if (!validate(lastnameValue)) {
      setStatus({ tag: 'error', type: 'LASTNAME_INVALID' });
    } else {
      try {
        setStatus({ tag: 'loading' });
        await dispatch(updateUserProfileThunk({ name: nameValue, lastname: lastnameValue })).unwrap();
        notificationsService.show({
          text: translate('views.account.tabs.account.accountDetails.editProfile.updatedProfile'),
          type: ToastType.Success,
        });
        onClose();
      } catch {
        setStatus({ tag: 'error', type: 'UNKNOWN' });
        notificationsService.show({
          text: translate('views.account.tabs.account.accountDetails.editProfile.errorUpdatingProfile'),
          type: ToastType.Error,
        });
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <h1 className="text-2xl font-medium text-gray-80">
          {translate('views.account.tabs.account.accountDetails.editProfile.title')}
        </h1>
        <div className="flex space-x-3">
          <Input
            disabled={status.tag === 'loading'}
            label={translate('views.account.tabs.account.accountDetails.name') as string}
            value={nameValue}
            onChange={setNameValue}
            accent={nameIsInvalid ? 'error' : undefined}
            message={nameIsInvalid ? 'This name is invalid' : undefined}
            name="firstName"
          />
          <Input
            disabled={status.tag === 'loading'}
            label={translate('views.account.tabs.account.accountDetails.lastname') as string}
            value={lastnameValue}
            onChange={setLastnameValue}
            accent={lastnameIsInvalid ? 'error' : undefined}
            message={lastnameIsInvalid ? 'This lastname is invalid' : undefined}
            name="lastName"
          />
        </div>

        <div className="flex items-end space-x-3">
          <Input
            disabled
            className="flex-1"
            label={translate('views.account.tabs.account.accountDetails.card.email') as string}
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
          <Button loading={status.tag === 'loading'} className="ml-2" onClick={onSave}>
            {status.tag === 'loading' ? translate('actions.saving') : translate('actions.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ChangeEmailModal({ isOpen, onClose, email }: { isOpen: boolean; onClose: () => void; email: string }) {
  const { translate } = useTranslationContext();
  const [password, setPassword] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  const [status, setStatus] = useState<
    | { tag: 'ready' }
    | { tag: 'loading' }
    | { tag: 'error'; type: 'NAME_INVALID' | 'LASTNAME_INVALID' | 'PASSWORD_INVALID' | 'SAME_EMAIL' | 'UNKNOWN' }
  >({ tag: 'ready' });

  useEffect(() => {
    if (isOpen) {
      setStatus({ tag: 'ready' });
    }
  }, [isOpen]);

  async function onChange(e) {
    e.preventDefault();
    if (email === newEmail) {
      setStatus({ tag: 'error', type: 'SAME_EMAIL' });
    } else {
      try {
        setStatus({ tag: 'loading' });
        const correctPassword = await areCredentialsCorrect(email, password);
        if (correctPassword) {
          // TODO -> Send verificaion email
          // Send verification to newEmail
          notificationsService.show({
            text: translate('views.account.tabs.account.accountDetails.changeEmail.sucessSendingVerification', {
              email: newEmail,
            }),
            type: ToastType.Success,
          });
          onClose();
        } else {
          setStatus({ tag: 'error', type: 'PASSWORD_INVALID' });
        }
      } catch {
        setStatus({ tag: 'error', type: 'UNKNOWN' });
        notificationsService.show({
          text: translate('views.account.tabs.account.accountDetails.changeEmail.errorSendingVerification'),
          type: ToastType.Error,
        });
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={onChange}>
        <h1 className="text-2xl font-medium text-gray-80">
          {translate('views.account.tabs.account.accountDetails.changeEmail.title')}
        </h1>

        <div className="flex flex-col space-y-3">
          <Input
            disabled
            label={translate('views.account.tabs.account.accountDetails.changeEmail.email') as string}
            value={email}
            name="email"
          />
          <Input
            required
            variant="email"
            autoComplete="off"
            label={translate('views.account.tabs.account.accountDetails.changeEmail.newEmail') as string}
            onChange={setNewEmail}
            accent={status.tag === 'error' && status.type === 'SAME_EMAIL' ? 'error' : undefined}
            message={
              status.tag === 'error' && status.type === 'SAME_EMAIL'
                ? (translate('views.account.tabs.account.accountDetails.changeEmail.errorSameEmail') as string)
                : undefined
            }
            name="newemail"
          />
          <Input
            required
            disabled={status.tag === 'loading'}
            label={translate('views.account.tabs.account.accountDetails.changeEmail.password') as string}
            variant="password"
            onChange={setPassword}
            accent={status.tag === 'error' && status.type === 'PASSWORD_INVALID' ? 'error' : undefined}
            message={
              status.tag === 'error' && status.type === 'PASSWORD_INVALID'
                ? (translate('views.account.tabs.account.accountDetails.changeEmail.errorPassword') as string)
                : undefined
            }
            name="password"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button disabled={status.tag === 'loading'} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button loading={status.tag === 'loading'} type="submit">
            {status.tag === 'loading'
              ? translate('views.account.tabs.account.accountDetails.changeEmail.sendingVerification')
              : translate('views.account.tabs.account.accountDetails.changeEmail.sendVerification')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
