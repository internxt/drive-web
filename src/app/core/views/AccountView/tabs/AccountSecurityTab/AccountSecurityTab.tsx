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
import errorService from '../../../../services/error.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import { TwoFactorAuthStep } from '../../../../../auth/types';
import { generateNew2FA, userHas2FAStored } from '../../../../../auth/services/auth.service';

const AccountSecurityTab = (): JSX.Element => {
  const [currentStep, setCurrentStep] = useState(0);
  const [has2FA, setHas2FA] = useState(false);
  const [modal2FA, setModal2FA] = useState(false);
  const [disableModal2FA, setDisableModal2FA] = useState(false);
  const [qr, setQr] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [passwordSalt, setPasswordSalt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [disableSubmit, setDisableSubmit] = useState(false);
  const check2FA = async () => {
    try {
      const { tfaEnabled, encryptedSalt } = await userHas2FAStored();

      if (!tfaEnabled) {
        const { qr, backupKey } = await generateNew2FA();
        setQr(qr);
        setBackupKey(backupKey);
      } else {
        setHas2FA(true);
        setPasswordSalt(encryptedSalt);
        setCurrentStep(0);
        setDisableSubmit(false);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show({
        text: i18n.get('error.genericError', { reason: castedError.message }),
        type: ToastType.Error,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = () => {
    const submit = document.getElementById('submit2fa');
    submit !== null && submit.click();
  };
  const steps = Object.values(TwoFactorAuthStep).map((stepKey) => stepKey);
  const CurrentActivateStepComponent = activateSteps[currentStep].component;
  const currentActivateStepProps = {
    qr,
    backupKey,
    setHas2FA,
  };

  const check2FALenght = () => {
    const minLength = (document.getElementById('input2fa') as HTMLInputElement).value.length >= 6;
    setDisableSubmit(minLength);
  };

  const enableModal = (
    <>
      <div className="flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setModal2FA(true);
          }}
          className="flex flex-row rounded-lg bg-blue-60 px-6 py-2 font-medium text-white"
        >
          Enable 2FA
        </button>
      </div>

      <Transition appear show={modal2FA} as={Fragment} key="enableModal">
        <Dialog
          as="div"
          className="fixed inset-0 z-10 flex h-full w-full flex-col items-center justify-center overflow-y-auto"
          onClose={() => {
            setModal2FA(false);
            setTimeout(() => {
              setCurrentStep(0);
              setDisableSubmit(false);
            }, 200);
          }}
        >
          <div className="flex min-h-screen flex-col items-center justify-center px-4">
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
                className="relative flex w-full max-w-lg transform flex-col space-y-6 rounded-2xl bg-white
                           p-6 shadow-xl transition-all md:w-156"
                onKeyUp={() => {
                  currentStep === steps.length - 1 && check2FALenght();
                }}
              >
                <div className="modal_title flex flex-col">
                  <span className="text-sm font-medium text-neutral-100">
                    {i18n.get('views.account.tabs.security.two-factor-auth.stepsLabel', {
                      current: currentStep + 1,
                      total: steps.length,
                    })}
                  </span>

                  <Dialog.Title as="h3" className="text-xl font-medium text-neutral-700">
                    {i18n.get(`views.account.tabs.security.two-factor-auth.steps.${steps[currentStep]}.title`)}
                  </Dialog.Title>
                </div>

                <div className="modal_body">
                  <CurrentActivateStepComponent {...currentActivateStepProps} />
                </div>

                <div className="modal_actions flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="flex flex-row rounded-md border border-red-20 bg-red-10 px-3.5 py-1.5 text-sm
                               font-medium text-red-60"
                    onClick={() => {
                      setModal2FA(false);
                      setTimeout(() => {
                        setCurrentStep(0);
                        setDisableSubmit(false);
                      }, 200);
                    }}
                  >
                    Cancel
                  </button>

                  <div className="flex flex-row space-x-2">
                    {currentStep >= 1 && (
                      <button
                        type="button"
                        className="flex flex-row rounded-md border border-l-neutral-40 bg-white px-3.5 py-1.5 text-sm
                                  font-medium text-neutral-500"
                        onClick={() => {
                          currentStep >= 1 && setCurrentStep(currentStep - 1);
                        }}
                      >
                        Back
                      </button>
                    )}

                    <button
                      type="button"
                      className={`flex flex-row px-3.5 py-1.5
                                  ${
                                    currentStep === steps.length - 1 && !disableSubmit
                                      ? 'cursor-not-allowed border-blue-30 bg-blue-30'
                                      : 'border-blue-60 bg-blue-60'
                                  }
                                 rounded-md border text-sm font-medium text-white`}
                      onClick={() => {
                        currentStep < steps.length - 1
                          ? setCurrentStep(currentStep + 1)
                          : disableSubmit && handleSubmit();
                      }}
                      disabled={currentStep === steps.length - 1 ? !disableSubmit : false}
                    >
                      {currentStep < steps.length - 1 ? 'Next' : 'Enable 2FA'}
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
          onClick={() => {
            setDisableModal2FA(true);
          }}
          className="flex flex-row rounded-lg bg-red-10 px-6 py-2 font-medium
                     text-red-60 hover:bg-red-20 hover:bg-opacity-50"
        >
          Disable 2FA
        </button>
      </div>

      <Transition appear show={disableModal2FA} as={Fragment} key="diableModal">
        <Dialog
          as="div"
          className="fixed inset-0 z-10 flex h-full w-full flex-col items-center justify-center overflow-y-auto"
          onClose={() => {
            setDisableModal2FA(false);
          }}
        >
          <div className="flex min-h-screen flex-col items-center justify-center px-4">
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
                className="relative flex w-full max-w-lg transform flex-col space-y-6 rounded-2xl bg-white
                           p-6 shadow-xl transition-all md:w-156"
              >
                <div className="modal_title flex flex-col">
                  <Dialog.Title as="h3" className="text-xl font-medium text-neutral-700">
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

  return (
    <>
      {/* Two-Factor Authentication */}
      <div className="mt-10 mb-16 flex w-full flex-col">
        {has2FA && (
          <div
            className="mb-2 flex flex-row items-center justify-center space-x-2 self-start rounded-md bg-green-10
                        px-2.5 py-1 pl-2 text-sm font-medium text-green-60"
          >
            <UilCheckCircle className="h-4 w-4" />
            <span>Enabled</span>
          </div>
        )}
        <h3 className="mb-2 font-semibold">{i18n.get('views.account.tabs.security.advice.title')}</h3>
        <p className="mb-6">{i18n.get('views.account.tabs.security.advice.description')}</p>

        {isLoading ? (
          <ActivateTwoFactorAuthSkeleton />
        ) : (
          <div className="flex w-full flex-col items-center">{has2FA ? disableModal : enableModal}</div>
        )}
      </div>

      <div className="mb-16 flex h-px w-full flex-col bg-neutral-20"></div>

      {/* Password */}
      <div className="flex w-full flex-col">
        <AccountPasswordTab />
      </div>
    </>
  );
};

export default AccountSecurityTab;
