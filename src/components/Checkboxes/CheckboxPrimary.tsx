import React from 'react';
import { Path, UseFormRegister } from 'react-hook-form';
import { IFormValues } from '../../models/interfaces';

interface CheckboxProps {
  label: Path<IFormValues>,
  register: UseFormRegister<IFormValues>,
  required: boolean,
  text: string,
  additionalStyling: string
}

const CheckboxPrimary = ({ label, register, required, text, additionalStyling }: CheckboxProps): JSX.Element => {
  return (
    <label className={`flex w-max items-center cursor-pointer mt-2 mb-3.5 ${additionalStyling}`}>
      <input type="checkbox" placeholder="Remember me" {...register(label, { required })} />
      <span className='text-sm text-neutral-500 ml-3 select-none'>{text}</span>
    </label>
  );
};

export default CheckboxPrimary;
