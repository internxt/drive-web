import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { UserSettings } from '../../models/interfaces';
import { RootState } from '../../store';
import history from '../../lib/history';
import * as Unicons from '@iconscout/react-unicons';

import './AppHeader.scss';

interface AppHeaderProps {
  user: UserSettings | undefined
}

interface AppHeaderState { }

class AppHeader extends React.Component<AppHeaderProps, AppHeaderState> {
  constructor(props: AppHeaderProps) {
    super(props);

    this.state = {};

    this.onAccountButtonClicked = this.onAccountButtonClicked.bind(this);
    this.onSearchButtonClicked = this.onSearchButtonClicked.bind(this);
  }

  onAccountButtonClicked(): void {
    history.push('/account');
  }

  onSearchButtonClicked(): void {
    console.log('search submitted!');
  }

  render(): ReactNode {
    const { user } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';

    return (
      <div className="flex justify-between w-full py-3 mb-2">
        <div className="flex">
          <input type="text" placeholder="Search files" className="no-ring right-icon" />
          <Unicons.UilSearch onClick={this.onSearchButtonClicked} className="text-blue-60 cursor-pointer right-6 relative w-4" />
        </div>
        <div className="flex items-center cursor-pointer" onClick={this.onAccountButtonClicked}>
          <Unicons.UilUser className="user-avatar rounded-2xl mr-1 bg-l-neutral-30 p-0.5 text-blue-60" />
          <span className="text-neutral-500 text-sm">Welcome {userFullName}</span>
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user
}))(AppHeader);