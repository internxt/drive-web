import React from 'react';
import { IconTypes } from '../../models/enums';

interface InputProps {
  style?: string,
  type: string,
  placeholder?: string,
  icon?: IconTypes
}

const InputPrimary = ({ type, placeholder }: InputProps): JSX.Element => {
  return (
    <input className='w-full'
      type={type}
      placeholder={placeholder}
    />
  );
};

export default InputPrimary;
