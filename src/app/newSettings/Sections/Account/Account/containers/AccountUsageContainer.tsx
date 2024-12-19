import { useEffect, useState } from 'react';

import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { useDispatch, useSelector } from 'react-redux';
import errorService from '../../../../../core/services/error.service';
import navigationService from '../../../../../core/services/navigation.service';
import usageService, { UsageDetailsProps } from '../../../../../drive/services/usage.service';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import { Button, Loader } from '@internxt/ui';
import Card from '../../../../../shared/components/Card';
import { PlanState } from '../../../../../store/slices/plan';
import { uiActions } from '../../../../../store/slices/ui';
import VerticalDivider from '../../../../components/VerticalDivider';
import { getProductCaptions } from '../../../../utils/productUtils';
import Usage from '../../../../components/Usage/Usage';

const AccountUsageContainer = ({
  className = '',
  changeSection,
}: Readonly<{
  className?: string;
  changeSection: ({ section, subsection }) => void;
}>): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const [usageDetails, setUsageDetails] = useState<UsageDetailsProps | null>(null);

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const planUsage = useAppSelector((state: RootState) => state.plan.planUsage);

  const planLimitInBytes = plan.planLimit;
  const products = getProductCaptions(usageDetails);
  const driveProduct = products.find((product) => product.name === 'Drive');
  const backupsProduct = products.find((product) => product.name === 'Backups');
  const driveUsage = driveProduct ? driveProduct?.usageInBytes : 0;
  const backupsUsage = backupsProduct ? backupsProduct?.usageInBytes : 0;
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);

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
  const navigateToPlansSubSection = () => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    changeSection({ section: 'account', subsection: 'plans' });
  };

  return (
    <Card className="space-y-6">
      <div className={`${className} w-full space-y-6 `}>
        {products && planUsage >= 0 && planLimitInBytes ? (
          <>
            <Usage
              usedSpace={planUsage}
              spaceLimit={planLimitInBytes}
              driveUsage={driveUsage}
              backupsUsage={backupsUsage}
            />
          </>
        ) : (
          <div className="flex h-36 w-full items-center justify-center">
            <Loader classNameLoader="h-7 w-7 text-primary" />
          </div>
        )}
      </div>

      <Card>
        <div className="-m-5 flex flex-row rounded-xl bg-gray-1 p-5 dark:bg-surface">
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
              {translate('preferences.account.emptyTrashDescription')}{' '}
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
