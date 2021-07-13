import React from 'react';
import { useState } from 'react';
import { IconTypes, ILogger } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';
import Item from './Item';
import './FileLogger.scss';
import { useAppDispatch } from '../../store/hooks';
import { useSelector } from 'react-redux';
import { selectShowFileLogger, showFileLogger } from '../../store/slices/layoutSlice';
import { selectLoggerFiles } from '../../store/slices/filesStateSlice';
/* import FileLogger from '../../services/fileLogger';
 */
const FileLoggerModal = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const isOpen = useSelector(selectShowFileLogger);
  const [isMinimized, setIsMinized] = useState(false);
  const files: ILogger = useSelector(selectLoggerFiles);

  const Button = ({ icon, onClick, style = '' }: { icon: IconTypes, onClick?: () => void, style?: string }) => {
    return (
      <div className={`flex items-center justify-center h-4 w-4 rounded-full bg-neutral-70 cursor-pointer ${style}`}
        onClick={onClick}
      >
        <img src={getIcon(icon)} alt="" />
      </div>
    );
  };

  const handleClose = () => {
    dispatch(showFileLogger(false));
  };

  /* FileLogger.on('new-entry', () => {
    console.log('triggered');
  }); */

  return (
    <div className={`absolute bottom-0 right-80 flex flex-col w-64 transform duration-300 ${isMinimized ? 'h-9' : 'h-64'} bg-white mr-8 mb-11 rounded-md border border-gray-30 overflow-hidden ${!isOpen ? 'hidden' : ''}`}>
      <div className='flex justify-between bg-neutral-900 px-4 py-2.5 rounded-md select-none'>
        <div className='flex w-max'>
          <Button icon={IconTypes.DoubleArrowUpWhite} style={`transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`} />
          <span className='text-xs font-semibold text-white ml-2.5'>Activity</span>
        </div>

        <div className='flex'>
          <Button icon={IconTypes.DoubleArrowUpWhite} onClick={() => setIsMinized(!isMinimized)} style={`mr-1.5 transform duration-500 ${!isMinimized ? 'rotate-180' : 'rotate-0'}`} />
          <Button icon={IconTypes.CrossNeutralBlue} onClick={handleClose} />
        </div>
      </div>

      <div className='overflow-y-scroll scrollbar pt-2.5'>
        {
          Object.values(files).map(file => <Item item={file} key={file.filePath} />)
        }
      </div>
    </div>
  );
};

export default FileLoggerModal;
