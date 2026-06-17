import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import { EnvironmentConfig } from './types';

/**
 * Returns required config to upload files to the Internxt Network
 * @param isWorkspace Flag to indicate if is a team or not
 */
export function getEnvironmentConfig(isWorkspace?: boolean): EnvironmentConfig {
  const workspaceCredentials = localStorageService.getWorkspaceCredentials();
  const workspace = localStorageService.getB2BWorkspace();

  if (isWorkspace && workspaceCredentials && workspace) {
    return {
      bridgeUser: workspaceCredentials?.credentials?.networkUser,
      bridgePass: workspaceCredentials?.credentials?.networkPass,
      encryptionKey: workspace.workspaceUser.key,
      bucketId: workspaceCredentials?.bucket,
      useProxy: envService.getVariable('dontUseProxy') !== 'true',
    };
  }

  const user = localStorageService.getUser() as UserSettings;

  return {
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
    useProxy: envService.getVariable('dontUseProxy') !== 'true',
  };
}
