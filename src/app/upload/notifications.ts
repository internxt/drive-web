import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';

export const notifyUploadFailed = (error: unknown) => {
  const uploadError = errorService.castError(error);
  errorService.reportError(uploadError);
  notificationsService.show({ text: uploadError.message, type: ToastType.Error, requestId: uploadError.requestId });
};
