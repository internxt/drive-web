import React from 'react';
import * as Unicons from '@iconscout/react-unicons';

import SidenavItem from './SidenavItem/SidenavItem';
import authService from '../../services/auth.service';
import { connect } from 'react-redux';
import { RootState } from '../../store';
import { UserSettings } from '../../models/interfaces';
import { getIcon } from '../../services/icon.service';

import { ReactComponent as ReactLogo } from '../../assets/icons/internxt-long-logo.svg';
import './Sidenav.scss';

interface SidenavProps {
  user: UserSettings;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
}

interface SidenavState { }

class SideNavigatorItemSideNavigator extends React.Component<SidenavProps, SidenavState> {
  constructor(props: SidenavProps) {
    super(props);

    this.state = {};
  }

  componentDidMount(): void { }

  onUpgradeButtonClicked = () => {
    console.log('Upgrade button clicked!');
  }

  render(): JSX.Element {
    const { user, collapsed, onCollapseButtonClicked } = this.props;

    return (
      <div className={`${collapsed ? 'collapsed' : ''} side-navigator`}>

        {/* LOGO & ITEMS */}
        <div>
          <button
            className="p-4 collapse-button cursor-pointer flex items-center z-40 absolute transform"
            onClick={onCollapseButtonClicked}
          >
            <img src={getIcon('nextPage')} alt="" />
          </button>

          <div>
            <div className="py-3 mb-2">
              {collapsed ?
                <img className='opacity-0 w-6 long-logo' src={getIcon('internxtShortLogo')} alt="" /> :
                <div className="w-28 h-auto flex items-center">
                  <ReactLogo className="long-logo w-full" />
                </div>
              }
            </div>

            <div className={`${!collapsed ? 'mb-10' : ''}`}>
              <span className='h-3 text-xs text-m-neutral-100 font-semibold mb-4'>{!collapsed && 'Storage'}</span>
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
            </div>

            <div>
              <span className='h-3 text-xs text-m-neutral-100 font-semibold mb-4'>{!collapsed && 'Configuration'}</span>
              <SidenavItem
                label='Account'
                to="/account"
                icon={<Unicons.UilUserCircle className="w-5" />}
                isOpen={!collapsed}
              />
              <SidenavItem
                label="Support"
                icon={<Unicons.UilChatBubbleUser className="w-5" />}
                isOpen={!collapsed}
              />
              <SidenavItem
                label='Log out'
                icon={<Unicons.UilSignout className="w-5" />}
                isOpen={!collapsed}
                onClick={authService.logOut}
              />
            </div>
          </div>
        </div>

        {/* UPGRADE */}
        { !collapsed ? (
          <div className="account-state-container w-full">
            <div className="bg-white w-full rounded-4px">
              <div className="px-4 py-2 text-xs border-b border-dashed border-l-neutral-40">
                Jhon Doe Young
              </div>
              <div className="px-4 pt-2 pb-2 flex flex-col justify-center">
                <span className="text-xs">{user.email}</span>
                <div className="w-full bg-blue-10 h-1 rounded-sm">
                  <div className="w-1/2 h-full bg-blue-60 rounded-sm"></div>
                </div>
                <span className="flex-grow mt-1 text-supporting-2 text-m-neutral-100">338.64 MB of 10 GB</span>
                <button className="secondary" onClick={this.onUpgradeButtonClicked}>Upgrade</button>
              </div>
            </div>
          </div>) :
          null
        }
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(SideNavigatorItemSideNavigator);
