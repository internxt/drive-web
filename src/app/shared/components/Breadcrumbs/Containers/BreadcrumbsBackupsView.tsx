import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { Device } from 'app/backups/types';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { backupsActions } from 'app/store/slices/backups';
import { t } from 'i18next';
import { Dispatch, SetStateAction } from 'react';
import BreadcrumbsMenuBackups from '../BreadcrumbsMenu/BreadcrumbsMenuBackups';
import { BreadcrumbItemData } from '../types';

interface BreadcrumbsBackupsViewProps {
  setSelectedDevices: Dispatch<SetStateAction<(Device | DriveFolderData)[]>>;
  backupsAsFoldersPath: DriveFolderData[];
  goToFolder: (folderId: number, folderUuid?: string) => void;
}

const BreadcrumbsBackupsView = ({
  setSelectedDevices,
  backupsAsFoldersPath,
  goToFolder,
}: BreadcrumbsBackupsViewProps) => {
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const dispatch = useAppDispatch();

  const goBack = () => {
    setSelectedDevices([]);
    dispatch(backupsActions.setCurrentDevice(null));
  };

  const breadcrumbBackupsViewItems = (): BreadcrumbItemData[] => {
    const items: BreadcrumbItemData[] = [];

    items.push({
      uuid: '',
      label: `${t('backups.your-devices')}`,
      icon: null,
      isFirstPath: true,
      active: true,
      onClick: () => goBack(),
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
  return <Breadcrumbs items={breadcrumbBackupsViewItems()} menu={BreadcrumbsMenuBackups} />;
};

export default BreadcrumbsBackupsView;
