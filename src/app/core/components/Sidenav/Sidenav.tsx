import React from 'react';
import UilAngleDoubleLeft from '@iconscout/react-unicons/icons/uil-angle-double-left';
import UilAngleDoubleRight from '@iconscout/react-unicons/icons/uil-angle-double-right';
import UilFolderMedical from '@iconscout/react-unicons/icons/uil-folder-medical';
import UilHdd from '@iconscout/react-unicons/icons/uil-hdd';
import UilClockEight from '@iconscout/react-unicons/icons/uil-clock-eight';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import { connect } from 'react-redux';

import { AppView } from '../../types';
import navigationService from '../../services/navigation.service';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import smallLogo from 'assets/icons/small-logo.svg';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import SidenavItem from './SidenavItem/SidenavItem';
import desktopService from 'app/core/services/desktop.service';
import PlanUsage from 'app/drive/components/PlanUsage/PlanUsage';
import { planSelectors } from 'app/store/slices/plan';
import screenService from 'app/core/services/screen.service';

import './Sidenav.scss';
import ReferralsWidget from 'app/referrals/components/ReferralsWidget/ReferralsWidget';

interface SidenavProps {
  user: UserSettings | undefined;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

interface SidenavState {
  isLgScreen: boolean;
}
class Sidenav extends React.Component<SidenavProps, SidenavState> {
  constructor(props: SidenavProps) {
    super(props);

    this.state = {
      isLgScreen: screenService.isLg(),
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.onWindowResized);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResized);
  }

  onWindowResized = () => {
    this.setState({
      isLgScreen: screenService.isLg(),
    });
  };

  onDownloadAppButtonClicked = (): void => {
    window.open(desktopService.getDownloadAppUrl(), '_blank');
  };

  onLogoClicked = (): void => {
    navigationService.push(AppView.Drive);
  };

  render(): JSX.Element {
    const { collapsed, onCollapseButtonClicked, planUsage, planLimit, isLoadingPlanLimit, isLoadingPlanUsage } =
      this.props;
    const isCollapsed = collapsed || !screenService.isLg();

    return (
      <div className={`${isCollapsed ? 'collapsed' : ''} side-nav`}>
        <button
          className="hidden lg:flex items-center p-2 collapse-button cursor-pointer z-40 absolute transform"
          onClick={onCollapseButtonClicked}
        >
          {isCollapsed ? <UilAngleDoubleRight /> : <UilAngleDoubleLeft />}
        </button>

        <div className="pl-6 py-1.5 cursor-pointer border-b border-l-neutral-30" onClick={this.onLogoClicked}>
          {isCollapsed ? (
            <img className="opacity-0 w-6 h-9" src={smallLogo} alt="" />
          ) : (
            <div
              className="w-28 h-auto flex items-center"
              onClick={() => {
                navigationService.history.push('/');
              }}
            >
              <InternxtLogo className="h-9 w-full" />
            </div>
          )}
        </div>

        <div className="h-full flex flex-col pt-7 border-r border-l-neutral-30 justify-between">
          <div className={`${isCollapsed ? '' : 'px-6'} pb-4`}>
            <SidenavItem label="Drive" to="/app" icon={<UilFolderMedical className="w-5" />} isOpen={!isCollapsed} />
            <SidenavItem label="Backups" to="/app/backups" icon={<UilHdd className="w-5" />} isOpen={!isCollapsed} />
            <SidenavItem
              label="Recents"
              to="/app/recents"
              icon={<UilClockEight className="w-5" />}
              isOpen={!isCollapsed}
            />
            <SidenavItem
              label="Download App"
              icon={<UilDesktop className="w-5" />}
              isOpen={!isCollapsed}
              onClick={this.onDownloadAppButtonClicked}
            />
          </div>

          <div className={isCollapsed ? 'opacity-0' : 'flex flex-col flex-grow justify-end h-1'}>
            {/* REFERRALS WIDGET */}

            <ReferralsWidget />

            <div className="px-6 pt-8 pb-12">
              <PlanUsage
                limit={planLimit}
                usage={planUsage}
                isLoading={isLoadingPlanUsage || isLoadingPlanLimit}
              ></PlanUsage>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user,
  planUsage: state.plan.planUsage,
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
}))(Sidenav);
