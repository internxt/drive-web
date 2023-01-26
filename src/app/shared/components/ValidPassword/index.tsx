import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { useState } from 'react';
import Input from '../Input';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

export default function ValidPassword({
  className = '',
  label,
  username,
  onChange,
  value,
  disabled,
  dataTest,
}: {
  className?: string;
  label?: string;
  username: string;
  onChange: (payload: { valid: boolean; password: string }) => void;
  value: string;
  disabled?: boolean;
  dataTest?: string;
}): JSX.Element {
  const [state, setState] = useState<{ tag: 'error' | 'warning' | 'success'; label: string } | null>(null);

  const [showIndicator, setShowIndicator] = useState(false);

  function onChangeHandler(input: string) {
    const result = testPasswordStrength(input, username);
    if (!result.valid) {
      setState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? 'Password is not complex enough'
            : 'Password has to be at least 8 characters long',
      });
    } else if (result.strength === 'medium') {
      setState({ tag: 'warning', label: 'Password is weak' });
    } else {
      setState({ tag: 'success', label: 'Password is strong' });
    }

    onChange({ valid: result.valid, password: input });
  }

  return (
    <div className={className}>
      <Input
        variant="password"
        label={label}
        onChange={onChangeHandler}
        onFocus={() => setShowIndicator(true)}
        onBlur={() => setShowIndicator(false)}
        value={value}
        accent={state?.tag}
        disabled={disabled}
        dataTest={dataTest}
      />
      {showIndicator && state && (
        <PasswordStrengthIndicator className="mt-2" strength={state.tag} label={state.label} />
      )}
    </div>
  );
}
