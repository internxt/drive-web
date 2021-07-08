import React from 'react';

const Header = () => {
  return (
    <div className='px-4'>
      <div className='flex justify-between'>
        <div>this is the input</div>
        <div>this is the users name</div>
      </div>

      <div className='flex justify-between'>
        <div className='flex flex-row bg-blue-30 w-full'>
          <div className='w-7 h-7 bg-gray-30'>
            arr
          </div>

          <div className='w-7 h-7 bg-gray-30'>
            arr
          </div>

          <div>
            <div className='m-0'>Drive</div>
            <p className='m-0 text-supporting-2'>FolderParentName / Downloads / FilesPending</p>
          </div>
        </div>

        <div></div>
      </div>
    </div>
  );
};

export default Header;
