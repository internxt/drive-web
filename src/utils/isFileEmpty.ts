import { DriveFileData } from 'app/drive/types';

export const isFileEmpty = (file: DriveFileData | File) => {
  if (file instanceof File) return file.size === 0;
  return file.size === 0 || file.fileId === null;
};
