import { Workspace } from '../../../../../core/types';
import { useAppSelector } from '../../../../../store/hooks';
import storageSelectors from '../../../../../store/slices/storage/storage.selectors';
import { DriveItemData, FolderPath } from '../../../../types';

import shareService from 'app/share/services/share.service';
interface DriveItemStoreProps {
  isSomeItemSelected: boolean;
  selectedItems: DriveItemData[];
  namePath: FolderPath[];
  currentFolderId: number;
  isItemSelected: (item: DriveItemData) => boolean;
  workspace: Workspace;
  isSidenavCollapsed: boolean;
  isDriveItemInfoMenuOpen: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isItemShared: (item: any, callback: any)=>void;
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
  const isItemShared = useAppSelector((state) => (item,callback)=>{
    const page = state.shared.pagination.page;
    const perPage = state.shared.pagination.perPage;
    shareService.getAllShareLinks(page,perPage,undefined).then((response)=>{
  
    response.items.some((i) => {
      
      callback(item.id.toString() === (i.item as DriveItemData).id.toString() && (item.isFolder === i.isFolder || (item.isFolder === undefined && i.isFolder === false)));
    });
  });
  });

  return {
    isSomeItemSelected,
    selectedItems,
    namePath,
    currentFolderId,
    isItemSelected,
    workspace,
    isSidenavCollapsed,
    isDriveItemInfoMenuOpen,
    isItemShared,
  };
};

export default useDriveItemStoreProps;
