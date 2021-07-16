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
      <div className="flex justify-between w-full py-3 mb-2">
        <input type="text" placeholder="Search files" />
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic">
            <img src={iconService.getIcon(IconType.Settings)} />
          </Dropdown.Toggle>
          <Dropdown.Menu className="file-dropdown-actions">
            <span className="text-supporting-2 mb-1">Screen</span>
            <Dropdown.Item
              id="light-mode"
              className="file-dropdown-actions-button flex"
              onClick={this.onLightModeButtonClicked}
            >
              <img className="mr-2 text-neutral-900" src={iconService.getIcon(IconType.Settings)} />
              <span>Light mode</span>
            </Dropdown.Item>
            <Dropdown.Item
              id="dark-mode"
              className="file-dropdown-actions-button flex"
              onClick={this.onDarkModeButtonClicked}
            >
              <img className="mr-2" src={iconService.getIcon(IconType.Settings)} />
              <span>Dark mode</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user
}))(AppHeader);