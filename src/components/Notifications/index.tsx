import * as Unicons from '@iconscout/react-unicons';
import { uniqueId } from 'lodash';
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
  IconComponent: any;
  messageClassName: string;
}

const Toast = ({ text, IconComponent, messageClassName }: ToastProps): JSX.Element => (
  <div className='flex items-center justify-start'>
    <IconComponent className="w-6 min-w-max h-6" />
    <span className={`${messageClassName || ''} flex-grow ml-2.5`}>{text}</span>
  </div>
);

const notify = (text: string, type: ToastType, duration: number = 3000): void => {
  const configByType = {
    success: {
      messageClassName: 'text-neutral-900',
      background: '#42BE65',
      icon: Unicons.UilCheckCircle
    },
    error: {
      messageClassName: 'text-white',
      background: '#DA1E28',
      icon: Unicons.UilTimesCircle
    },
    warning: {
      messageClassName: 'text-neutral-900',
      background: '#F1C21B',
      icon: Unicons.UilExclamationTriangle
    },
    info: {
      messageClassName: 'text-white',
      background: '#091E42',
      icon: Unicons.UilInfoCircle
    }
  };

  toast.info(<Toast
    text={text}
    IconComponent={configByType[type].icon}
    messageClassName={configByType[type].messageClassName}
  />, {
    toastId: uniqueId(),
    autoClose: duration,
    position: 'bottom-right',
    hideProgressBar: true,
    type,
    style: {
      height: 'auto',
      background: configByType[type].messageClassName
    }
  });
};

export default notify;
