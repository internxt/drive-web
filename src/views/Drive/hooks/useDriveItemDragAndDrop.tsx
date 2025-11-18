import { ConnectDragSource, ConnectDropTarget, useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { transformDraggedItems } from 'services/drag-and-drop.service';
import { DragAndDropType } from 'app/core/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import {
  handleRepeatedUploadingFiles,
  handleRepeatedUploadingFolders,
} from 'app/store/slices/storage/storage.thunks/renameItemsThunk';
import { DriveItemData } from 'app/drive/types';
import { uploadFoldersWithManager } from 'app/network/UploadFolderManager';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

interface DragSourceCollectorProps {
  isDraggingThisItem: boolean;
}

interface DriveItemDrag {
  isDraggingThisItem: boolean;
  connectDragSource: ConnectDragSource;
}

interface DropTargetCollectorProps {
  isDraggingOverThisItem: boolean;
  canDrop: boolean;
}

interface DriveItemDrop {
  isDraggingOverThisItem: boolean;
  canDrop: boolean;
  connectDropTarget: ConnectDropTarget;
}

export const useDriveItemDrag = (item: DriveItemData): DriveItemDrag => {
  const [{ isDraggingThisItem }, connectDragSource] = useDrag<DriveItemData, unknown, DragSourceCollectorProps>(() => ({
    type: DragAndDropType.DriveItem,
    collect: (monitor) => ({
      isDraggingThisItem: monitor.isDragging(),
    }),
    item,
  }));

  return { isDraggingThisItem, connectDragSource };
};

const handleDriveItemDrop = async (
  droppedData: DriveItemData,
  item: DriveItemData,
  isSomeItemSelected: boolean,
  selectedItems: DriveItemData[],
  dispatch: ReturnType<typeof useAppDispatch>,
) => {
  const itemsToMove = isSomeItemSelected
    ? [...selectedItems, droppedData].filter(
        (a, index, self) => index === self.findIndex((b) => a.id === b.id && a.isFolder === b.isFolder),
      )
    : [droppedData];

  const filesToMove: DriveItemData[] = [];
  const foldersToMove = itemsToMove?.filter((i) => {
    if (!i.isFolder) filesToMove.push(i);
    return i.isFolder;
  });

  dispatch(storageActions.setMoveDestinationFolderId(item.uuid));

  const unrepeatedFiles = await handleRepeatedUploadingFiles(filesToMove, dispatch, item.uuid);
  const unrepeatedFolders = await handleRepeatedUploadingFolders(foldersToMove, dispatch, item.uuid);
  const unrepeatedItems: DriveItemData[] = [...unrepeatedFiles, ...unrepeatedFolders] as DriveItemData[];

  if (unrepeatedItems.length === itemsToMove.length) {
    dispatch(storageActions.setMoveDestinationFolderId(item.uuid));
  }

  dispatch(
    storageThunks.moveItemsThunk({
      items: unrepeatedItems,
      destinationFolderId: item.uuid,
    }),
  );
};

const handleFileDrop = async (
  droppedData: { items: DataTransferItemList },
  item: DriveItemData,
  folderPath: string,
  selectedWorkspace: ReturnType<typeof workspacesSelectors.getSelectedWorkspace>,
  dispatch: ReturnType<typeof useAppDispatch>,
) => {
  const { rootList, files } = await transformDraggedItems(droppedData.items, folderPath);

  if (files.length) {
    // only files
    await dispatch(storageThunks.uploadItemsThunk({ files, parentFolderId: item.uuid }));
  }

  if (rootList.length) {
    // directory tree
    const folderDataToUpload = rootList.map((root) => ({
      root,
      currentFolderId: item.uuid,
    }));
    await uploadFoldersWithManager({
      payload: folderDataToUpload,
      selectedWorkspace,
      dispatch,
    });
  }
};

export const useDriveItemDrop = (item: DriveItemData): DriveItemDrop => {
  const dispatch = useAppDispatch();
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const { selectedItems } = useAppSelector((state) => state.storage);
  const namePath = useAppSelector((state) => state.storage.namePath);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const [{ isDraggingOverThisItem, canDrop }, connectDropTarget] = useDrop<
    DriveItemData | DriveItemData[],
    unknown,
    DropTargetCollectorProps
  >(
    () => ({
      accept: item.isFolder ? [NativeTypes.FILE, DragAndDropType.DriveItem] : [],
      collect: (monitor) => ({
        isDraggingOverThisItem: monitor.isOver() && item.isFolder,
        canDrop: monitor.canDrop(),
      }),
      canDrop: () => true,
      drop: async (_, monitor) => {
        const droppedType = monitor.getItemType();

        if (!item.isFolder) {
          return;
        }

        const namePathDestinationArray = namePath.map((level) => level.name);
        namePathDestinationArray[0] = '';
        const folderPath = namePathDestinationArray.join('/') + '/' + item.name;

        if (droppedType === DragAndDropType.DriveItem) {
          const droppedData = monitor.getItem<DriveItemData>();
          await handleDriveItemDrop(droppedData, item, isSomeItemSelected, selectedItems, dispatch);
        } else if (droppedType === NativeTypes.FILE) {
          const droppedData = monitor.getItem<{ items: DataTransferItemList }>();
          await handleFileDrop(droppedData, item, folderPath, selectedWorkspace, dispatch);
        }
      },
    }),
    [selectedItems],
  );

  return {
    isDraggingOverThisItem,
    canDrop,
    connectDropTarget,
  };
};
