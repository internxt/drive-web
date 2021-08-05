import React from 'react';
import * as Unicons from '@iconscout/react-unicons';
import { connect } from 'react-redux';

import { RootState } from '../../store';
import { UserSettings } from '../../models/interfaces';
import smallLogo from '../../assets/icons/small-logo.svg';
import { ReactComponent as ReactLogo } from '../../assets/icons/big-logo.svg';
import history from '../../lib/history';
import SidenavItem from './SidenavItem/SidenavItem';
import desktopService from '../../services/desktop.service';

import './Sidenav.scss';

interface SidenavProps {
  user: UserSettings;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
  isTeam: boolean
}

interface SidenavState { }

class SideNavigatorItemSideNavigator extends React.Component<SidenavProps, SidenavState> {
  constructor(props: SidenavProps) {
    super(props);

    this.state = {};
  }

  onDownloadAppButtonClicked = (): void => {
    window.open(desktopService.getDownloadAppUrl(), '_blank');
  }

  render(): JSX.Element {
    const { collapsed, onCollapseButtonClicked } = this.props;

    return (
      <div className={`transform duration-200 ${collapsed ? 'collapsed' : ''} side-navigator`}>

        {/* LOGO & ITEMS */}
        <div>
          <button
            className="p-2 collapse-button cursor-pointer flex items-center z-40 absolute transform"
            onClick={onCollapseButtonClicked}
          >
            {collapsed ? <Unicons.UilAngleDoubleRight /> : <Unicons.UilAngleDoubleLeft />}
          </button>

          <div>
            <div className="py-3 mb-1.5">
              {collapsed ?
                <img className='opacity-0 w-6 sidenav-logo' src={smallLogo} alt="" /> :
                <div className="w-28 h-auto flex items-center" onClick={() => {
                  history.push('/');
                }}>
                  <ReactLogo className="sidenav-logo w-full" />
                </div>
              }
            </div>

            <div className={`${!collapsed ? 'mb-10' : ''}`}>
              <SidenavItem
                label='Drive'
                to="/app"
                icon={<Unicons.UilFolderMedical className="w-5" />}
                isOpen={!collapsed}
              />
              <SidenavItem
                label='Recents'
                to="/app/recents"
                icon={<Unicons.UilClockEight className="w-5" />}
                isOpen={!collapsed}
              />
              <SidenavItem
                label='Download App'
                icon={<Unicons.UilDesktop className="w-5" />}
                isOpen={!collapsed}
                onClick={this.onDownloadAppButtonClicked}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(SideNavigatorItemSideNavigator);