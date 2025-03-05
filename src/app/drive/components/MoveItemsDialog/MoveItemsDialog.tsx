import { FolderAncestor, FolderAncestorWorkspace } from '@internxt/sdk/dist/drive/storage/types';
import { CaretRight, FolderSimplePlus } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import BreadcrumbsMoveItemsDialogView from 'app/shared/components/Breadcrumbs/Containers/BreadcrumbsMoveItemsDialogView';
import { Button, Loader } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import { RootState, store } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { setItemsToMove, storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { fetchDialogContentThunk } from 'app/store/slices/storage/storage.thunks/fetchDialogContentThunk';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import { uiActions } from 'app/store/slices/ui';
import folderImage from 'assets/icons/light/folder.svg';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from '../../../store/slices/storage/storage.thunks/renameItemsThunk';
import { IRoot } from '../../../store/slices/storage/types';
import { DriveFileData, DriveFolderData, DriveItemData, FolderPathDialog } from '../../types';
import CreateFolderDialog from '../CreateFolderDialog/CreateFolderDialog';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';

interface MoveItemsDialogProps {
  onItemsMoved?: () => void;
  isTrash?: boolean;
  items: DriveItemData[];
}

const MoveItemsDialog = (props: MoveItemsDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const itemsToMove: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToMove);
  const [isLoading, setIsLoading] = useState(false);
  const [destinationId, setDestinationId] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState('');
  const [shownFolders, setShownFolders] = useState(props.items);
  const [currentFolderName, setCurrentFolderName] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const arrayOfPaths: FolderPathDialog[] = [];
  const [currentNamePaths, setCurrentNamePaths] = useState(arrayOfPaths);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const currentPath = useAppSelector((state: RootState) => state.storage.namePath);
  const rootFolderID: string = useSelector((state: RootState) => storageSelectors.rootFolderId(state));
  const itemParentId = itemsToMove[0]?.folderUuid ?? itemsToMove[0]?.folderUuid;
  const isDriveAndCurrentFolder = !props.isTrash && itemParentId === destinationId;
  const workspaceSelected = useSelector(workspacesSelectors.getSelectedWorkspace);
  const isWorkspaceSelected = !!workspaceSelected;

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentNamePaths([]);
      onShowFolderContentClicked(rootFolderID, 'Drive');
    }
  }, [isOpen]);

  const onShowFolderContentClicked = (folderId: string, name: string): void => {
    setIsLoading(true);
    dispatch(fetchDialogContentThunk(folderId))
      .unwrap()
      .then(() => {
        retrieveMoveDialogItems(folderId, name);
      })
      .finally(() => setIsLoading(false));
  };

  const handleDialogBreadcrumbs = (folderId: string, name: string) => {
    let auxCurrentPaths: FolderPathDialog[] = [...currentNamePaths];
    const currentIndex = auxCurrentPaths.findIndex((i) => {
      return i.uuid === folderId;
    });
    if (currentIndex > -1) {
      auxCurrentPaths = auxCurrentPaths.slice(0, currentIndex + 1);
      dispatch(storageActions.popNamePathDialogUpTo({ uuid: folderId, name: name }));
    } else {
      auxCurrentPaths.push({ uuid: folderId, name: name });
      dispatch(storageActions.pushNamePathDialog({ uuid: folderId, name: name }));
    }

    setCurrentNamePaths(auxCurrentPaths);
  };

  const retrieveMoveDialogItems = (folderId: string, name: string) => {
    databaseService.get(DatabaseCollection.MoveDialogLevels, folderId).then((items) => {
      setCurrentFolderId(folderId);
      setCurrentFolderName(name);
      setDestinationId(folderId);

      const folders = items?.filter((i) => {
        return i.isFolder;
      });

      handleDialogBreadcrumbs(folderId, name);

      if (folders) {
        const unselectedFolders = folders?.filter((folderItem) => {
          return !itemsToMove.some((itemToMove) => itemToMove.id === folderItem.id);
        });
        setShownFolders(unselectedFolders);
      } else {
        setShownFolders([]);
        setDestinationId(folderId);
        setCurrentFolderId(folderId);
        setCurrentFolderName(name);
      }
    });
  };

  const onFolderClicked = (folderId: string, name?: string): void => {
    if (destinationId != folderId) {
      setDestinationId(folderId);
    } else {
      setDestinationId(currentFolderId);
    }
    name && setSelectedFolderName(name);
  };

  const onClose = (): void => {
    dispatch(uiActions.setIsMoveItemsDialogOpen(false));
    onShowFolderContentClicked(currentFolderId, currentFolderName);
    dispatch(setItemsToMove([]));
  };

  const setDriveBreadcrumb = async (itemsToMove: DriveItemData[]) => {
    const item = itemsToMove[0];
    const itemUuid = item.uuid;
    const itemFolderUuid = item.isFolder ? itemUuid : item.folderUuid;
    const itemType = item.isFolder ? 'folder' : 'file';
    const storageKey = item.isFolder ? STORAGE_KEYS.FOLDER_ACCESS_TOKEN : STORAGE_KEYS.FILE_ACCESS_TOKEN;
    const token = localStorageService.get(storageKey) || undefined;

    const breadcrumbsList: FolderAncestor[] | FolderAncestorWorkspace[] = isWorkspaceSelected
      ? await newStorageService.getFolderAncestorsInWorkspace(workspaceSelected.workspace.id, itemType, itemUuid, token)
      : await newStorageService.getFolderAncestors(itemFolderUuid);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    const fullPath = breadcrumbsList.toReversed();
    const isRootPathNameList = fullPath.length === 0;
    if (isRootPathNameList && !!currentPath?.[0]) {
      fullPath.push(currentPath[0] as FolderAncestor);
    }
    const fullPathParsedNamesList = fullPath.map((pathItem) => ({ ...pathItem, name: pathItem.plainName }));

    dispatch(storageActions.setNamePath(fullPathParsedNamesList));

    const currentItemUuid = navigationService.getUuid();
    const shouldUpdateBreadcrumb = item.isFolder && currentItemUuid === itemUuid;

    if (itemsToMove.length > 1) {
      return;
    }

    if (shouldUpdateBreadcrumb) {
      await getAncestorsAndSetNamePath(item.isFolder ? itemUuid : itemFolderUuid, dispatch);
    }
  };

  const onAccept = async (destinationFolderId, name, namePaths): Promise<void> => {
    try {
      dispatch(storageActions.setMoveDestinationFolderId(destinationFolderId));

      setIsLoading(true);
      if (itemsToMove.length > 0) {
        if (destinationFolderId != currentFolderId) {
          namePaths.push({ id: destinationId, name: selectedFolderName });
        }

        if (!destinationFolderId) {
          destinationFolderId = currentFolderId;
        }

        const files = itemsToMove.filter((item) => item.type !== 'folder') as DriveFileData[];
        const folders = itemsToMove.filter((item) => item.type === 'folder') as (IRoot | DriveFolderData)[];

        const filesWithoutDuplicates = await handleRepeatedUploadingFiles(files, dispatch, destinationFolderId);
        const foldersWithoutDuplicates = await handleRepeatedUploadingFolders(folders, dispatch, destinationFolderId);

        const itemsToMoveWithoutDuplicates = [...filesWithoutDuplicates, ...foldersWithoutDuplicates];

        if (itemsToMoveWithoutDuplicates.length > 0) {
          await dispatch(
            storageThunks.moveItemsThunk({
              items: itemsToMoveWithoutDuplicates as DriveItemData[],
              destinationFolderId: destinationFolderId,
            }),
          );
        }
      }
      props.onItemsMoved?.();

      setIsLoading(false);
      onClose();
      !props.isTrash && setDriveBreadcrumb(itemsToMove);
      store.dispatch(storageActions.popItemsToDelete(itemsToMove));
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-[550px]" className="p-5">
      <div className="flex flex-col space-y-5">
        {/* Title */}
        <div className="flex text-2xl font-medium text-gray-100">
          <span className="flex whitespace-nowrap">
            {`${props.isTrash ? translate('actions.restore') : translate('actions.move')}`} "
          </span>
          <span className="max-w-fit flex-1 truncate">{itemsToMove[0]?.name}</span>
          <span className="flex">"</span>
        </div>

        {/* Create folder dialog */}
        <CreateFolderDialog
          currentFolderId={currentFolderId}
          onFolderCreated={() => onShowFolderContentClicked(currentFolderId, currentFolderName)}
        />

        {/* Folder list */}
        <div className="flex flex-col">
          <div className="flex h-10 items-center">
            {isLoading ? (
              <Loader classNameLoader="h-5 w-5" />
            ) : (
              <BreadcrumbsMoveItemsDialogView
                onShowFolderContentClicked={onShowFolderContentClicked}
                currentNamePaths={currentNamePaths}
              />
            )}
          </div>

          <div className="h-60 divide-y divide-gray-5 overflow-scroll rounded-md border border-gray-10">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader classNameLoader="h-5 w-5" />
              </div>
            ) : (
              shownFolders
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((folder) => {
                  return (
                    <div
                      className={`cursor-pointer ${
                        destinationId === folder.uuid
                          ? 'bg-primary/10 text-primary dark:bg-primary/20'
                          : 'hover:bg-gray-1 dark:hover:bg-gray-5'
                      } flex h-12 items-center space-x-4 px-4`}
                      onDoubleClick={() => onShowFolderContentClicked(folder.uuid, folder.name)}
                      onClick={() => onFolderClicked(folder.uuid, folder.name)}
                      key={folder.id}
                    >
                      <img className="flex h-8 w-8" alt="Folder icon" src={folderImage} />
                      <span className="w-full flex-1 truncate text-base" title={folder.name}>
                        {folder.name}
                      </span>
                      <CaretRight
                        onClick={() => onShowFolderContentClicked(folder.uuid, folder.name)}
                        className="h-6 w-6"
                      />
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button disabled={isLoading} variant="secondary" onClick={onCreateFolderButtonClicked}>
            <FolderSimplePlus size={24} />
            <span>{translate('actions.upload.folder')}</span>
          </Button>

          <div className="flex space-x-2">
            <Button disabled={isLoading} variant="secondary" onClick={onClose}>
              {translate('actions.cancel')}
            </Button>
            <Button
              disabled={isLoading || isDriveAndCurrentFolder}
              variant="primary"
              onClick={() =>
                onAccept(destinationId ? destinationId : currentFolderId, currentFolderName, currentNamePaths)
              }
            >
              {!props.isTrash ? translate('actions.move') : translate('actions.restoreHere')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MoveItemsDialog;
