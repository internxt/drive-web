import { useState } from 'react';
import { IconType } from '../../../models/enums';

import { getIcon } from '../../../services/getIcon';

import './InputDialog.scss';

interface InputDialogProps {
  initialState: boolean,
  title: string,
  placeholder: string,
  cancelLabel: string,
  acceptLabel: string,
  onCancel: () => void,
  onAccept: () => void
}

const InputDialog = ({
  initialState,
  title,
  placeholder,
  cancelLabel,
  acceptLabel,
  onCancel,
  onAccept
}: InputDialogProps
) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [inputValue, setInputValue] = useState('');
  const onCancelFn = (() => {
    (onCancel || (() => { }))();
    setIsOpen(false);
  });
  const onAcceptFn = (() => {
    (onAccept || (() => { }))();
    setIsOpen(false);
  });

  return (
    <div className="absolute flex align-middle justify-center w-full h-full">
      {/* BACKGROUND */}
      <div className={`${isOpen ? 'block' : 'hidden'} z-40 absolute opacity-80 bg-m-neutral-100 w-full h-full`}></div>

      {/* PANEL */}
      <div className={`input-dialog-panel ${isOpen ? 'block' : 'hidden'} relative z-50 rounded-lg px-7 py-4 bg-white text-xs`}>
        <div className='flex items-center justify-center w-full'>
          <span className='text-neutral-90 font-semibold text-xs'>{title}</span>

          <img
            src={getIcon(IconType.CrossBlue)}
            alt=""
            className='input-dialog-close-button absolute mr-5 right-0 cursor-pointer'
            onClick={onCancelFn}
          />
        </div>

        <input className='w-full h-7 text-xs mt-4 text-blue-60'
          placeholder={placeholder}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          type="text" />

        <div className='mt-3'>
          <button onClick={onAcceptFn} className='px-3 h-7 text-white font-light bg-blue-60 rounded-sm'>{acceptLabel}</button>
          <button onClick={onCancelFn} className='text-blue-60 font-light ml-4'>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default InputDialog;
