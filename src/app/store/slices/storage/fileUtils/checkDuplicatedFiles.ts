import { items as itemUtils } from '@internxt/lib';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from '../../../../drive/services/new-storage.service';

export interface DuplicatedFilesResult {
  duplicatedFilesResponse: DriveFileData[];
  filesWithDuplicates: (File | DriveFileData)[];
  filesWithoutDuplicates: (File | DriveFileData)[];
}

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
  const checkDuplicatedFileResponse = await newStorageService.checkDuplicatedFiles(parentFolderId, parsedFiles);

  const duplicatedFilesResponse = checkDuplicatedFileResponse.existentFiles;

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
