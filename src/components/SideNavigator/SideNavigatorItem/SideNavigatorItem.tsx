import React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import ReactTooltip from 'react-tooltip';

import './SideNavigatorItem.scss';

interface SideNavitorItem {
  text: string,
  icon: string,
  hasChildren: boolean,
  isOpen: boolean,
  tooltipText: string
}

const Option = ({ text, icon, hasChildren, isOpen, tooltipText }: SideNavitorItem): JSX.Element => {
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowChildren(false);
    }
  }, [isOpen]);

  return (
    <div>
      <div className='mb-1.5 select-none'>

        <div className='flex w-max cursor-pointer border'
          onClick={() => {
            if (hasChildren && isOpen) {
              setShowChildren(!showChildren);
            }
          }}
        >
          <img src={icon} alt="" className='mr-2' />

          {isOpen
            ? <span className='border' data-for="mainTooltip" data-tip={tooltipText} data-iscapture="true">{text}</span>
            : null
          }

        </div>
        <ReactTooltip className='w-32 h-6 p-0 text-center z-10' id='mainTooltip' place='top' type='info' effect='solid' />

        {showChildren ?
          <div className='pl-4'>
            <div className='flex'>
              <img src={icon} alt="" className='mr-2' />
              {text}
            </div>

            <div className='flex'>
              <img src={icon} alt="" className='mr-2' />
              {text}
            </div>

            <div className='flex'>
              <img src={icon} alt="" className='mr-2' />
              {text}
            </div>
          </div>
          :
          null
        }
      </div>
    </div>
  );
};

export default Option;
