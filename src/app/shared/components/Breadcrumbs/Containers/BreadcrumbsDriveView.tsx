import navigationService from 'app/core/services/navigation.service';
import { AppView, DragAndDropType } from 'app/core/types';
import { FolderPath } from 'app/drive/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { t } from 'i18next';
import BreadcrumbsMenuDrive from '../BreadcrumbsMenu/BreadcrumbsMenuDrive';
import { storageSelectors } from 'app/store/slices/storage';
import iconService from 'app/drive/services/icon.service';
import { NativeTypes } from 'react-dnd-html5-backend';
import { BreadcrumbItemData, Breadcrumbs } from '@internxt/ui';
import { useDrop } from 'react-dnd';
import { canItemDrop, onItemDropped } from '../helper';

interface BreadcrumbsDriveViewProps {
  namePath: FolderPath[];
}

const BreadcrumbsDriveView = (props: BreadcrumbsDriveViewProps) => {
  const { namePath } = props;
  const dispatch = useAppDispatch();
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);

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
          navigationService.push(AppView.Drive, {}, selectedWorkspace?.workspaceUser.workspaceId);
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
      namePath={props.namePath}
      isSomeItemSelected={isSomeItemSelected}
      selectedItems={selectedItems}
      onItemDropped={onItemDropped}
      canItemDrop={canItemDrop}
      dispatch={dispatch}
      acceptedTypes={[NativeTypes.FILE, DragAndDropType.DriveItem]}
      itemComponent={iconService.getItemIcon(true)}
      useDrop={useDrop}
    />
  );
};

export default BreadcrumbsDriveView;
