import { t } from 'i18next';
import { bytesToString } from 'app/drive/services/size.service';
import UsageBar from 'app/newSettings/components/Usage/UsageBar';

const Usage = ({
  usedSpace,
  spaceLimit,
  driveUsage,
  backupsUsage,
}: {
  usedSpace: string | number;
  spaceLimit: string | number;
  driveUsage: string | number;
  backupsUsage: string | number;
}) => {
  const usedSpaceBytes = Number(usedSpace);
  const spaceLimitBytes = Number(spaceLimit);
  const spaceLimitString = bytesToString(spaceLimitBytes);
  const usedSpaceString = bytesToString(usedSpaceBytes);
  const bytesString = usedSpaceString.length ? usedSpaceString : '0 Bytes';
  const percentageUsed =
    usedSpaceBytes === 0 && spaceLimitBytes === 0 ? 0 : Math.round((usedSpaceBytes * 100) / spaceLimitBytes);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row">
        <div className="flex w-full grow flex-col py-2">
          <p className="text-3xl font-medium leading-9 text-gray-100">{bytesString}</p>
          <h1 className="text-base font-normal leading-5 text-gray-60">
            {t('views.preferences.workspace.overview.spaceUsed', { percentageUsed })}
          </h1>
        </div>
        <div className="mx-8 border border-gray-10" />
        <div className="flex w-full grow flex-col justify-start py-2">
          <p className="text-3xl font-medium leading-9 text-gray-100">{spaceLimitString}</p>
          <h1 className="text-base font-normal leading-5 text-gray-60">
            {t('views.preferences.workspace.overview.totalSpace')}
          </h1>
        </div>
      </div>
      <div className="mt-6">
        <UsageBar backupsUsage={backupsUsage} driveUsage={driveUsage} spaceLimit={spaceLimit} height={'h-8'} />
      </div>
      <div className="mt-2 mt-2.5 flex space-x-4">
        <div className="flex items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="ml-1 text-sm text-gray-80">{t('sideNav.drive')}</p>
        </div>
        <div className="flex items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-indigo" />
          <p className="ml-1 text-sm text-gray-80">{t('sideNav.backups')}</p>
        </div>
      </div>
    </div>
  );
};

export default Usage;
