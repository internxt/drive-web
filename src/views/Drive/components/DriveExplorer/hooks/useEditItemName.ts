import { useEffect, useState } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { storageActions } from 'app/store/slices/storage';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { DriveItemData } from 'app/drive/types';
import errorService from 'services/error.service';

export const useEditItemName = () => {
  const dispatch = useAppDispatch();
  const itemToRename = useAppSelector((state: RootState) => state.storage.itemToRename);
  const isFileViewerOpen = useAppSelector((state: RootState) => state.ui.isFileViewerOpen);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const [editNameItem, setEditNameItem] = useState<DriveItemData | null>(null);

  useEffect(() => {
    if (itemToRename) {
      setEditNameItem(itemToRename);
    }
  }, [itemToRename]);

  const onEditNameClose = (renamedItem?: DriveItemData) => {
    if (renamedItem && editNameItem) {
      if (isFileViewerOpen) {
        dispatch(uiActions.setCurrentEditingNameDirty(renamedItem.plainName ?? renamedItem.name));
      } else if (itemToRename && editNameItem.isFolder) {
        getAncestorsAndSetNamePath(renamedItem.uuid, dispatch, selectedWorkspace).catch(errorService.reportError);
      }
    }
    dispatch(storageActions.setItemToRename(null));
    setEditNameItem(null);
  };

  return { editNameItem, setEditNameItem, onEditNameClose };
};
