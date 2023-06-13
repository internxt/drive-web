import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { SdkFactory } from '../../factory/sdk';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function VerifyEmailView(): JSX.Element {
  const { translate } = useTranslationContext();
  const { params } = useRouteMatch<{ token: string }>();
  const { token } = params;

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  async function verify() {
    setStatus('loading');

    try {
      const usersClient = SdkFactory.getInstance().createUsersClient();
      await usersClient.verifyEmail({ verificationToken: decodeURIComponent(token) });
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  useEffect(() => {
    verify();
  }, []);

  const layout = {
    success: {
      icon: <CheckCircle className="text-primary" weight="thin" size={96} />,
      title: translate('views.emailVerification.success.title'),
      subtitle: translate('views.emailVerification.success.subtitle'),
    },
    error: {
      icon: <WarningCircle className="text-red-std" weight="thin" size={96} />,
      title: translate('views.emailVerification.error.title'),
      subtitle: translate('views.emailVerification.error.subtitle'),
    },
  };

  const cta = {
    success: {
      label: translate('views.emailVerification.success.cta'),
      path: '/',
    },
    error: {
      label: translate('views.emailVerification.error.cta'),
      path: '/preferences?tab=account',
    },
  };

  const State = ({ icon, title, subtitle }: { icon: JSX.Element; title: string; subtitle: string }) => (
    <div className="flex w-full max-w-xs flex-col items-center space-y-5">
      {icon}

      <div className="flex flex-col items-center space-y-1 text-center">
        <h1 className="text-2xl font-medium text-gray-100">{title}</h1>
        <p className="text-base leading-tight text-gray-80">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-xl flex-col items-center space-y-5">
        {status === 'loading' ? <Spinner size={24} /> : <State {...layout[status]} />}

        {status !== 'loading' && (
          <Link
            className="flex h-10 items-center justify-center rounded-lg bg-primary px-5 font-medium text-white no-underline hover:text-white"
            to={cta[status].path}
          >
            {cta[status].label}
          </Link>
        )}
      </div>
    </div>
  );
}
