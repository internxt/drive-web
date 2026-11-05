import { t } from 'i18next';
import { TaskStatus } from 'app/tasks/types';
import { UploadFailureReason } from 'app/upload/types';

const errorSubtitle = (reason?: UploadFailureReason): string | undefined => {
  switch (reason) {
    case UploadFailureReason.ConnectionLost:
      return t('error.connectionLostError') as string;
    case UploadFailureReason.UploadFailed:
    case UploadFailureReason.PlanLimit:
      return t('tasks.subtitles.upload-failed') as string;
    default:
      return undefined;
  }
};

export const errorMerge = (reason?: UploadFailureReason) => {
  const subtitle = errorSubtitle(reason);
  return subtitle !== undefined ? { status: TaskStatus.Error, subtitle } : { status: TaskStatus.Error };
};
