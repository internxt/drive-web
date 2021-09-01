import localStorageService from '../services/local-storage.service';

function getHeaders(withAuth: boolean, withMnemonic: boolean, isTeam = false): Headers {
  const headers = new Headers();

  headers.append('content-type', 'application/json; charset=utf-8');
  headers.append('internxt-version', '1.0.0');
  headers.append('internxt-client', 'drive-web');

  if (withAuth) {
    isTeam
      ? headers.append('Authorization', `Bearer ${localStorageService.get('xTokenTeam')}`)
      : headers.append('Authorization', `Bearer ${localStorageService.get('xToken')}`);
  }

  if (withMnemonic) {
    isTeam
      ? headers.append('internxt-mnemonic', `${localStorageService.getTeams()?.bridge_mnemonic}`)
      : headers.append('internxt-mnemonic', `${localStorageService.get('xMnemonic')}`);
  }

  return headers;
}

export { getHeaders };
