import React from 'react';
import { Clock, ClockCounterClockwise, Desktop, Folder } from 'phosphor-react';
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

interface SidenavProps {
  user: UserSettings | undefined;
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
    window.open(desktopService.getDownloadAppUrl(), '_self');
  };

  onLogoClicked = (): void => {
    navigationService.push(AppView.Drive);
  };

  render(): JSX.Element {
    const { planUsage, planLimit, isLoadingPlanLimit, isLoadingPlanUsage } = this.props;

    return (
      <div className="w-64 flex flex-col">
        <div
          className="flex items-center flex-shrink-0 pl-8 h-14 cursor-pointer border-b border-neutral-30"
          onClick={this.onLogoClicked}
        >
          <InternxtLogo className="h-auto w-28" />
        </div>
        <div className="flex-col flex flex-grow border-r border-neutral-30 px-2">
          <div className="mt-2">
            <SidenavItem label="Drive" to="/app" Icon={Folder} />
            <SidenavItem label="Backups" to="/app/backups" Icon={ClockCounterClockwise} />
            <SidenavItem label="Recents" to="/app/recents" Icon={Clock} />
            <SidenavItem label="Desktop App" Icon={Desktop} onClick={this.onDownloadAppButtonClicked} />
          </div>
          <ReferralsWidget />

          <div className="px-5 mt-8 mb-11">
            <PlanUsage
              limit={planLimit}
              usage={planUsage}
              isLoading={isLoadingPlanUsage || isLoadingPlanLimit}
            ></PlanUsage>
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
