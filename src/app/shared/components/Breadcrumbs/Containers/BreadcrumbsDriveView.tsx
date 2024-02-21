import { FolderPath } from 'app/drive/types';
import { BreadcrumbItemData } from '../types';
import { AppDispatch } from 'app/store';
import { t } from 'i18next';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';

interface BreadcrumbsDriveViewProps {
  namePath: FolderPath[];
  dispatch: AppDispatch;
}

const BreadcrumbsDriveView = (props: BreadcrumbsDriveViewProps) => {
  const { namePath, dispatch } = props;

  const breadcrumbDriveViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    if (namePath.length > 0) {
      const firstPath = namePath[0];

      items.push({
        id: firstPath.id,
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

      namePath.slice(1).forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => navigationService.pushFolder(path.uuid),
        });
      });
    }

    return items;
  };
  return <Breadcrumbs items={breadcrumbDriveViewItems()} rootBreadcrumbItemDataCy="driveViewRootBreadcrumb" />;
};

export default BreadcrumbsDriveView;
