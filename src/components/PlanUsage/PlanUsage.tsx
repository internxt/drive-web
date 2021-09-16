import { AppView } from '../../models/enums';
import i18n from '../../services/i18n.service';
import navigationService from '../../services/navigation.service';
import { bytesToString } from '../../services/size.service';
import { getUserLimitString } from '../../services/usage.service';
import { AccountViewTab } from '../../views/AccountView/tabs';
import { setCurrentAccountTab } from '../../store/slices/ui';
import { useAppDispatch } from '../../store/hooks';

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
  const dispatch = useAppDispatch();
  const onUpgradeButtonClicked = () => {
    dispatch(setCurrentAccountTab(AccountViewTab.Plans));;
  };

  return (
    <div className={`flex flex-col justify-center w-full rounded-md ${className}`}>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <p className="text-sm text-m-neutral-70 m-0">
          {bytesToString(usage) || '0'} of {getUserLimitString(limit)}
        </p>
      )}
      <div className="flex justify-start h-1.5 w-full bg-l-neutral-30 rounded-lg overflow-hidden mb-1.5">
        <div className="h-full bg-blue-60" style={{ width: isLoading ? 0 : Math.ceil((usage / limit) * 100) }} />
      </div>
      <p onClick={onUpgradeButtonClicked} className="font-semibold text-blue-60 cursor-pointer">
        {i18n.get('action.upgrade')}
      </p>
    </div>
  );
}
