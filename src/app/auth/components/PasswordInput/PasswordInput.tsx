import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';


import './PasswordInput.scss';
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
  icon?: JSX.Element;  
  onChange?: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className? : string;
 
}
const PasswordInput = ({label, type, disabled, register, minLength, maxLength, placeholder, pattern, error, min, required, icon, onChange, onFocus, onBlur, className }:  InputProps ): JSX.Element => {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className='relative flex-1'>
     <input 
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      min={0}
      required={true}
     
      {...register(label, {
        required,
        minLength,
        min,
        maxLength,
        pattern,
      })}
      //onChange={onChange?(e) => onChange && onChange(e.target.value) : undefined}
      onFocus={() => {
        if (onFocus) onFocus();
          setIsFocused(true);
      }}
      onBlur={() => {
        if (onBlur) onBlur();
        setIsFocused(false);
      }}
      className={`py-2 w-full h-11 transform duration-200 ${className} ${error ? 'error' : 'input-primary'}`}
     />
    <div
      className={`text-neutral-100 absolute ${
        label === 'password' || label === 'confirmPassword'|| label === 'lastPassword' 
          ? 'right-3 top-3 cursor-pointer' 
          : 'right-3 top-3'
      } flex items-center justify-center`}
    >
    {icon || null}
    </div>
   </div>
  );
};

export default PasswordInput;