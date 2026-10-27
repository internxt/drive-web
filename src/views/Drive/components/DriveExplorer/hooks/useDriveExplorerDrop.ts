import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useAppSelector } from 'app/store/hooks';
import { IRoot } from 'app/store/slices/storage/types';
import { FolderPath } from 'app/drive/types';
import { transformDraggedItems } from 'services/drag-and-drop.service';
import { notifyUploadFailed } from '../helpers/uploadHelpers';

interface DroppedNativeFiles {
  files: File[];
  items: DataTransferItemList;
}

const getDropDestinationPath = (namePath: FolderPath[]) =>
  ['', ...namePath.slice(1).map((level) => level.name)].join('/');

export const useDriveExplorerDrop = (onItemsDropped: (rootList: IRoot[], files: File[]) => Promise<void>) => {
  const namePath = useAppSelector((state) => state.storage.namePath);

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
      drop: (droppedFiles: DroppedNativeFiles, monitor) => {
        if (monitor.didDrop()) return;

        transformDraggedItems(droppedFiles.items, getDropDestinationPath(namePath))
          .then(({ rootList, files }) => onItemsDropped(rootList, files))
          .catch(notifyUploadFailed);
      },
    }),
    [namePath, onItemsDropped],
  );

  return { isOver, dropRef };
};
