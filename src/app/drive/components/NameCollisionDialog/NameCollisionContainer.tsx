import { FC, useMemo } from 'react';
import NameCollisionDialog, { OnSubmitPressed } from '.';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { IRoot } from 'app/store/slices/storage/types';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { NameCollisionContext, resolveCollision } from './nameCollision.actions';
import { findExistingItemFor, findPendingGroupIndex, getRemainingGroups } from './nameCollision.utils';

const NameCollisionContainer: FC = () => {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);
  const collisionDialogInfo = useAppSelector((state: RootState) => state.ui.nameCollisionDialogInfo);
  const collisionGroups = useMemo(() => collisionDialogInfo?.groups ?? [], [collisionDialogInfo]);
  const operationType = collisionDialogInfo?.operation;
  const newItems = useMemo(() => collisionGroups.flatMap((g) => g.duplicatedItems), [collisionGroups]);
  const existingItems = useMemo(() => collisionGroups.flatMap((g) => g.existingItems), [collisionGroups]);
  const remainingItemsCount = existingItems.length;

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const maxUploadFileSize = useAppSelector(fileVersionsSelectors.getMaxFileSizeLimit);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;

  const context: NameCollisionContext = { dispatch, selectedWorkspace, maxUploadFileSize, isVersioningEnabled };

  const closeDialog = () => {
    dispatch(uiActions.setIsNameCollisionDialogOpen({ open: false, info: undefined }));
  };

  const triggerSelectedOptionsOnSubmit = async ({ operationType, operation, applyToAll }: OnSubmitPressed) => {
    if (applyToAll) {
      closeDialog();
      await Promise.all(
        collisionGroups.map((group) =>
          resolveCollision(
            {
              operationType,
              operation,
              items: group.duplicatedItems,
              existingItems: group.existingItems,
              destinationUuid: group.destinationUuid,
            },
            context,
          ),
        ),
      );
      return;
    }

    const groupIndex = findPendingGroupIndex(collisionGroups);
    const hasPendingGroup = groupIndex !== -1;
    if (!hasPendingGroup) {
      closeDialog();
      return;
    }

    const group = collisionGroups[groupIndex];
    const itemToUpload = group.duplicatedItems[0];
    const itemToReplace = findExistingItemFor(itemToUpload, group.existingItems);

    await resolveCollision(
      {
        operationType,
        operation,
        items: [itemToUpload],
        existingItems: group.existingItems,
        destinationUuid: group.destinationUuid,
      },
      context,
    );

    const remainingGroups = getRemainingGroups(collisionGroups, groupIndex, itemToReplace);
    const hasRemainingGroups = remainingGroups.length > 0;
    if (hasRemainingGroups) {
      dispatch(
        uiActions.setIsNameCollisionDialogOpen({
          open: true,
          info: { groups: remainingGroups, operation: operationType },
        }),
      );
    } else {
      closeDialog();
    }
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
      remainingItemsCount={remainingItemsCount}
    />
  );
};

export default NameCollisionContainer;
