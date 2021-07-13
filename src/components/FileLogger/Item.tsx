import React from 'react';

import { FileData } from '../../models/interfaces';
import { FileStatusType } from '../../models/enums';
import { getIcon, IconType } from '../../services/icon.service';

interface ItemProps {
  item: FileData
}

const Item = ({ item }: ItemProps) => {
  const getFileInfo = (): { icon: string, status: string, name: string } => {
    const infoObj = { icon: '', status: '', name: '' };

    switch (item.fileStatus) {
      case FileStatusType.Uploading:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.ClockGray);
        infoObj.status = item.isFolder ? 'Uploading...' : item.progress + '% File uploading...';
        infoObj.name = item.name;

        return infoObj;

      case FileStatusType.Downloading:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.ClockGray);
        infoObj.status = item.isFolder ? 'Downloading files in folder...' : item.progress + '% File uploading...';
        infoObj.name = item.name;

        return infoObj;

      case FileStatusType.Success:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.FileSuccessGreen);
        infoObj.status = 'File downloaded';
        infoObj.name = item.name;

        return infoObj;

      case FileStatusType.Error:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.FileErrorRed);
        infoObj.status = 'Error during upload/download';
        infoObj.name = item.name;

        return infoObj;

      case FileStatusType.Encrypting:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.FileEncryptingGray);
        infoObj.status = item.isFolder ? 'Encrypting files' : 'Encrypting file';
        infoObj.name = item.name;

        return infoObj;

      default:
        infoObj.icon = item.isFolder ? getIcon(IconType.FolderBlue) : getIcon(IconType.ClockGray);
        infoObj.status = item.progress + ' File uploading...';
        infoObj.name = item.name;

        return infoObj;
    }
  };

  return (
    <div className='flex items-center h-8 px-4 mb-2.5'>
      <div className='flex items-center justify-center mr-2.5 w-4'>
        <img src={getFileInfo().icon} alt="" />
      </div>

      <div className='flex flex-col justify-start'>
        <span className='text-xs text-neutral-900'>
          {getFileInfo().name}
        </span>

        <span className='text-supporting-2 text-neutral-500'>
          {getFileInfo().status}
        </span>
      </div>
    </div>
  );
};

export default Item;
