import { items as itemsUtils } from '@internxt/lib';

import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from '../../../../drive/services/new-storage.service';

export const getUniqueFilename = async (
  filename: string,
  extension: string,
  duplicatedFiles: DriveFileData[],
  parentFolderId: string,
): Promise<string> => {
  let isFileNewNameDuplicated = true;
  let finalFilename = filename;
  let currentDuplicatedFiles = duplicatedFiles;

  do {
    const currentFolderFilesToCheckDuplicates = currentDuplicatedFiles.map((file) => ({
      name: file.plainName ?? file.name,
      type: file.type,
    }));

    const [, , renamedFilename] = itemsUtils.renameIfNeeded(
      currentFolderFilesToCheckDuplicates,
      finalFilename,
      extension,
    );

    finalFilename = renamedFilename;

    const duplicatedFilesResponse = await newStorageService.checkDuplicatedFiles(parentFolderId, [
      { plainName: renamedFilename, type: extension },
    ]);
    currentDuplicatedFiles = duplicatedFilesResponse.existentFiles;
    isFileNewNameDuplicated = currentDuplicatedFiles.length > 0;
  } while (isFileNewNameDuplicated);

  return finalFilename;
};
