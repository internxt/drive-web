import { createElement } from 'react';
import toast from 'react-hot-toast';
import NotificationToast from '../components/NotificationToast/NotificationToast';

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Loading = 'loading',
}

export type ToastShowProps = {
  text: string;
  type?: ToastType;
  action?: { text: string; to?: string; onClick: () => void };
  duration?: number;
  closable?: boolean;
};

const notificationsService = {
  show: ({ text, type, action, duration = 5000, closable = true }: ToastShowProps): string => {
    const id = toast.custom(
      (t) =>
        createElement(NotificationToast, {
          text,
          type,
          visible: t.visible,
          action,
          closable,
          onClose() {
            toast.dismiss(id);
          },
        }),
      { duration },
    );
    return id;
  },
  dismiss: toast.dismiss,
};

export default notificationsService;
