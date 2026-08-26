import { FC, useMemo } from 'react';
import NameCollisionDialog, { OnSubmitPressed } from '.';
import { moveItemsToTrash } from 'views/Trash/services';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { uiActions } from 'app/store/slices/ui';
import { DriveItemData } from 'app/drive/types';
import { IRoot } from 'app/store/slices/storage/types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { uploadFoldersWithTracking } from 'app/drive/services/folder.service/uploadFoldersWithTracking';
import replaceFileService from 'views/Drive/services/replaceFile.service';
import { Network, getEnvironmentConfig } from 'app/drive/services/network.service';
import { fileVersionsActions, fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { isVersioningExtensionAllowed } from 'views/Drive/components/VersionHistory/utils';
import { checkFolderDuplicated } from 'app/store/slices/storage/folderUtils/checkFolderDuplicated';
import { getUniqueFolderName } from 'app/store/slices/storage/folderUtils/getUniqueFolderName';
import { getUniqueFilename } from 'app/store/slices/storage/fileUtils/getUniqueFilename';
import { checkDuplicatedFiles } from 'app/store/slices/storage/fileUtils/checkDuplicatedFiles';
import { items as itemUtils } from '@internxt/lib';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { MoveItemPayload } from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

const NameCollisionContainer: FC = () => {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const collisionDialogInfo = useAppSelector((state: RootState) => state.ui.nameCollisionDialogInfo);
  const collisionGroups = useMemo(() => collisionDialogInfo?.groups ?? [], [collisionDialogInfo]);
  const operationType = collisionDialogInfo?.operation;
  const newItems = useMemo(() => collisionGroups.flatMap((g) => g.duplicatedItems), [collisionGroups]);
  const existingItems = useMemo(() => collisionGroups.flatMap((g) => g.existingItems), [collisionGroups]);
  const remainingItemsCount = useMemo(() => existingItems.length, [existingItems]);

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const closeDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: false, info: undefined }));
  };

  const matchesName = (existing: DriveItemData, name: string) => (existing.plainName ?? existing.name) === name;

  const matchesType = (existing: DriveItemData, type?: string | null) => (existing.type ?? null) === (type ?? null);

  const findExistingItemFor = (
    itemToUpload: File | IRoot | DriveItemData,
    existingItems: DriveItemData[],
  ): DriveItemData | undefined => {
    const isUploadedFolder = !!(itemToUpload as IRoot).fullPathEdited;
    if (isUploadedFolder) {
      const folder = itemToUpload as IRoot;
      return existingItems.find((existing) => matchesName(existing, folder.name));
    }

    const isUploadedFile = itemToUpload instanceof File;
    if (isUploadedFile) {
      const { filename, extension } = itemUtils.getFilenameAndExt(itemToUpload.name);
      return existingItems.find((existing) => matchesName(existing, filename) && matchesType(existing, extension));
    }

    const movedItem = itemToUpload as DriveItemData;
    return existingItems.find(
      (existing) =>
        !!existing.isFolder === !!movedItem.isFolder &&
        matchesName(existing, movedItem.plainName ?? movedItem.name) &&
        (movedItem.isFolder || matchesType(existing, movedItem.type)),
    );
  };

  type CollisionPair<T> = { item: T; existing: DriveItemData };

  const isFolderUpload = (item: IRoot | File): item is IRoot => !!(item as IRoot).fullPathEdited;

  const getCollisionPairs = <T extends File | IRoot | DriveItemData>(group: CollisionGroup): CollisionPair<T>[] =>
    (group.duplicatedItems as T[]).flatMap((item) => {
      const existing = findExistingItemFor(item, group.existingItems);
      return existing ? [{ item, existing }] : [];
    });

  const replaceAndMoveItems = async (pairs: CollisionPair<DriveItemData>[], destinationUuid: string) => {
    if (pairs.length === 0) return;

    await moveItemsToTrash(pairs.map((pair) => pair.existing));
    await dispatch(
      storageThunks.moveItemsThunk({
        items: pairs.map((pair) => pair.item),
        destinationFolderId: destinationUuid,
      }),
    );
  };

  const getUniqueNameMovePayload = async (item: DriveItemData, destinationUuid: string): Promise<MoveItemPayload> => {
    if (item.isFolder) {
      const { duplicatedFoldersResponse } = await checkFolderDuplicated([item], destinationUuid);
      const finalName = await getUniqueFolderName(
        item.plainName ?? item.name,
        duplicatedFoldersResponse as DriveItemData[],
        destinationUuid,
      );
      return { ...item, name: finalName, plain_name: finalName, newItemName: finalName };
    }

    const { duplicatedFilesResponse } = await checkDuplicatedFiles([item], destinationUuid);
    const finalName = await getUniqueFilename(item.name, item.type, duplicatedFilesResponse, destinationUuid);
    return { ...item, name: finalName, plainName: finalName, plain_name: finalName, newItemName: finalName };
  };

  const keepAndMoveItems = async (items: DriveItemData[], destinationUuid: string) => {
    if (items.length === 0) return;

    const itemsParsed = await Promise.all(items.map((item) => getUniqueNameMovePayload(item, destinationUuid)));
    await dispatch(
      storageThunks.moveItemsThunk({
        items: itemsParsed,
        destinationFolderId: destinationUuid,
      }),
    );
  };

  const uploadFileAndGetFileId = async (file: File, itemToReplace: DriveItemData) => {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig(!!selectedWorkspace);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);
    const taskId = `replace-${itemToReplace.uuid}-${Date.now()}`;
    const [uploadPromise] = network.uploadFile(
      bucketId,
      { filecontent: file, filesize: file.size, progressCallback: () => {} },
      { taskId },
    );
    return uploadPromise;
  };

  const replaceFileVersion = async (file: File, itemToReplace: DriveItemData) => {
    const newFileId = await uploadFileAndGetFileId(file, itemToReplace);
    await replaceFileService.replaceFile(itemToReplace.uuid, { fileId: newFileId, size: file.size });
    dispatch(fileVersionsActions.invalidateCache(itemToReplace.uuid));
  };

  const uploadFiles = async (files: File[], destinationUuid: string, shouldSkipDuplicatesCheck = false) => {
    if (files.length === 0) return;

    await dispatch(
      storageThunks.uploadItemsThunk({
        files,
        parentFolderId: destinationUuid,
        options: { disableDuplicatedNamesCheck: shouldSkipDuplicatesCheck },
      }),
    );
  };

  const uploadFolders = async (folders: IRoot[], destinationUuid: string) => {
    if (folders.length === 0) return;

    await uploadFoldersWithTracking({
      payload: folders.map((root) => ({ root: { ...root }, currentFolderId: destinationUuid })),
      selectedWorkspace,
      dispatch,
      maxUploadFileSize,
    });
  };

  const uploadItems = async (items: (IRoot | File)[], destinationUuid: string, shouldSkipDuplicatesCheck = false) => {
    const folders = items.filter(isFolderUpload);
    const files = items.filter((item): item is File => !isFolderUpload(item));

    await uploadFolders(folders, destinationUuid);
    await uploadFiles(files, destinationUuid, shouldSkipDuplicatesCheck);
  };

  const uploadNewFilesOnly = async (files: File[], destinationUuid: string) => {
    const { unrepeatedItems: newFiles } = await handleRepeatedUploadingFiles(files, destinationUuid);
    await uploadFiles(newFiles as File[], destinationUuid, true);
  };

  /**
   * Merges a skipped folder upload into its existing counterpart: files that already
   * exist are left untouched, new files and new subfolders are uploaded into the
   * existing folder, and colliding subfolders are merged recursively so the folder
   * structure is preserved.
   */
  const mergeSkipFolderUpload = async (root: IRoot, existingFolderUuid: string) => {
    await uploadNewFilesOnly(root.childrenFiles, existingFolderUuid);

    const {
      unrepeatedItems: newFolders,
      repeatedItems: collidingFolders,
      existingItems: existingFolders,
    } = await handleRepeatedUploadingFolders(root.childrenFolders, existingFolderUuid);

    await uploadFolders(newFolders as IRoot[], existingFolderUuid);

    for (const collidingFolder of collidingFolders as IRoot[]) {
      const existingFolder = existingFolders.find((folder) => folder.plainName === collidingFolder.name);
      if (existingFolder) {
        await mergeSkipFolderUpload(collidingFolder, existingFolder.uuid);
      }
    }
  };

  const isVersionedFilePair = (pair: CollisionPair<IRoot | File>) =>
    !isFolderUpload(pair.item) && isVersioningEnabled && isVersioningExtensionAllowed(pair.existing);

  /**
   * Versioned files are replaced one at a time because that upload bypasses the upload queue.
   */
  const replaceFileVersions = async (pairs: CollisionPair<IRoot | File>[]) => {
    for (const pair of pairs) {
      await replaceFileVersion(pair.item as File, pair.existing);
    }
  };

  const trashAndUploadItems = async (pairs: CollisionPair<IRoot | File>[], destinationUuid: string) => {
    if (pairs.length === 0) return;

    await moveItemsToTrash(pairs.map((pair) => pair.existing));
    await uploadItems(
      pairs.map((pair) => pair.item),
      destinationUuid,
      true,
    );
  };

  const replaceAndUploadItems = async (pairs: CollisionPair<IRoot | File>[], destinationUuid: string) => {
    if (pairs.length === 0) return;

    await trashAndUploadItems(
      pairs.filter((pair) => !isVersionedFilePair(pair)),
      destinationUuid,
    );
    await replaceFileVersions(pairs.filter(isVersionedFilePair));

    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  const keepAndUploadItems = async (items: (IRoot | File)[], destinationUuid: string) => {
    if (items.length === 0) return;

    await uploadItems(items, destinationUuid);
    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  /**
   * Skipping uploaded files is a no-op (the existing files stay untouched), while
   * skipping uploaded folders merges their new content into the existing folders.
   */
  const skipAndUploadItems = async (pairs: CollisionPair<IRoot | File>[], destinationUuid: string) => {
    const folderPairs = pairs.filter((pair) => isFolderUpload(pair.item));
    if (folderPairs.length === 0) return;

    await Promise.all(folderPairs.map((pair) => mergeSkipFolderUpload(pair.item as IRoot, pair.existing.uuid)));
    dispatch(fetchSortedFolderContentThunk(destinationUuid));
  };

  const hasDuplicatedItems = (group: CollisionGroup) => group.duplicatedItems.length > 0;

  const triggerSelectedOptionsOnSubmit = async ({ operationType, operation, applyToAll }: OnSubmitPressed) => {
    if (applyToAll) {
      closeDialog();
      await Promise.all(
        collisionGroups.map(async (group) => {
          switch (operationType + operation) {
            case 'move' + 'keep':
              await keepAndMoveItems(group.duplicatedItems as DriveItemData[], group.destinationUuid);
              dispatch(storageActions.popItemsToDelete(group.duplicatedItems as DriveItemData[]));
              break;
            case 'move' + 'replace':
              await replaceAndMoveItems(getCollisionPairs<DriveItemData>(group), group.destinationUuid);
              dispatch(storageActions.popItemsToDelete(group.duplicatedItems as DriveItemData[]));
              break;
            case 'upload' + 'keep':
              await keepAndUploadItems(group.duplicatedItems as (IRoot | File)[], group.destinationUuid);
              break;
            case 'upload' + 'replace':
              await replaceAndUploadItems(getCollisionPairs<IRoot | File>(group), group.destinationUuid);
              break;
            case 'upload' + 'skip':
              await skipAndUploadItems(getCollisionPairs<IRoot | File>(group), group.destinationUuid);
              break;
            case 'move' + 'skip':
              break;
          }
        }),
      );
      return;
    }

    const groupIndex = collisionGroups.findIndex(hasDuplicatedItems);
    const hasPendingGroup = groupIndex !== -1;
    if (!hasPendingGroup) {
      closeDialog();
      return;
    }

    const group = collisionGroups[groupIndex];
    const itemToUpload = group.duplicatedItems[0];
    const itemToReplace = findExistingItemFor(itemToUpload, group.existingItems);
    const pairs = itemToReplace ? [{ item: itemToUpload, existing: itemToReplace }] : [];

    switch (operationType + operation) {
      case 'move' + 'keep':
        await keepAndMoveItems([itemToUpload as DriveItemData], group.destinationUuid);
        dispatch(storageActions.popItemsToDelete([itemToUpload as DriveItemData]));
        break;
      case 'move' + 'replace':
        await replaceAndMoveItems(pairs as CollisionPair<DriveItemData>[], group.destinationUuid);
        dispatch(storageActions.popItemsToDelete([itemToUpload as DriveItemData]));
        break;
      case 'upload' + 'keep':
        await keepAndUploadItems([itemToUpload as IRoot | File], group.destinationUuid);
        break;
      case 'upload' + 'replace':
        await replaceAndUploadItems(pairs as CollisionPair<IRoot | File>[], group.destinationUuid);
        break;
      case 'upload' + 'skip':
        await skipAndUploadItems(pairs as CollisionPair<IRoot | File>[], group.destinationUuid);
        break;
      case 'move' + 'skip':
        break;
    }

    const remainingGroups = collisionGroups
      .map((g, idx) =>
        idx === groupIndex
          ? {
              ...g,
              duplicatedItems: g.duplicatedItems.slice(1),
              existingItems: g.existingItems.filter((existing) => existing !== itemToReplace),
            }
          : g,
      )
      .filter(hasDuplicatedItems);

    const hasRemainingGroups = remainingGroups.length > 0;
    if (hasRemainingGroups) {
      dispatch(
        uiActions.setIsNameCollisionDialogOpen({
          open: true,
          info: { groups: remainingGroups, operation: operationType },
        }),
      );
    } else {
      closeDialog();
    }
  };

  if (!collisionDialogInfo) return null;

  return (
    <NameCollisionDialog
      isOpen={isOpen}
      newItems={newItems as (File | IRoot)[]}
      driveItems={existingItems}
      onCancelButtonPressed={closeDialog}
      onSubmitButtonPressed={triggerSelectedOptionsOnSubmit}
      onCloseDialog={closeDialog}
      operationType={operationType as 'move' | 'upload'}
      remainingItemsCount={remainingItemsCount}
    />
  );
};

export default NameCollisionContainer;
