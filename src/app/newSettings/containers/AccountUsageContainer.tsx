import { useEffect, useState } from 'react';

import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { t } from 'i18next';
import { useDispatch, useSelector } from 'react-redux';
import errorService from '../../core/services/error.service';
import navigationService from '../../core/services/navigation.service';
import usageService, { UsageDetailsProps } from '../../drive/services/usage.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Spinner from '../../shared/components/Spinner/Spinner';
import { PlanState } from '../../store/slices/plan';
import { uiActions } from '../../store/slices/ui';
import UsageBar from '../components/Usage/UsageBar';
import VerticalDivider from '../components/VerticalDivider';
import UsageDetails from './WorkspaceUsageContainer';

const AccountUsageContainer = ({
  className = '',
}: Readonly<{
  className?: string;
}>): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const [usageDetails, setUsageDetails] = useState<UsageDetailsProps | null>(null);

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const planUsage = useAppSelector((state: RootState) => state.plan.planUsage);
  const planLimitInBytes = plan.planLimit;
  const products: Parameters<typeof UsageDetails>[0]['products'] | null = planUsage
    ? [
        {
          name: t('sideNav.drive'),
          usageInBytes: usageDetails?.drive ?? 0,
          color: 'primary',
        },
        {
          name: t('sideNav.photos'),
          usageInBytes: usageDetails?.photos ?? 0,
          color: 'orange',
        },
        {
          name: t('views.account.tabs.account.view.backups'),
          usageInBytes: usageDetails?.backups ?? 0,
          color: 'indigo',
        },
      ]
    : null;
  products?.sort((a, b) => b.usageInBytes - a.usageInBytes);
  const usedProducts = products?.filter((product) => product.usageInBytes > 0);

  useEffect(() => {
    usageService
      .getUsageDetails()
      .then((usageDetails) => {
        setUsageDetails(usageDetails);
      })
      .catch((err) => {
        const error = errorService.castError(err);
        errorService.reportError(error);
      });
  }, []);

  const openTrashDialog = () => dispatch(uiActions.setIsClearTrashDialogOpen(true));
  const navigateToPlansSubSection = () =>
    navigationService.openPreferencesDialog({ section: 'account', subsection: 'plans' });

  return (
    <Card className="space-y-6">
      <div className={`${className} w-full space-y-6 `}>
        {products && usedProducts && planLimitInBytes ? (
          <UsageBar
            products={products}
            planUsage={planUsage}
            usedProducts={usedProducts}
            planLimitInBytes={planLimitInBytes}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center">
            <Spinner className="h-7 w-7 text-primary" />
          </div>
        )}
      </div>

      <Card>
        <div className="-m-5 flex flex-row rounded-xl bg-surface p-5 ">
          <div className="flex flex-col">
            <p className="text-base font-medium text-gray-100">{translate('preferences.account.upgrade')}</p>
            <p className="text-base font-normal text-gray-60">{translate('preferences.account.levelUpStorage')}</p>
            <div className="mt-3">
              <Button variant="primary" onClick={navigateToPlansSubSection}>
                {translate('preferences.account.upgradeNow')}
              </Button>
            </div>
          </div>
          <VerticalDivider className="mx-8" />
          <div className="flex flex-col">
            <p className="text-base font-medium text-gray-100">{translate('preferences.account.emptyTrash')}</p>
            <p className="text-base font-normal text-gray-60">
              {translate('preferences.account.emptryTrashDescription')}{' '}
            </p>
            <div className="mt-3">
              <Button variant="secondary" onClick={openTrashDialog}>
                {translate('preferences.account.emptyTrash')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Card>
  );
};

export default AccountUsageContainer;
