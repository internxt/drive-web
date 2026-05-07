import { renderHook, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, test } from 'vitest';
import { FOURTEEN_DAYS, useDownloadBackupKeys } from './useDownloadBackupKeys';
import { handleExportBackupKey } from 'utils';
import { localStorageService } from 'services';

const mockOpenDialog = vi.fn();
const mockCloseDialog = vi.fn();
const mockIsDialogOpen = vi.fn();

vi.mock('app/contexts/dialog-manager/useActionDialog', () => ({
  useActionDialog: () => ({
    openDialog: mockOpenDialog,
    closeDialog: mockCloseDialog,
    isDialogOpen: mockIsDialogOpen,
  }),
}));

vi.mock('utils', () => ({
  handleExportBackupKey: vi.fn(),
  generateCaptchaToken: vi.fn().mockResolvedValue('mocked-captcha-token'),
}));

const translate = vi.fn((key: string) => key);

describe('Download Backup Keys - Custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDialogOpen.mockReturnValue(false);
  });

  test('When the user has never seen the dialog, then the dialog opens', () => {
    vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

    const { result } = renderHook(() => useDownloadBackupKeys(translate));
    act(() => result.current.openBackupKeysDialog());

    expect(mockOpenDialog).toHaveBeenCalledOnce();
  });

  test('When the user already saved the backup key, then the dialog does not open', () => {
    vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: true, remindMeLater: null });

    const { result } = renderHook(() => useDownloadBackupKeys(translate));
    act(() => result.current.openBackupKeysDialog());

    expect(mockOpenDialog).not.toHaveBeenCalled();
  });

  describe('Remind me later', () => {
    test('When the user clicked remind me later less than 14 days ago, then the dialog does not open', () => {
      const recentDate = new Date(Date.now() - FOURTEEN_DAYS + 1000).toISOString();
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: recentDate });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.openBackupKeysDialog());

      expect(mockOpenDialog).not.toHaveBeenCalled();
    });

    test('When the user clicked remind me later more than 14 days ago, then the dialog opens again', () => {
      const expiredDate = new Date(Date.now() - FOURTEEN_DAYS - 1000).toISOString();
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: expiredDate });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.openBackupKeysDialog());

      expect(mockOpenDialog).toHaveBeenCalledOnce();
    });

    test('When the user clicks remind me later, then the current date is saved and the dialog closes', () => {
      const backupRemindLaterSpy = vi.spyOn(localStorageService, 'setBackupKeysRemindLater');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onRemindMeLaterButtonClicked());

      expect(backupRemindLaterSpy).toHaveBeenCalledOnce();
      expect(mockCloseDialog).toHaveBeenCalledOnce();
    });
  });

  describe('Download backup key saved', () => {
    test('When the user confirms the backup key is saved, then the saved flag is persisted and the dialog closes', () => {
      const backupSavedSpy = vi.spyOn(localStorageService, 'setBackupKeysAcknowledged');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(backupSavedSpy).toHaveBeenCalledOnce();
      expect(mockCloseDialog).toHaveBeenCalledOnce();
    });

    test('When the user confirms the backup key is saved and had a remind me later, then the remind me later entry is removed', () => {
      const removeItem = vi.spyOn(localStorageService, 'removeItem');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({
        saved: false,
        remindMeLater: new Date().toISOString(),
      });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(removeItem).toHaveBeenCalledOnce();
    });

    test('When the user confirms the backup key is saved without a previous remind me later, then the remind me later entry is not removed', () => {
      const removeItem = vi.spyOn(localStorageService, 'removeItem');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Downloading keys', () => {
    test('When the user clicks the download button, then the key download starts', () => {
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onDownloadBackupKeysButtonClicked());

      expect(handleExportBackupKey).toHaveBeenCalledWith(translate);
    });

    test('When the user clicks the download button, then the downloaded state is marked as true', () => {
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, remindMeLater: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onDownloadBackupKeysButtonClicked());

      expect(result.current.isDownloadedKeys).toBe(true);
    });
  });
});
