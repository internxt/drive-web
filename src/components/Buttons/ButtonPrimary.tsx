import React from 'react';
import { IconPosition, IconTypes } from '../../models/enums';
import { getIcon } from '../../services/icon.service';

interface ButtonProps {
  text: string
  width: string
  disabled?: boolean
  icon?: IconTypes
  iconPosition?: IconPosition
  onClick?: () => any
}

const ButtonPrimary = ({ text, width, icon, iconPosition, onClick, disabled }: ButtonProps): JSX.Element => {
  return (
    <button className={`flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm ${width} ${iconPosition === IconPosition.Right ? 'flex-row' : 'flex-row-reverse'} transition duration-200 easi-in-out hover:bg-blue-80`}
      onClick={() => onClick && onClick()}
      disabled={disabled}
    >
      <span className={iconPosition === IconPosition.Right ? 'mr-2' : 'ml-2'}>{text}</span>
      <img className={!icon ? 'hidden' : ''} src={icon && getIcon(icon)} alt="" />
    </button>
  );
};

export default ButtonPrimary;