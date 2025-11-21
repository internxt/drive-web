import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

import './PasswordInput.scss';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useState } from 'react';

interface InputProps {
  label: Path<IFormValues>;
  disabled?: boolean;
  register: UseFormRegister<IFormValues>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  placeholder: string;
  pattern?: ValidationRule<RegExp>;
  error?: FieldError;
  min?: ValidationRule<number | string>;
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  autoFocus?: boolean;
  value?: string;
  autoComplete?: string;
  inputDataCy?: string;
}

const PasswordInput = ({
  label,
  disabled,
  register,
  minLength,
  maxLength,
  placeholder,
  pattern,
  error,
  min,
  required,
  onFocus,
  onBlur,
  className,
  autoFocus,
  autoComplete,
  inputDataCy,
}: InputProps): JSX.Element => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`relative flex-1 ${className}`}>
      <input
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
        placeholder={placeholder}
        min={0}
        required={true}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        data-cy={inputDataCy}
        {...register(label, {
          required,
          minLength,
          min,
          maxLength,
          pattern,
        })}
        onFocus={() => {
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        className={error ? 'inxt-input input-error' : 'inxt-input input-primary'}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-gray-100"
      >
        {showPassword ? <Eye className="h-6 w-6" /> : <EyeSlash className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default PasswordInput;
