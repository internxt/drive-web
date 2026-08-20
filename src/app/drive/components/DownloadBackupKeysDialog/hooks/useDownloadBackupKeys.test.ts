import { renderHook, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, test } from 'vitest';
import { THIRTY_DAYS, useDownloadBackupKeys } from './useDownloadBackupKeys';
import { handleExportBackupKey } from 'utils';
import { localStorageService } from 'services';
import dayjs from 'dayjs';

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

  test('When the user has never seen the dialog, then seenAt is saved and the dialog does not open', () => {
    const setBackupKeysSeenAtSpy = vi.spyOn(localStorageService, 'setBackupKeysSeenAt');
    vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

    const { result } = renderHook(() => useDownloadBackupKeys(translate));
    act(() => result.current.openBackupKeysDialog());

    expect(setBackupKeysSeenAtSpy).toHaveBeenCalledOnce();
    expect(mockOpenDialog).not.toHaveBeenCalled();
  });

  test('When the user already saved the backup key, then the dialog does not open', () => {
    vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: true, seenAt: null });

    const { result } = renderHook(() => useDownloadBackupKeys(translate));
    act(() => result.current.openBackupKeysDialog());

    expect(mockOpenDialog).not.toHaveBeenCalled();
  });

  describe('30-day cycle', () => {
    test('When seenAt is less than 30 days ago, then the dialog does not open', () => {
      const recentDate = dayjs()
        .subtract(THIRTY_DAYS - 1, 'day')
        .toISOString();
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: recentDate });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.openBackupKeysDialog());

      expect(mockOpenDialog).not.toHaveBeenCalled();
    });

    test('When seenAt is 30 or more days ago, then the dialog opens and seenAt is renewed', () => {
      const setBackupKeysSeenAtSpy = vi.spyOn(localStorageService, 'setBackupKeysSeenAt');
      const expiredDate = dayjs().subtract(THIRTY_DAYS, 'day').toISOString();
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: expiredDate });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.openBackupKeysDialog());

      expect(setBackupKeysSeenAtSpy).toHaveBeenCalledOnce();
      expect(mockOpenDialog).toHaveBeenCalledOnce();
    });

    test('When the user clicks remind me later, then seenAt is renewed and the dialog closes', () => {
      const setBackupKeysSeenAtSpy = vi.spyOn(localStorageService, 'setBackupKeysSeenAt');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onRemindMeLaterButtonClicked());

      expect(setBackupKeysSeenAtSpy).toHaveBeenCalledOnce();
      expect(mockCloseDialog).toHaveBeenCalledOnce();
    });
  });

  describe('Download backup key saved', () => {
    test('When the user confirms the backup key is saved, then the saved flag is persisted and the dialog closes', () => {
      const backupSavedSpy = vi.spyOn(localStorageService, 'setBackupKeysAcknowledged');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(backupSavedSpy).toHaveBeenCalledOnce();
      expect(mockCloseDialog).toHaveBeenCalledOnce();
    });

    test('When the user confirms the backup key is saved and had a seenAt, then the seenAt entry is removed', () => {
      const removeBackupKeysSeenAt = vi.spyOn(localStorageService, 'removeBackupKeysSeenAt');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({
        saved: false,
        seenAt: dayjs().toISOString(),
      });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(removeBackupKeysSeenAt).toHaveBeenCalledOnce();
    });

    test('When the user confirms the backup key is saved without a previous seenAt, then the seenAt entry is not removed', () => {
      const removeBackupKeysSeenAt = vi.spyOn(localStorageService, 'removeBackupKeysSeenAt');
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onBackupSavedButtonClicked());

      expect(removeBackupKeysSeenAt).not.toHaveBeenCalled();
    });
  });

  describe('Downloading keys', () => {
    test('When the user clicks the download button, then the key download starts', () => {
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onDownloadBackupKeysButtonClicked());

      expect(handleExportBackupKey).toHaveBeenCalledWith(translate);
    });

    test('When the user clicks the download button, then the downloaded state is marked as true', () => {
      vi.spyOn(localStorageService, 'getBackupKeys').mockReturnValue({ saved: false, seenAt: null });

      const { result } = renderHook(() => useDownloadBackupKeys(translate));
      act(() => result.current.onDownloadBackupKeysButtonClicked());

      expect(result.current.isDownloadedKeys).toBe(true);
    });
  });
});
