import React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import ReactTooltip from 'react-tooltip';

interface OptionProps {
  text: string,
  icon: string,
  hasChildren: boolean,
  isOpen: boolean,
  tooltipText: string
}

const Option = ({ text, icon, hasChildren, isOpen, tooltipText }: OptionProps): JSX.Element => {
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowChildren(false);
    }
  }, [isOpen]);

  return (
    <div>
      <div className='h-max mb-2 select-none'>
        <div className='flex items-center w-max cursor-pointer'
          onClick={() => {
            if (hasChildren && isOpen) {
              setShowChildren(!showChildren);
            }
          }}
        >
          <div className='flex items-center h-5'>
            <img src={icon} alt="" className='mr-2.5' />
          </div>

          {isOpen
            ? <span className='text-base text-neutral-10' data-for="mainTooltip" data-tip={tooltipText} data-iscapture="true">{text}</span>
            : null
          }
        </div>

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

        <ReactTooltip id='mainTooltip' place='top' type='info' effect='solid'
          className='w-32 h-6 p-0 text-center z-10' />
      </div>
    </div>
  );
};

export default Option;
