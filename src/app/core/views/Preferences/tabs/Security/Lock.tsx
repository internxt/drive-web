import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { areCredentialsCorrect } from '../../../../../auth/services/auth.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import { RootState } from '../../../../../store';
import Section from '../../components/Section';

export default function Lock({
  className = '',
  onUnlock,
}: {
  className?: string;
  onUnlock: (password: string) => void;
}): JSX.Element {
  const { translate } = useTranslationContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  const [password, setPassword] = useState('');
  const [formState, setFormState] = useState<
    { tag: 'ready' } | { tag: 'error'; errorMessage: string } | { tag: 'loading' }
  >({ tag: 'ready' });

  async function onAccess() {
    try {
      setFormState({ tag: 'loading' });

      if (!user) throw new Error('User is not defined');

      const correctCredentials = await areCredentialsCorrect(user.email, password);

      if (correctCredentials) {
        onUnlock(password);
      } else {
        setFormState({ tag: 'error', errorMessage: translate('views.account.tabs.security.lock.errors.incorrect') });
      }
    } catch (err) {
      console.error(err);
      setFormState({ tag: 'error', errorMessage: translate('views.account.tabs.security.lock.errors.notVerified') });
    }
  }

  return (
    <Section className={className} title={translate('views.account.tabs.security.label')}>
      <Card>
        <h1 className="text-lg font-medium text-gray-80">{translate('views.account.tabs.security.lock.title')}</h1>
        <p className="mt-3 text-gray-80">{translate('views.account.tabs.security.lock.description')}</p>
        <Input
          label={translate('views.account.tabs.security.lock.inputLabel') as string}
          className="mt-3"
          variant="password"
          onChange={setPassword}
          value={password}
          message={formState.tag === 'error' ? formState.errorMessage : undefined}
          accent={formState.tag === 'error' ? 'error' : undefined}
          disabled={formState.tag === 'loading'}
        />
        <div className="mt-4 flex justify-end">
          <Button
            loading={formState.tag === 'loading'}
            disabled={!password}
            onClick={onAccess}
            dataTest="access-button"
          >
            {translate('actions.access')}
          </Button>
        </div>
      </Card>
    </Section>
  );
}
