import React, { SetStateAction } from 'react';
import { getIcon } from '../../../services/getIcon';
import { IconTypes } from '../../../models/interfaces';
import Option from './Option';

interface SideNavigatorProps {
  isVisible: boolean,
  setIsVisible: React.Dispatch<SetStateAction<boolean>>
}

const SideNavigator = ({ isVisible, setIsVisible }: SideNavigatorProps) => {

  return (
    <div className={`bg-gray-10 ${isVisible ? 'w-sidenav-1280-open' : 'w-sidenav-1280-closed'} pt-10`}>
      <button className={`flex items-center absolute top-3 left-3 ${isVisible ? 'transform rotate-0 duration-500' : 'transform rotate-180 duration-500'}`}
        onClick={() => setIsVisible(!isVisible)}
      >
        <img src={getIcon(IconTypes.BackArrows)} alt="" width='16' height='16' />
      </button>

      <Option text='Drive' icon={getIcon(IconTypes.FolderWithCrossGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es drive' />
      <Option text='Recents' icon={getIcon(IconTypes.ClockGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es recents' />
      <Option text='Account' icon={getIcon(IconTypes.AccountGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es account' />
      <Option text='Support' icon={getIcon(IconTypes.SupportGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es support' />
      <Option text='Log out' icon={getIcon(IconTypes.LogOutGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es log out' />
    </div>
  );
};

export default SideNavigator;
