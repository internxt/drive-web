import limitService from 'app/drive/services/limit.service';
import { bytesToString } from 'app/drive/services/size.service';
import usageService from 'app/drive/services/usage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

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
  const { translate } = useTranslationContext();
  const usagePercent = usageService.getUsagePercent(usage, limit);

  const onUpgradeButtonClicked = () => {
    navigationService.push(AppView.Preferences, { tab: 'plans' });
  };

  return (
    <div className={`flex w-full flex-col justify-center rounded-md ${className}`}>
      {isLoading ? (
        <p className="text-sm">{translate('general.loading.default')}</p>
      ) : (
        <p className="text-sm font-medium text-gray-60">
          {bytesToString(usage) || '0'} {translate('general.of')} {limitService.formatLimit(limit)}
        </p>
      )}
      <div className="mt-1 flex h-1.5 w-full justify-start overflow-hidden rounded-lg bg-gray-5">
        <div className="h-full bg-primary" style={{ width: isLoading ? 0 : `${usagePercent}%` }} />
      </div>
      <p onClick={onUpgradeButtonClicked} className="mt-3 cursor-pointer text-sm font-medium text-blue-60">
        {translate('actions.upgradeNow')}
      </p>
    </div>
  );
}
