import { useState } from 'react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { areCredentialsCorrect } from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';

import { Button } from '@internxt/ui';
import Card from 'app/shared/components/Card';
import Input from 'app/shared/components/Input';

const EnterPassword = ({
  onUnlock,
  user,
}: {
  onUnlock: (password: string) => void;
  user: UserSettings | undefined;
}): JSX.Element => {
  const { translate } = useTranslationContext();

  const [password, setPassword] = useState('');
  const [formState, setFormState] = useState<
    { tag: 'ready' } | { tag: 'error'; errorMessage: string } | { tag: 'loading' }
  >({ tag: 'ready' });

  const onAccess = async (e) => {
    e.preventDefault();
    try {
      setFormState({ tag: 'loading' });

      if (!user) throw new Error('User is not defined');

      const correctCredentials = await areCredentialsCorrect(password);

      if (correctCredentials) {
        onUnlock(password);
      } else {
        setFormState({ tag: 'error', errorMessage: translate('views.account.tabs.security.lock.errors.incorrect') });
      }
    } catch (err) {
      const error = errorService.castError(err);
      setFormState({ tag: 'error', errorMessage: translate('views.account.tabs.security.lock.errors.notVerified') });
      errorService.reportError(error);
    }
  };

  return (
    <div className="flex w-full justify-center" title={translate('views.account.tabs.security.label')}>
      <Card className="w-2/3 space-y-3">
        <h1 className="text-lg font-medium text-gray-80">{translate('views.account.tabs.security.lock.title')}</h1>
        <p className="text-gray-80">{translate('views.account.tabs.security.lock.description')}</p>
        <form className="flex w-full flex-col items-end space-y-4" onSubmit={onAccess}>
          <Input
            label={translate('views.account.tabs.security.lock.inputLabel')}
            className="w-full"
            variant="password"
            onChange={setPassword}
            value={password}
            message={formState.tag === 'error' ? formState.errorMessage : undefined}
            accent={formState.tag === 'error' ? 'error' : undefined}
            disabled={formState.tag === 'loading'}
          />
          <Button
            variant="secondary"
            loading={formState.tag === 'loading'}
            disabled={!password}
            type="submit"
            dataTest="access-button"
          >
            {translate('actions.access')}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default EnterPassword;
