import { createElement } from 'react';
import toast from 'react-hot-toast';
import NotificationToast from '../components/NotificationToast/NotificationToast';

const HALF_SECOND = 500;

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export type ToastShowProps = {
  text: string;
  type?: ToastType;
  action?: { text: string; to?: string; onClick: () => void };
  duration?: number;
  closable?: boolean;
  onUndo?: () => void;
  onFinishDuration?: () => void;
};

const notificationsService = {
  show: ({
    text,
    type,
    action,
    duration = 5000,
    closable = true,
    onUndo,
    onFinishDuration,
  }: ToastShowProps): string => {
    const finishDurationTimeoutId = setTimeout(() => onFinishDuration?.(), duration + HALF_SECOND);

    const id = toast.custom(
      (t) =>
        createElement(NotificationToast, {
          text,
          type,
          visible: t.visible,
          action,
          closable,
          onUndo: onUndo
            ? () => {
                clearTimeout(finishDurationTimeoutId);
                onUndo?.();
                toast.dismiss(id);
              }
            : undefined,
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
