import { ReactSVGElement } from 'react';
import './NotificationToast.scss';

interface ToastProps {
  text: string;
  IconComponent: (props) => ReactSVGElement;
}

const NotificationToast = ({ text, IconComponent }: ToastProps): JSX.Element => (
  <div className='flex items-center justify-start'>
    <IconComponent className="flex-none w-6 h-6" />
    <span className='flex-grow ml-2.5'>{text}</span>
  </div>
);

export default NotificationToast;
