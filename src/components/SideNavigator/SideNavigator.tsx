import React from 'react';

import { getIcon, IconType } from '../../services/icon.service';
import SideNavigatorItem from './SideNavigatorItem/SideNavigatorItem';

import './SideNavigator.scss';
import authService from '../../services/auth.service';

interface SideNavigatorProps { }

interface SideNavigatorState {
  collapsed: boolean;
}

class SideNavigator extends React.Component<SideNavigatorProps, SideNavigatorState> {
  constructor(props: SideNavigatorProps) {
    super(props);

    this.state = {
      collapsed: false
    };

    this.toggleCollapsed = this.toggleCollapsed.bind(this);
  }

  componentDidMount() { }

  toggleCollapsed() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  render() {
    const { collapsed } = this.state;

    return (
      <div className={`bg-l-neutral-20 ${!collapsed ? 'w-sidenav-1280-open' : 'w-sidenav-1280-closed'} px-8`}>
        <button className={`flex items-center absolute top-4 left-32 transform duration-500 ${!collapsed ? 'rotate-0' : 'rotate-180'}`}
          onClick={this.toggleCollapsed}
        >
          <img src={getIcon(IconType.BackArrows)} alt="" />
        </button>

        <div className={`transform duration-500 ${!collapsed ? '' : '-translate-x-3'}`}>
          {!collapsed
            ? <div className='absolute -top-8 h-2'><img src={getIcon(IconType.InternxtLongLogo)} alt="" /></div>
            : <div className='absolute -top-9 w-4 h-4'><img src={getIcon(IconType.InternxtShortLogo)} alt="" /></div>
          }

          <div className='flex flex-col items-start mb-10 mt-12'>
            <span className='h-3 text-xs text-m-neutral-10 font-semibold mb-3'>{!collapsed && 'Files'}</span>
            <SideNavigatorItem text='Drive' icon={getIcon(IconType.FolderWithCrossGray)} isOpen={!collapsed} tooltipText='Esto es drive' />
            <SideNavigatorItem text='Recents' icon={getIcon(IconType.ClockGray)} isOpen={!collapsed} tooltipText='Esto es recents' />
          </div>

          <div className={`flex flex-col items-start transform duration-300 ${!collapsed ? 'delay-500' : 'delay-500 -translate-y-16'}`}>
            <span className='h-3 text-xs text-m-neutral-10 font-semibold mb-3'>{!collapsed && 'Configuration'}</span>
            <SideNavigatorItem text='Account' icon={getIcon(IconType.AccountGray)} isOpen={!collapsed} tooltipText='Esto es account' />
            <SideNavigatorItem text='Support' icon={getIcon(IconType.SupportGray)} isOpen={!collapsed} tooltipText='Esto es support' />
            <SideNavigatorItem text='Log out' icon={getIcon(IconType.LogOutGray)} isOpen={!collapsed} onClick={authService.logOut} />
          </div>
        </div>
      </div>
    );
  }
}

export default SideNavigator;
