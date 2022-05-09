import { useState } from 'react';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Section from '../../components/Section';

export default function Lock({ className = '', onUnlock }: { className?: string; onUnlock: () => void }): JSX.Element {
  const [password, setPassword] = useState('');
  const [formState, setFormState] = useState<
    { tag: 'ready' } | { tag: 'error'; errorMessage: string } | { tag: 'loading' }
  >({ tag: 'ready' });

  function onAccess() {
    setFormState({ tag: 'loading' });
    setTimeout(onUnlock, 1000);
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
