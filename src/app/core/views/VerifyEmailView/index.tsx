import { CheckCircle, WarningOctagon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import Spinner from '../../../shared/components/Spinner/Spinner';
import { SdkFactory } from '../../factory/sdk';

export default function VerifyEmailView(): JSX.Element {
  const { params } = useRouteMatch<{ token: string }>();
  const { token } = params;

  const [state, setState] = useState<'loading' | 'error' | 'success'>('loading');

  async function verify() {
    setState('loading');

    try {
      const usersClient = SdkFactory.getInstance().createUsersClient();
      await usersClient.verifyEmail({ verificationToken: decodeURIComponent(token) });
      setState('success');
    } catch (err) {
      console.error(err);
      setState('error');
    }
  }

  useEffect(() => {
    verify();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-xl flex-col items-center">
        <div className="flex items-center">
          {state === 'loading' && <Spinner className="h-5 w-5" />}
          {state === 'error' && <WarningOctagon className="text-red-std" weight="fill" size={24} />}
          {state === 'success' && <CheckCircle className="text-green" weight="fill" size={24} />}
          <h1 className="ml-2 text-2xl font-medium text-gray-80">
            {state === 'loading'
              ? 'Verifying your email'
              : state === 'error'
              ? 'Something went wrong'
              : 'Email verified'}
          </h1>
        </div>
        {state === 'error' && <p className="mt-4 text-gray-70">We could not verify your email address</p>}
        {(state === 'error' || state === 'success') && (
          <Link className="mt-2 font-medium text-primary no-underline" to="/">
            Go back home
          </Link>
        )}
      </div>
    </div>
  );
}
