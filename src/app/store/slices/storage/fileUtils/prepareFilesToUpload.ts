import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { processDuplicateFiles } from './processDuplicateFiles';
import { FileToUpload } from '../../../../drive/services/file.service/types';

const BATCH_SIZE = 200;

export const prepareFilesToUpload = async ({
  files,
  parentFolderId,
  disableDuplicatedNamesCheck = false,
  fileType,
  disableExistenceCheck = false,
}: {
  files: File[];
  parentFolderId: string;
  disableDuplicatedNamesCheck?: boolean;
  fileType?: string;
  disableExistenceCheck?: boolean;
}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
  let filesToUpload: FileToUpload[] = [];
  let zeroLengthFilesNumber = 0;

  const processFiles = async (
    filesBatch: File[],
    disableDuplicatedNamesCheckOverride: boolean,
    duplicatedFiles?: DriveFileData[],
  ) => {
    const { zeroLengthFiles, newFilesToUpload } = await processDuplicateFiles({
      files: filesBatch,
      existingFilesToUpload: filesToUpload,
      fileType,
      parentFolderId,
      disableDuplicatedNamesCheck: disableDuplicatedNamesCheckOverride,
      duplicatedFiles,
    });

    filesToUpload = newFilesToUpload;
    zeroLengthFilesNumber += zeroLengthFiles;
  };

  const processFilesBatch = async (filesBatch: File[]) => {
    if (disableExistenceCheck) {
      await processFiles(filesBatch, true);
    } else {
      const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
        filesBatch,
        parentFolderId,
      );

      await processFiles(filesWithoutDuplicates as File[], true);
      await processFiles(filesWithDuplicates as File[], disableDuplicatedNamesCheck, duplicatedFilesResponse);
    }
  };

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await processFilesBatch(batch);
  }

  return { filesToUpload, zeroLengthFilesNumber };
};
