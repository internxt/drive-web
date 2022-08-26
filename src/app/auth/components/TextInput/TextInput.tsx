import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import './TextInput.scss';
import { useState } from 'react';

interface InputProps {
  label: Path<IFormValues>;
  type: string;
  disabled?: boolean;
  register: UseFormRegister<IFormValues>;
  minLength?: ValidationRule<number> | undefined;
  maxLength?: ValidationRule<number> | undefined;
  placeholder: string;
  pattern?: ValidationRule<RegExp> | undefined;
  error: FieldError | undefined;
  min?: ValidationRule<number | string> | undefined;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}
const TextInput = ({label, type, disabled, register, minLength, maxLength, placeholder, pattern, error, min, required, autoFocus, className, onFocus, onBlur, }:  InputProps ): JSX.Element => {
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`relative flex-1 ${className}`}>
     <input 
      type={type}
      disabled={disabled}
      placeholder={placeholder}
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
      onFocus={() => {
        if (onFocus) onFocus();
          setIsFocused(true);
      }}
      onBlur={() => {
        if (onBlur) onBlur();
        setIsFocused(false);
      }}
      className={`py-2 h-11 w-full transform duration-200 ${error ? 'error' : 'input-primary'}`}
     />
    </div>
  );
};

export default TextInput;