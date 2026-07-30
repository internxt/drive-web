import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import { EnvironmentConfig } from './types';
import encryptedStorageService from 'services/encrypted-storage.service';

/**
 * Returns required config to upload files to the Internxt Network
 * @param isWorkspace Flag to indicate if is a team or not
 */
export async function getEnvironmentConfig(isWorkspace?: boolean): Promise<EnvironmentConfig> {
  const workspaceCredentials = encryptedStorageService.getWorkspaceCredentials();
  const workspaceMnemonic = await encryptedStorageService.getB2BWorkspaceMnemonic();

  if (isWorkspace && workspaceCredentials && workspaceMnemonic) {
    return {
      bridgeUser: workspaceCredentials?.credentials?.networkUser,
      bridgePass: workspaceCredentials?.credentials?.networkPass,
      encryptionKey: workspaceMnemonic,
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
