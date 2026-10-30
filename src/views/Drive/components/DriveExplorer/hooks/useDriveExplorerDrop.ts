import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { IRoot } from 'app/store/slices/storage/types';
import { transformDraggedItems } from 'services/drag-and-drop.service';
import { notifyUploadFailed } from '../helpers/uploadHelpers';

interface DroppedNativeFiles {
  files: File[];
  items: DataTransferItemList;
}

export const useDriveExplorerDrop = (onItemsDropped: (rootList: IRoot[], files: File[]) => Promise<void>) => {
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
      drop: (droppedFiles: DroppedNativeFiles, monitor) => {
        if (monitor.didDrop()) return;

        transformDraggedItems(droppedFiles.items)
          .then(({ rootList, files }) => onItemsDropped(rootList, files))
          .catch(notifyUploadFailed);
      },
    }),
    [onItemsDropped],
  );

  return { isOver, dropRef };
};
