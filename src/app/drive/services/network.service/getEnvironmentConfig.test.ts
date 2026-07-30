import { describe, expect, test, vi, beforeEach } from 'vitest';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getEnvironmentConfig } from './getEnvironmentConfig';
import localStorageService from 'services/local-storage.service';
import envService from 'services/env.service';
import encryptedStorageService from 'services/encrypted-storage.service';

vi.mock('services/local-storage.service', () => ({
  default: {
    getUser: vi.fn(),
  },
}));

vi.mock('services/encrypted-storage.service', () => ({
  default: {
    getB2BWorkspaceMnemonic: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));

vi.mock('services/env.service', () => ({
  default: {
    getVariable: vi.fn(),
  },
}));

const mockedLocalStorage = vi.mocked(localStorageService);
const mockedEncryptedStorage = vi.mocked(encryptedStorageService);
const mockedEnvService = vi.mocked(envService);

const createMockUser = (overrides: Partial<UserSettings> = {}): UserSettings =>
  ({
    bridgeUser: 'user@internxt.com',
    userId: 'user-id-123',
    mnemonic: 'personal-mnemonic',
    bucket: 'personal-bucket',
    ...overrides,
  }) as UserSettings;

const createMockWorkspaceCredentials = () =>
  ({
    credentials: {
      networkUser: 'workspace-user',
      networkPass: 'workspace-pass',
    },
    bucket: 'workspace-bucket',
  }) as any;

const createMockWorkspaceMnemonic = () => 'workspace-key';

describe('Get Environment Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Personal account context', () => {
    test('When the user is not in a workspace, then the personal credentials are returned', async () => {
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(false);

      expect(result).toEqual({
        bridgeUser: 'user@internxt.com',
        bridgePass: 'user-id-123',
        encryptionKey: 'personal-mnemonic',
        bucketId: 'personal-bucket',
        useProxy: true,
      });
    });

    test('When the workspace flag is not provided, then the personal credentials are returned by default', async () => {
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig();

      expect(result.bridgeUser).toBe('user@internxt.com');
      expect(result.bucketId).toBe('personal-bucket');
    });

    test('When the user requests workspace context but no workspace credentials are stored, then the personal credentials are returned', async () => {
      mockedEncryptedStorage.getWorkspaceCredentials.mockReturnValue(null);
      mockedEncryptedStorage.getB2BWorkspaceMnemonic.mockResolvedValue(createMockWorkspaceMnemonic());
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(true);

      expect(result.bridgeUser).toBe('user@internxt.com');
      expect(result.encryptionKey).toBe('personal-mnemonic');
    });

    test('When the user requests workspace context but no workspace data is stored, then the personal credentials are returned', async () => {
      mockedEncryptedStorage.getWorkspaceCredentials.mockReturnValue(createMockWorkspaceCredentials());
      mockedEncryptedStorage.getB2BWorkspaceMnemonic.mockResolvedValue(null);
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(true);

      expect(result.bridgeUser).toBe('user@internxt.com');
      expect(result.encryptionKey).toBe('personal-mnemonic');
    });
  });

  describe('Workspace account context', () => {
    test('When the user is in a workspace, then the workspace credentials are returned', async () => {
      mockedEncryptedStorage.getWorkspaceCredentials.mockReturnValue(createMockWorkspaceCredentials());
      mockedEncryptedStorage.getB2BWorkspaceMnemonic.mockResolvedValueOnce(createMockWorkspaceMnemonic());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(true);

      expect(result).toEqual({
        bridgeUser: 'workspace-user',
        bridgePass: 'workspace-pass',
        encryptionKey: 'workspace-key',
        bucketId: 'workspace-bucket',
        useProxy: true,
      });
    });

    test('When the user is in a workspace, then the workspace encryption key is used instead of the personal one', async () => {
      mockedEncryptedStorage.getWorkspaceCredentials.mockReturnValue(createMockWorkspaceCredentials());
      mockedEncryptedStorage.getB2BWorkspaceMnemonic.mockResolvedValue(createMockWorkspaceMnemonic());
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(true);

      expect(result.encryptionKey).toBe('workspace-key');
      expect(result.encryptionKey).not.toBe('personal-mnemonic');
    });
  });

  describe('Proxy usage', () => {
    test('When proxy usage is enabled in the environment, then the proxy flag is true', async () => {
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('false');

      const result = await getEnvironmentConfig(false);

      expect(result.useProxy).toBe(true);
    });

    test('When proxy usage is disabled in the environment, then the proxy flag is false', async () => {
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('true');

      const result = await getEnvironmentConfig(false);

      expect(result.useProxy).toBe(false);
    });

    test('When the proxy setting is not configured in the environment, then the proxy is used by default', async () => {
      mockedLocalStorage.getUser.mockReturnValue(createMockUser());
      mockedEnvService.getVariable.mockReturnValue('');

      const result = await getEnvironmentConfig(false);

      expect(result.useProxy).toBe(true);
    });
  });
});
