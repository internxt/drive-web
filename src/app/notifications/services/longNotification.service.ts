import { createElement } from 'react';
import toast from 'react-hot-toast';
import LongNotificationToast from '../components/NotificationToast/LongNotificationToast';

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
  requestId?: string;
};

const longNotificationsService = {
  show: ({ text, type, action, duration = 5000, closable = true, requestId }: ToastShowProps): string => {
    const id = toast.custom(
      (t) =>
        createElement(LongNotificationToast, {
          text,
          type,
          visible: t.visible,
          action,
          closable,
          requestId,
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

export default longNotificationsService;
