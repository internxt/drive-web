import React from 'react';
import { IconPosition } from '../../models/enums';
import { getIcon, IconType } from '../../services/icon.service';

interface ButtonProps {
  text: string
  width: string
  disabled?: boolean
  textWhenDisabled?: string
  icon?: keyof typeof IconType
  iconPosition?: keyof typeof IconPosition
  onClick?: () => any
}

const ButtonPrimary = ({ text, width, icon, iconPosition, onClick, disabled }: ButtonProps): JSX.Element => {
  return (
    <button className={`flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm ${width} ${iconPosition === 'Right' ? 'flex-row' : 'flex-row-reverse'} transition duration-200 easi-in-out hover:bg-blue-80`}
      onClick={() => onClick && onClick()}
      disabled={disabled}
    >
      <span className={iconPosition === 'Left' ? 'mr-2' : 'ml-2'}>{text}</span>
      <img className={!icon ? 'hidden' : ''} src={icon && getIcon(icon)} alt="" />
    </button>
  );
};

export default ButtonPrimary;