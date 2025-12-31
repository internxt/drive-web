import { items as itemUtils } from '@internxt/lib';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { renameFile } from '../../../../crypto/services/utils';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { getUniqueFilename } from './getUniqueFilename';

interface ProcessDuplicateFilesParams {
  files: File[];
  existingFilesToUpload: FileToUpload[];
  fileType?: string;
  parentFolderId: string;
  disableDuplicatedNamesCheck?: boolean;
  duplicatedFiles?: DriveFileData[];
}

export const processDuplicateFiles = async ({
  files,
  existingFilesToUpload,
  fileType,
  parentFolderId,
  disableDuplicatedNamesCheck,
  duplicatedFiles,
}: ProcessDuplicateFilesParams): Promise<{ newFilesToUpload: FileToUpload[] }> => {
  const newFilesToUpload: FileToUpload[] = [...existingFilesToUpload];

  const processFile = async (file: File): Promise<void> => {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    let finalFilename = filename;

    if (!disableDuplicatedNamesCheck && duplicatedFiles) {
      finalFilename = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);
    }

    const fileContent = renameFile(file, finalFilename);

    newFilesToUpload.push({
      name: finalFilename,
      size: file.size,
      type: extension ?? fileType,
      content: fileContent,
      parentFolderId,
    });
  };

  await Promise.all(files.map(processFile));

  return { newFilesToUpload };
};
