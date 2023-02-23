import { useState } from 'react';
import { DeviceBackup } from '../../types';
import BackupListItem from './BackupListItem';
import { useAppDispatch } from '../../../store/hooks';
import { backupsThunks } from '../../../store/slices/backups';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import List from '../../../shared/components/List';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';

interface Props {
  items: DeviceBackup[];
  isLoading: boolean;
}

const BackupList = (props: Props): JSX.Element => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const { isLoading } = props;

  const [selectedBackups, setSelectedBackups] = useState<DeviceBackup[]>([]);

  const onDownloadBackupClicked = () => {
    selectedBackups.forEach((backup) => dispatch(backupsThunks.downloadBackupThunk(backup)));
  };
  const onDeleteBackupClicked = () => {
    selectedBackups.forEach((backup) => dispatch(backupsThunks.deleteBackupThunk(backup)));
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
      </div>
    </div>
  );
};

export default BackupList;
