import { useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';
import { Question } from '@phosphor-icons/react';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import ChangePassword from 'app/auth/components/ChangePassword/ChangePassword';
import RestartAccount from 'app/auth/components/RestartAccount/RestartAccount';

export default function RecoverAccountView(): JSX.Element {
  const { translate } = useTranslationContext();

  const [hasBackupKey, setHasBackupKey] = useState<boolean | undefined>();

  return (
    <div className="flex h-full w-full flex-col overflow-y-scroll bg-gray-5">
      <div className="flex h-full min-h-[600px] flex-col">
        <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
          <InternxtLogo className="h-auto w-28 text-gray-100" />
        </div>

        <div className="flex h-full flex-grow flex-col items-center justify-center">
          <div className="flex w-96 flex-col rounded-2xl bg-surface p-8 shadow-soft">
            {hasBackupKey === undefined && (
              <>
                <h3 className="font-regular mb-1 text-base text-gray-60">{translate('auth.recoverAccount.title')}</h3>
                <h4 className="text-2xl font-medium text-gray-100">{translate('auth.recoverAccount.subtitle')}</h4>
                <div className="my-5 flex flex-col rounded-2xl border border-gray-10 bg-gray-1 p-4">
                  <h5 className="flex items-center">
                    <span className="mr-1.5">
                      <Question weight="fill" size={18} className="text-primary" />
                    </span>
                    <p className="text-sm font-medium text-gray-80">{translate('auth.recoverAccount.info')}</p>
                  </h5>
                  <ul className="font-regular mt-1 list-disc pl-6 text-sm text-gray-60">
                    <li className="mt-1">{translate('auth.recoverAccount.info1')}</li>
                    <li className="mt-1">{translate('auth.recoverAccount.info2')}</li>
                  </ul>
                </div>
                <Button variant="primary" className="mb-2 w-full" onClick={() => setHasBackupKey(true)}>
                  {translate('auth.recoverAccount.haveKeyButton')}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setHasBackupKey(false)}>
                  {translate('auth.recoverAccount.notKeyButton')}
                </Button>
              </>
            )}
            {hasBackupKey === true && <ChangePassword setHasBackupKey={setHasBackupKey} />}
            {hasBackupKey === false && <RestartAccount setHasBackupKey={setHasBackupKey} />}
          </div>
        </div>

        <div className="flex shrink-0 flex-row justify-center py-8">
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
          <a
            href="https://help.internxt.com"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.help')}
          </a>
        </div>
      </div>
    </div>
  );
}
