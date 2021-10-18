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

const BackupList = (props: Props) => {
  const dispatch = useAppDispatch();
  const { isLoading } = props;
  const onDownloadBackupClicked = async (backup: DeviceBackup) => {
    dispatch(backupsThunks.downloadBackupThunk(backup));
  };
  const getItemsList = () =>
    props.items.map((item: DeviceBackup) => (
      <BackupListItem
        key={item.id}
        backup={item}
        onDownloadBackupClicked={(backup) => onDownloadBackupClicked(backup)}
      />
    ));
  const getLoadingSkeleton = () => {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };

  return (
    <div className="flex flex-col flex-grow bg-white h-1">
      <div className="files-list font-semibold flex border-b border-l-neutral-30 bg-white text-neutral-500 py-3 text-sm">
        <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
        <div className="flex-grow flex items-center px-3">{i18n.get('backups.backups-list.columns.name')}</div>
        <div className="w-2/12 hidden items-center xl:flex"></div>
        <div className="w-3/12 hidden items-center lg:flex">{i18n.get('backups.backups-list.columns.last-update')}</div>
        <div className="w-2/12 flex items-center">{i18n.get('backups.backups-list.columns.size')}</div>
        <div className="w-1/12 flex items-center rounded-tr-4px">
          {i18n.get('backups.backups-list.columns.actions')}
        </div>
      </div>
      <div className="h-full overflow-y-auto">{isLoading ? getLoadingSkeleton() : getItemsList()}</div>
    </div>
  );
};

export default BackupList;
