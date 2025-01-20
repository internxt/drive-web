import { Warning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import authService, { generateNew2FA } from 'app/auth/services/auth.service';
import { Button, Loader } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import appStoreIcon from 'app/../assets/icons/app-store.svg';
import playStoreIcon from 'app/../assets/icons/play-store.svg';
import useEffectAsync from 'app/core/hooks/useEffectAsync';
import Copyable from 'app/shared/components/Copyable';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import Input from 'app/shared/components/Input';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const TwoFactorAuthenticationEnableModal = ({
  isOpen,
  onClose,
  onEnabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEnabled: () => void;
}): JSX.Element => {
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
    <div className="pb-5 pt-2">
      <p className="text-gray-80">{translate('views.account.tabs.security.2FA.modal.steps.download.description')}</p>
      <div className="mt-4 flex flex-row items-center justify-center space-x-4">
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
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-sm">
            <img src={qr.img} className="h-40 w-40 object-cover" draggable="false" alt="Bidi code" />
          </div>
          <p className="mx-4 text-gray-50">{translate('views.account.tabs.security.2FA.modal.or')}</p>
          <div className="flex flex-col items-center">
            <Copyable className="w-60" text={qr.key} />
            <p className="mt-2 px-2 text-center text-sm text-gray-60">
              {translate('views.account.tabs.security.2FA.modal.steps.qr.description')}
            </p>
          </div>
        </>
      ) : (
        <Loader classNameLoader="h-7 w-7 text-gray-50" />
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

  async function handleActivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      <form onSubmit={handleActivate}>
        <h1 className="text-2xl font-medium text-gray-80">
          {translate('views.account.tabs.security.2FA.modal.title')}
        </h1>
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
              <Button type="submit" disabled={activateValue.length < 6} loading={activateState === 'loading'}>
                {translate('views.account.tabs.security.2FA.modal.button')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TwoFactorAuthenticationEnableModal;
