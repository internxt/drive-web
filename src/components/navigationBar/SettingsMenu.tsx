import React, { useState, useEffect } from 'react';

import { Dropdown, ProgressBar } from 'react-bootstrap';
import HeaderButton from './HeaderButton';

import history from '../../lib/history';
import { getUserData } from '../../lib/analytics';
import customPrettySize from '../../lib/sizer';
import account from '../../assets/Dashboard-Icons/Account.svg';
import localStorageService from '../../services/localStorage.service';
import { UserSettings } from '../../lib/settings';
import SessionStorage from '../../lib/sessionStorage';
import { getHeaders } from '../../lib/auth';
import { getLimit } from '../../services/storage.service';

interface SettingMenuProp {
  isTeam: boolean,
}

interface UsageResponse {
  _id: string
  total: number
}

const DEFAULT_LIMIT = 1024 * 1024 * 1024 * 10;

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
    return fetch('/api/usage', {
      headers: getHeaders(true, false, isTeam)
    }).then(res => res.json())
      .then((res: UsageResponse) => {
        setBarUsage(res.total);
      }).catch(() => null);
  };

  const putLimitUser = () => {
    if (barLimit > 0) {
      if (barLimit < 108851651149824) {
        return customPrettySize(barLimit);
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
          <p className="space-used">Used <strong>{customPrettySize(barUsage)}</strong> of {barLimitTeams && isTeam ? <strong>{barLimitTeams > 0 ? customPrettySize(barLimitTeams) : '...'}</strong> : <strong>{putLimitUser()}</strong>}</p>
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
          <Dropdown.Item onClick={(e) => {
            window.analytics.track('user-signout', {
              email: getUserData().email
            });
            localStorageService.clear();
            localStorageService.del('workspace');
            history.push('/login');
          }}>Sign out</Dropdown.Item>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default SettingMenu;