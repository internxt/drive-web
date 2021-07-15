import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { UserSettings } from '../../models/interfaces';
import iconService, { IconType } from '../../services/icon.service';
import { RootState } from '../../store';

import './AppHeader.scss';

interface AppHeaderProps {
  user: UserSettings | undefined
}

interface AppHeaderState { }

class AppHeader extends React.Component<AppHeaderProps, AppHeaderState> {
  constructor(props: AppHeaderProps) {
    super(props);

    this.state = {};
  }

  render(): ReactNode {
    const { user } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';

    return (
      <div className="flex justify-between w-full py-3">
        <input type="text" placeholder="Search files" />
        <div className="flex">
          <img src={iconService.getIcon(IconType.DefaultAvatar)} alt="" className="user-avatar rounded-2xl mr-1 bg-l-neutral-30 p-0.5" />
          <span className="welcome-message text-neutral-500 text-sm">Welcome {userFullName}</span>
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user
}))(AppHeader);