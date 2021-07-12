import React from 'react';
import { useState } from 'react';
import { IconTypes, IFile } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';
import Item from './Item';
import items from './items.json';
import './FileLogger.scss';

const FileLogger = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinized] = useState(false);
  const files: IFile[] = items;

  const Button = ({ icon, onClick, style = '' }: { icon: IconTypes, onClick: () => void, style?: string }) => {
    return (
      <div className={`flex items-center justify-center h-4 w-4 rounded-full bg-white ml-1.5 cursor-pointer ${style}`}
        onClick={onClick}
      >
        <img src={getIcon(icon)} alt="" />
      </div>
    );
  };

  return (
    <div className={`absolute bottom-0 right-80 flex flex-col w-64 transform duration-300 ${isMinimized ? 'h-9' : 'h-64'} bg-white mr-8 mb-11 rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden': ''}`}>
      <div className='flex justify-between bg-l-neutral-30 px-4 py-2.5 select-none'>
        <span className='text-xs font-semibold text-neutral-90'>Activity</span>

        <div className='flex'>
          <Button icon={IconTypes.DoubleArrowUpBlue} onClick={() => setIsMinized(!isMinimized)} style={`transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`} />
          <Button icon={IconTypes.CrossGray} onClick={() => setIsOpen(false)} />
        </div>
      </div>

      <div className='overflow-y-scroll scrollbar pt-2.5'>
        {
          files.map(file => <Item item={file} key={file.id} />)
        }
      </div>
    </div>
  );
};

export default FileLogger;
