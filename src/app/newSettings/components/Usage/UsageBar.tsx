import { useEffect, useRef, useState } from 'react';
import { bytesToString } from 'app/drive/services/size.service';
import Tooltip from 'app/shared/components/Tooltip';

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
  const [barWidth, setBarWidth] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const spaceLimitBytes = Number(spaceLimit);
  const driveUsageBytes = Number(driveUsage);
  const backupsUsageBytes = Number(backupsUsage);
  const percentageDriveUsed = (driveUsageBytes * 100) / spaceLimitBytes;
  const percentageBackupUsed = (backupsUsageBytes * 100) / spaceLimitBytes;
  const driveWidth = (barWidth * percentageDriveUsed) / 100;
  const backupWidth = (barWidth * percentageBackupUsed) / 100;

  useEffect(() => {
    const bar = barRef.current;

    if (bar) {
      const listener = () => {
        setBarWidth(bar.getBoundingClientRect().width);
      };
      bar.addEventListener('resize', listener);

      listener();

      return () => bar.removeEventListener('resize', listener);
    }
  }, []);

  return (
    <div className={`flex w-full rounded-lg border border-gray-10 bg-gray-5 ${height}`} ref={barRef}>
      <Tooltip
        key="Drive"
        title="Drive"
        subtitle={bytesToString(driveUsageBytes)}
        popsFrom="top"
        className="mr-0.5 rounded-l-lg bg-primary"
      >
        <div style={{ width: `${driveWidth > 0 && driveWidth < 5 ? 5 : driveWidth}px` }}></div>
      </Tooltip>

      <Tooltip
        key="Backup"
        title="Backup"
        subtitle={bytesToString(driveUsageBytes)}
        popsFrom="top"
        className="rounded-r-lg bg-indigo"
      >
        <div style={{ width: `${backupWidth}px` }}></div>
      </Tooltip>
    </div>
  );
};

export default UsageBar;
