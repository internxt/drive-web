import React, { useEffect, useState } from 'react';
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
import screenService from 'app/core/services/screen.service';

import './Sidenav.scss';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { get } from 'app/i18n/services/i18n.service';
import { useTranslation } from 'react-i18next';

interface SidenavProps {
  user: UserSettings | undefined;
  subscription: UserSubscription | null;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

interface SidenavState {
  isLgScreen: boolean;
}
const Sidenav = (props: SidenavProps) => {
  // constructor(props: SidenavProps) {
  //   super(props);

  //   state = {
  //     isLgScreen: screenService.isLg(),
  //   };
  // }
  const [state, setState] = useState({
    isLgScreen: screenService.isLg(),
  });
  const { t } = useTranslation();

  useEffect(() => {
    window.addEventListener('resize', onWindowResized);

    return () => {
      window.removeEventListener('resize', onWindowResized);
    };
  }, []);

  const onWindowResized = () => {
    setState({
      isLgScreen: screenService.isLg(),
    });
  };

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
        className="flex h-14 flex-shrink-0 cursor-pointer items-center border-b border-neutral-30 pl-8"
        onClick={onLogoClicked}
      >
        <InternxtLogo className="h-auto w-28" />
      </div>
      <div className="flex flex-grow flex-col border-r border-neutral-30 px-2">
        <div className="mt-2">
          <SidenavItem label={t('sideNav.drive')} to="/app" Icon={FolderSimple} />
          <SidenavItem label={t('sideNav.photos')} to="/app/photos" Icon={ImageSquare} showNew />
          <SidenavItem label={t('sideNav.backups')} to="/app/backups" Icon={ClockCounterClockwise} />
          <SidenavItem label={t('sideNav.sharedLinks')} to="/app/shared-links" Icon={Link} />
          <SidenavItem label={t('sideNav.recents')} to="/app/recents" Icon={Clock} />
          <SidenavItem label={t('sideNav.trash')} to="/app/trash" Icon={Trash} />
          <SidenavItem label={t('sideNav.desktop')} Icon={Desktop} onClick={onDownloadAppButtonClicked} />
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
