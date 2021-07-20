import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { UserSettings } from '../../models/interfaces';
import iconService, { IconType } from '../../services/icon.service';
import { RootState } from '../../store';
import history from '../../lib/history';

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
  }

  onAccountButtonClicked(): void {
    history.push('/account');
  }

  render(): ReactNode {
    const { user } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';

    return (
      <div className="flex justify-between w-full py-3 mb-2">
        <input type="text" placeholder="Search files" />
        <div className="flex items-center cursor-pointer" onClick={this.onAccountButtonClicked}>
          <img alt="" src={iconService.getIcon(IconType.DefaultAvatar)} className="user-avatar rounded-2xl mr-1 bg-l-neutral-30 p-0.5" />
          <span className="text-neutral-500 text-sm">Welcome {userFullName}</span>
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user
}))(AppHeader);