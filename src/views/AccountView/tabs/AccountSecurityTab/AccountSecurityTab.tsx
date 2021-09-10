import { useEffect, useState } from 'react';
import { Fragment } from 'react';

import { generateNew2FA, userHas2FAStored } from '../../../../services/auth.service';
import Deactivate2FA from './DeactivateTwoFactorAuth/DeactivateTwoFactorAuth';
import Steps from './ActivateTwoFactorAuth/steps';
import Skeleton from 'react-loading-skeleton';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import errorService from '../../../../services/error.service';
import { TwoFactorAuthStep } from '../../../../models/enums';
import activateSteps from './ActivateTwoFactorAuth/steps';

import './AccountSecurityTab.scss';

const AccountSecurityTab = (): JSX.Element => {
  const [currentStep, setCurrentStep] = useState(1);
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
    <button
      onClick={() => pickStep(index)}
      className={`${currentStep === index ? 'active' : ''} two-factor-step-button square`}
    >
      <span className="block">{index + 1}</span>
      <span className="block">{i18n.get(`views.account.tabs.security.two-factor-auth.steps.${stepKey}.title`)}</span>
    </button>
  ));
  const CurrentActivateStepComponent = activateSteps[currentStep].component;
  const currentActivateStepProps = {
    qr,
    backupKey,
    setHas2FA,
  };
  const currentActivateStep = <CurrentActivateStepComponent {...currentActivateStepProps} />;

  useEffect(() => {
    if (!has2FA) {
      check2FA();
    }
  }, [has2FA]);

  return (
    <div className="w-full flex flex-col border">
      <h3 className="font-semibold mb-4">{i18n.get('views.account.tabs.security.advice.title')}</h3>
      <p className="mb-8">{i18n.get('views.account.tabs.security.advice.description')}</p>

      {isLoading ? (
        <Skeleton width={400} height={50} />
      ) : (
        <Fragment>
          <div className={`${has2FA ? 'hidden' : 'flex'} border`}>{stepButtons}</div>
          {has2FA ? <Deactivate2FA passwordSalt={passwordSalt} setHas2FA={setHas2FA} /> : currentActivateStep}
        </Fragment>
      )}
    </div>
  );
};

export default AccountSecurityTab;
