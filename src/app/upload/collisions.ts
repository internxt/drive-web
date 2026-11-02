import { DriveItemData } from 'app/drive/types';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from 'app/store/slices/storage/types';

interface RepeatedItemsCheck<T> {
  repeatedItems: T[];
  existingItems: DriveItemData[];
  unrepeatedItems: T[];
}

interface NameCollisions {
  collisionGroups: CollisionGroup[];
  rootsWithoutCollision: IRoot[];
  filesWithoutCollision: File[];
}

const noRepeatedItems = <T>(): RepeatedItemsCheck<T> => ({
  repeatedItems: [],
  existingItems: [],
  unrepeatedItems: [],
});

const buildCollisionGroups = (destinationUuid: string, checks: RepeatedItemsCheck<unknown>[]): CollisionGroup[] =>
  checks
    .filter((check) => check.repeatedItems.length > 0)
    .map(
      (check) =>
        ({
          destinationUuid,
          duplicatedItems: check.repeatedItems,
          existingItems: check.existingItems,
          unrepeatedItems: check.unrepeatedItems,
        }) as CollisionGroup,
    );

export const findNameCollisions = async (
  destinationFolderUuid: string,
  roots: IRoot[],
  files: File[],
): Promise<NameCollisions> => {
  const [filesCheck, foldersCheck] = await Promise.all([
    files.length > 0 ? handleRepeatedUploadingFiles(files, destinationFolderUuid) : noRepeatedItems<File>(),
    roots.length > 0 ? handleRepeatedUploadingFolders(roots, destinationFolderUuid) : noRepeatedItems<IRoot>(),
  ]);

  return {
    collisionGroups: buildCollisionGroups(destinationFolderUuid, [filesCheck, foldersCheck]),
    rootsWithoutCollision: foldersCheck.unrepeatedItems as IRoot[],
    filesWithoutCollision: filesCheck.unrepeatedItems as File[],
  };
};
