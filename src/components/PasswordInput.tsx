/*eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useState } from 'react';
import TextInput, { TextInputProps } from './TextInput';

const PasswordInput = (props: TextInputProps) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  return (
    <div className="relative flex w-full">
      <TextInput
        {...props}
        type={showPassword ? 'text' : 'password'}
        isPasswordInput
        passwordError={props.passwordError}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        disabled={props.disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className={`absolute top-0 right-0 flex h-11 w-11 flex-col items-center justify-center ${
          props.disabled ? 'text-gray-30' : 'text-gray-100'
        } cursor-pointer`}
      >
        {showPassword ? <Eye className="h-6 w-6" /> : <EyeSlash className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default PasswordInput;
