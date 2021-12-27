import { Storage, Token } from '@internxt/sdk';
import packageJson from '../../../package.json';
import localStorageService from '../../app/core/services/local-storage.service';
import { LocalStorageItem, Workspace } from '../../app/core/types';

export function createStorageClient(): Storage {
  const token = getToken();
  return Storage.client(process.env.REACT_APP_API_URL, packageJson.name, packageJson.version, token);
}

function getToken(): Token {
  const tokenByWorkspace: { [key in Workspace]: string } = {
    [Workspace.Individuals]: localStorageService.get('xToken') || '',
    [Workspace.Business]: localStorageService.get('xTokenTeam') || '',
  };
  const workspace =
    (localStorageService.get(LocalStorageItem.Workspace) as Workspace) ||
    Workspace.Individuals;

  return tokenByWorkspace[workspace];
}