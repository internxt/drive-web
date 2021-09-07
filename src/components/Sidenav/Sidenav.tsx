import React from 'react';
import * as Unicons from '@iconscout/react-unicons';
import { connect } from 'react-redux';

import { RootState } from '../../store';
import { UserSettings } from '../../models/interfaces';
import smallLogo from '../../assets/icons/small-logo.svg';
import { ReactComponent as InternxtLogo } from '../../assets/icons/big-logo.svg';
import SidenavItem from './SidenavItem/SidenavItem';
import desktopService from '../../services/desktop.service';

import './Sidenav.scss';
import PlanUsage from '../PlanUsage/PlanUsage';
import { Link } from 'react-router-dom';
import { planSelectors } from '../../store/slices/plan';
import { AppView } from '../../models/enums';
import navigationService from '../../services/navigation.service';

interface SidenavProps {
  user: UserSettings | undefined;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
  planUsage: number;
  planLimit: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
}

class Sidenav extends React.Component<SidenavProps> {
  constructor(props: SidenavProps) {
    super(props);
  }

  onDownloadAppButtonClicked = (): void => {
    window.open(desktopService.getDownloadAppUrl(), '_blank');
  };

  onLogoClicked = (): void => {
    navigationService.push(AppView.Drive);
  };

  render(): JSX.Element {
    const { collapsed, onCollapseButtonClicked, planUsage, planLimit, isLoadingPlanLimit, isLoadingPlanUsage } =
      this.props;

    return (
      <div className={`${collapsed ? 'collapsed' : ''} side-nav`}>
        <button
          className="p-2 collapse-button cursor-pointer flex items-center z-40 absolute transform"
          onClick={onCollapseButtonClicked}
        >
          {collapsed ? <Unicons.UilAngleDoubleRight /> : <Unicons.UilAngleDoubleLeft />}
        </button>

        <div className="pl-6 py-1.5 cursor-pointer border-b border-l-neutral-30" onClick={this.onLogoClicked}>
          {collapsed ? (
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

        <div
          className={`${
            collapsed ? '' : 'px-6'
          } pt-7 border-r border-l-neutral-30 h-full flex flex-col justify-between`}
        >
          <div>
            <SidenavItem
              label="Drive"
              to="/app"
              icon={<Unicons.UilFolderMedical className="w-5" />}
              isOpen={!collapsed}
            />
            <SidenavItem
              label="Recents"
              to="/app/recents"
              icon={<Unicons.UilClockEight className="w-5" />}
              isOpen={!collapsed}
            />
            <SidenavItem
              label="Download App"
              icon={<Unicons.UilDesktop className="w-5" />}
              isOpen={!collapsed}
              onClick={this.onDownloadAppButtonClicked}
            />
          </div>

          {!collapsed && (
            <div className="mb-12">
              <PlanUsage
                limit={planLimit}
                usage={planUsage}
                isLoading={isLoadingPlanUsage || isLoadingPlanLimit}
              ></PlanUsage>
            </div>
          )}
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
