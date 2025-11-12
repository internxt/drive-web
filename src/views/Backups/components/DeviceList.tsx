import desktopService from '../../../app/core/services/desktop.service';

import folderEmptyImage from '../../../assets/icons/light/folder-backup.svg';
import { DownloadSimple } from '@phosphor-icons/react';
import Empty from '../../../app/shared/components/Empty/Empty';
import notificationsService, { ToastType } from '../../../app/notifications/services/notifications.service';
import { useTranslationContext } from '../../../app/i18n/provider/TranslationProvider';
import { contextMenuBackupItems } from '../../../app/drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { skinSkeleton } from 'app/shared/Skeleton';
import { List } from '@internxt/ui';
import { Device } from '@internxt/sdk/dist/drive/backups/types';
import { DeviceNameCell, DeviceDateCell, DeviceSizeCell } from './DeviceListItem';

interface Props {
  items: (Device | DriveFolderData)[];
  selectedItems: (Device | DriveFolderData)[];
  isLoading: boolean;
  onDeviceSelected: (changes: { device: Device | DriveFolderData; isSelected: boolean }[]) => void;
  onDeviceDeleted: (device: (Device | DriveFolderData)[]) => void;
  onDeviceClicked: (device: Device | DriveFolderData) => void;
}

type Item = (Device & { name: string; size: number }) | (DriveFolderData & { size: number });

const DeviceList = (props: Props): JSX.Element => {
  const { isLoading, onDeviceDeleted, onDeviceSelected, selectedItems, onDeviceClicked } = props;

  const { translate } = useTranslationContext();

  const renderDeviceNameCell = (device: Item) => <DeviceNameCell device={device} onDeviceClicked={onDeviceClicked} />;
  const renderDeviceDateCell = (device: Item) => <DeviceDateCell device={device} translate={translate} />;
  const renderDeviceSizeCell = (device: Item) => <DeviceSizeCell device={device} />;

  const getDownloadApp = async () => {
    const download = await desktopService.getDownloadAppUrl();
    return download;
  };

  return (
    <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<Item, 'name' | 'updatedAt' | 'size'>
          header={[
            {
              label: translate('drive.list.columns.name'),
              width: 'flex-1 min-w-activity truncate shrink-0 cursor-pointer items-center',
              name: 'name',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.modified'),
              width: 'w-date',
              name: 'updatedAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.size'),
              width: 'flex cursor-pointer items-center w-size',
              name: 'size',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={props.items as Item[]}
          isLoading={isLoading}
          itemComposition={[renderDeviceNameCell, renderDeviceDateCell, renderDeviceSizeCell]}
          onClick={(item) => {
            const unselectedDevices = selectedItems.map((deviceSelected) => ({
              device: deviceSelected,
              isSelected: false,
            }));
            onDeviceSelected([...unselectedDevices, { device: item, isSelected: true }]);
          }}
          onDoubleClick={onDeviceClicked}
          skinSkeleton={skinSkeleton}
          emptyState={
            <Empty
              icon={<img className="w-36" alt="" src={folderEmptyImage} />}
              title={translate('backups.empty.title')}
              subtitle={translate('backups.empty.subtitle')}
              action={{
                icon: DownloadSimple,
                style: 'plain',
                text: translate('backups.empty.downloadApp'),
                onClick: () => {
                  getDownloadApp()
                    .then((downloaded) => {
                      window.open(downloaded, '_newtab' + Date.now());
                    })
                    .catch(() => {
                      notificationsService.show({
                        text: 'Something went wrong while downloading the desktop app',
                        type: ToastType.Error,
                      });
                    });
                },
              }}
            />
          }
          menu={contextMenuBackupItems({
            onDeviceDeleted,
            selectedDevices: selectedItems as Device[],
          })}
          selectedItems={selectedItems as Item[]}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          onSelectedItemsChanged={(changes) => {
            const selectedDevicesParsed = changes.map((change) => ({ device: change.props, isSelected: change.value }));
            onDeviceSelected(selectedDevicesParsed);
          }}
          // disableItemCompositionStyles={true}
        />
      </div>
    </div>
  );
};

export default DeviceList;
