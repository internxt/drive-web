import { Storage, Share, Users, Referrals, Payments, Backups } from '@internxt/sdk/dist/drive';
import { Auth, Token } from '@internxt/sdk/dist/auth';
import {
  ApiSecurity, ApiUrl,
  AppDetails
} from '@internxt/sdk/dist/shared';
import packageJson from '../../../../../package.json';
import localStorageService from '../../services/local-storage.service';
import { LocalStorageItem, Workspace } from '../../types';
import authService from '../../../auth/services/auth.service';
import tasksService from '../../../tasks/services/tasks.service';

export function createAuthClient(): Auth {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Auth.client(apiUrl, appDetails, apiSecurity);
}

export function createStorageClient(): Storage {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Storage.client(apiUrl, appDetails, apiSecurity);
}

export function createShareClient(): Share {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Share.client(apiUrl, appDetails, apiSecurity);
}

export function createUsersClient(): Users {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Users.client(apiUrl, appDetails, apiSecurity);
}

export function createReferralsClient(): Referrals {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Referrals.client(apiUrl, appDetails, apiSecurity);
}

export function createPaymentsClient(): Payments {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Payments.client(apiUrl, appDetails, apiSecurity);
}

export function createBackupsClient(): Backups {
  const apiUrl = getApiUrl();
  const appDetails = getAppDetails();
  const apiSecurity = getApiSecurity();
  return Backups.client(apiUrl, appDetails, apiSecurity);
}

function getApiUrl(): ApiUrl {
  return process.env.REACT_APP_API_URL + '/api';
}

function getAppDetails(): AppDetails {
  return {
    clientName: packageJson.name,
    clientVersion: packageJson.version,
  };
}

function getApiSecurity(): ApiSecurity {
  const workspace = getWorkspace();
  return {
    mnemonic: getMnemonic(workspace),
    token: getToken(workspace),
    unauthorizedCallback: async () => {
      authService.logOut();
      tasksService.clearTasks();
    }
  };
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

function getWorkspace(): string {
  return (localStorageService.get(LocalStorageItem.Workspace) as Workspace) || Workspace.Individuals;
}
