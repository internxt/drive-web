import navigationService from '../../../../core/services/navigation.service';
import { AppView } from '../../../../core/types';
import { FolderPath } from '../../../../drive/types';
import Breadcrumbs from '../../../../shared/components/Breadcrumbs/Breadcrumbs';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { uiActions } from '../../../../store/slices/ui';
import { t } from 'i18next';
import BreadcrumbsMenuDrive from '../BreadcrumbsMenu/BreadcrumbsMenuDrive';
import { BreadcrumbItemData } from '../types';

interface BreadcrumbsDriveViewProps {
  namePath: FolderPath[];
}

const BreadcrumbsDriveView = (props: BreadcrumbsDriveViewProps) => {
  const { namePath } = props;
  const dispatch = useAppDispatch();
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);

  const breadcrumbDriveViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const breadcrumbNamePath = [...namePath];
      const firstPath = breadcrumbNamePath[0];

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

      breadcrumbNamePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
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
