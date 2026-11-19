import { useEffect } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { setItemsToMove, storageActions } from 'app/store/slices/storage';
import { uiActions } from 'app/store/slices/ui';

/**
 * Escape closes the dialog opened on top of the file viewer instead of the viewer itself.
 */
export const useNestedDialogsEscape = (): void => {
  const dispatch = useAppDispatch();
  const isMoveItemsDialogOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const isCreateFolderDialogOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const isEditNameDialogOpen = useAppSelector((state: RootState) => state.ui.isEditFolderNameDialog);
  const isShareDialogOpen = useAppSelector((state: RootState) => state.ui.isShareItemDialogOpenInPreviewView);
  const isNestedDialogOpen =
    isMoveItemsDialogOpen || isCreateFolderDialogOpen || isEditNameDialogOpen || isShareDialogOpen;

  useEffect(() => {
    if (!isNestedDialogOpen) return;

    const closeNestedDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();

      if (isShareDialogOpen) {
        dispatch(uiActions.setIsShareItemDialogOpenInPreviewView(false));
        dispatch(storageActions.setItemToShare(null));
      } else if (isEditNameDialogOpen) {
        dispatch(storageActions.setItemToRename(null));
        dispatch(uiActions.setIsEditFolderNameDialog(false));
      } else if (isCreateFolderDialogOpen) {
        dispatch(uiActions.setIsCreateFolderDialogOpen(false));
      } else {
        dispatch(uiActions.setIsMoveItemsDialogOpen(false));
        dispatch(setItemsToMove([]));
      }
    };

    document.addEventListener('keydown', closeNestedDialog);
    return () => document.removeEventListener('keydown', closeNestedDialog);
  }, [isNestedDialogOpen, isMoveItemsDialogOpen, isCreateFolderDialogOpen, isEditNameDialogOpen, isShareDialogOpen]);
};
