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
import { getLimit } from '../../services/limit.service';
import usageService, { fetchUsage, UsageResponse } from '../../services/usage.service';
import SessionStorage from '../../lib/sessionStorage';
import { getHeaders } from '../../lib/auth';
import { bytesToString } from '../../services/size.service';
import localStorageService from '../../services/localStorage.service';
import history from '../../lib/history';

interface SidenavProps {
  user: UserSettings;
  collapsed: boolean;
  onCollapseButtonClicked: () => void;
  isTeam: boolean
}

interface SidenavState {
  limit: number,
  usage: number,
  limitTeams: number,
  usageTeams: number
}

const DEFAULT_LIMIT = 1024 * 1024 * 1024 * 10;

class SideNavigatorItemSideNavigator extends React.Component<SidenavProps, SidenavState> {
  constructor(props: SidenavProps) {
    super(props);

    this.state = {
      limit: DEFAULT_LIMIT,
      usage: 0,
      limitTeams: 0,
      usageTeams: 0
    };
  }

  componentDidMount(): void {
    const limitStorage = SessionStorage.get('limitStorage');
    const teamsStorage = SessionStorage.get('teamsStorage');

    if (limitStorage) {
      this.setState({ limit: parseInt(limitStorage, 10) });
    } else {
      getLimit(false).then((limitStorage) => {
        if (limitStorage) {
          SessionStorage.set('limitStorage', limitStorage);
          this.setState({ limit: parseInt(limitStorage) });
        }
      });
    }

    if (teamsStorage) {
      this.setState({ limitTeams: parseInt(teamsStorage, 10) });
    } else {
      if (localStorageService.get('xTeam')) {
        getLimit(true).then((teamsStorage) => {
          if (teamsStorage) {
            SessionStorage.set('teamsStorage', teamsStorage);
            this.setState({ limitTeams: parseInt(teamsStorage) });
          }
        });
      }
    }

    usageService.fetchUsage().then((res: UsageResponse) => {
      this.setState({ usage: res.total });
    }).catch(() => null);
  }

  putLimitUser = () => {
    if (this.state.limit > 0) {
      if (this.state.limit < 108851651149824) {
        return bytesToString(this.state.limit);
      } else if (this.state.limit >= 108851651149824) {
        return '\u221E';
      } else {
        return '...';
      }
    }
  };

  onUpgradeButtonClicked = () => {
    history.push('/account');
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
                onClick={() => window.open('https://help.internxt.com/')}
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
        {!collapsed ? (
          <div className="account-state-container w-full">
            <div className="bg-white w-full rounded-4px">
              <div className="px-4 py-2 text-xs border-b border-dashed border-l-neutral-40">
                {this.props.user.name} {this.props.user.lastname}
              </div>

              <div className="px-4 pt-2 pb-2 flex flex-col justify-center">
                <span className="text-xs">{user.email}</span>

                <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden'>
                  <div className='h-full bg-blue-70' style={{ width: (this.state.usage / this.state.limit) * 100 }} />
                </div>

                <span className="flex-grow mt-1 text-supporting-2 text-m-neutral-100">{bytesToString(this.state.usage)} of {this.putLimitUser()}</span>
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
