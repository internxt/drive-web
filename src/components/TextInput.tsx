import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import './TextInput.scss';

interface InputProps {
  label?: Path<IFormValues>;
  type?: 'text' | 'email' | 'number';
  disabled?: boolean;
  register?: UseFormRegister<IFormValues>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  placeholder: string;
  pattern?: ValidationRule<RegExp>;
  error?: FieldError;
  min?: ValidationRule<number | string>;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoComplete?: string;
  inputDataCy?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  value?: string;
  style?: React.CSSProperties;
}

export default function TextInput({
  label,
  type = 'text',
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
  inputClassName,
  autoFocus,
  autoComplete,
  inputDataCy,
  onChange,
  onKeyDown,
  value,
  style,
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
        style={style}
        {...(register && label
          ? register(label, {
              required,
              minLength,
              min,
              maxLength,
              pattern,
            })
          : { value, onChange, onKeyDown })}
        className={`${error ? 'inxt-input input-error' : 'inxt-input input-primary'} ${inputClassName || ''}`}
      />
    </div>
  );
}
