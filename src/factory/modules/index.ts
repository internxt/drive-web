import { Storage, Token } from '@internxt/sdk';
import packageJson from '../../../package.json';
import localStorageService from '../../app/core/services/local-storage.service';
import { LocalStorageItem, Workspace } from '../../app/core/types';

export function createStorageClient(): Storage {
  const workspace = getWorkspace();
  const token = getToken(workspace);
  const mnemonic = getMnemonic(workspace);
  return Storage.client(process.env.REACT_APP_API_URL, packageJson.name, packageJson.version, token, mnemonic);
}

function getWorkspace(): string {
  return (localStorageService.get(LocalStorageItem.Workspace) as Workspace) || Workspace.Individuals;
}

function getMnemonic(workspace: string): string {
  const mnemonicByWorkspace: { [key in Workspace]: string } = {
    [Workspace.Individuals]: localStorageService.get('xMnemonic') || '',
    [Workspace.Business]: localStorageService.getTeams()?.bridge_mnemonic || '',
  };
  return mnemonicByWorkspace[workspace];
}

function getToken(workspace: string): Token {
  const tokenByWorkspace: { [key in Workspace]: string } = {
    [Workspace.Individuals]: localStorageService.get('xToken') || '',
    [Workspace.Business]: localStorageService.get('xTokenTeam') || '',
  };
  return tokenByWorkspace[workspace];
}