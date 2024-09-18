import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import newStorageService from '../../../../drive/services/new-storage.service';
// import { DriveFolderData } from '../../../../drive/types';
import { IRoot } from '../storage.thunks/uploadFolderThunk';

interface DuplicatedFoldersResult {
  duplicatedFoldersResponse: DriveFolderData[];
  foldersWithDuplicates: (IRoot | DriveFolderData)[];
  foldersWithoutDuplicates: (IRoot | DriveFolderData)[];
}

export const checkFolderDuplicated = async (
  folders: (IRoot | DriveFolderData)[],
  parentFolderId: string,
): Promise<DuplicatedFoldersResult> => {
  if (folders.length === 0) {
    return {
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: folders,
    };
  }
  const foldersNamesToUpload = folders.map((folder) => folder.name);

  const checkDuplicatedFolderResponse = await newStorageService.checkDuplicatedFolders(
    parentFolderId,
    foldersNamesToUpload,
  );
  const duplicatedFoldersResponse = checkDuplicatedFolderResponse.existentFolders;

  const foldersWithDuplicates: (IRoot | DriveFolderData)[] = [];
  const foldersWithoutDuplicates: (IRoot | DriveFolderData)[] = [];

  folders.forEach((folder) => {
    const isDuplicate = duplicatedFoldersResponse.some(
      (duplicatedFolder) => (duplicatedFolder as DriveFolderData & { plainName: string }).plainName === folder.name,
    );

    if (isDuplicate) {
      foldersWithDuplicates.push(folder);
    } else {
      foldersWithoutDuplicates.push(folder);
    }
  });

  return { duplicatedFoldersResponse, foldersWithoutDuplicates, foldersWithDuplicates };
};
