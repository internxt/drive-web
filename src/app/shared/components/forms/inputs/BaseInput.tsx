import { IFormValues } from 'app/core/types';
import React from 'react';
import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';

interface InputProps {
  className?: string;
  label: Path<IFormValues>;
  type: string;
  disabled?: boolean;
  register: UseFormRegister<IFormValues>;
  required: boolean;
  minLength?: ValidationRule<number> | undefined;
  maxLength?: ValidationRule<number> | undefined;
  min?: ValidationRule<number | string> | undefined;
  max?: ValidationRule<number | string> | undefined;
  placeholder: string;
  pattern?: ValidationRule<RegExp> | undefined;
  icon?: JSX.Element;
  error: FieldError | undefined;
  onClick?: () => void;
}

const InputPrimary = ({
  className,
  label,
  disabled,
  type,
  register,
  required,
  placeholder,
  pattern,
  icon,
  minLength,
  maxLength,
  min,
  error,
  onClick,
}: InputProps): JSX.Element => (
  <div className={`${className || ''} relative flex-1`}>
    <input
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={label === 'email' ? 'email' : 'new-password'}
      min={0}
      {...register(label, {
        required,
        minLength,
        min,
        maxLength,
        pattern,
      })}
      className={`py-2 w-full transform duration-200 ${error ? 'error' : ''}`}
    />

    <div
      className={`text-neutral-100 absolute ${
        label === 'password' || label === 'confirmPassword'|| label === 'lastPassword' 
          ? 'right-3 bottom-2 cursor-pointer' 
          : 'right-3 bottom-2'
      } flex items-center justify-center`}
      onClick={() =>
        label === 'password' || label === 'confirmPassword' ||
        label === 'currentPassword' || label === 'lastPassword' ? onClick && onClick() : null
      }
    >
      {icon || null}
    </div>
  </div>
);

export default React.memo(InputPrimary);