import { Dispatch, SetStateAction } from 'react';
import { BreadcrumbItemData } from '../types';
import { t } from 'i18next';
import Breadcrumbs from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { Device } from 'app/backups/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { backupsActions } from 'app/store/slices/backups';
import BreadcrumbsMenuBackups from '../BreadcrumbsMenu/BreadcrumbsMenuBackups';

interface BreadcrumbsBackupsViewProps {
  setSelectedDevices: Dispatch<SetStateAction<(Device | DriveFolderData)[]>>;
  backupsAsFoldersPath: DriveFolderData[];
  goToFolder: (folderId: number) => void;
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
      id: -1,
      label: `${t('backups.your-devices')}`,
      icon: null,
      isFirstPath: true,
      active: true,
      onClick: () => goBack(),
    });

    if (currentDevice && 'mac' in currentDevice) {
      items.push({
        id: currentDevice.id,
        label: currentDevice.name,
        icon: null,
        active: false,
        isBackup: true,
      });
    } else if (currentDevice) {
      backupsAsFoldersPath.forEach((item, i) => {
        const clickableOptions = {
          active: true,
          onClick: () => goToFolder(item.id),
        };
        items.push({
          id: item.id,
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
