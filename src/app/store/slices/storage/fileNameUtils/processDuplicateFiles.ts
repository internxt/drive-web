import { items as itemUtils } from '@internxt/lib';

import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { renameFile } from '../../../../crypto/services/utils';
import { FileToUpload } from '../../../../drive/services/file.service/uploadFile';
import { getUniqueFilename } from './getUniqueFilename';

export const processDuplicateFiles = async ({
  filesWithDuplicates,
  filesToUpload,
  fileType,
  parentFolderId,
  disableDuplicatedNamesCheck,
  duplicatedFiles,
}: {
  filesWithDuplicates: File[];
  filesToUpload: FileToUpload[];
  fileType: string | undefined;
  parentFolderId: string;
  disableDuplicatedNamesCheck: boolean | undefined;
  duplicatedFiles?: DriveFileData[];
}): Promise<number> => {
  let zeroLengthFiles = 0;

  for (const file of filesWithDuplicates) {
    if (file.size === 0) {
      zeroLengthFiles++;
      continue;
    }
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    let finalFilename = filename;

    if (!disableDuplicatedNamesCheck && duplicatedFiles) {
      finalFilename = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);
    }

    const fileContent = renameFile(file, finalFilename);

    filesToUpload.push({
      name: finalFilename,
      size: file.size,
      type: extension ?? fileType,
      content: fileContent,
      parentFolderId,
    });
  }
  return zeroLengthFiles;
};
