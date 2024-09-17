import { RootState } from 'app/store';
import { Workspace } from '../../../../../core/types';
import { useAppSelector } from '../../../../../store/hooks';
import storageSelectors from '../../../../../store/slices/storage/storage.selectors';
import { DriveItemData, FolderPath } from '../../../../types';

interface DriveItemStoreProps {
  isSomeItemSelected: boolean;
  selectedItems: DriveItemData[];
  namePath: FolderPath[];
  currentFolderId: string;
  isItemSelected: (item: DriveItemData) => boolean;
  workspace: Workspace;
  isSidenavCollapsed: boolean;
  isDriveItemInfoMenuOpen: boolean;
  isEditingName: (item: DriveItemData) => boolean;
  dirtyName: string;
}

const useDriveItemStoreProps = (): DriveItemStoreProps => {
  const isEditingNameSelector =
    (state: RootState) =>
    (item: DriveItemData): boolean => {
      return (
        item.id === state.ui.currentEditingNameDriveItem?.id &&
        item.isFolder === state.ui.currentEditingNameDriveItem?.isFolder
      );
    };

  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state: RootState) => state.storage.selectedItems);
  const namePath = useAppSelector((state: RootState) => state.storage.namePath);
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const isItemSelected = useAppSelector(storageSelectors.isItemSelected);
  const workspace = useAppSelector((state: RootState) => state.session.workspace);
  const isSidenavCollapsed = useAppSelector((state: RootState) => state.ui.isSidenavCollapsed);
  const isDriveItemInfoMenuOpen = useAppSelector((state: RootState) => state.ui.isDriveItemInfoMenuOpen);
  const isEditingName = useAppSelector(isEditingNameSelector);
  const dirtyName = useAppSelector((state: RootState) => state.ui.currentEditingNameDirty);

  return {
    isSomeItemSelected,
    selectedItems,
    namePath,
    currentFolderId,
    isItemSelected,
    workspace,
    isSidenavCollapsed,
    isDriveItemInfoMenuOpen,
    isEditingName,
    dirtyName,
  };
};

export default useDriveItemStoreProps;
