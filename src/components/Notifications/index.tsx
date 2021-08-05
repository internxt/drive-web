import * as Unicons from '@iconscout/react-unicons';
import { toast } from 'react-toastify';

import './toastify.scss';

const SuccessToast = ({ text }: { text: string }): JSX.Element => (
  <div className='flex items-center justify-start'>
    <Unicons.UilCheckCircle />
    <span className='text-neutral-900 ml-2.5'>{text}</span>
  </div>
);

const ErrorToast = ({ text }: { text: string }): JSX.Element => (
  <div className='flex items-center justify-start'>
    <Unicons.UilCheckCircle className="text-white"/>
    <span className='text-white ml-2.5'>{text}</span>
  </div>
);

const InfoToast = ({ text }: { text: string }): JSX.Element => (
  <div className='flex items-center justify-start'>
    <Unicons.UilCheckCircle className="text-white"/>
    <span className='text-white ml-2.5'>{text}</span>
  </div>
);

const WarningToast = ({ text }: { text: string }): JSX.Element => (
  <div className='flex items-center justify-start'>
    <Unicons.UilCheckCircle />
    <span className='text-neutral-900 ml-2.5'>{text}</span>
  </div>
);

const notify = (text: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number): void => {
  if (type === 'success') {
    toast.error(<SuccessToast text={text} />, {
      toastId: 'success',
      autoClose: duration || 3000,
      position: 'bottom-right',
      type: 'success',
      style: { width: '360px', height: 'auto', background: '#42BE65' }
    });
  }

  if (type === 'error') {
    toast.error(<ErrorToast text={text} />, {
      toastId: 'error',
      autoClose: duration || 3000,
      position: 'bottom-right',
      type: 'error',
      style: { width: '360px', height: 'auto', background: '#DA1E28' }
    });
  }

  if (type === 'warning') {
    toast.error(<WarningToast text={text} />, {
      toastId: 'warning',
      autoClose: duration || 3000,
      position: 'bottom-right',
      type: 'warning',
      style: { width: '360px', height: 'auto', background: '#F1C21B' }
    });
  }

  if (type === 'info') {
    toast.error(<InfoToast text={text} />, {
      toastId: 'info',
      autoClose: duration || 3000,
      position: 'bottom-right',
      type: 'warning',
      style: { width: '360px', height: 'auto', background: '#091E42' }
    });
  }
};

export default notify;
