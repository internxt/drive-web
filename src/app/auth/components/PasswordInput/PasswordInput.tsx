import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';

import './PasswordInput.scss';
import { Eye, EyeSlash } from 'phosphor-react';
import { useState } from 'react';

interface InputProps {
  label: Path<IFormValues>;
  disabled?: boolean;
  register: UseFormRegister<IFormValues>;
  minLength?: ValidationRule<number> | undefined;
  maxLength?: ValidationRule<number> | undefined;
  placeholder: string;
  pattern?: ValidationRule<RegExp> | undefined;
  error: FieldError | undefined;
  min?: ValidationRule<number | string> | undefined;
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  autoFocus?: boolean;
  value?: string;
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
        autoComplete="new-password"
        {...register(label, {
          required,
          onChange: (e) => {
            if (e.target.value.length > 0) {
              localStorage.setItem('password', e.target.value);
            }
          },
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
        className={`h-11 w-full py-2 duration-100 ${error ? 'input-error' : 'input-primary'}`}
      />
      <div
        onClick={() => setShowPassword(!showPassword)}
        onKeyDown={(e) => (e['code'] === 'Space' || e['code'] === 'Enter') && setShowPassword(!showPassword)}
        tabIndex={0}
        className="absolute right-4 top-1/2 flex -translate-y-1/2 transform cursor-pointer items-center justify-center text-gray-100"
      >
        {showPassword ? <Eye className="h-6 w-6" /> : <EyeSlash className="h-6 w-6" />}
      </div>
    </div>
  );
};

export default PasswordInput;
