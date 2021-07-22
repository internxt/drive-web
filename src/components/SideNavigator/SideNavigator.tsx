import React from 'react';

import { getIcon, IconType } from '../../services/icon.service';
import SideNavigatorItem from './SideNavigatorItem/SideNavigatorItem';
import { ReactComponent as ReactLogo } from '../../assets/icons/internxt-long-logo.svg';

import './SideNavigator.scss';
import authService from '../../services/auth.service';
import { connect } from 'react-redux';
import { RootState } from '../../store';
import { UserSettings } from '../../models/interfaces';

interface SideNavigatorProps {
  user: UserSettings;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
}

interface SideNavigatorState { }

class SideNavigator extends React.Component<SideNavigatorProps, SideNavigatorState> {
  constructor(props: SideNavigatorProps) {
    super(props);

    this.state = { };
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
          <button className="collapse-button cursor-pointer flex items-center z-40 absolute transform"
            onClick={onCollapseButtonClicked}
          >
            <img src={getIcon(IconType.NextPage)} alt="" />
          </button>

          <div>
            <div className="py-3 mb-2">
              {collapsed ?
                <img className='opacity-0 w-6 long-logo' src={getIcon(IconType.InternxtShortLogo)} alt="" /> :
                <div className="w-28 h-auto flex items-center">
                  <ReactLogo className="long-logo w-full" />
                </div>
              }
            </div>

            <div className={`${!collapsed ? 'mb-10' : ''}`}>
              <span className='h-3 text-xs text-m-neutral-100 font-semibold mb-4'>{!collapsed && 'Storage'}</span>
              <SideNavigatorItem
                label='Drive'
                to="/app"
                icon={getIcon(IconType.FolderWithCrossGray)}
                isOpen={!collapsed}
              />
              <SideNavigatorItem
                label='Recents'
                to="/app/recents"
                icon={getIcon(IconType.ClockGray)}
                isOpen={!collapsed}
              />
            </div>

            <div>
              <span className='h-3 text-xs text-m-neutral-100 font-semibold mb-4'>{!collapsed && 'Configuration'}</span>
              <SideNavigatorItem
                label='Account'
                to="/account"
                icon={getIcon(IconType.AccountGray)}
                isOpen={!collapsed}
              />
              <SideNavigatorItem label="App" icon={getIcon(IconType.Desktop)} isOpen={!collapsed} />
              <SideNavigatorItem label='Support' icon={getIcon(IconType.SupportGray)} isOpen={!collapsed} />
              <SideNavigatorItem label='Log out' icon={getIcon(IconType.LogOutGray)} isOpen={!collapsed} onClick={authService.logOut} />
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
  }))(SideNavigator);
