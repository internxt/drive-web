import { uiActions } from 'app/store/slices/ui';
import { planThunks } from 'app/store/slices/plan';
import { uploadFoldersWithTasks } from 'app/tasks/upload/uploadFoldersWithTasks';

type UploadFoldersWithTasksProps = Parameters<typeof uploadFoldersWithTasks>[0];
type UploadFoldersWithTrackingProps = Omit<
  UploadFoldersWithTasksProps,
  'fileSizeExceededCallback' | 'onFolderUploadSucceeded'
>;

export const uploadFoldersWithTracking = (props: UploadFoldersWithTrackingProps): Promise<void> => {
  const { dispatch, selectedWorkspace } = props;
  const memberId = selectedWorkspace?.workspaceUser?.memberId;

  return uploadFoldersWithTasks({
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
