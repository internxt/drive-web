import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';


import './PasswordInput.scss';




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
  onClick?: () => void;
  icon?: JSX.Element;  
 
}
const PasswordInput = ({label, type, disabled, register, minLength, maxLength, placeholder, pattern, error, min, required, onClick, icon }:  InputProps ): JSX.Element => {



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
      className={`py-2 w-full transform duration-200 ${error ? 'error' : 'input-primary'}`}
     />
    <div
      className={`text-neutral-100 absolute ${
        label === 'password' || label === 'confirmPassword'|| label === 'lastPassword' 
          ? 'right-3 top-3 cursor-pointer' 
          : 'right-3 top-3'
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
};

export default PasswordInput;