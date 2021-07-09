/* eslint-disable */ 

import React from 'react';
import { useState } from 'react';
import { FileStatusTypes, IconTypes } from '../../models/interfaces';
import { getIcon } from '../../services/getIcon';
import Item from './Item';

const Button = ({ icon }: { icon: IconTypes }) => (
  <div className='flex items-center justify-center h-4 w-4 rounded-full bg-white ml-1.5'>
    <img src={getIcon(icon)} alt="" />
  </div>
);

const FileLogger = (): JSX.Element => {
  const [isFolder, setIsFolder] = useState(true);
  const [fileStatus, setFileStatus] = useState(FileStatusTypes.None);

  return (
    <div className='absolute bottom-0 right-9 w-64 h-64 border bg-white'>
      <div className='flex justify-between rounded-t-md bg-l-neutral-30 px-4 py-2.5'>
        <span className='text-xs font-semibold text-neutral-90'>Activity</span>

        <div className='flex'>
          <Button icon={IconTypes.DoubleArrowUpBlue} />
          <Button icon={IconTypes.CrossGray} />
        </div>
      </div>

      <div className=''>
        <Item isFolder={isFolder} fileStatus={fileStatus} />
      </div>
    </div>
  );
};

export default FileLogger;
