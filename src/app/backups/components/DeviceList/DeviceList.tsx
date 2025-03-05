import desktopService from '../../../core/services/desktop.service';
import { Device } from '../../types';

import folderEmptyImage from 'assets/icons/light/folder-backup.svg';
import { DownloadSimple } from '@phosphor-icons/react';
import Empty from '../../../shared/components/Empty/Empty';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { contextMenuBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import UilApple from '@iconscout/react-unicons/icons/uil-apple';
import UilLinux from '@iconscout/react-unicons/icons/uil-linux';
import UilWindows from '@iconscout/react-unicons/icons/uil-windows';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import dateService from '../../../core/services/date.service';
import sizeService from '../../../drive/services/size.service';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { skinSkeleton } from 'app/shared/Skeleton';
import { List } from '@internxt/ui';

interface Props {
  items: (Device | DriveFolderData)[];
  selectedItems: (Device | DriveFolderData)[];
  isLoading: boolean;
  onDeviceSelected: (changes: { device: Device | DriveFolderData; isSelected: boolean }[]) => void;
  onDeviceDeleted: (device: (Device | DriveFolderData)[]) => void;
  onDeviceClicked: (device: Device | DriveFolderData) => void;
}

const DeviceList = (props: Props): JSX.Element => {
  const { isLoading, onDeviceDeleted, onDeviceSelected, selectedItems, onDeviceClicked } = props;

  const { translate } = useTranslationContext();

  const getDownloadApp = async () => {
    const download = await desktopService.getDownloadAppUrl();
    return download;
  };

  return (
    <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<Device | (DriveFolderData & { size: number }), 'name' | 'updatedAt' | 'size'>
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
          items={props.items as Device[] | (DriveFolderData & { size: number })[]}
          isLoading={isLoading}
          itemComposition={[
            (device) => {
              let Icon;

              if ('platform' in device) {
                switch (device.platform) {
                  case 'darwin':
                    Icon = UilApple;
                    break;
                  case 'linux':
                    Icon = UilLinux;
                    break;
                  case 'win32':
                    Icon = UilWindows;
                    break;
                  default:
                    Icon = UilDesktop;
                }
              } else Icon = UilDesktop;
              return (
                <div className="flex min-w-activity cursor-default flex-row items-center justify-center">
                  <div className="mr-3 h-8 w-8">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="grow cursor-default truncate pr-3">
                    <button className="z-10 shrink cursor-pointer truncate" onClick={() => onDeviceClicked(device)}>
                      {device.name}
                    </button>
                  </div>
                </div>
              );
            },
            (device) => <div>{dateService.formatDefaultDate(device.updatedAt, translate)}</div>,
            (device) => {
              const size = 'size' in device ? sizeService.bytesToString(device.size) : '';
              return <div>{size}</div>;
            },
          ]}
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
          selectedItems={selectedItems as Device[] | (DriveFolderData & { size: number })[]}
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
