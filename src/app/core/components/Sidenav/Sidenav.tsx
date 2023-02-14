import { Clock, ClockCounterClockwise, Link, Desktop, FolderSimple, ImageSquare, Trash } from 'phosphor-react';
import { connect } from 'react-redux';

import { AppView } from '../../types';
import navigationService from '../../services/navigation.service';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import SidenavItem from './SidenavItem/SidenavItem';
import desktopService from 'app/core/services/desktop.service';
import PlanUsage from 'app/drive/components/PlanUsage/PlanUsage';
import { planSelectors } from 'app/store/slices/plan';

import './Sidenav.scss';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface SidenavProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

const Sidenav = (props: SidenavProps) => {
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

  return (
    <div className="flex w-64 flex-col">
      <div
        className="flex h-14 flex-shrink-0 cursor-pointer items-center border-b border-gray-5 pl-8"
        onClick={onLogoClicked}
      >
        <InternxtLogo className="h-auto w-28" />
      </div>
      <div className="flex flex-grow flex-col overflow-x-auto border-r border-gray-5 px-2">
        <div className="mt-2">
          <SidenavItem label={translate('sideNav.drive')} to="/app" Icon={FolderSimple} />
          <SidenavItem label={translate('sideNav.photos')} to="/app/photos" Icon={ImageSquare} showNew />
          <SidenavItem label={translate('sideNav.backups')} to="/app/backups" Icon={ClockCounterClockwise} />
          <SidenavItem label={translate('sideNav.sharedLinks')} to="/app/shared-links" Icon={Link} />
          <SidenavItem label={translate('sideNav.recents')} to="/app/recents" Icon={Clock} />
          <SidenavItem label={translate('sideNav.trash')} to="/app/trash" Icon={Trash} />
          <SidenavItem label={translate('sideNav.desktop')} Icon={Desktop} onClick={onDownloadAppButtonClicked} />
        </div>
        {props.subscription && props.subscription.type === 'free' ? (
          <ReferralsWidget />
        ) : (
          <div className="flex-grow"></div>
        )}

        <div className="mt-8 mb-11 px-5">
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
