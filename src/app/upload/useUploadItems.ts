import { useMemo } from 'react';
import { useStore } from 'react-redux';
import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { AppDispatch, RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { planSelectors, planThunks } from 'app/store/slices/plan';
import { storageActions } from 'app/store/slices/storage';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { startUpload, UploadContext, uploadItems, UploadItemsPayload } from './uploadItems';

const createUploadContext = (dispatch: AppDispatch, state: RootState): UploadContext => ({
  ownerUserAuthenticationData: workspacesSelectors.getOwnerUserAuthenticationData(state),
  maxUploadFileSize: fileVersionsSelectors.getMaxFileSizeLimit(state),
  planStorage: { limit: planSelectors.planLimitToShow(state), usage: planSelectors.planUsageToShow(state) },
  onUploadItemsLimitExceeded: () => {
    dispatch(uiActions.setIsUploadItemsFailsDialogOpen(true));
    notificationsService.show({ text: t('drive.uploadItems.advice'), type: ToastType.Warning });
  },
  onFilesTooLarge: (exceededFiles) =>
    dispatch(uiActions.setOpenFileSizeLimitReachedDialog({ open: true, info: { exceededFiles } })),
  onPlanLimitReached: () => dispatch(uiActions.setOpenReachedPlanLimitDialog({ open: true })),
  onNameCollisions: (collisionGroups) =>
    dispatch(
      uiActions.setIsNameCollisionDialogOpen({ open: true, info: { groups: collisionGroups, operation: 'upload' } }),
    ),
  onItemUploaded: (uploadedItem, parentFolderUuid) =>
    dispatch(storageActions.pushItems({ updateRecents: true, folderIds: [parentFolderUuid], items: [uploadedItem] })),
  onItemRemoved: (removedItem, parentFolderUuid) =>
    dispatch(storageActions.popItems({ folderIds: [parentFolderUuid], items: [removedItem] })),
  onUploadFinished: (destinationFolderUuid) => {
    dispatch(fetchSortedFolderContentThunk(destinationFolderUuid));
    dispatch(planThunks.fetchUsageThunk());
    const isWorkspaceMember = !!workspacesSelectors.getSelectedWorkspace(state)?.workspaceUser?.memberId;
    if (isWorkspaceMember) dispatch(planThunks.fetchBusinessLimitUsageThunk());
  },
});

type UploadContextOverrides = Partial<
  Pick<UploadContext, 'ownerUserAuthenticationData' | 'onPlanLimitReached' | 'onUploadFinished'>
>;

export const useUploadItems = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  return useMemo(() => {
    const getUploadContext = () => createUploadContext(dispatch, store.getState());

    return {
      uploadItems: (payload: UploadItemsPayload) => uploadItems(payload, getUploadContext()),
      startUpload: (payload: UploadItemsPayload, contextOverrides: UploadContextOverrides = {}) =>
        startUpload(payload, { ...getUploadContext(), ...contextOverrides }),
    };
  }, [dispatch, store]);
};
