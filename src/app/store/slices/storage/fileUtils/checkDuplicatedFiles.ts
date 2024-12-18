import { items as itemUtils } from '@internxt/lib';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from '../../../../drive/services/new-storage.service';
import { BATCH_SIZE } from './prepareFilesToUpload';

export interface DuplicatedFilesResult {
  duplicatedFilesResponse: DriveFileData[];
  filesWithDuplicates: (File | DriveFileData)[];
  filesWithoutDuplicates: (File | DriveFileData)[];
}

const getDuplicatedFilesBySlots = (files: ParsedFile[]): ParsedFile[][] => {
  const slots: ParsedFile[][] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    slots.push(batch);
  }

  return slots;
};

export const checkDuplicatedFiles = async (
  files: (File | DriveFileData)[],
  parentFolderId: string,
): Promise<DuplicatedFilesResult> => {
  if (files.length === 0) {
    return {
      duplicatedFilesResponse: [],
      filesWithDuplicates: [],
      filesWithoutDuplicates: files,
    } as DuplicatedFilesResult;
  }

  const parsedFiles = files.map(parseFile);
  const slots = getDuplicatedFilesBySlots(parsedFiles);

  const promises = slots.map((slot) => newStorageService.checkDuplicatedFiles(parentFolderId, slot));

  const checkDuplicatedFiles = await Promise.all(promises);

  const duplicatedFilesResponse = checkDuplicatedFiles.reduce<DriveFileData[]>(
    (allFiles, cur) => [...allFiles, ...cur.existentFiles],
    [],
  );

  const { filesWithDuplicates, filesWithoutDuplicates } = parsedFiles.reduce(
    (acc, parsedFile) => {
      const isDuplicated = duplicatedFilesResponse.some(
        (duplicatedFile) =>
          duplicatedFile.plainName === parsedFile.plainName && duplicatedFile.type === parsedFile.type,
      );

      if (isDuplicated) {
        acc.filesWithDuplicates.push(parsedFile.originalFile);
      } else {
        acc.filesWithoutDuplicates.push(parsedFile.originalFile);
      }

      return acc;
    },
    { filesWithDuplicates: [], filesWithoutDuplicates: [] } as {
      filesWithDuplicates: (File | DriveFileData)[];
      filesWithoutDuplicates: (File | DriveFileData)[];
    },
  );

  return { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates };
};

interface ParsedFile {
  plainName: string;
  type: string;
  originalFile: File | DriveFileData;
}

const parseFile = (file: File | DriveFileData): ParsedFile => {
  if (file instanceof File) {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    return { plainName: filename, type: extension, originalFile: file };
  } else {
    return { plainName: file.name, type: file.type, originalFile: file };
  }
};
