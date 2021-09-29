import { Workspace } from '../../../../models/enums';
import { DriveItemData, FolderPath } from '../../../../models/interfaces';
import { useAppSelector } from '../../../../store/hooks';
import { storageSelectors } from '../../../../store/slices/storage';

interface DriveItemStoreProps {
  isSomeItemSelected: boolean;
  selectedItems: DriveItemData[];
  namePath: FolderPath[];
  currentFolderId: number;
  isItemSelected: (item: DriveItemData) => boolean;
  workspace: Workspace;
  isSidenavCollapsed: boolean;
  isDriveItemInfoMenuOpen: boolean;
}

const useDriveItemStoreProps = (): DriveItemStoreProps => {
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);
  const namePath = useAppSelector((state) => state.storage.namePath);
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const isItemSelected = useAppSelector(storageSelectors.isItemSelected);
  const workspace = useAppSelector((state) => state.session.workspace);
  const isSidenavCollapsed = useAppSelector((state) => state.ui.isSidenavCollapsed);
  const isDriveItemInfoMenuOpen = useAppSelector((state) => state.ui.isDriveItemInfoMenuOpen);

  return {
    isSomeItemSelected,
    selectedItems,
    namePath,
    currentFolderId,
    isItemSelected,
    workspace,
    isSidenavCollapsed,
    isDriveItemInfoMenuOpen,
  };
};

export default useDriveItemStoreProps;
