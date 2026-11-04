import { describe, expect, test } from 'vitest';
import { RootState } from '../..';
import workspacesSelectors from './workspaces.selectors';

const stateWith = (workspaces: Partial<RootState['workspaces']>) => ({ workspaces }) as RootState;

describe('Credentials to act on behalf of the workspace owner', () => {
  test('When no workspace is selected, then there are no workspace credentials', () => {
    const state = stateWith({ selectedWorkspace: null, workspaceCredentials: null });

    expect(workspacesSelectors.getOwnerUserAuthenticationData(state)).toBeUndefined();
  });

  test('When a workspace is selected, then its network credentials, bucket, key and token are used', () => {
    const state = stateWith({
      selectedWorkspace: { workspace: { id: 'workspace-id' }, workspaceUser: { key: 'workspace-key' } } as never,
      workspaceCredentials: {
        credentials: { networkUser: 'network-user', networkPass: 'network-pass' },
        bucket: 'workspace-bucket',
        tokenHeader: 'workspace-token',
      } as never,
    });

    expect(workspacesSelectors.getOwnerUserAuthenticationData(state)).toEqual({
      bridgeUser: 'network-user',
      bridgePass: 'network-pass',
      encryptionKey: 'workspace-key',
      bucketId: 'workspace-bucket',
      workspaceId: 'workspace-id',
      workspacesToken: 'workspace-token',
    });
  });
});
