import { CheckCircle, ClockCountdown, Envelope, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useRouteMatch } from 'react-router-dom';
import { areCredentialsCorrect } from '../../../auth/services/auth.service';
import userService from '../../../auth/services/user.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { Button, Loader } from '@internxt/ui';
import Input from '../../../shared/components/Input';
import { uiActions } from '../../../store/slices/ui';
import { userThunks } from '../../../store/slices/user';
import errorService from '../../services/error.service';

type StatusType = 'loading' | 'auth' | 'error' | 'success' | 'expired';

const STATUS = {
  LOADING: 'loading',
  AUTH: 'auth',
  ERROR: 'error',
  SUCCESS: 'success',
  EXPIRED: 'expired',
} as const;

const State = ({ icon, title, subtitle }: { icon: JSX.Element; title: string; subtitle: string }) => (
  <div className="flex w-full max-w-xs flex-col items-center space-y-5">
    {icon}

    <div className="flex flex-col items-center space-y-1 text-center">
      <h1 className="text-2xl font-medium text-gray-100">{title}</h1>
      <p className="text-base leading-tight text-gray-80">{subtitle}</p>
    </div>
  </div>
);

export default function ChangeEmailView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const { params } = useRouteMatch<{ token: string }>();
  const { token } = params;
  const urlParams = new URLSearchParams(window.location.search);
  const newEmailParam = urlParams.get('n');

  const [status, setStatus] = useState<StatusType>(STATUS.LOADING);
  const [newEmail, setNewEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [expired, setExpired] = useState<boolean | null>(null);
  const [auth, setAuth] = useState<boolean>(false);

  async function getInfo() {
    try {
      const isExpired = (await userService.checkChangeEmailLinkExpiration(token)).isExpired;

      if (isExpired) {
        setStatus(STATUS.EXPIRED);
        setExpired(true);
      } else {
        setStatus(STATUS.AUTH);
        setExpired(false);

        if (newEmailParam) setNewEmail(newEmailParam);
      }
    } catch (error) {
      errorService.reportError(error, { extra: { view: 'Change email view', emailLinkExpirationToken: token } });
      setStatus(STATUS.ERROR);
    }
  }

  useEffect(() => {
    getInfo();
  }, []);

  async function verify(e) {
    e.preventDefault();
    setStatus(STATUS.LOADING);

    try {
      const isCorrectPassword = await areCredentialsCorrect(password);
      if (isCorrectPassword) {
        setAuth(true);

        try {
          const { newAuthentication } = await userService.verifyEmailChange(token);
          const { user, token: oldToken, newToken } = newAuthentication;
          dispatch(userThunks.updateUserEmailCredentialsThunk({ newUserData: user, token: oldToken, newToken }));

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
      icon: <WarningCircle className="text-red" weight="thin" size={96} />,
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
      path: '/?preferences=open&section=account&subsection=account',
    },
    expired: {
      label: translate('views.emailChange.expired.cta'),
      path: '/?preferences=open&section=account&subsection=account',
    },
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-xs flex-col items-center space-y-5">
        {status === STATUS.LOADING && expired === null && <Loader size={24} />}
        {!expired && !auth ? (
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
                message={status === STATUS.ERROR ? translate('views.emailChange.auth.wrongPassword') : undefined}
                name="password"
              />

              <Button loading={status === STATUS.LOADING} type="submit">
                {translate('views.account.tabs.account.accountDetails.changeEmail.confirm')}
              </Button>
            </form>
          </>
        ) : (
          <>
            <State {...layout[status]} />

            <Link
              className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 font-medium text-white no-underline hover:text-white"
              to={cta[status]?.path}
              onClick={() => {
                if (status !== STATUS.SUCCESS) dispatch(uiActions.setIsPreferencesDialogOpen(true));
              }}
            >
              {cta[status]?.label}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
