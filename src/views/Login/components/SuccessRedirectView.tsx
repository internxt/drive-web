import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@internxt/ui';
import { CheckCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface SuccessRedirectViewProps {
  title: string;
  description: string;
  redirectSeconds?: number;
  redirectPath?: string;
  buttonText: string;
}

export default function SuccessRedirectView({
  title,
  description,
  redirectSeconds = 10,
  redirectPath = '/login',
  buttonText,
}: Readonly<SuccessRedirectViewProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [countDown, setCountDown] = useState<number>(redirectSeconds);

  useEffect(() => {
    if (countDown > 0) {
      const timer = setInterval(() => {
        setCountDown(countDown - 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    if (countDown === 0) {
      globalThis.location.assign(`${globalThis.location.origin}${redirectPath}`);
    }
  }, [countDown, redirectPath]);

  return (
    <div className="flex flex-col items-center">
      <CheckCircle size={80} className="mb-4 text-primary" weight="thin" />
      <h3 className="font-gray-100 mb-1 text-2xl font-medium">{title}</h3>
      <p className="font-gray-80 font-regular mb-5 text-center text-sm">{description}</p>
      <div className="font-regular mb-2 flex w-full justify-center rounded-lg border border-gray-10 bg-gray-1 p-4 text-sm text-gray-100">
        {translate('auth.recoverAccount.changePassword.emailSent.redirect')}
        <span className="font-medium">&nbsp;{countDown}</span>
      </div>
      <Link to={redirectPath} className="w-full cursor-pointer no-underline">
        <Button variant="primary" className="mb-2 w-full">
          {buttonText}
        </Button>
      </Link>
    </div>
  );
}
