import { FileToUpload } from '../../../../drive/services/file.service/uploadFile';
import { checkDuplicatedFiles } from './checkDuplicatedFiles';
import { processDuplicateFiles } from './processDuplicateFiles';

const BATCH_SIZE = 200;

export const prepareFilesToUpload = async ({
  files,
  parentFolderId,
  disableDuplicatedNamesCheck,
  fileType,
}: {
  files: File[];
  parentFolderId: string;
  disableDuplicatedNamesCheck?: boolean;
  fileType?: string;
}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
  let filesToUpload: FileToUpload[] = [];
  let zeroLengthFilesNumber = 0;

  const processFilesBatch = async (filesBatch: File[]) => {
    const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
      filesBatch,
      parentFolderId,
    );

    const { zeroLengthFiles, newFilesToUpload: filesToUploadReturned } = await processDuplicateFiles({
      files: filesWithoutDuplicates as File[],
      existingFilesToUpload: filesToUpload,
      fileType,
      parentFolderId,
      disableDuplicatedNamesCheck: true,
    });
    filesToUpload = filesToUploadReturned;
    zeroLengthFilesNumber += zeroLengthFiles;

    const { zeroLengthFiles: zeroLengthFilesReturned, newFilesToUpload: filesToUploadReturned2 } =
      await processDuplicateFiles({
        files: filesWithDuplicates as File[],
        existingFilesToUpload: filesToUpload,
        fileType,
        parentFolderId,
        disableDuplicatedNamesCheck,
        duplicatedFiles: duplicatedFilesResponse,
      });

    filesToUpload = filesToUploadReturned2;
    zeroLengthFilesNumber += zeroLengthFilesReturned;
  };

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await processFilesBatch(batch);
  }

  return { filesToUpload, zeroLengthFilesNumber };
};
