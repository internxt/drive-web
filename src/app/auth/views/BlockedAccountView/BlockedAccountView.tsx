import navigationService from 'app/core/services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import { ShieldWarning } from '@phosphor-icons/react';
import Button from 'app/shared/components/Button/Button';
import { AppView } from 'app/core/types';
import { useEffect, useState } from 'react';
import queryString from 'query-string';

export default function BlockedAccountView(): JSX.Element {
  const { translate } = useTranslationContext();
  const [userEmail, setUserEmail] = useState('');

  const goToRecoveryLink = () => {
    navigationService.push(AppView.RecoveryLink);
  };

  useEffect(() => {
    const queryParameters = navigationService.history.location.search;
    const email = queryString.parse(queryParameters).email as string;
    setUserEmail(email);
  }, []);

  return (
    <div className="bg-surface flex h-full w-full flex-col overflow-auto dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex w-96 flex-col items-center justify-center text-center">
          <ShieldWarning size={80} className="mb-5 text-primary" weight="thin" />
          <h2 className="mb-4 text-3xl font-medium text-gray-100">{translate('blockedAccount.title')}</h2>
          <p className="font-regular mb-4 text-base text-gray-80">{translate('blockedAccount.text1')}</p>
          <p className="font-regular mb-4 text-base text-gray-80">
            {translate('blockedAccount.text2', { email: userEmail })}
          </p>
          <Button
            loading={false}
            variant="secondary"
            className="mb-5 h-11 w-full text-base font-medium"
            onClick={goToRecoveryLink}
          >
            {translate('blockedAccount.forgotPassword')}
          </Button>
          <span className="mb-5 h-px w-72 bg-gray-10"></span>
          <p className="font-regular text-base text-gray-80">
            {translate('blockedAccount.text3')}{' '}
            <span className="cursor-pointer text-primary">{translate('blockedAccount.resend')}</span>
          </p>
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
  );
}
