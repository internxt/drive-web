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

const ButtonPrimary = ({ text, textWhenDisabled, width, icon, iconPosition, onClick, disabled }: ButtonProps): JSX.Element => {
  return (
    <button className={`flex items-center justify-center ${disabled ? 'bg-blue-30 cursor-default' : 'bg-blue-60 transition duration-200 easi-in-out hover:bg-blue-80'} py-2 rounded text-white text-sm ${width} ${iconPosition === 'Right' ? 'flex-row' : 'flex-row-reverse'}`}
      onClick={() => onClick && onClick()}
      disabled={disabled}
    >
      <span className={iconPosition === 'Left' ? 'mr-2' : 'ml-2'}>{textWhenDisabled ? textWhenDisabled : text}</span>
      <img className={!icon ? 'hidden' : ''} src={icon && getIcon(icon)} alt="" />
    </button>
  );
};

export default ButtonPrimary;