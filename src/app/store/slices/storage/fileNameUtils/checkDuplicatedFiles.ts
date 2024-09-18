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

  const filesToUploadParsedToCheck = files.map((file) => {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    return { plainName: filename, type: extension };
  });

  const checkDuplicatedFileResponse = await newStorageService.checkDuplicatedFiles(
    parentFolderId,
    filesToUploadParsedToCheck,
  );
  const duplicatedFilesResponse = checkDuplicatedFileResponse.existentFiles;
  const filesWithoutDuplicates: (File | DriveFileData)[] = [];
  const filesWithDuplicates: (File | DriveFileData)[] = [];

  files.forEach((file) => {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    const isDuplicated = duplicatedFilesResponse.some(
      (duplicatedFile) => duplicatedFile.plainName === filename && duplicatedFile.type === extension,
    );

    if (isDuplicated) {
      filesWithDuplicates.push(file);
    } else {
      filesWithoutDuplicates.push(file);
    }
  });

  return { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates };
};
