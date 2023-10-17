import { CheckCircle, ClockCountdown, Envelope, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Input from 'app/shared/components/Input';
import Button from 'app/shared/components/Button/Button';
import { areCredentialsCorrect } from 'app/auth/services/auth.service';
import Spinner from 'app/shared/components/Spinner/Spinner';

export default function ChangeEmailView(): JSX.Element {
  const { translate } = useTranslationContext();
  const { params } = useRouteMatch<{ token: string }>();
  const { token } = params;

  const [status, setStatus] = useState<'auth' | 'loading' | 'error' | 'success' | 'expired'>('loading');
  const [email, setEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [expired, setExpired] = useState<boolean | null>(null);
  const [auth, setAuth] = useState<boolean>(false);

  async function getInfo() {
    // TODO -> Get user "email", "newEmail" and "expired" from the token
    const isExpired = false; //! Check if link has expired

    if (isExpired) {
      setStatus('expired');
      setExpired(true);
    } else {
      setStatus('auth');
      setExpired(false);

      // TODO -> Set info from "email" and "newEmail"
      setEmail('current_email@inxt.com'); //! Change with current email
      setNewEmail('new_email@inxt.com'); //! Change with new email
    }
  }

  useEffect(() => {
    getInfo();
  }, []);

  async function verify(e) {
    e.preventDefault();
    setStatus('loading');

    try {
      const correctPassword = await areCredentialsCorrect(email, password);
      if (correctPassword) {
        try {
          // TODO -> Run changeEmail thunk (if chaged successfully return true, if not return false)
          const emailChanged = true; //! Change for changeEmail thunk

          if (emailChanged) {
            setStatus('success');
            setAuth(true);
          } else {
            setStatus('error');
            setAuth(true);
          }
        } catch (err) {
          console.error(err);
          setStatus('error');
        }
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
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
        {status === 'loading' && expired === null ? (
          <Spinner size={24} />
        ) : !expired && !auth ? (
          <>
            <State {...layout['auth']} />

            <form className="flex w-full flex-col space-y-3" onSubmit={verify}>
              <Input
                required
                disabled={status === 'loading'}
                variant="password"
                label={translate('views.emailChange.password')}
                onChange={setPassword}
                autofocus
                accent={status === 'error' ? 'error' : undefined}
                message={status === 'error' ? (translate('views.emailChange.auth.wrongPassword') as string) : undefined}
                name="password"
              />

              <Button loading={status === 'loading'} type="submit">
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
