import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import Deactivate2FA from './DeactivateTwoFactorAuth/DeactivateTwoFactorAuth';
import activateSteps from './ActivateTwoFactorAuth/steps';

import './AccountSecurityTab.scss';
// eslint-disable-next-line max-len
import ActivateTwoFactorAuthSkeleton from 'app/auth/components/ActivateTwoFactorAuthSkeleton/ActivateTwoFactorAuthSkeleton';
import AccountPasswordTab from '../AccountPasswordTab/AccountPasswordTab';
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle';
import i18n from '../../../../../i18n/services/i18n.service';
// import screenService from '../../../../services/screen.service';
import errorService from '../../../../services/error.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { TwoFactorAuthStep } from '../../../../../auth/types';
import { generateNew2FA, userHas2FAStored } from '../../../../../auth/services/auth.service';

const AccountSecurityTab = (): JSX.Element => {
  // const [isLgScreen, setIsLgScreen] = useState(screenService.isLg());
  const [currentStep, setCurrentStep] = useState(0);
  const [has2FA, setHas2FA] = useState(false);
  const [modal2FA, setModal2FA] = useState(false);
  const [disableModal2FA, setDisableModal2FA] = useState(false);
  const [qr, setQr] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [passwordSalt, setPasswordSalt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const check2FA = async () => {
    try {
      const { has2fa, data } = await userHas2FAStored();

      if (!has2fa) {
        const bidi = await generateNew2FA();

        setQr(bidi.qr);
        setBackupKey(bidi.code);
      } else {
        setHas2FA(true);
        setPasswordSalt(data.sKey);
        setCurrentStep(0);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(i18n.get('error.genericError', { reason: castedError.message }), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = () => {
    const submit = document.getElementById('submit2fa');
    submit !== null && submit.click();
  };
  const steps = Object.values(TwoFactorAuthStep).map(stepKey => stepKey);
  const CurrentActivateStepComponent = activateSteps[currentStep].component;
  const currentActivateStepProps = {
    qr,
    backupKey,
    setHas2FA,
  };

  const enableModal = (
    <>
      <div className="flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => { setModal2FA(true); }}
          className="flex flex-row px-6 py-2 bg-blue-60 text-white font-medium rounded-lg"
        >
          Enable 2FA
        </button>
      </div>

      <Transition
        appear
        show={modal2FA}
        as={Fragment}
        key="enableModal"
      >
        <Dialog
          as="div"
          className="fixed flex flex-col w-full h-full items-center justify-center inset-0 z-10 overflow-y-auto"
          onClose={() => { setModal2FA(false); setTimeout(() => { setCurrentStep(0); }, 200); }}
        >
          <div className="flex flex-col min-h-screen px-4 items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay
                className={`fixed inset-0 bg-neutral-900 ${modal2FA ? 'bg-opacity-40' : 'bg-opacity-0'}
                            transition duration-200 ease-in-out`}
              />
            </Transition.Child>

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div
                className="relative flex flex-col w-full md:w-156 max-w-lg transition-all transform bg-white
                           p-6 shadow-xl rounded-2xl space-y-6"
              >
                
                <div className="modal_title flex flex-col">
                  <span className="text-sm font-medium text-m-neutral-100">
                    {i18n.get('views.account.tabs.security.two-factor-auth.stepsLabel',
                      { current: currentStep + 1, total: steps.length })
                    }
                  </span>

                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium text-neutral-700"
                  >
                    {i18n.get(`views.account.tabs.security.two-factor-auth.steps.${steps[currentStep]}.title`)}
                  </Dialog.Title>
                </div>

                <div className="modal_body">
                  <CurrentActivateStepComponent {...currentActivateStepProps} />
                </div>

                <div className="modal_actions flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="flex flex-row px-3.5 py-1.5 bg-red-10 text-red-60 text-sm font-medium rounded-md
                               border border-red-20"
                    onClick={() => { setModal2FA(false); setTimeout(() => { setCurrentStep(0); }, 200); }}
                  >
                    Cancel
                  </button>

                  <div className="flex flex-row space-x-2">
                    { currentStep >= 1 &&
                      <button
                        type="button"
                        className="flex flex-row px-3.5 py-1.5 bg-white text-neutral-500 text-sm font-medium rounded-md
                                  border border-l-neutral-40"
                        onClick={() => { currentStep >= 1 && setCurrentStep(currentStep -1); }}
                      >
                        Back
                      </button>
                    }

                    <button
                      type="button"
                      className="flex flex-row px-3.5 py-1.5 bg-blue-60 text-white text-sm font-medium rounded-md
                                border border-blue-60"
                      onClick={() => {
                        currentStep < (steps.length - 1) ?
                        setCurrentStep(currentStep + 1)
                        :
                        handleSubmit();}
                      }
                    >
                      { currentStep < 3 ? 'Next' : 'Enable 2FA'}
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );

  const disableModal = (
    <>
      <div className="flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => { setDisableModal2FA(true); }}
          className="flex flex-row px-6 py-2 bg-l-neutral-20 text-m-neutral-300 font-medium rounded-lg"
        >
          Disable 2FA
        </button>
      </div>

      <Transition
        appear
        show={disableModal2FA}
        as={Fragment}
        key="diableModal"
      >
        <Dialog
          as="div"
          className="fixed flex flex-col w-full h-full items-center justify-center inset-0 z-10 overflow-y-auto"
          onClose={() => { setDisableModal2FA(false); }}
        >
          <div className="flex flex-col min-h-screen px-4 items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay
                className={`fixed inset-0 bg-neutral-900 ${disableModal2FA ? 'bg-opacity-40' : 'bg-opacity-0'}
                            transition duration-200 ease-in-out`}
              />
            </Transition.Child>

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div
                className="relative flex flex-col w-full md:w-156 max-w-lg transition-all transform bg-white
                           p-6 shadow-xl rounded-2xl space-y-6"
              >
                
                <div className="modal_title flex flex-col">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-medium text-neutral-700"
                  >
                    {i18n.get('views.account.tabs.security.two-factor-auth.steps.disable.title')}
                  </Dialog.Title>
                </div>

                <div className="modal_body">
                  <Deactivate2FA passwordSalt={passwordSalt} setHas2FA={setHas2FA} />
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );

  useEffect(() => {
    if (!has2FA) {
      check2FA();
    }
  }, [has2FA]);

  // useEffect(() => {
  //   setIsLgScreen(screenService.isLg());
  // });

  return (
    <>
      {/* Two-Factor Authentication */}
      <div className="w-full flex flex-col mt-10 mb-16">
        {has2FA &&
          <div className="flex flex-row self-start items-center justify-center px-3 py-1 bg-green-10
                        text-green-60 text-sm font-medium rounded-md mb-2 space-x-2">
            <UilCheckCircle className="w-4 h-4" />
            <span>Enabled</span>
          </div>
        }
        <h3 className="font-semibold mb-2">{i18n.get('views.account.tabs.security.advice.title')}</h3>
        <p className="mb-6">{i18n.get('views.account.tabs.security.advice.description')}</p>

        {isLoading ? (
          <ActivateTwoFactorAuthSkeleton />
        ) : (
          <div className="flex flex-col w-full items-center">
            {has2FA ? disableModal : enableModal}
          </div>
        )}
      </div>

      <div className="flex flex-col w-full h-px bg-l-neutral-20 mb-16"></div>

      {/* Password */}
      <div className="w-full flex flex-col">
          <AccountPasswordTab />
      </div>
    </>
  );
};

export default AccountSecurityTab;
