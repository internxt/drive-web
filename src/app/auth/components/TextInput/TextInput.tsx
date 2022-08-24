import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import './TextInput.scss';

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
}
const TextInput = ({label, type, disabled, register, minLength, maxLength, placeholder, pattern, error, min, required }:  InputProps ): JSX.Element => {
  return (
    <div className='mb-2.5 relative flex-1'>
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
    </div>
  );
};

export default TextInput;