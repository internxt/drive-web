import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { handleExportBackupKey, BackupData } from './backupKeyUtils';
import localStorageService from 'app/core/services/local-storage.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { saveAs } from 'file-saver';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'error',
    Success: 'success',
  },
}));

describe('backupKeyUtils', () => {
  const mockTranslate = vi.fn((key) => `Translated: ${key}`);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should export backup key successfully', () => {
    const mockMnemonic = 'test mnemonic';
    const mockUser = {
      privateKey: 'test-private-key',
      keys: {
        ecc: {
          privateKey: 'test-ecc-private-key',
        },
        kyber: {
          privateKey: 'test-kyber-private-key',
        },
      },
      userId: 'test-user-id',
      uuid: 'test-uuid',
      email: 'test@example.com',
      name: 'Test User',
      lastname: 'User',
      username: 'testuser',
      bridgeUser: 'test-bridge-user',
      bucket: 'test-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'test-root-folder-id',
      rootFolderUuid: 'test-root-folder-uuid',
      sharedWorkspace: false,
      credit: 0,
      publicKey: 'test-public-key',
      revocationKey: 'test-revocation-key',
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    } as UserSettings;

    vi.mocked(localStorageService.get).mockReturnValue(mockMnemonic);
    vi.mocked(localStorageService.getUser).mockReturnValue(mockUser);

    const expectedBackupData: BackupData = {
      mnemonic: mockMnemonic,
      privateKey: mockUser.privateKey,
      keys: {
        ecc: mockUser.keys?.ecc?.privateKey || '',
        kyber: mockUser.keys?.kyber?.privateKey || '',
      },
    };

    handleExportBackupKey(mockTranslate);

    expect(localStorageService.get).toHaveBeenCalledWith('xMnemonic');
    expect(localStorageService.getUser).toHaveBeenCalled();

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'INTERNXT-BACKUP-KEY.txt');

    const blobCall = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    expect(blobCall.type).toBe('text/plain');

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: mockTranslate('views.account.tabs.security.backupKey.success'),
      type: ToastType.Success,
    });
  });

  it('should handle missing mnemonic', () => {
    vi.mocked(localStorageService.get).mockReturnValue(null);
    vi.mocked(localStorageService.getUser).mockReturnValue({} as any);

    handleExportBackupKey(mockTranslate);

    expect(saveAs).not.toHaveBeenCalled();

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: mockTranslate('views.account.tabs.security.backupKey.error'),
      type: ToastType.Error,
    });
  });

  it('should handle missing user', () => {
    vi.mocked(localStorageService.get).mockReturnValue('test-mnemonic');
    vi.mocked(localStorageService.getUser).mockReturnValue(null);

    handleExportBackupKey(mockTranslate);

    expect(saveAs).not.toHaveBeenCalled();

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: mockTranslate('views.account.tabs.security.backupKey.error'),
      type: ToastType.Error,
    });
  });

  it('should handle missing key properties', () => {
    const mockMnemonic = 'test mnemonic';
    const mockUser = {
      privateKey: 'test-private-key',
      userId: 'test-user-id',
      uuid: 'test-uuid',
      email: 'test@example.com',
      name: 'Test User',
      lastname: 'User',
      username: 'testuser',
      bridgeUser: 'test-bridge-user',
      bucket: 'test-bucket',
      backupsBucket: null,
      root_folder_id: 0,
      rootFolderId: 'test-root-folder-id',
      rootFolderUuid: 'test-root-folder-uuid',
      sharedWorkspace: false,
      credit: 0,
      publicKey: 'test-public-key',
      revocationKey: 'test-revocation-key',
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    } as UserSettings;

    vi.mocked(localStorageService.get).mockReturnValue(mockMnemonic);
    vi.mocked(localStorageService.getUser).mockReturnValue(mockUser);

    handleExportBackupKey(mockTranslate);

    expect(saveAs).toHaveBeenCalled();

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: mockTranslate('views.account.tabs.security.backupKey.success'),
      type: ToastType.Success,
    });
  });
});
