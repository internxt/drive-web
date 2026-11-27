import { describe, expect, test, vi } from 'vitest';
import { OwnerUserAuthenticationData } from 'app/network/types';
import { decryptMnemonic } from 'app/share/services/share.crypto';
import { getSharedFolderAuthenticationData, SharedFolderOwner } from './sharedFolderAuthentication';

vi.mock('app/share/services/share.crypto', () => ({ decryptMnemonic: vi.fn() }));

const RESOURCES_TOKEN = 'resources-token';

const aSharedFolderOwner = (overrides: Partial<SharedFolderOwner> = {}): SharedFolderOwner => ({
  filesOwnerCredentials: { networkUser: 'owner@example.com', networkPass: 'owner-pass' },
  currentUser: { email: 'member@example.com', mnemonic: 'member-mnemonic', bucket: 'member-bucket' },
  ownerEncryptionKey: 'encrypted-owner-mnemonic',
  ownerBucket: 'owner-bucket',
  ...overrides,
});

describe('Credentials to upload into a folder shared with the user', () => {
  test('When a workspace is selected, then the files go to the workspace storage with the folder access', async () => {
    const workspaceAuthenticationData = {
      bridgeUser: 'workspace-user',
      bridgePass: 'workspace-pass',
      encryptionKey: 'workspace-key',
      bucketId: 'workspace-bucket',
      workspaceId: 'workspace-id',
      workspacesToken: 'workspace-token',
    } as OwnerUserAuthenticationData;

    const credentials = await getSharedFolderAuthenticationData(
      aSharedFolderOwner({ workspaceAuthenticationData }),
      RESOURCES_TOKEN,
    );

    expect(credentials).toStrictEqual({ ...workspaceAuthenticationData, resourcesToken: RESOURCES_TOKEN });
  });

  test('When the user owns the shared folder, then the files go to their own storage', async () => {
    const owner = aSharedFolderOwner({
      currentUser: { email: 'owner@example.com', mnemonic: 'owner-mnemonic', bucket: 'own-bucket' },
    });

    const credentials = await getSharedFolderAuthenticationData(owner, RESOURCES_TOKEN);

    expect(credentials).toStrictEqual({
      bridgeUser: 'owner@example.com',
      bridgePass: 'owner-pass',
      encryptionKey: 'owner-mnemonic',
      bucketId: 'own-bucket',
      token: RESOURCES_TOKEN,
      resourcesToken: RESOURCES_TOKEN,
    });
  });

  test('When someone else owns the shared folder, then the files go to the owner storage', async () => {
    vi.mocked(decryptMnemonic).mockResolvedValueOnce('owner-mnemonic');

    const credentials = await getSharedFolderAuthenticationData(aSharedFolderOwner(), RESOURCES_TOKEN);

    expect(decryptMnemonic).toHaveBeenCalledWith('encrypted-owner-mnemonic');
    expect(credentials).toStrictEqual({
      bridgeUser: 'owner@example.com',
      bridgePass: 'owner-pass',
      encryptionKey: 'owner-mnemonic',
      bucketId: 'owner-bucket',
      token: RESOURCES_TOKEN,
      resourcesToken: RESOURCES_TOKEN,
    });
  });

  test.each([
    { missing: 'the owner credentials', owner: aSharedFolderOwner({ filesOwnerCredentials: undefined }) },
    { missing: 'the owner key', owner: aSharedFolderOwner({ ownerEncryptionKey: null }) },
    { missing: 'the owner bucket', owner: aSharedFolderOwner({ ownerBucket: null }) },
  ])('When $missing are unknown, then there are no owner credentials', async ({ owner }) => {
    vi.mocked(decryptMnemonic).mockResolvedValueOnce('owner-mnemonic');

    const credentials = await getSharedFolderAuthenticationData(owner, RESOURCES_TOKEN);

    expect(credentials).toBeUndefined();
  });
});
