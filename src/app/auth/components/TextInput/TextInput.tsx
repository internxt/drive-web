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
}: InputProps): JSX.Element {
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
        {...register(label, {
          required,
          minLength,
          min,
          maxLength,
          pattern,
        })}
        className={`relative h-11 w-full py-2 duration-100 ${error ? 'input-error' : 'input-primary'}`}
      />
    </div>
  );
}
