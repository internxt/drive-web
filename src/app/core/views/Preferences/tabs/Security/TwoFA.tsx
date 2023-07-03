import { CheckCircle, Warning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import authService, {
  deactivate2FA,
  generateNew2FA,
  userHas2FAStored,
} from '../../../../../auth/services/auth.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Modal from '../../../../../shared/components/Modal';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import Section from '../../components/Section';
import appStoreIcon from '../../../../../../assets/icons/app-store.svg';
import playStoreIcon from '../../../../../../assets/icons/play-store.svg';
import useEffectAsync from '../../../../hooks/useEffectAsync';
import Copyable from '../../../../../shared/components/Copyable';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Input from '../../../../../shared/components/Input';
import errorService from '../../../../services/error.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function TwoFA({ className = '', password }: { className?: string; password: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
  const { translate } = useTranslationContext();

  useEffect(() => {
    userHas2FAStored().then(({ tfaEnabled }) => {
      if (tfaEnabled) {
        setStatus('enabled');
      } else {
        setStatus('disabled');
      }
    });
  }, []);

  const [enableModalOpen, setEnableModalOpen] = useState(false);

  const [disableModalOpen, setDisableModalOpen] = useState(false);

  return (
    <Section className={className} title={translate('views.account.tabs.security.2FA.title')}>
      <Card>
        <p className="text-gray-60">{translate('views.account.tabs.security.2FA.description')}</p>
        <div className="mt-3">
          {status === 'enabled' ? (
            <div className="flex">
              <div className="flex items-center font-medium text-green">
                <CheckCircle size={20} weight="fill" />
                <p className="ml-1">{translate('views.account.tabs.security.2FA.enabled')}</p>
                <Button className="ml-4" variant="secondary" onClick={() => setDisableModalOpen(true)}>
                  {translate('views.account.tabs.security.2FA.disable')}
                </Button>
              </div>
            </div>
          ) : status === 'disabled' ? (
            <Button onClick={() => setEnableModalOpen(true)}>
              {translate('views.account.tabs.security.2FA.button')}
            </Button>
          ) : (
            <div className="flex h-10 items-center">
              <Spinner className="block h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </Card>
      <EnableModal
        isOpen={enableModalOpen}
        onClose={() => setEnableModalOpen(false)}
        onEnabled={() => setStatus('enabled')}
      />
      <DisableModal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        onDisabled={() => setStatus('disabled')}
        password={password}
      />
    </Section>
  );
}

function EnableModal({
  isOpen,
  onClose,
  onEnabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEnabled: () => void;
}): JSX.Element {
  const { translate } = useTranslationContext();
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setQR(null);
      setActivateState('ready');
      setActivateValue('');
    }
  }, [isOpen]);

  const [step, setStep] = useState(0);
  const steps = [
    translate('views.account.tabs.security.2FA.modal.steps.download.title'),
    translate('views.account.tabs.security.2FA.modal.steps.qr.title'),
    translate('views.account.tabs.security.2FA.modal.steps.backup-key.title'),
    translate('views.account.tabs.security.2FA.modal.steps.enable.title'),
  ];

  const downloadStep = (
    <div className="pt-2 pb-5">
      <p className="text-gray-80">{translate('views.account.tabs.security.2FA.modal.steps.download.description')}</p>
      <div className="mt-2 flex flex-row items-center justify-center space-x-4">
        <a href="https://apps.apple.com/us/app/authy/id494168017" target="_blank" rel="noreferrer">
          <img src={appStoreIcon} height={40} width={135} alt="App Store" />
        </a>

        <a href="https://play.google.com/store/apps/details?id=com.authy.authy" target="_blank" rel="noreferrer">
          <img src={playStoreIcon} height={40} width={135} alt="Google Play" />
        </a>
      </div>
    </div>
  );

  const [qr, setQR] = useState<null | { img: string; key: string }>(null);

  useEffectAsync(async () => {
    if (!isOpen) return;

    const { qr: img, backupKey: key } = await generateNew2FA();
    setQR({ img, key });
  }, [isOpen]);

  const qrStep = (
    <div className="mb-1 flex h-40 items-center justify-center">
      {qr ? (
        <>
          <img className="-m-3" src={qr.img} alt="Bidi code" />
          <p className="ml-8 text-gray-50">{translate('views.account.tabs.security.2FA.modal.or')}</p>
          <div className="ml-8 flex flex-col items-center">
            <Copyable className="w-60" text={qr.key} />
            <p className="mt-2 px-2 text-center text-sm text-gray-60">
              {translate('views.account.tabs.security.2FA.modal.steps.qr.description')}
            </p>
          </div>
        </>
      ) : (
        <Spinner className="h-7 w-7 text-gray-50" />
      )}
    </div>
  );

  const backupKeyStep = (
    <div className="py-5">
      {qr && <Copyable className="mx-auto w-60" text={qr.key} />}
      <div className="mt-2 flex items-center">
        <Warning size={24} className="text-yellow" style={{ marginLeft: '83px' }} weight="fill" />
        <p className="ml-2 w-64 text-sm text-gray-60">
          {translate('views.account.tabs.security.2FA.modal.steps.backup-key.description')}
        </p>
      </div>
    </div>
  );

  const [activateState, setActivateState] = useState<'ready' | 'error' | 'loading'>('ready');
  const [activateValue, setActivateValue] = useState('');

  async function handleActivate() {
    if (qr) {
      try {
        setActivateState('loading');
        await authService.store2FA(qr.key, activateValue);
        notificationsService.show({ text: translate('success.twoFactorAuthActivated'), type: ToastType.Success });
        onEnabled();
        onClose();
      } catch (err) {
        setActivateState('error');
      }
    }
  }

  const activateStep = (
    <div className="py-5">
      <Input
        label={translate('views.account.tabs.security.2FA.modal.2FALabelCode') as string}
        value={activateValue}
        disabled={activateState === 'loading'}
        accent={activateState === 'error' ? 'error' : undefined}
        onChange={setActivateValue}
        message={
          activateState === 'error'
            ? (translate('views.account.tabs.security.2FA.modal.errors.incorrect') as string)
            : undefined
        }
      />
    </div>
  );

  const parts = [downloadStep, qrStep, backupKeyStep, activateStep];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">{translate('views.account.tabs.security.2FA.modal.title')}</h1>
      <h2 className="mt-5 flex items-center">
        <p className="mt-0.5 text-gray-50">
          {translate('views.account.tabs.security.2FA.modal.stepsLabel', {
            current: step + 1,
            total: steps.length,
          })}
        </p>
        <p className="ml-2 text-xl font-medium text-gray-80">{steps[step]}</p>
      </h2>
      {parts[step]}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={step === 0 ? onClose : () => setStep(step - 1)}
          disabled={activateState === 'loading'}
        >
          {step === 0 ? translate('actions.cancel') : translate('actions.back')}
        </Button>
        <div className="ml-2">
          {step !== steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={qr === null && step === 1}>
              {translate('actions.next')}
            </Button>
          ) : (
            <Button onClick={handleActivate} disabled={activateValue.length < 6} loading={activateState === 'loading'}>
              {translate('views.account.tabs.security.2FA.modal.button')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DisableModal({
  isOpen,
  onClose,
  onDisabled,
  password,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
  password: string;
}): JSX.Element {
  const { translate } = useTranslationContext();
  useEffect(() => {
    if (isOpen) {
      setStatus('ready');
      setAuthCode('');
    }
  }, [isOpen]);

  const [status, setStatus] = useState<'ready' | 'error' | 'loading'>('ready');
  const [authCode, setAuthCode] = useState('');

  async function handleDisable() {
    setStatus('loading');
    try {
      const { encryptedSalt } = await userHas2FAStored();

      await deactivate2FA(encryptedSalt, password, authCode);

      notificationsService.show({ text: translate('success.twoFactorAuthDisabled'), type: ToastType.Success });
      onDisabled();
      onClose();
    } catch (err) {
      setStatus('error');
      const castedError = errorService.castError(err);

      notificationsService.show({ text: castedError.message || translate('error.serverError'), type: ToastType.Error });
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">{translate('views.account.tabs.security.2FA.titleDisable')}</h1>
      <Input
        className="mt-4"
        label={translate('views.account.tabs.security.2FA.modal.2FALabelCode') as string}
        disabled={status === 'loading'}
        accent={status === 'error' ? 'error' : undefined}
        message={
          status === 'error'
            ? (translate('views.account.tabs.security.2FA.modal.errors.incorrect') as string)
            : undefined
        }
        value={authCode}
        onChange={setAuthCode}
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose} variant="secondary" disabled={status === 'loading'}>
          {translate('actions.cancel')}
        </Button>
        <Button className="ml-2" loading={status === 'loading'} onClick={handleDisable} disabled={authCode.length < 6}>
          {translate('actions.disable')}
        </Button>
      </div>
    </Modal>
  );
}
