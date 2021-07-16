import React from 'react';
import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import { IFormValues } from '../../views/Authentication';

interface InputProps {
  label: Path<IFormValues>,
  type: string
  register: UseFormRegister<IFormValues>,
  required: boolean,
  minLength?: ValidationRule<string | number> | undefined
  maxLength?: ValidationRule<string | number> | undefined
  placeholder: string,
  pattern?: ValidationRule<RegExp> | undefined
  icon: IconTypes,
  error: FieldError | undefined
  onClick?: () => void
}

const InputPrimary = ({ label, type, register, required, placeholder, pattern, icon, minLength, maxLength, error, onClick }: InputProps): JSX.Element => (
  <div>
    <input type={type} placeholder={placeholder}
      {...register(label, {
        required,
        minLength,
        maxLength,
        pattern
      })}
      className={`w-full transform duration-200 ${error ? 'error' : ''}`}
    />

    <div className={`absolute ${label === 'password' ? 'right-3 bottom-5 cursor-pointer' : 'right-3 bottom-6'} flex items-center justify-center`}
      onClick={() => label === 'password' ? onClick && onClick() : null}
    >
      <img src={getIcon(icon)} alt="" />
    </div>
  </div >
);

export default InputPrimary;
