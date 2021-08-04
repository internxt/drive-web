import { useState, useEffect } from 'react';

import { Dropdown, ProgressBar } from 'react-bootstrap';
import HeaderButton from './HeaderButton';

import history from '../../lib/history';
import { bytesToString } from '../../services/size.service';
import account from '../../assets/Dashboard-Icons/Account.svg';
import localStorageService from '../../services/localStorage.service';
import SessionStorage from '../../lib/sessionStorage';
import { getLimit } from '../../services/limit.service';
import { UserSettings } from '../../models/interfaces';
import authService from '../../services/auth.service';
import usageService, { UsageResponse } from '../../services/usage.service';

interface SettingMenuProp {
  isTeam: boolean
}

const DEFAULT_LIMIT = 1024 * 1024 * 1024 * 2;

function SettingMenu({ isTeam }: SettingMenuProp): JSX.Element {

  const [barUsage, setBarUsage] = useState<number>(0);
  const [barLimit, setBarLimit] = useState<number>(DEFAULT_LIMIT);
  const [barLimitTeams, setBarLimitTeams] = useState<number>();

  useEffect(() => {
    const limitStorage = SessionStorage.get('limitStorage');
    const teamsStorage = SessionStorage.get('teamsStorage');

    if (limitStorage) {
      setBarLimit(parseInt(limitStorage, 10));
    } else {
      getLimit(false).then((limitStorage) => {
        if (limitStorage) {
          SessionStorage.set('limitStorage', limitStorage);
          setBarLimit(parseInt(limitStorage));
        }
      });
    }

    if (teamsStorage) {
      setBarLimitTeams(parseInt(teamsStorage, 10));
    } else {
      if (localStorageService.get('xTeam')) {
        getLimit(true).then((teamsStorage) => {
          if (teamsStorage) {
            SessionStorage.set('teamsStorage', teamsStorage);
            setBarLimitTeams(parseInt(teamsStorage));
          }
        });
      }
    }

  }, []);

  const fetchUsage = () => {
    return usageService.fetchUsage(isTeam)
      .then((res: UsageResponse) => {
        setBarUsage(res.total);
      }).catch(() => null);
  };

  const putLimitUser = () => {
    if (barLimit > 0) {
      if (barLimit < 108851651149824) {
        return bytesToString(barLimit);
      } else if (barLimit >= 108851651149824) {
        return '\u221E';
      } else {
        return '...';
      }
    }
  };

  useEffect(() => {
    fetchUsage().then();
  }, [barUsage, isTeam]);

  const isAdmin = localStorageService.getTeams().isAdmin;
  const xTeam = localStorageService.exists('xTeam');

  let user: UserSettings | null = null;

  try {
    user = localStorageService.getUser();
    if (user == null) {
      throw new Error();
    }
  } catch {
    history.push('/login');
    return <></>;
  }

  return (
    <Dropdown drop="left" className="settingsButton" onClick={() => {
      fetchUsage().then();
    }}>
      <Dropdown.Toggle id="1"><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
      <Dropdown.Menu>
        <div className="dropdown-menu-group info">
          <p className="name-lastname">{isTeam ? 'Business' : `${user.name} ${user.lastname}`}</p>
          {isTeam ? <ProgressBar className="mini-progress-bar" now={barUsage} max={barLimitTeams} /> : <ProgressBar className="mini-progress-bar" now={barUsage} max={barLimit} />}
          <p className="space-used">Used <strong>{bytesToString(barUsage)}</strong> of {barLimitTeams && isTeam ? <strong>{barLimitTeams > 0 ? bytesToString(barLimitTeams) : '...'}</strong> : <strong>{putLimitUser()}</strong>}</p>
        </div>
        <Dropdown.Divider />
        <div className="dropdown-menu-group">
          {!isTeam && <Dropdown.Item onClick={(e) => {
            history.push('/storage');
          }}>Storage</Dropdown.Item>}
          {!isTeam && <Dropdown.Item onClick={(e) => {
            history.push('/settings');
          }}>Settings</Dropdown.Item>}
          <Dropdown.Item onClick={(e) => {
            history.push('/security');
          }}>Security</Dropdown.Item>
          {/* {!xTeam && <Dropdown.Item onClick={(e) => {
            history.push('/token');
          }}>Token</Dropdown.Item>} */}
          {isAdmin || !xTeam ? <Dropdown.Item onClick={(e) => {
            history.push('/teams');
          }}>Business</Dropdown.Item> : <></>}
          {!isTeam && <Dropdown.Item onClick={(e) => {
            history.push('/invite');
          }}>Referrals</Dropdown.Item>}
          {!isTeam && <Dropdown.Item onClick={(e) => {
            function getOperatingSystem() {
              let operatingSystem = 'Not known';

              if (window.navigator.appVersion.indexOf('Win') !== -1) {
                operatingSystem = 'WindowsOS';
              }
              if (window.navigator.appVersion.indexOf('Mac') !== -1) {
                operatingSystem = 'MacOS';
              }
              if (window.navigator.appVersion.indexOf('X11') !== -1) {
                operatingSystem = 'UNIXOS';
              }
              if (window.navigator.appVersion.indexOf('Linux') !== -1) {
                operatingSystem = 'LinuxOS';
              }

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
          <Dropdown.Item href="https://help.internxt.com/">Contact</Dropdown.Item>
        </div>
        <Dropdown.Divider />
        <div className="dropdown-menu-group">
          <Dropdown.Item onClick={(e) => authService.logOut()}>Sign out</Dropdown.Item>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default SettingMenu;