import { uiActions } from 'app/store/slices/ui';
import { planThunks } from 'app/store/slices/plan';
import { uploadFoldersWithManager } from 'app/network/UploadFolderManager';

type UploadFoldersWithManagerProps = Parameters<typeof uploadFoldersWithManager>[0];
type UploadFoldersWithTrackingProps = Omit<
  UploadFoldersWithManagerProps,
  'fileSizeExceededCallback' | 'onFolderUploadSucceeded'
>;

export const uploadFoldersWithTracking = (props: UploadFoldersWithTrackingProps): Promise<void> => {
  const { dispatch, selectedWorkspace } = props;
  const memberId = selectedWorkspace?.workspaceUser?.memberId;

  return uploadFoldersWithManager({
    ...props,
    fileSizeExceededCallback: (exceededFiles) =>
      dispatch(uiActions.setOpenFileSizeLimitReachedDialog({ open: true, info: { exceededFiles } })),
    onFolderUploadSucceeded: () => {
      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
        if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
      }, 1000);
    },
  });
};
