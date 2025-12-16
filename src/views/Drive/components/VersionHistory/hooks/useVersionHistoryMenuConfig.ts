import { useSelector } from 'react-redux';
import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import navigationService from 'services/navigation.service';
import { DriveItemData } from 'app/drive/types';
import { isVersioningExtensionAllowed } from '../utils';
import { VersionHistoryMenuConfig } from '../../DriveExplorer/components/DriveItemContextMenu';
import { RootState } from 'app/store';

export const useVersionHistoryMenuConfig = (selectedItem?: DriveItemData): VersionHistoryMenuConfig => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const limits = useSelector((state: RootState) => state.fileVersions.limits);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;
  const allowedExtension = selectedItem ? isVersioningExtensionAllowed(selectedItem) : true;

  return {
    locked: !isVersioningEnabled,
    allowedExtension,
    onLockedClick: () => {
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
      navigationService.openPreferencesDialog({
        section: 'account',
        subsection: 'plans',
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
    },
  };
};
