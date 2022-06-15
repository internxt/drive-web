import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
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
        setFormState({ tag: 'error', errorMessage: 'Incorrect password, please try again' });
      }
    } catch (err) {
      console.error(err);
      setFormState({ tag: 'error', errorMessage: 'We could not verify your password' });
    }
  }

  return (
    <Section className={className} title="Security">
      <Card>
        <h1 className="text-lg font-medium text-gray-80">Enter your password to continue</h1>
        <p className="mt-3 text-gray-80">
          For security reasons, you must enter your password before being able to make any changes on this page.
        </p>
        <Input
          label="Password"
          className="mt-3"
          variant="password"
          onChange={setPassword}
          value={password}
          message={formState.tag === 'error' ? formState.errorMessage : undefined}
          accent={formState.tag === 'error' ? 'error' : undefined}
          disabled={formState.tag === 'loading'}
        />
        <div className="mt-4 flex justify-end">
          <Button loading={formState.tag === 'loading'} disabled={!password} onClick={onAccess}>
            Access
          </Button>
        </div>
      </Card>
    </Section>
  );
}
