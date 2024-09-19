import newStorageService from '../../../../drive/services/new-storage.service';
import { DriveFolderData } from '../../../../drive/types';
import renameFolderIfNeeded from './renameFolderIfNeeded';

export const getUniqueFolderName = async (
  folderName: string,
  duplicatedFolders: DriveFolderData[],
  parentFolderId: string,
): Promise<string> => {
  let isFolderNewNameDuplicated = true;
  let finalFolderName = folderName;
  let currentDuplicatedFolders = duplicatedFolders;
  do {
    const currentFolderFoldersToCheckDuplicates = currentDuplicatedFolders.map((folder) => ({
      ...folder,
      name: folder?.plainName ?? folder.name,
    }));

    const [, , renamedFoldername] = renameFolderIfNeeded(currentFolderFoldersToCheckDuplicates, finalFolderName);

    finalFolderName = renamedFoldername;

    const duplicatedFoldersResponse = await newStorageService.checkDuplicatedFolders(parentFolderId, [
      renamedFoldername,
    ]);

    currentDuplicatedFolders = duplicatedFoldersResponse.existentFolders as DriveFolderData[];
    isFolderNewNameDuplicated = currentDuplicatedFolders.length > 0;
  } while (isFolderNewNameDuplicated);

  return finalFolderName;
};
