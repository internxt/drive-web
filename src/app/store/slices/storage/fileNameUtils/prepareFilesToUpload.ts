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
  const filesToUpload: FileToUpload[] = [];
  let zeroLengthFilesNumber = 0;

  const processFilesBatch = async (filesBatch: File[]) => {
    const { duplicatedFilesResponse, filesWithoutDuplicates, filesWithDuplicates } = await checkDuplicatedFiles(
      filesBatch,
      parentFolderId,
    );

    zeroLengthFilesNumber += await processDuplicateFiles({
      filesWithDuplicates: filesWithoutDuplicates as File[],
      filesToUpload,
      fileType,
      parentFolderId,
      disableDuplicatedNamesCheck: true,
    });
    zeroLengthFilesNumber += await processDuplicateFiles({
      filesWithDuplicates: filesWithDuplicates as File[],
      filesToUpload,
      fileType,
      parentFolderId,
      disableDuplicatedNamesCheck,
      duplicatedFiles: duplicatedFilesResponse,
    });
  };

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await processFilesBatch(batch);
  }

  return { filesToUpload, zeroLengthFilesNumber };
};
