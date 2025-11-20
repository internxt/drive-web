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
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  min?: ValidationRule<number | string>;
  max?: ValidationRule<number | string>;
  placeholder: string;
  pattern?: ValidationRule<RegExp>;
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
}: InputProps): JSX.Element => {
  const isPasswordField =
    label === 'password' || label === 'confirmPassword' || label === 'currentPassword' || label === 'lastPassword';

  return (
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
        className={`w-full py-2 duration-200 ${error ? 'error' : ''}`}
      />

      {isPasswordField && onClick ? (
        <button
          type="button"
          className="absolute bottom-2 right-3 flex cursor-pointer items-center justify-center text-gray-50"
          onClick={onClick}
          aria-label="Toggle password visibility"
        >
          {icon}
        </button>
      ) : (
        icon && <div className="absolute bottom-2 right-3 flex items-center justify-center text-gray-50">{icon}</div>
      )}
    </div>
  );
};

export default React.memo(InputPrimary);
