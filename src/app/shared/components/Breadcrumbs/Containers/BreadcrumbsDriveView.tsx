import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { FolderPath } from 'app/drive/types';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { t } from 'i18next';
import BreadcrumbsMenuDrive from '../BreadcrumbsMenu/BreadcrumbsMenuDrive';
import { BreadcrumbItemData } from '../types';
import useDriveItemStoreProps from 'app/drive/components/DriveExplorer/DriveExplorerItem/hooks/useDriveStoreProps';
import { getAncestorsAndSetNamePath } from 'app/store/slices/storage/storage.thunks/goToFolderThunk';
import { useEffect } from 'react';

interface BreadcrumbsDriveViewProps {
  namePath: FolderPath[];
}

const BreadcrumbsDriveView = (props: BreadcrumbsDriveViewProps) => {
  const { namePath } = props;
  const dispatch = useAppDispatch();
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);
  const currentBreadcrumb = namePath[namePath.length - 1];
  const { breadcrumbDirtyName } = useDriveItemStoreProps();

  useEffect(() => {
    if (breadcrumbDirtyName) {
      getAncestorsAndSetNamePath(currentBreadcrumb.uuid, dispatch);
      dispatch(uiActions.setCurrentEditingBreadcrumbNameDirty(''));
    }
  }, [breadcrumbDirtyName]);

  const breadcrumbDriveViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const breadcrumbNamePath = [...namePath];
      const parsedBreadcrumbNamePath =
        selectedWorkspace && breadcrumbNamePath.length > 1 ? breadcrumbNamePath.slice(1) : breadcrumbNamePath;
      const firstPath = parsedBreadcrumbNamePath[0];

      items.push({
        uuid: firstPath.uuid,
        label: t('sideNav.drive'),
        icon: null,
        active: true,
        isFirstPath: true,
        onClick: () => {
          dispatch(uiActions.setIsGlobalSearch(false));
          dispatch(storageThunks.goToFolderThunk(firstPath));
          navigationService.push(AppView.Drive);
        },
      });

      parsedBreadcrumbNamePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          uuid: path.uuid,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => navigationService.pushFolder(path.uuid, selectedWorkspace?.workspaceUser.workspaceId),
        });
      });
    }

    return items;
  };
  return (
    <Breadcrumbs
      items={breadcrumbDriveViewItems()}
      rootBreadcrumbItemDataCy="driveViewRootBreadcrumb"
      menu={BreadcrumbsMenuDrive}
    />
  );
};

export default BreadcrumbsDriveView;
