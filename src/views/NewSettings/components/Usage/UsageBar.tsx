import { bytesToString } from 'app/drive/services/size.service';
import { Tooltip } from '@internxt/ui';
import { getUsageBarPercentages } from 'views/NewSettings/utils';

const UsageBar = ({
  backupsUsage,
  driveUsage,
  spaceLimit,
  height,
}: {
  backupsUsage: string | number;
  driveUsage: string | number;
  spaceLimit: string | number;
  height: string | number;
}) => {
  const spaceLimitBytes = Number(spaceLimit);
  const driveUsageBytes = Number(driveUsage);
  const backupsUsageBytes = Number(backupsUsage);
  const { drivePercentage, backupPercentage, isOverLimit } = getUsageBarPercentages({
    driveUsageBytes,
    backupsUsageBytes,
    spaceLimitBytes,
  });
  const driveColor = isOverLimit ? 'bg-red' : 'bg-primary';
  const backupColor = isOverLimit ? 'bg-red' : 'bg-indigo';
  const hasDriveSegment = drivePercentage > 0;
  const hasBackupsSegment = backupPercentage > 0;
  const driveShapeClass = hasBackupsSegment ? 'mr-0.5 rounded-l-lg' : 'rounded-lg';
  const backupShapeClass = hasDriveSegment ? 'rounded-r-lg' : 'rounded-lg';
  const driveMinWidthClass = drivePercentage > 0 ? 'min-w-[5px]' : '';

  return (
    <div data-cy="usageBar" className={`flex w-full rounded-lg border border-gray-10 bg-gray-5 ${height}`}>
      <div className={`flex ${driveMinWidthClass}`} style={{ width: `${drivePercentage}%` }}>
        <Tooltip
          key="Drive"
          title="Drive"
          subtitle={bytesToString(driveUsageBytes)}
          popsFrom="top"
          className={`${driveShapeClass} !w-full ${driveColor}`}
        >
          <div></div>
        </Tooltip>
      </div>

      <div className="flex" style={{ width: `${backupPercentage}%` }}>
        <Tooltip
          key="Backup"
          title="Backup"
          subtitle={bytesToString(backupsUsageBytes)}
          popsFrom="top"
          className={`${backupShapeClass} !w-full ${backupColor}`}
        >
          <div></div>
        </Tooltip>
      </div>
    </div>
  );
};

export default UsageBar;
