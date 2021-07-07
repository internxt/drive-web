import localStorageService from '../services/localStorage.service';

function getHeaders(withAuth: Boolean, withMnemonic: Boolean, isTeam: Boolean = false): Headers {
  const headers = new Headers();

  headers.append('content-type', 'application/json; charset=utf-8');
  headers.append('internxt-version', '1.0.0');
  headers.append('internxt-client', 'drive-web');

  if (isTeam) {
    if (withAuth) {
      headers.append('Authorization', `Bearer ${localStorageService.get('xTokenTeam')}`);
    }

    if (withMnemonic) {
      headers.append('internxt-mnemonic', `${localStorageService.getTeams().bridge_mnemonic}`);
    }
  } else {
    if (withAuth) {
      headers.append('Authorization', `Bearer ${localStorageService.get('xToken')}`);
    }

    if (withMnemonic) {
      headers.append('internxt-mnemonic', `${localStorageService.get('xMnemonic')}`);
    }
  }

  return headers;
}

export {
  getHeaders
};