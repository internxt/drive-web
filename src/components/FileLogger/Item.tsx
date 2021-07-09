import React from 'react';
import { FileStatusTypes, IconTypes } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';

interface ItemProps {
  isFolder: boolean
  fileStatus: FileStatusTypes
}

const Item = ({ isFolder, fileStatus }: ItemProps) => {

  const chooseIcon = (): string => {
    if (isFolder) {
      return getIcon(IconTypes.FolderBlue);
    }
    switch (fileStatus) {
      case FileStatusTypes.Uploading:
        return getIcon(IconTypes.ClockGray);

      case FileStatusTypes.Success:
        return getIcon(IconTypes.FileSuccessGreen);

      case FileStatusTypes.Error:
        return getIcon(IconTypes.FileErrorRed);

      case FileStatusTypes.Encrypting:
        return getIcon(IconTypes.FileEncryptingGray);

      default:
        return getIcon(IconTypes.ClockGray);
    }
  };

  return (
    <div className='flex items-center h-8 px-4 mt-2.5'>
      <div className='flex items-center justify-center mr-2.5'>
        <img src={chooseIcon()} alt="" />
      </div>

      <div className='flex flex-col justify-start'>
        <span className='text-xs text-neutral-90'>
          Folder
        </span>

        <span className='text-supporting-2 text-neutral-50'>
          Downloading...
        </span>
      </div>
    </div>
  );
};

export default Item;
