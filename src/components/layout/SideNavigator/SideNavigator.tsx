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
    <div className={`bg-gray-10 ${isVisible ? 'w-sidenav-1280-open' : 'w-sidenav-1280-closed'} px-8`}>
      <button className={`flex items-center absolute top-4 left-32 transform duration-500 ${isVisible ? 'rotate-0' : 'rotate-180'}`}
        onClick={() => setIsVisible(!isVisible)}
      >
        <img src={getIcon(IconTypes.BackArrows)} alt="" />
      </button>

      <div className={`transform duration-500 ${isVisible ? '' : '-translate-x-3'}`}>
        {isVisible
          ? <div className='absolute -top-8 h-2'><img src={getIcon(IconTypes.InternxtLongLogo)} alt="" /></div>
          : <div className='absolute -top-9 w-4 h-4'><img src={getIcon(IconTypes.InternxtShortLogo)} alt="" /></div>
        }

        <div className='flex flex-col items-start mb-10 mt-12'>
          <span className='h-3 text-xs text-m-neutral-10 font-semibold mb-3'>{isVisible && 'Files'}</span>
          <Option text='Drive' icon={getIcon(IconTypes.FolderWithCrossGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es drive' />
          <Option text='Recents' icon={getIcon(IconTypes.ClockGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es recents' />
        </div>

        <div className={`flex flex-col items-start transform duration-300 ${isVisible ? 'delay-500' : 'delay-500 -translate-y-16'}`}>
          <span className='h-3 text-xs text-m-neutral-10 font-semibold mb-3'>{isVisible && 'Configuration'}</span>
          <Option text='Account' icon={getIcon(IconTypes.AccountGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es account' />
          <Option text='Support' icon={getIcon(IconTypes.SupportGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es support' />
          <Option text='Log out' icon={getIcon(IconTypes.LogOutGray)} hasChildren={true} isOpen={isVisible} tooltipText='Esto es log out' />
        </div>
      </div>
    </div>
  );
};

export default SideNavigator;
