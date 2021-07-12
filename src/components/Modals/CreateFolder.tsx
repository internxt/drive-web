import React from 'react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconTypes } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';
import { RootState } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { showCreateFolder } from '../../store/slices/layoutSlice';

const selectIsOpen = (state: RootState) => state.layout.showCreateFolder;

const CreateFolder = () => {
  const [folderName, setFolderName] = useState('');
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(useSelector(selectIsOpen));

  const handleFolderCreation = () => {
    console.log('folder created with name:', folderName);
  };

  const handleClose = () => {
    setIsOpen(false);
    dispatch(showCreateFolder(false));
  };

  return (
    <div className={`${isOpen ? 'flex' : 'hidden'} flex-col w-64 rounded-lg px-7 py-4 bg-white z-20 text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2`}>
      <div className='relative flex items-center justify-center w-full'>
        <span className='text-neutral-90 font-semibold'>Create folder</span>

        <div className='absolute right-0 cursor-pointer' onClick={handleClose}>
          <img src={getIcon(IconTypes.CrossBlue)} alt="" />
        </div>
      </div>

      <input className='rounded-sm h-7 text-xs mt-4 p-3 text-blue-60 ring-1 ring-l-neutral-40 focus:ring-blue-60'
        placeholder='Enter folder name'
        onChange={e => setFolderName(e.target.value)}
        type="text" />

      <div className='mt-2'>
        <button onClick={handleFolderCreation} className='w-16 h-7 text-white font-light bg-blue-60 rounded-sm'>Create</button>
        <button onClick={handleClose} className='text-blue-60 font-light ml-4'>Cancel</button>
      </div>
    </div>
  );
};

export default CreateFolder;
