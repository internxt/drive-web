import { useSelector } from 'react-redux';
import { fileVersionsSelectors } from 'app/store/slices/fileVersions';
import { DriveItemData } from 'app/drive/types';
import { isVersioningExtensionAllowed } from '../components/VersionHistory/utils';
import { VersionHistoryMenuConfig } from '../components/DriveExplorer/components/DriveItemContextMenu';

export const useVersionHistoryMenuConfig = (selectedItem?: DriveItemData): VersionHistoryMenuConfig => {
  const limits = useSelector(fileVersionsSelectors.getLimits);
  const isVersioningEnabled = limits?.versioning?.enabled ?? false;
  const isExtensionAllowed = selectedItem ? isVersioningExtensionAllowed(selectedItem) : true;

  return {
    isLocked: !isVersioningEnabled,
    isExtensionAllowed,
  };
};
