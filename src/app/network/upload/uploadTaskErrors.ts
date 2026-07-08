import { t } from 'i18next';
import { TaskStatus } from 'app/tasks/types';

export type UploadTaskErrorReason = 'connection-lost' | 'upload-failed';

const errorSubtitle = (reason?: UploadTaskErrorReason): string | undefined => {
  switch (reason) {
    case 'connection-lost':
      return t('error.connectionLostError') as string;
    case 'upload-failed':
      return t('tasks.subtitles.upload-failed') as string;
    default:
      return undefined;
  }
};

export const errorMerge = (reason?: UploadTaskErrorReason) => {
  const subtitle = errorSubtitle(reason);
  return subtitle !== undefined ? { status: TaskStatus.Error, subtitle } : { status: TaskStatus.Error };
};
