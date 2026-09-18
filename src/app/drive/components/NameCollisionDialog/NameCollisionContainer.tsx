import { FC, useMemo } from 'react';
import NameCollisionDialog, { OnSubmitPressed } from '.';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { IRoot } from 'app/store/slices/storage/types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { NameCollisionContext, resolveCollision } from './nameCollision.actions';

const NameCollisionContainer: FC = () => {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const collisionDialogInfo = useAppSelector((state: RootState) => state.ui.nameCollisionDialogInfo);
  const collisionGroups = useMemo(() => collisionDialogInfo?.groups ?? [], [collisionDialogInfo]);
  const operationType = collisionDialogInfo?.operation;
  const newItems = useMemo(() => collisionGroups.flatMap((g) => g.duplicatedItems), [collisionGroups]);
  const existingItems = useMemo(() => collisionGroups.flatMap((g) => g.existingItems), [collisionGroups]);

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const context: NameCollisionContext = { dispatch, selectedWorkspace, maxUploadFileSize, isVersioningEnabled };

  const closeDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: false, info: undefined }));
  };

  const triggerSelectedOptionsOnSubmit = async ({ operationType, operation }: OnSubmitPressed) => {
    for (const group of collisionGroups) {
      await resolveCollision(
        {
          operationType,
          operation,
          items: group.duplicatedItems,
          existingItems: group.existingItems,
          destinationUuid: group.destinationUuid,
        },
        context,
      );
    }
    closeDialog();
  };

  if (!collisionDialogInfo) return null;

  return (
    <NameCollisionDialog
      isOpen={isOpen}
      newItems={newItems as (File | IRoot)[]}
      driveItems={existingItems}
      onCancelButtonPressed={closeDialog}
      onSubmitButtonPressed={triggerSelectedOptionsOnSubmit}
      onCloseDialog={closeDialog}
      operationType={operationType as 'move' | 'upload'}
    />
  );
};

export default NameCollisionContainer;
