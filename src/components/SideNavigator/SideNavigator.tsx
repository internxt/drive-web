import { getIcon } from '../../helpers/getIcon';
import { IconTypes } from '../../models/interfaces';
import SideNavigatorItem from './SideNavigatorItem/SideNavigatorItem';
import React from 'react';

import './SideNavigator.scss';

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
      <div className={`bg-gray-10 ${!collapsed ? 'w-sidenav-1280-open' : 'w-sidenav-1280-closed'} pt-10`}>
        <button className={`flex items-center absolute top-3 left-3 ${!collapsed ? 'transform rotate-0 duration-500' : 'transform rotate-180 duration-500'}`}
          onClick={() => this.toggleCollapsed()}
        >
          <img src={getIcon(IconTypes.BackArrows)} alt="" width='16' height='16' />
        </button>

        <SideNavigatorItem text='Drive' icon={getIcon(IconTypes.FolderWithCrossGray)} hasChildren={true} isOpen={!collapsed} tooltipText='Esto es drive' />
        <SideNavigatorItem text='Recents' icon={getIcon(IconTypes.ClockGray)} hasChildren={true} isOpen={!collapsed} tooltipText='Esto es recents' />
        <SideNavigatorItem text='Account' icon={getIcon(IconTypes.AccountGray)} hasChildren={true} isOpen={!collapsed} tooltipText='Esto es account' />
        <SideNavigatorItem text='Support' icon={getIcon(IconTypes.SupportGray)} hasChildren={true} isOpen={!collapsed} tooltipText='Esto es support' />
        <SideNavigatorItem text='Log out' icon={getIcon(IconTypes.LogOutGray)} hasChildren={true} isOpen={!collapsed} tooltipText='Esto es log out' />
      </div>
    );
  }
}

export default SideNavigator;