import DeviceListItem from './DeviceListItem';
import desktopService from '../../../core/services/desktop.service';
import { Device } from '../../types';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import folderEmptyImage from 'assets/icons/light/folder-backup.svg';
import { DownloadSimple } from 'phosphor-react';
import Empty from '../../../shared/components/Empty/Empty';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import List from '../../../shared/components/List';
import { contextMenuBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';

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
  const getLoadingSkeleton = () => {
    return Array(20)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };

  return (
    <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<Device | (DriveFolderData & { size: number }), 'name' | 'updatedAt' | 'size'>
          header={[
            {
              label: translate('drive.list.columns.name'),
              width: 'flex flex-grow cursor-pointer items-center pl-6',
              name: 'name',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.modified'),
              width: 'hidden w-3/12 lg:flex pl-4',
              name: 'updatedAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: translate('drive.list.columns.size'),
              width: 'flex w-2/12 cursor-pointer items-center',
              name: 'size',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={props.items as Device[] | (DriveFolderData & { size: number })[]}
          isLoading={isLoading || !!props.items.length}
          itemComposition={[(props) => <DeviceListItem device={props} onClick={(device) => onDeviceClicked(device)} />]}
          skinSkeleton={getLoadingSkeleton()}
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
          disableItemCompositionStyles={true}
        />
      </div>
    </div>
  );
};

export default DeviceList;
