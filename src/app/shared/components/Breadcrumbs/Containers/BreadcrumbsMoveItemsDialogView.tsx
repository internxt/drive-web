import { FolderPathDialog } from 'app/drive/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { storageSelectors } from 'app/store/slices/storage';
import { canItemDrop, onItemDropped } from '../helper';
import iconService from 'app/drive/services/icon.service';
import { DragAndDropType } from 'app/core/types';
import { NativeTypes } from 'react-dnd-html5-backend';
import { BreadcrumbItemData, Breadcrumbs } from '@internxt/ui';
import { useDrop } from 'react-dnd';

interface BreadcrumbsMoveItemsDialogViewProps {
  onShowFolderContentClicked: (folderId: string, name: string) => void;
  currentNamePaths: FolderPathDialog[];
}

const BreadcrumbsMoveItemsDialogView = (props: BreadcrumbsMoveItemsDialogViewProps) => {
  const { onShowFolderContentClicked, currentNamePaths } = props;
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const dispatch = useAppDispatch();
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);

  const breadcrumbItems = (currentFolderPaths): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    if (currentFolderPaths.length > 0) {
      currentFolderPaths.forEach((path: FolderPathDialog, i: number, namePath: FolderPathDialog[]) => {
        items.push({
          uuid: path.uuid,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          dialog: isOpen,
          onClick: () => onShowFolderContentClicked(path.uuid, path.name),
        });
      });
    }
    return items;
  };

  return (
    <Breadcrumbs
      items={breadcrumbItems(currentNamePaths)}
      namePath={currentNamePaths}
      isSomeItemSelected={isSomeItemSelected}
      selectedItems={selectedItems}
      onItemDropped={onItemDropped}
      canItemDrop={canItemDrop}
      dispatch={dispatch}
      acceptedTypes={[NativeTypes.FILE, DragAndDropType.DriveItem]}
      itemComponent={iconService.getItemIcon(true)}
      useDrop={useDrop}
    />
  );
};

export default BreadcrumbsMoveItemsDialogView;
