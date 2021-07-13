import { useState } from 'react';

import { getIcon, IconType } from '../../../services/icon.service';

import './MessageDialog.scss';

interface MessageDialogProps {
  initialState: boolean,
  title: string,
  message: string,
  cancelLabel: string,
  acceptLabel: string,
  onCancel: () => void,
  onAccept: () => void
}

const MessageDialog = ({
  initialState,
  title,
  message,
  cancelLabel,
  acceptLabel,
  onCancel,
  onAccept
}: MessageDialogProps
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
      <div className={`${isOpen ? 'block' : 'hidden'} z-40 absolute opacity-50 bg-black w-full h-full`}></div>

      {/* PANEL */}
      <div className={`message-dialog-panel ${isOpen ? 'block' : 'hidden'} relative z-50 rounded-lg px-7 py-4 bg-white text-xs`}>
        <div className='flex items-center justify-center w-full'>
          <span className='text-neutral-90 font-semibold text-xs'>{title}</span>

          <img
            src={getIcon(IconType.CrossBlue)}
            alt=""
            className='message-dialog-close-button absolute mr-5 right-0 cursor-pointer'
            onClick={onCancelFn}
          />
        </div>

        <span className='text-center block w-full text-xs mt-4'>
          {message}
        </span>

        <div className='mt-3 flex justify-center'>
          <button onClick={onAcceptFn} className='px-3 h-7 text-white font-light bg-blue-60 rounded-sm'>{acceptLabel}</button>
          <button onClick={onCancelFn} className='px-3 stext-blue-60 font-light ml-4'>{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default MessageDialog;
