import { AppError } from '@internxt/sdk';
import longNotificationsService from 'app/notifications/services/longNotification.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { STATUS_CODE_ERROR } from '../constants';

export const handleCheckoutError = (error: AppError, defaultErrorMessage: string) => {
  if (error?.status && error?.status >= STATUS_CODE_ERROR.INTERNAL_SERVER_ERROR) {
    notificationsService.show({
      text: defaultErrorMessage,
      type: ToastType.Error,
      requestId: error?.requestId,
    });
  } else {
    longNotificationsService.show({
      type: ToastType.Error,
      text: error?.message,
      requestId: error?.requestId,
    });
  }
};
