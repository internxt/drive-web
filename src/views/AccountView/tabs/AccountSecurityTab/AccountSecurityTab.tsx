import { useEffect, useState } from 'react';

import { generateNew2FA, userHas2FAStored } from '../../../../services/auth.service';
import Deactivate2FA from './DeactivateTwoFactorAuth/DeactivateTwoFactorAuth';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import errorService from '../../../../services/error.service';
import { TwoFactorAuthStep } from '../../../../models/enums';
import activateSteps from './ActivateTwoFactorAuth/steps';
import ActivateTwoFactorAuthSkeleton from '../../../../components/loaders/ActivateTwoFactorAuthSkeleton';

import './AccountSecurityTab.scss';
import screenService from '../../../../services/screen.service';

const AccountSecurityTab = (): JSX.Element => {
  const [isLgScreen, setIsLgScreen] = useState(screenService.isLg());
  const [currentStep, setCurrentStep] = useState(0);
  const [has2FA, setHas2FA] = useState(false);
  const [qr, setQr] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [passwordSalt, setPasswordSalt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pickStep = (selectedStep) => {
    if (currentStep - selectedStep >= -1) {
      setCurrentStep(selectedStep);
    }
  };
  const check2FA = async () => {
    try {
      const has2fa = await userHas2FAStored();

      if (!has2fa) {
        const bidi = await generateNew2FA();

        setQr(bidi.qr);
        setBackupKey(bidi.code);
      } else {
        setHas2FA(true);
        setPasswordSalt(has2fa.sKey);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(i18n.get('error.genericError', { reason: castedError.message }), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };
  const stepButtons = Object.values(TwoFactorAuthStep).map((stepKey, index) => (
    <div
      key={stepKey}
      onClick={() => pickStep(index)}
      className={`${currentStep === index ? 'active' : ''} two-factor-step-button square`}
    >
      <span className="block text-2xl">{index + 1}</span>
      <span className="block flex-1">
        {i18n.get(`views.account.tabs.security.two-factor-auth.steps.${stepKey}.title`)}
      </span>
    </div>
  ));
  const CurrentActivateStepComponent = activateSteps[currentStep].component;
  const currentActivateStepProps = {
    qr,
    backupKey,
    setHas2FA,
  };
  const currentActivateStep = (
    <div className="border border-l-neutral-30 rounded-lg">
      <CurrentActivateStepComponent {...currentActivateStepProps} />
    </div>
  );

  useEffect(() => {
    if (!has2FA) {
      check2FA();
    }
  }, [has2FA]);

  useEffect(() => {
    setIsLgScreen(screenService.isLg());
  });

  return (
    <div className="w-full flex flex-col">
      <h3 className="font-semibold mb-4">{i18n.get('views.account.tabs.security.advice.title')}</h3>
      <p className="mb-8">{i18n.get('views.account.tabs.security.advice.description')}</p>

      {isLoading ? (
        <ActivateTwoFactorAuthSkeleton />
      ) : (
        <div className={`${isLgScreen ? 'max-w-xl' : 'max-w-lg'} mx-auto w-full`}>
          <div className={`${has2FA ? 'hidden' : 'flex'} mb-2`}>{stepButtons}</div>
          {has2FA ? <Deactivate2FA passwordSalt={passwordSalt} setHas2FA={setHas2FA} /> : currentActivateStep}
        </div>
      )}
    </div>
  );
};

export default AccountSecurityTab;
