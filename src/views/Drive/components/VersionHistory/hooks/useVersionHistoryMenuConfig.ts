import { useSelector } from 'react-redux';
import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import navigationService from 'services/navigation.service';
import { DriveItemData } from 'app/drive/types';
import { isVersioningExtensionAllowed } from '../utils';
import { VersionHistoryMenuConfig } from '../../DriveExplorer/components/DriveItemContextMenu';

export const useVersionHistoryMenuConfig = (selectedItem?: DriveItemData): VersionHistoryMenuConfig => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useSelector(fileVersionsSelectors.getLimits);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;
  const isExtensionAllowed = selectedItem ? isVersioningExtensionAllowed(selectedItem) : true;

  return {
    isLocked: !isVersioningEnabled,
    isExtensionAllowed,
    onUpgradeClick: () => {
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
      navigationService.openPreferencesDialog({
        section: 'account',
        subsection: 'plans',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
    },
  };
};
