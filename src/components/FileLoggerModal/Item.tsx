import React from 'react';
import { FileActionTypes, FileStatusTypes, IconTypes, ILoggerFile } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';

interface ItemProps {
  item: ILoggerFile
}

const Item = ({ item }: ItemProps): JSX.Element => {
  const getFileInfo = (): { icon: string, status: string, name: string } => {
    const name = item.filePath.substr(item.filePath.lastIndexOf('/') + 1);
    const infoObj = { icon: '', status: '', name: name };

    switch (item.status) {
      case FileStatusTypes.Uploading:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.ClockGray);
        infoObj.status = item.isFolder ? 'Uploading...' : item.progress + '% Uploading file...';

        return infoObj;

      case FileStatusTypes.Downloading:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.ClockGray);
        infoObj.status = item.isFolder ? 'Downloading files in folder...' : item.progress + '% Downloading file...';

        return infoObj;

      case FileStatusTypes.Success:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.FileSuccessGreen);
        infoObj.status = item.action === FileActionTypes.Download ? 'File downloaded' : 'File uploaded';

        return infoObj;

      case FileStatusTypes.Error:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.FileErrorRed);
        infoObj.status = item.action === FileActionTypes.Download ? 'Error during download' : 'Error during upload';

        return infoObj;

      case FileStatusTypes.Encrypting:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.FileEncryptingGray);
        infoObj.status = item.isFolder ? 'Encrypting files' : 'Encrypting file';

        return infoObj;

      case FileStatusTypes.Decrypting:
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.FileEncryptingGray);
        infoObj.status = item.isFolder ? 'Decrypting files' : 'Decrypting file';

        return infoObj;

      case FileStatusTypes.CreatingDirectoryStructure:
        infoObj.icon = getIcon(IconTypes.ClockGray);
        infoObj.status = 'Creating directory structure';

        return infoObj;

      default: // Pending
        infoObj.icon = item.isFolder ? getIcon(IconTypes.FolderBlue) : getIcon(IconTypes.ClockGray);
        infoObj.status = item.progress + item.action === FileActionTypes.Download ? ' Pending to download' : 'Pending to upload';

        return infoObj;
    }
  };

  return (
    <div className='flex items-center px-4 mb-2.5'>
      <div className='flex items-center justify-center mr-2.5 w-4'>
        <img src={getFileInfo().icon} alt="" />
      </div>

      <div className='flex flex-col text-left w-40'>
        <span className='text-xs text-neutral-900 truncate'>
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
