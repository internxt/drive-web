import { createElement } from 'react';
import toast from 'react-hot-toast';
import NotificationToast from '../components/NotificationToast/NotificationToast';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export type ToastShowProps = {
  text: string;
  type?: ToastType;
  subtitle?: string;
  action?: { text: string; onClick: () => void };
  duration?: number;
};

const notificationsService = {
  show: ({ text, type, subtitle, action, duration = 3000 }: ToastShowProps): string => {
    return toast.custom(
      (t) =>
        createElement(NotificationToast, {
          text,
          type,
          visible: t.visible,
          subtitle,
          action,
        }),
      { duration },
    );
  },
  dismiss: toast.dismiss,
};

export default notificationsService;
