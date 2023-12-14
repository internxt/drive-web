import { CheckCircle, ClockCountdown, Envelope, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Input from 'app/shared/components/Input';
import Button from 'app/shared/components/Button/Button';
import { areCredentialsCorrect } from 'app/auth/services/auth.service';
import Spinner from 'app/shared/components/Spinner/Spinner';
import localStorageService from '../../services/local-storage.service';
import userService from '../../../auth/services/user.service';
import errorService from '../../services/error.service';

type StatusType = 'loading' | 'auth' | 'error' | 'success' | 'expired';

const STATUS = {
  LOADING: 'loading',
  AUTH: 'auth',
  ERROR: 'error',
  SUCCESS: 'success',
  EXPIRED: 'expired',
} as const;

export default function ChangeEmailView(): JSX.Element {
  const { translate } = useTranslationContext();
  const { params } = useRouteMatch<{ token: string }>();
  const { token } = params;
  const urlParams = new URLSearchParams(window.location.search);
  const newEmailParam = urlParams.get('n');

  const [status, setStatus] = useState<StatusType>(STATUS.LOADING);
  const [email, setEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [expired, setExpired] = useState<boolean | null>(null);
  const [auth, setAuth] = useState<boolean>(false);

  async function getInfo() {
    const isExpired = (await userService.checkChangeEmailLinkExpiration(token)).isExpired;

    if (isExpired) {
      setStatus(STATUS.EXPIRED);
      setExpired(true);
    } else {
      setStatus(STATUS.AUTH);
      setExpired(false);

      const user = localStorageService.getUser();
      if (user) setEmail(user.email);
      if (newEmailParam) setNewEmail(newEmailParam);
    }
  }

  useEffect(() => {
    getInfo();
  }, []);

  async function verify(e) {
    e.preventDefault();
    setStatus(STATUS.LOADING);

    try {
      const correctPassword = await areCredentialsCorrect(email, password);
      if (correctPassword) {
        setAuth(true);

        try {
          await userService.verifyEmailChange(token);
          setStatus(STATUS.SUCCESS);
        } catch (error) {
          errorService.reportError(error);
          setStatus(STATUS.ERROR);
        }
      } else {
        setStatus(STATUS.ERROR);
        setAuth(false);
      }
    } catch (error) {
      errorService.reportError(error);
      setStatus(STATUS.ERROR);
    }
  }

  const layout = {
    auth: {
      icon: <Envelope className="text-primary" weight="thin" size={96} />,
      title: translate('views.emailChange.auth.title'),
      subtitle: translate('views.emailChange.auth.subtitle', { email: newEmail }),
    },
    success: {
      icon: <CheckCircle className="text-primary" weight="thin" size={96} />,
      title: translate('views.emailChange.success.title'),
      subtitle: translate('views.emailChange.success.subtitle'),
    },
    error: {
      icon: <WarningCircle className="text-red-std" weight="thin" size={96} />,
      title: translate('views.emailChange.error.title'),
      subtitle: translate('views.emailChange.error.subtitle'),
    },
    expired: {
      icon: <ClockCountdown className="text-gray-50" weight="thin" size={96} />,
      title: translate('views.emailChange.expired.title'),
      subtitle: translate('views.emailChange.expired.subtitle'),
    },
  };

  const cta = {
    success: {
      label: translate('views.emailChange.success.cta'),
      path: '/',
    },
    error: {
      label: translate('views.emailChange.error.cta'),
      path: '/preferences?tab=account',
    },
    expired: {
      label: translate('views.emailChange.expired.cta'),
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
      <div className="flex w-full max-w-xs flex-col items-center space-y-5">
        {status === STATUS.LOADING && expired === null ? (
          <Spinner size={24} />
        ) : !expired && !auth ? (
          <>
            <State {...layout[STATUS.AUTH]} />

            <form className="flex w-full flex-col space-y-3" onSubmit={verify}>
              <Input
                required
                disabled={status === STATUS.LOADING}
                variant="password"
                label={translate('views.emailChange.password')}
                onChange={setPassword}
                autofocus
                accent={status === STATUS.ERROR ? 'error' : undefined}
                message={
                  status === STATUS.ERROR ? (translate('views.emailChange.auth.wrongPassword') as string) : undefined
                }
                name="password"
              />

              <Button loading={status === STATUS.LOADING} type="submit">
                {translate('views.account.tabs.account.accountDetails.changeEmail.sendingVerification')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <State {...layout[status]} />

            <Link
              className="flex h-10 items-center justify-center rounded-lg bg-primary px-5 font-medium text-white no-underline hover:text-white"
              to={cta[status].path}
            >
              {cta[status].label}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
