import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import './TextInput.scss';

interface InputProps {
  label: Path<IFormValues>;
  type: 'text' | 'email' | 'number';
  disabled?: boolean;
  register: UseFormRegister<IFormValues>;
  minLength?: ValidationRule<number> | undefined;
  maxLength?: ValidationRule<number> | undefined;
  placeholder: string;
  pattern?: ValidationRule<RegExp> | undefined;
  error: FieldError | undefined;
  min?: ValidationRule<number | string> | undefined;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoComplete?: string;
  inputDataCy?: string;
}

export default function TextInput({
  label,
  type,
  disabled,
  register,
  minLength,
  maxLength,
  placeholder,
  pattern,
  error,
  min,
  required,
  className,
  autoFocus,
  autoComplete,
  inputDataCy,
}: Readonly<InputProps>): JSX.Element {
  return (
    <div className={`${className}`}>
      <input
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        id={label}
        min={0}
        required={true}
        autoFocus={autoFocus}
        data-cy={inputDataCy}
        {...register(label, {
          required,
          minLength,
          min,
          maxLength,
          pattern,
        })}
        className={error ? 'inxt-input input-error' : 'inxt-input input-primary'}
      />
    </div>
  );
}
