import { t } from 'i18next';
import { TaskStatus } from 'app/tasks/types';
import { UploadErrorReason } from 'app/network/types';

const errorSubtitle = (reason?: UploadErrorReason): string | undefined => {
  switch (reason) {
    case 'connection-lost':
      return t('error.connectionLostError') as string;
    case 'upload-failed':
      return t('tasks.subtitles.upload-failed') as string;
    default:
      return undefined;
  }
};

export const errorMerge = (reason?: UploadErrorReason) => {
  const subtitle = errorSubtitle(reason);
  return subtitle !== undefined ? { status: TaskStatus.Error, subtitle } : { status: TaskStatus.Error };
};
