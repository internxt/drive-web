import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { backupsActions } from 'app/store/slices/backups';
import { t } from 'i18next';
import BreadcrumbsMenuBackups from '../BreadcrumbsMenu/BreadcrumbsMenuBackups';
import { storageSelectors } from 'app/store/slices/storage';
import { canItemDrop, onItemDropped } from '../helper';
import iconService from 'app/drive/services/icon.service';
import { DragAndDropType } from 'app/core/types';
import { NativeTypes } from 'react-dnd-html5-backend';
import { BreadcrumbItemData, Breadcrumbs } from '@internxt/ui';
import { useDrop } from 'react-dnd';

interface BreadcrumbsBackupsViewProps {
  backupsAsFoldersPath: DriveFolderData[];
  goToFolder: (folderId: number, folderUuid?: string) => void;
  goToFolderRoot: () => void;
}

const BreadcrumbsBackupsView = ({ backupsAsFoldersPath, goToFolder, goToFolderRoot }: BreadcrumbsBackupsViewProps) => {
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const dispatch = useAppDispatch();
  const namePath = useAppSelector((state) => state.storage.namePath);
  const isSomeItemSelected = useAppSelector(storageSelectors.isSomeItemSelected);
  const selectedItems = useAppSelector((state) => state.storage.selectedItems);

  const breadcrumbBackupsViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    items.push({
      uuid: '',
      label: `${t('backups.your-devices')}`,
      icon: null,
      isFirstPath: true,
      active: true,
      onClick: () => goToFolderRoot(),
    });

    if (currentDevice && 'mac' in currentDevice) {
      items.push({
        uuid: currentDevice.id.toString(),
        label: currentDevice.name,
        icon: null,
        active: false,
        isBackup: true,
      });
    } else if (currentDevice) {
      backupsAsFoldersPath.forEach((item, i) => {
        const clickableOptions = {
          active: true,
          onClick: () => {
            dispatch(backupsActions.setCurrentFolder(item));
            goToFolder(item.id, item.uuid);
          },
        };
        items.push({
          uuid: item.uuid,
          label: item.name,
          icon: null,
          isBackup: true,
          ...(i === backupsAsFoldersPath.length - 1 ? { active: false } : clickableOptions),
        });
      });
    }

    return items;
  };
  return (
    <Breadcrumbs
      items={breadcrumbBackupsViewItems()}
      menu={BreadcrumbsMenuBackups}
      namePath={namePath}
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

export default BreadcrumbsBackupsView;
