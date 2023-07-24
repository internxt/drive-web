import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/auth/components/Button/Button';

import { CaretLeft, WarningCircle, Envelope } from '@phosphor-icons/react';

interface RestartAccount {
  setHasBackupKey: Dispatch<SetStateAction<boolean | undefined>>;
}

export default function RestartAccount(props: RestartAccount): JSX.Element {
  const { translate } = useTranslationContext();

  const [isEmailSent, setIsEmailSent] = useState(false);

  const sendAccountRestart = () => {
    setIsEmailSent(true);
  };

  return (
    <>
      {!isEmailSent ? (
        <>
          <span
            onClick={() => props.setHasBackupKey(undefined)}
            className="font-regular mb-1 flex cursor-pointer items-center text-base text-blue-60"
          >
            <CaretLeft size={18} weight="thin" className="mr-0.5" />
            {translate('auth.recoverAccount.title')}
          </span>
          <h3 className="mb-1 text-2xl font-medium">{translate('auth.restartAccount.title')}</h3>
          <p className="font-regular mb-5 text-sm text-gray-80">{translate('auth.restartAccount.description')}</p>
          <div className="font-regular mb-4 flex rounded-md border border-red-br bg-red-bg p-4 text-sm text-red-dark">
            <span className="mr-1.5 pt-0.5">
              <WarningCircle size={18} weight="fill" className="text-red-std" />
            </span>
            <div className="flex flex-col">
              <p className="mb-5">{translate('auth.restartAccount.alert1')}</p>
              <p>{translate('auth.restartAccount.alert2')}</p>
            </div>
          </div>
          <Button
            text={translate('auth.restartAccount.button')}
            loading={false}
            style="button-danger"
            className="w-full bg-red-dark"
            onClick={sendAccountRestart}
          />
        </>
      ) : (
        <div className="flex flex-col items-center">
          <Envelope size={80} className="text-primary" weight="thin" />
          <div className="w-full">
            <h4 className="mt-4 w-full text-center text-xl font-medium">
              {translate('auth.forgotPassword.successTitle')}
            </h4>
            <p className="font-regular mt-1 w-64 w-full text-center text-base text-gray-60">
              {translate('auth.restartAccount.successDescription')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
