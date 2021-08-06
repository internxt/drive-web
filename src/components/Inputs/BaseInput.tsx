import React from 'react';
import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from '../../models/interfaces';

import './BaseInput.scss';

interface InputProps {
  label: Path<IFormValues>,
  type: string
  register: UseFormRegister<IFormValues>,
  required: boolean,
  minLength?: ValidationRule<string | number> | undefined
  maxLength?: ValidationRule<string | number> | undefined
  min?: ValidationRule<number> | undefined
  placeholder: string,
  pattern?: ValidationRule<RegExp> | undefined
  icon?: JSX.Element,
  error: FieldError | undefined
  onClick?: () => void
}

const InputPrimary = ({ label, type, register, required, placeholder, pattern, icon, minLength, maxLength, min, error, onClick }: InputProps): JSX.Element => (
  <div className='relative flex-1'>
    <input type={type} placeholder={placeholder} autoComplete={label === 'email' ? 'email' : 'new-password'} min={0}
      {...register(label, {
        required,
        minLength,
        min,
        maxLength,
        pattern
      })}
      className={`py-2 w-full transform duration-200 mb-2.5 ${error ? 'error' : ''}`}
    />

    <div className={`text-m-neutral-100 absolute ${label === 'password' || label === 'confirmPassword' ? 'right-3 bottom-4 cursor-pointer' : 'right-3 bottom-4'} flex items-center justify-center`}
      onClick={() => label === 'password' || label === 'confirmPassword' || label === 'currentPassword' ? onClick && onClick() && onClick() : null}
    >
      {icon || null}
    </div>
  </div >
);

export default React.memo(InputPrimary);
