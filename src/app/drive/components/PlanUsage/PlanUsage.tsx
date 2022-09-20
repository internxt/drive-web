import i18n from 'app/i18n/services/i18n.service';
import limitService from 'app/drive/services/limit.service';
import { bytesToString } from 'app/drive/services/size.service';
import usageService from 'app/drive/services/usage.service';
import { useHistory } from 'react-router';
import analyticsService from 'app/analytics/services/analytics.service';

export default function PlanUsage({
  limit,
  usage,
  isLoading,
  className = '',
}: {
  limit: number;
  usage: number;
  isLoading: boolean;
  className?: string;
}): JSX.Element {
  const history = useHistory();
  const onUpgradeButtonClicked = () => {
    history.push('/preferences?tab=plans');
    analyticsService.rudderTrackClickedSidenavUpgradeButton();
  };
  const usagePercent = usageService.getUsagePercent(usage, limit);

  return (
    <div className={`flex w-full flex-col justify-center rounded-md ${className}`}>
      {isLoading ? (
        <p className="text-sm">{i18n.get('general.loading.default')}</p>
      ) : (
        <p className="text-sm font-medium text-gray-60">
          {bytesToString(usage) || '0'} of {limitService.formatLimit(limit)}
        </p>
      )}
      <div className="mt-1 flex h-1.5 w-full justify-start overflow-hidden rounded-lg bg-gray-5">
        <div className="h-full bg-primary" style={{ width: isLoading ? 0 : `${usagePercent}%` }} />
      </div>
      <p onClick={onUpgradeButtonClicked} className="mt-3 cursor-pointer text-sm font-medium text-blue-60">
        {i18n.get('actions.upgradeNow')}
      </p>
    </div>
  );
}
