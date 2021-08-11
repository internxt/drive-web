import * as Unicons from '@iconscout/react-unicons';
import { toast } from 'react-toastify';

import './toastify.scss';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}
interface ToastProps {
  text: string;
  messageClassName: string;
}

const Toast = ({ text, messageClassName }: ToastProps): JSX.Element => (
  <div className='flex items-center justify-start'>
    <Unicons.UilCheckCircle />
    <span className={`${messageClassName || ''} ml-2.5`}>{text}</span>
  </div>
);

const notify = (text: string, type: ToastType, duration: number = 3000): void => {
  const configByType = {
    success: {
      messageClassName: 'text-neutral-900',
      background: '#42BE65'
    },
    error: {
      messageClassName: 'text-white',
      background: '#DA1E28'
    },
    warning: {
      messageClassName: 'text-neutral-900',
      background: '#F1C21B'
    },
    info: {
      messageClassName: 'text-white',
      background: '#091E42'
    }
  };

  toast.error(<Toast text={text} messageClassName={configByType[type].messageClassName} />, {
    toastId: type,
    autoClose: duration,
    position: 'bottom-right',
    type,
    style: {
      width: '360px',
      height: 'auto',
      background: configByType[type].messageClassName
    }
  });
};

export default notify;
