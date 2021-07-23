import React from 'react';
import { FieldError, Path, UseFormRegister, ValidationRule } from 'react-hook-form';
import { IFormValues } from '../../models/interfaces';

import iconService, { IconType } from '../../services/icon.service';

import './AuthInput.scss';

interface InputProps {
  label: Path<IFormValues>,
  type: string
  register: UseFormRegister<IFormValues>,
  required: boolean,
  minLength?: ValidationRule<string | number> | undefined
  maxLength?: ValidationRule<string | number> | undefined
  placeholder: string,
  pattern?: ValidationRule<RegExp> | undefined
  icon: keyof typeof IconType,
  error: FieldError | undefined
  onClick?: () => void
}

const InputPrimary = ({ label, type, register, required, placeholder, pattern, icon, minLength, maxLength, error, onClick }: InputProps): JSX.Element => (
  <div className='relative flex-1'>
    <input type={type} placeholder={placeholder}
      {...register(label, {
        required,
        minLength,
        maxLength,
        pattern
      })}
      className={`auth-input w-full transform duration-200 mb-2.5 ${error ? 'error' : ''}`}
    />

    <div className={`absolute ${label === 'password' || label === 'confirmPassword' ? 'right-3 bottom-5 cursor-pointer' : 'right-3 bottom-6'} flex items-center justify-center`}
      onClick={() => label === 'password' || label === 'confirmPassword' ? onClick && onClick() : null}
    >
      <img src={iconService.getIcon(icon)} alt="" />
    </div>
  </div >
);

export default React.memo(InputPrimary);
