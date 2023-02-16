import { useState } from 'react';
import { DeviceBackup } from '../../types';
import BackupListItem from './BackupListItem';
import { useAppDispatch } from '../../../store/hooks';
import { backupsThunks } from '../../../store/slices/backups';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import List from '../../../shared/components/List';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';

interface Props {
  items: DeviceBackup[];
  isLoading: boolean;
}

const BackupList = (props: Props): JSX.Element => {
  const dispatch = useAppDispatch();
  const { isLoading } = props;

  const [selectedBackups, setSelectedBackups] = useState<DeviceBackup[]>([]);

  const onDownloadBackupClicked = async () => {
    selectedBackups.forEach(async (backup) => dispatch(backupsThunks.downloadBackupThunk(backup)));
  };
  const onDeleteBackupClicked = async () => {
    selectedBackups.forEach(async (backup) => dispatch(backupsThunks.deleteBackupThunk(backup)));
  };

  const onBackupSelected = (changes: { device: DeviceBackup; isSelected: boolean }[]) => {
    let updatedSelectedItems = selectedBackups;
    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.device.id);
      if (change.isSelected) {
        updatedSelectedItems = [...updatedSelectedItems, change.device];
      }
    }
    setSelectedBackups(updatedSelectedItems);
  };

  const getLoadingSkeleton = () => {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };

  return (
    <div className="flex h-1 flex-grow flex-col bg-white">
      <div id="scrollableList" className="flex h-full flex-col overflow-y-auto">
        {isLoading ? (
          getLoadingSkeleton()
        ) : (
          <div className="flex h-full w-full flex-col overflow-y-auto">
            <List<DeviceBackup, 'name' | 'updatedAt' | 'size'>
              header={[
                {
                  label: 'Name',
                  width: 'flex flex-grow cursor-pointer items-center pl-6',
                  name: 'name',
                  orderable: true,
                  defaultDirection: 'ASC',
                },
                {
                  label: 'Modified',
                  width: 'hidden w-3/12 lg:flex pl-4',
                  name: 'updatedAt',
                  orderable: true,
                  defaultDirection: 'ASC',
                },
                {
                  label: 'Size',
                  width: 'flex w-1/12 cursor-pointer items-center',
                  name: 'size',
                  orderable: true,
                  defaultDirection: 'ASC',
                },
              ]}
              items={props.items}
              isLoading={isLoading}
              itemComposition={[
                (props) => (
                  <BackupListItem
                    key={props.id}
                    backup={props}
                    onDownloadBackupClicked={onDownloadBackupClicked}
                    onDeleteBackupClicked={onDeleteBackupClicked}
                  />
                ),
              ]}
              skinSkeleton={getLoadingSkeleton()}
              onNextPage={() => ({})} //TODO: REVISAR ESTO!
              hasMoreItems={false} //TODO: REVISAR ESTO!
              menu={contextMenuSelectedBackupItems({
                onDeleteSelectedItems: onDeleteBackupClicked,
                onDownloadSelectedItems: onDownloadBackupClicked,
              })}
              selectedItems={selectedBackups}
              keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
              onSelectedItemsChanged={(changes) => {
                const selectedDevicesParsed = changes.map((change) => ({
                  device: change.props,
                  isSelected: change.value,
                }));
                onBackupSelected(selectedDevicesParsed);
              }}
              disableItemCompositionStyles={true}
            />
          </div>
        )}
        {/* TODO: REVISAR ESTILOS AÑADIDOS POR ALVARO*/}
        {/* <div
        className="files-list \ flex border-b border-gray-5
      bg-white py-3 text-sm font-semibold"
      >
        <div className="box-content flex w-0.5/12 items-center justify-start pl-3"></div>
        <div className="flex flex-grow items-center px-3">{translate('backups.backups-list.columns.name')}</div>
        <div className="hidden w-2/12 items-center xl:flex"></div>
        <div className="hidden w-3/12 items-center lg:flex">
          {translate('backups.backups-list.columns.last-update')}
        </div>
        <div className="flex w-2/12 items-center">{translate('backups.backups-list.columns.size')}</div>
        <div className="flex w-1/12 items-center rounded-tr-4px">
          {translate('backups.backups-list.columns.actions')}
        </div> */}
      </div>
    </div>
  );
};

export default BackupList;
