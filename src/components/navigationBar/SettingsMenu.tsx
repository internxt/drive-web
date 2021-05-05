import React, { useState, useEffect } from 'react';

import { Dropdown, ProgressBar } from 'react-bootstrap';
import HeaderButton from './HeaderButton';

import history from '../../lib/history';
import { getUserData } from '../../lib/analytics';
import customPrettySize from '../../lib/sizer';
import account from '../../assets/Dashboard-Icons/Account.svg';
import Settings, { UserSettings } from '../../lib/settings';
import { getHeaders } from '../../lib/auth';
import { getLimit } from '../../services/storage.service';

interface SettingMenuProp {
  isTeam: boolean,
}

const DEFAULT_LIMIT = 1024 * 1024 * 1024 * 10;

function SettingMenu({ isTeam }: SettingMenuProp): JSX.Element {

  const [barUsage, setBarUsage] = useState<number>(0);
  const [barLimit, setBarLimit] = useState<number>(DEFAULT_LIMIT);

  useEffect(() => {

    if (!Settings.exists('limitStorage'))
    {
      getLimit().then((limitStorage) => {
        Settings.set('limitStorage', limitStorage);
        setBarLimit(parseInt(limitStorage));
      });
    }
    else
    {
      setBarLimit(parseInt(Settings.get('limitStorage')));
    }
  }, []);

  useEffect(() => {
    fetch('/api/usage', {
      headers: getHeaders(true, false, isTeam)
    }).then(res => {
      return res.json();
    }).then(res1 => {
      setBarUsage(res1.total);
    }).catch(() => null);
  }, []);

  const isAdmin = Settings.getTeams().isAdmin;
  const xTeam = Settings.exists('xTeam');

  let user: UserSettings = null;

  try {
    user = Settings.getUser();
    if (user == null) {
      throw new Error();
    }
  } catch {
    history.push('/login');
    return <></>;
  }

  return (
    <Dropdown drop="left" className="settingsButton">
      <Dropdown.Toggle id="1"><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
      <Dropdown.Menu>
        <div className="dropdown-menu-group info">
          <p className="name-lastname">{isTeam ? 'Business' : `${user.name} ${user.lastname}`}</p>
          <ProgressBar className="mini-progress-bar" now={barUsage} max={barLimit} />
          <p className="space-used">Used <strong>{customPrettySize(barUsage)}</strong> of <strong>{customPrettySize(barLimit)}</strong></p>
        </div>
        <Dropdown.Divider />
        <div className="dropdown-menu-group">
          {!isTeam && <Dropdown.Item onClick={(e) => { history.push('/storage'); }}>Storage</Dropdown.Item>}
          {!Settings.exists('xTeam') && <Dropdown.Item onClick={(e) => { history.push('/settings'); }}>Settings</Dropdown.Item>}
          <Dropdown.Item onClick={(e) => { history.push('/security'); }}>Security</Dropdown.Item>
          {!xTeam && <Dropdown.Item onClick={(e) => { history.push('/token'); }}>Token</Dropdown.Item>}
          {isAdmin || !xTeam ? <Dropdown.Item onClick={(e) => { history.push('/teams'); }}>Business</Dropdown.Item> : <></>}
          {!isTeam && <Dropdown.Item onClick={(e) => { history.push('/invite'); }}>Referrals</Dropdown.Item>}
          {!isTeam && <Dropdown.Item onClick={(e) => {
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
  );
}

export default SettingMenu;