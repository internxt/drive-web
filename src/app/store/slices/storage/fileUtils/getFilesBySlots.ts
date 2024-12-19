import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { IRoot } from '../types';

const BATCH_SIZE = 200;

type Files = (DriveFileData | File)[] | (IRoot | DriveFolderData)[];

export const getFilesBySlots = (items: Files): Files[] => {
  const slots: Files[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    slots.push(batch);
  }

  return slots;
};
