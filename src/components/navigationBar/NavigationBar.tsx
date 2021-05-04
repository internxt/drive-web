import React from 'react';
import { Nav, Navbar, Dropdown, ProgressBar } from 'react-bootstrap';

// Assets
import account from '../../assets/Dashboard-Icons/Account.svg';
import logo from '../../assets/drive-logo.svg';

import search from '../../assets/Dashboard-Icons/Search.svg';
import uploadFileIcon from '../../assets/Dashboard-Icons/Upload.svg';
import newFolder from '../../assets/Dashboard-Icons/Add-folder.svg';
import deleteFile from '../../assets/Dashboard-Icons/Delete.svg';
import share from '../../assets/Dashboard-Icons/Share.svg';
import teamsIcon from '../../assets/Dashboard-Icons/teamsIcon.svg';
import personalIcon from '../../assets/Dashboard-Icons/personalIcon.svg';

import HeaderButton from './HeaderButton';

import { getUserData } from '../../lib/analytics';

import './NavigationBar.scss';
import history from '../../lib/history';

import { getHeaders } from '../../lib/auth';
import Settings from '../../lib/settings';
import customPrettySize from '../../lib/sizer';
// import { toast } from 'react-toastify';

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
  barLimit: number
  barUsage: number
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
      barLimit: 1024 * 1024 * 1024 * 10,
      barUsage: 0,
      isTeam: this.props.isTeam || false,
      isAdmin: this.props.isAdmin || false,
      isMember: this.props.isMember || false
    };
  }

  async getUsage(isTeam: Boolean = false) {
    const limit = await fetch('/api/limit', {
      headers: getHeaders(true, false, isTeam)
    }).then(res => res.json()).catch(() => null);

    const usage = await fetch('/api/usage', {
      headers: getHeaders(true, false, isTeam)
    }).then(res3 => res3.json()).catch(() => null);

    if (limit && usage) {
      this.setState({
        barUsage: usage.total,
        barLimit: limit.maxSpaceBytes
      });
    }
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
      <input id="uploadFileControl" type="file" onChange={this.props.uploadHandler} multiple={true} />
      {xTeam && <HeaderButton icon={isTeam ? personalIcon : teamsIcon} name="Team" clickHandler={this.handleChangeWorkspace.bind(this)} />}
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

    this.getUsage(this.state.isTeam);
  }

  componentDidUpdate(prevProps) {
    if (this.props.isTeam !== prevProps.isTeam) {
      this.setState({
        isTeam: this.props.isTeam,
        navbarItems: this.getNavBarItems(this.props.isTeam),
        workspace: this.props.isTeam ? 'Team workspace' : 'My workspace'
      }, () => {
        this.getUsage(this.props.isTeam);
      });
    }
  }

  handleChangeWorkspace() {
    this.props.handleChangeWorkspace && this.props.handleChangeWorkspace();
  }

  // handleBilling() {
  //   const user = Settings.getUser().email;

  //   const body = {
  //     test: process.env.NODE_ENV !== 'production',
  //     email: user
  //   };

  //   fetch('/api/stripe/billing', {
  //     method: 'post',
  //     headers: getHeaders(true, false),
  //     body: JSON.stringify(body)
  //   }).then((res) => {
  //     if (res.status !== 200) {
  //       throw res;
  //     }
  //     return res.json();
  //   }).then(res => {
  //     const stripeBillingURL = res.url;

  //     window.location.href = stripeBillingURL;
  //   }).catch(error => {
  //     toast.warn('Error on Stripe Billing');
  //   });
  // }

  render() {
    let user: any = null;

    try {
      user = Settings.getUser();
      if (user == null) {
        throw new Error();
      }
    } catch {
      history.push('/login');
      return '';
    }

    const isAdmin = Settings.getTeams().isAdmin;
    const xTeam = Settings.exists('xTeam');
    // const tenGB = 10737418240;

    return (
      <Navbar id="mainNavBar">
        <Navbar.Brand>
          <a href="/"><img src={logo} alt="Logo" /></a>
        </Navbar.Brand>
        <Nav className="m-auto">
          {this.state.navbarItems}
        </Nav>
        <Nav style={{ margin: '0 13px 0 0' }}>
          <Dropdown drop="left" className="settingsButton">
            <Dropdown.Toggle id="1"><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
            <Dropdown.Menu>
              <div className="dropdown-menu-group info">
                <p className="name-lastname">{this.state.isTeam ? 'Business' : `${user.name} ${user.lastname}`}</p>
                <ProgressBar className="mini-progress-bar" now={this.state.barUsage} max={this.state.barLimit} />
                <p className="space-used">Used <strong>{customPrettySize(this.state.barUsage)}</strong> of <strong>{customPrettySize(this.state.barLimit)}</strong></p>
              </div>
              <Dropdown.Divider />
              <div className="dropdown-menu-group">
                {!this.state.isTeam && <Dropdown.Item onClick={(e) => { history.push('/storage'); }}>Storage</Dropdown.Item>}
                {!Settings.exists('xTeam') && <Dropdown.Item onClick={(e) => { history.push('/settings'); }}>Settings</Dropdown.Item>}
                <Dropdown.Item onClick={(e) => { history.push('/security'); }}>Security</Dropdown.Item>
                {!xTeam && <Dropdown.Item onClick={(e) => { history.push('/token'); }}>Token</Dropdown.Item>}
                {/* {!xTeam && (this.state.barLimit > tenGB) && <Dropdown.Item onClick={(e) => this.handleBilling()}> Billing </Dropdown.Item>} */}
                {isAdmin || !xTeam ? <Dropdown.Item onClick={(e) => { history.push('/teams'); }}>Business</Dropdown.Item> : <></>}
                {!this.state.isTeam && <Dropdown.Item onClick={(e) => { history.push('/invite'); }}>Referrals</Dropdown.Item>}
                {!this.state.isTeam && <Dropdown.Item onClick={(e) => {
                  function getOperatingSystem() {
                    let operatingSystem = 'Not known';

                    if (window.navigator.appVersion.indexOf('Win') !== -1) { operatingSystem = 'WindowsOS'; }
                    if (window.navigator.appVersion.indexOf('Mac') !== -1) { operatingSystem = 'MacOS'; }
                    if (window.navigator.appVersion.indexOf('X11') !== -1) { operatingSystem = 'UNIXOS'; }
                    if (window.navigator.appVersion.indexOf('Linux') !== -1) { operatingSystem = 'LinuxOS'; }

                    return operatingSystem;
                  }

                  console.log(getOperatingSystem());

                  switch (getOperatingSystem()) {
                    case 'WindowsOS':
                      window.location.href = 'https://internxt.com/downloads/drive.exe';
                      break;
                    case 'MacOS':
                      window.location.href = 'https://internxt.com/downloads/drive.dmg';
                      break;
                    case 'Linux':
                    case 'UNIXOS':
                      window.location.href = 'https://internxt.com/downloads/drive.deb';
                      break;
                    default:
                      window.location.href = 'https://github.com/internxt/drive-desktop/releases';
                      break;
                  }

                }}>Download</Dropdown.Item>}
                <Dropdown.Item href="mailto:support@internxt.zohodesk.eu">Contact</Dropdown.Item>
              </div>
              <Dropdown.Divider />
              <div className="dropdown-menu-group">
                <Dropdown.Item onClick={(e) => {
                  window.analytics.track('user-signout', {
                    email: getUserData().email
                  });
                  Settings.clear();
                  history.push('/login');
                }}>Sign out</Dropdown.Item>
              </div>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Navbar>
    );
  }
}

export default NavigationBar;