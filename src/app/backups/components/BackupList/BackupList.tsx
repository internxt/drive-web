import { DeviceBackup } from '../../types';
import BackupListItem from './BackupListItem';
import { useAppDispatch } from '../../../store/hooks';
import { backupsThunks } from '../../../store/slices/backups';
import i18n from '../../../i18n/services/i18n.service';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';

interface Props {
  items: DeviceBackup[];
  isLoading: boolean;
}

const BackupList = (props: Props): JSX.Element => {
  const dispatch = useAppDispatch();
  const { isLoading } = props;
  const onDownloadBackupClicked = async (backup: DeviceBackup) => {
    dispatch(backupsThunks.downloadBackupThunk(backup));
  };
  const onDeleteBackupClicked = async (backup: DeviceBackup) => {
    dispatch(backupsThunks.deleteBackupThunk(backup));
  };
  const getItemsList = () =>
    props.items.map((item: DeviceBackup) => (
      <BackupListItem
        key={item.id}
        backup={item}
        onDownloadBackupClicked={onDownloadBackupClicked}
        onDeleteBackupClicked={onDeleteBackupClicked}
        dataTest="backup-list-item"
      />
    ));
  const getLoadingSkeleton = () => {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };

  return (
    <div className="flex h-1 flex-grow flex-col bg-white">
      <div
        className="files-list \ flex border-b border-neutral-30
      bg-white py-3 text-sm font-semibold text-neutral-500"
      >
        <div className="box-content flex w-0.5/12 items-center justify-start pl-3"></div>
        <div className="flex flex-grow items-center px-3">{i18n.get('backups.backups-list.columns.name')}</div>
        <div className="hidden w-2/12 items-center xl:flex"></div>
        <div className="hidden w-3/12 items-center lg:flex">{i18n.get('backups.backups-list.columns.last-update')}</div>
        <div className="flex w-2/12 items-center">{i18n.get('backups.backups-list.columns.size')}</div>
        <div className="flex w-1/12 items-center rounded-tr-4px">
          {i18n.get('backups.backups-list.columns.actions')}
        </div>
      </div>
      <div className="h-full overflow-y-auto">{isLoading ? getLoadingSkeleton() : getItemsList()}</div>
    </div>
  );
};

export default BackupList;
