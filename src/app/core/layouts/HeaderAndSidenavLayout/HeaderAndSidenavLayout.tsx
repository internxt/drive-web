import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

import { Topbar as Navbar, Sidenav } from 'views/Home/components';
import { uiActions } from 'app/store/slices/ui';
import ReachedPlanLimitDialog from 'app/drive/components/ReachedPlanLimitDialog/ReachedPlanLimitDialog';
import navigationService from 'services/navigation.service';
import { AppView } from '../../types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import TaskLogger from 'app/tasks/components/TaskLogger/TaskLogger';
import DriveItemInfoMenu from 'app/drive/components/DriveItemInfoMenu/DriveItemInfoMenu';
import { getAppConfig } from 'services/config.service';
import ShareItemDialog from '../../../../views/Shared/components/ShareItemDialog/ShareItemDialog';
import { Sidebar as VersionHistorySidebar } from '../../../../views/Drive/components/VersionHistory';
import ReachedFileSizeLimitDialog from 'app/drive/components/ReachedFileSizeLimitDialog';
import SubscriptionEndingModal from '../../../../views/NewSettings/components/Sections/Workspace/Billing/components/cancelSubscription/paidPlanCancellation/SubscriptionEndingModal';
import { dateService } from 'services';
import { getCurrentUsage, getPlanInfo, getPlanName } from '../../../../views/NewSettings/utils/planUtils';
import { useSubscriptionCancellation } from 'views/NewSettings/hooks';

export interface HeaderAndSidenavLayoutProps {
  children: JSX.Element;
}

const SUBSCRIPTION_ENDING_WARNING_DAYS = [30, 7];

export default function HeaderAndSidenavLayout(props: HeaderAndSidenavLayoutProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { children } = props;
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const itemToShare = useAppSelector((state) => state.storage.itemToShare);
  const isShareItemDialogOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const isReachedPlanLimitDialogOpen = useAppSelector((state) => state.ui.isReachedPlanLimitDialogOpen);
  const isReachedFileSizeLImitDialogOpen = useAppSelector((state) => state.ui.isReachedFileSizeLimitDialogOpen);
  const isDriveItemInfoMenuOpen = useAppSelector((state) => state.ui.isDriveItemInfoMenuOpen);
  const driveItemInfo = useAppSelector((state) => state.ui.currentFileInfoMenuItem);
  const individualPlan = useAppSelector((state) => state.plan.individualPlan);
  const planLimit = useAppSelector((state) => state.plan.planLimit);
  const usageDetails = useAppSelector((state) => state.plan.usageDetails);
  const currentPlanName = getPlanName(individualPlan, planLimit);
  const currentPlanInfo = getPlanInfo(individualPlan);
  const currentUsage = getCurrentUsage(usageDetails);

  const onDriveItemInfoMenuClosed = () => {
    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
  };
  const location = useLocation();
  const hideSearch = getAppConfig().views.find((view) => view.path === location.pathname)?.hideSearch;

  const [isSubscriptionEndingModalClosed, setIsSubscriptionEndingModalClosed] = useState<boolean>(false);

  const { isReactivatingSubscription, reactivateUserSubscription } = useSubscriptionCancellation({
    onModalClose: () => setIsSubscriptionEndingModalClosed(true),
  });

  const cancellationDate = individualPlan?.commitment?.cancellationDate;
  const daysUntilCancellation = cancellationDate ? dateService.getDaysUntilExpiration(cancellationDate) : null;
  const isSubscriptionEndingModalOpen =
    !isSubscriptionEndingModalClosed &&
    daysUntilCancellation !== null &&
    SUBSCRIPTION_ENDING_WARNING_DAYS.includes(daysUntilCancellation);

  if (!isAuthenticated) {
    navigationService.push(AppView.Login);
  }

  return isAuthenticated ? (
    <div className="flex h-auto min-h-full flex-col">
      {isShareItemDialogOpen && itemToShare && <ShareItemDialog share={itemToShare?.share} item={itemToShare.item} />}
      {isReachedPlanLimitDialogOpen && <ReachedPlanLimitDialog />}
      {isReachedFileSizeLImitDialogOpen && <ReachedFileSizeLimitDialog />}
      {isSubscriptionEndingModalOpen && cancellationDate && (
        <SubscriptionEndingModal
          isOpen={isSubscriptionEndingModalOpen}
          currentPlanName={currentPlanName}
          currentPlanInfo={currentPlanInfo}
          currentUsage={currentUsage}
          cancellationDate={cancellationDate}
          isReactivatingSubscription={isReactivatingSubscription}
          onClose={() => setIsSubscriptionEndingModalClosed(true)}
          onReactivateSubscription={reactivateUserSubscription}
        />
      )}

      <div className="flex h-1 grow">
        <Sidenav />

        <div className="flex w-1 grow flex-col">
          <Navbar hideSearch={hideSearch} />
          <div className="relative flex h-1 w-full grow">
            {children}

            {isDriveItemInfoMenuOpen && driveItemInfo && (
              <DriveItemInfoMenu {...driveItemInfo} onClose={onDriveItemInfoMenuClosed} />
            )}

            <VersionHistorySidebar />
          </div>
          <div className="absolute bottom-0 right-0 z-50 w-80">
            <TaskLogger />
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="App">
      <h2>
        Please <Link to="/login">login</Link> into your Internxt Drive account
      </h2>
    </div>
  );
}
