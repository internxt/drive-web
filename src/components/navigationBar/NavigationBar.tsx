import React from 'react';
import { Nav, Navbar } from 'react-bootstrap';

// Assets
import logo from '../../assets/drive-logo.svg';

import search from '../../assets/Dashboard-Icons/Search.svg';
import uploadFileIcon from '../../assets/Dashboard-Icons/Upload.svg';
import newFolder from '../../assets/Dashboard-Icons/Add-folder.svg';
import deleteFile from '../../assets/Dashboard-Icons/Delete.svg';
import share from '../../assets/Dashboard-Icons/Share.svg';
import teamsIcon from '../../assets/Dashboard-Icons/teamsIcon.svg';
import personalIcon from '../../assets/Dashboard-Icons/personalIcon.svg';

import HeaderButton from './HeaderButton';

import './NavigationBar.scss';
import history from '../../lib/history';

import Settings from '../../lib/settings';
import SettingsMenu from './SettingsMenu';

interface NavigationBarProps {
  navbarItems: JSX.Element
  showFileButtons?: boolean
  showSettingsButton?: boolean
  setSearchFunction?: any
  uploadFile?: any
  createFolder?: any
  deleteItems?: any
  shareItem?: any
  uploadHandler?: any
  showTeamSettings?: any
  isTeam: boolean
  handleChangeWorkspace?: any
  isAdmin?: boolean
  isMember?: boolean
}

interface NavigationBarState {
  navbarItems: JSX.Element
  workspace: string
  menuButton: any
  isTeam: boolean
  isAdmin: boolean
  isMember: boolean
}

class NavigationBar extends React.Component<NavigationBarProps, NavigationBarState> {
  constructor(props: NavigationBarProps) {
    super(props);

    this.state = {
      menuButton: null,
      navbarItems: props.navbarItems,
      workspace: 'My Workspace',
      isTeam: this.props.isTeam || false,
      isAdmin: this.props.isAdmin || false,
      isMember: this.props.isMember || false
    };
  }

  getNavBarItems(isTeam: boolean) {
    const xTeam = Settings.exists('xTeam');

    return <Nav className="m-auto">
      <div className="top-bar">
        <div className="search-container">
          <input alt="Search files" className="search" required style={{ backgroundImage: 'url(' + search + ')' }} onChange={this.props.setSearchFunction} />
        </div>
      </div>

      <HeaderButton icon={uploadFileIcon} name="Upload file" clickHandler={this.props.uploadFile} />
      <HeaderButton icon={newFolder} name="New folder" clickHandler={this.props.createFolder} />
      <HeaderButton icon={deleteFile} name="Delete" clickHandler={this.props.deleteItems} />
      <HeaderButton icon={share} name="Share" clickHandler={this.props.shareItem} />
      <input id="uploadFileControl" type="file" onChange={this.props.uploadHandler} multiple={false} />
      {xTeam && <HeaderButton icon={this.props.isTeam ? personalIcon : teamsIcon} name="Team" clickHandler={this.handleChangeWorkspace.bind(this)} />}
    </Nav>;
  }

  componentDidMount() {
    if (Settings.exists('xTeam')) {
      const admin = Settings.getTeams().isAdmin;

      this.setState({ isAdmin: !!admin });
    } else {
      this.setState({ isAdmin: true });
    }
    let user: string;

    try {
      user = Settings.getUser().email;
      if (user == null) {
        throw new Error();
      }
    } catch {
      history.push('/login');
      return;
    }

    if (this.props.showFileButtons) {
      this.setState({
        navbarItems: this.getNavBarItems(false)
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.isTeam !== prevProps.isTeam) {
      this.setState({
        isTeam: this.props.isTeam,
        navbarItems: this.getNavBarItems(this.props.isTeam),
        workspace: this.props.isTeam ? 'Team workspace' : 'My workspace'
      });
    }
    if (Settings.exists('xTeam') && Settings.exists('teamActivation')) {
      Settings.del('teamActivation');
      this.setState({
        navbarItems: this.getNavBarItems(this.props.isTeam)
      });
    }
  }

  handleChangeWorkspace() {
    this.props.handleChangeWorkspace && this.props.handleChangeWorkspace();
  }

  render() {

    return (
      <Navbar id="mainNavBar">
        <Navbar.Brand>
          <a href="/"><img src={logo} alt="Logo" /></a>
        </Navbar.Brand>
        <Nav className="m-auto">
          {this.state.navbarItems}
        </Nav>
        <Nav style={{ margin: '0 13px 0 0' }}>
          <SettingsMenu isTeam={this.state.isTeam} />
        </Nav>
      </Navbar>
    );
  }
}

export default NavigationBar;