import i18n from '../../../i18n/services/i18n.service';
import limitService from '../../../drive/services/limit.service';
import navigationService from '../../services/navigation.service';
import { bytesToString } from '../../../drive/services/size.service';
import usageService from '../../../drive/services/usage.service';
import { AccountViewTab } from '../../views/AccountView/tabs';
import { AppView } from '../../types';

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
  const onUpgradeButtonClicked = () => {
    navigationService.push(AppView.Account, { tab: AccountViewTab.Plans });
  };
  const usagePercent = usageService.getUsagePercent(usage, limit);

  return (
    <div className={`flex flex-col justify-center w-full rounded-md ${className}`}>
      {isLoading ? (
        <p>{i18n.get('general.loading.default')}</p>
      ) : (
        <p className="text-sm text-m-neutral-70 m-0">
          {bytesToString(usage) || '0'} of {limitService.formatLimit(limit)}
        </p>
      )}
      <div className="flex justify-start h-1.5 w-full bg-l-neutral-30 rounded-lg overflow-hidden mb-1.5">
        <div className="h-full bg-blue-60" style={{ width: isLoading ? 0 : `${usagePercent}%` }} />
      </div>
      <p onClick={onUpgradeButtonClicked} className="font-semibold text-blue-60 cursor-pointer">
        {i18n.get('action.upgradeNow')}
      </p>
    </div>
  );
}
