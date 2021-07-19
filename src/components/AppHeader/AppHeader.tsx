import React, { ReactNode } from 'react';
import { Dropdown } from 'react-bootstrap';
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

    this.onDarkModeButtonClicked = this.onDarkModeButtonClicked.bind(this);
    this.onLightModeButtonClicked = this.onLightModeButtonClicked.bind(this);
  }

  onDarkModeButtonClicked() {
    console.log('dark mode button clicked!');
  }

  onLightModeButtonClicked() {
    console.log('light mode button clicked!');
  }

  render(): ReactNode {
    const { user } = this.props;
    const userFullName: string = user ? `${user.name} ${user.lastname}` : '';

    return (
      <div className="flex justify-between w-full pl-6 py-3 mb-2">
        <input type="text" placeholder="Search files" />

        { true ?
          <button className="theme-button bg-white" onClick={this.onLightModeButtonClicked}>
            <img src={iconService.getIcon(IconType.LightMode)} />
          </button> :
          <button className="theme-button bg-white" onClick={this.onDarkModeButtonClicked}>
            <img src={iconService.getIcon(IconType.DarkMode)} />
          </button>
        }
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user
}))(AppHeader);