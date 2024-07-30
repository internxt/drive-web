import navigationService from 'app/core/services/navigation.service';
import limitService from 'app/drive/services/limit.service';
import { bytesToString } from 'app/drive/services/size.service';
import usageService from 'app/drive/services/usage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';

export default function PlanUsage({
  limit,
  usage,
  isLoading,
  subscriptionType,
  className = '',
}: {
  limit: number;
  usage: number;
  isLoading: boolean;
  subscriptionType?: string;
  className?: string;
}): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const usagePercent = usageService.getUsagePercent(usage, limit);
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const isLimitReached = usage >= limit;
  const componentColor = isLimitReached ? 'bg-red' : 'bg-primary';

  const onUpgradeButtonClicked = () => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
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
        <div className={`h-full ${componentColor}`} style={{ width: isLoading ? 0 : `${usagePercent}%` }} />
      </div>
      {subscriptionType === 'free' && (
        <p
          onClick={onUpgradeButtonClicked}
          className={`mt-3 h-full cursor-pointer text-sm font-medium ${isLimitReached ? 'text-red' : 'text-primary'}`}
        >
          {translate('actions.upgradeNow')}
        </p>
      )}
    </div>
  );
}
