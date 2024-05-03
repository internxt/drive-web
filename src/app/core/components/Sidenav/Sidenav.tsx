import { Clock, ClockCounterClockwise, Desktop, FolderSimple, Trash, Users } from '@phosphor-icons/react';
import { connect } from 'react-redux';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import desktopService from 'app/core/services/desktop.service';
import PlanUsage from 'app/drive/components/PlanUsage/PlanUsage';
import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import navigationService from '../../services/navigation.service';
import { AppView } from '../../types';
import SidenavItem from './SidenavItem/SidenavItem';

import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';
import { useAppSelector } from 'app/store/hooks';

import WorkspaceSelectorContainer from './WorkspaceSelectorContainer';

interface SidenavProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

const Sidenav = (props: SidenavProps) => {
  const { user } = props;
  const { translate } = useTranslationContext();

  const onDownloadAppButtonClicked = (): void => {
    const getDownloadApp = async () => {
      const download = await desktopService.getDownloadAppUrl();
      return download;
    };
    getDownloadApp()
      .then((download) => {
        window.open(download, '_self');
      })
      .catch(() => {
        notificationsService.show({
          text: 'Something went wrong while downloading the desktop app',
          type: ToastType.Error,
        });
      });
  };

  const onLogoClicked = (): void => {
    navigationService.push(AppView.Drive);
  };

  const { planUsage, planLimit, isLoadingPlanLimit, isLoadingPlanUsage } = props;

  const pendingInvitations = useAppSelector((state: RootState) => state.shared.pendingInvitations);

  return (
    <div className="flex w-64 flex-col">
      <div
        className="flex h-14 shrink-0 cursor-pointer items-center border-b border-gray-5 pl-8 dark:bg-gray-1"
        onClick={onLogoClicked}
      >
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex grow flex-col overflow-x-auto border-r border-gray-5 px-2">
        <div className="mt-2">
          {/* MOCK COMPONENT */}
          {user && <WorkspaceSelectorContainer user={user} />}
          <SidenavItem label={translate('sideNav.drive')} to="/" Icon={FolderSimple} iconDataCy="sideNavDriveIcon" />
          <SidenavItem label={translate('sideNav.backups')} to="/backups" Icon={ClockCounterClockwise} />
          <SidenavItem
            label={translate('sideNav.shared')}
            to="/shared"
            Icon={Users}
            notifications={pendingInvitations.length}
          />
          <SidenavItem label={translate('sideNav.recents')} to="/recents" Icon={Clock} />
          <SidenavItem label={translate('sideNav.trash')} to="/trash" Icon={Trash} />
          <SidenavItem label={translate('sideNav.desktop')} Icon={Desktop} onClick={onDownloadAppButtonClicked} />
        </div>
        {props.subscription && props.subscription.type === 'free' ? <ReferralsWidget /> : <div className="grow"></div>}

        <div className="mb-11 mt-8 px-5">
          <PlanUsage
            limit={planLimit}
            usage={planUsage}
            isLoading={isLoadingPlanUsage || isLoadingPlanLimit}
          ></PlanUsage>
        </div>
      </div>
    </div>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  planUsage: state.plan.planUsage,
  subscription: state.plan.subscription,
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
}))(Sidenav);
