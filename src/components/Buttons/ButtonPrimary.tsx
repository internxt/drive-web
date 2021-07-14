import React from 'react';
import { IconPosition, IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';

interface ButtonProps {
  text: string
  width: string
  icon?: IconTypes
  iconPosition?: IconPosition
  onClick?: () => any
}

const ButtonPrimary = ({ text, width, icon, iconPosition, onClick }: ButtonProps): JSX.Element => {
  return (
    <button className={`flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm ${width} ${iconPosition === IconPosition.Right ? 'flex-row' : 'flex-row-reverse'}`}
      onClick={() => onClick}
    >
      <span className={iconPosition === IconPosition.Right ? 'mr-2' : 'ml-2'}>{text}</span>
      <img className={!icon ? 'hidden' : ''} src={icon && getIcon(icon)} alt="" />
    </button>
  );
};

export default ButtonPrimary;
