import { DriveFileData } from 'app/drive/types';

export const isFileEmpty = (file: DriveFileData | File) => file.size === 0;
