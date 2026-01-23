import { renderHook } from '@testing-library/react';
import { describe, expect, vi, beforeEach, test } from 'vitest';
import { useShareItemActions } from './useShareItemActions';
import shareService from 'app/share/services/share.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';
import { ItemToShare } from 'app/store/slices/storage/types';
import envService from 'services/env.service';
import { copyTextToClipboard } from 'utils/copyToClipboard.utils';

const { mockActionDispatch, mockUseShareDialogContext, mockTranslate, mockDispatch } = vi.hoisted(() => ({
  mockActionDispatch: vi.fn(),
  mockUseShareDialogContext: vi.fn(),
  mockTranslate: vi.fn((key: string) => key),
  mockDispatch: vi.fn(),
}));

vi.mock('utils/copyToClipboard.utils');
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: mockTranslate }),
}));
vi.mock('../context/ShareDialogContextProvider', () => ({
  useShareDialogContext: mockUseShareDialogContext,
  ShareDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('app/store/slices/sharedLinks', () => ({
  default: () => ({}),
  sharedThunks: {
    stopSharingItem: vi.fn(),
    removeUserFromSharedFolder: vi.fn(),
  },
  sharedActions: {},
}));

const createItemToShare = (isFolder: boolean, uuid = 'item-uuid-123'): ItemToShare => ({
  item: {
    id: 1,
    uuid,
    name: 'Test Item',
    isFolder,
  } as any,
});

describe('Share Item Actions', () => {
  const mockOnClose = vi.fn();
  const mockOnShareItem = vi.fn();
  const mockOnStopSharingItem = vi.fn();

  const mockSharingMeta = {
    id: 'sharing-id-123',
    encryptedCode: 'encrypted-code',
    token: 'share-token',
    code: 'share-code',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShareDialogContext.mockReturnValue({
      state: {
        accessMode: 'restricted',
        sharingMeta: null,
        isPasswordProtected: false,
      },
      dispatch: mockActionDispatch,
    });
    vi.spyOn(envService, 'getVariable').mockReturnValue('https://example.com');
  });

  describe('Get Private Share Link', () => {
    test('When copying private share link successfully, then shows success notification', async () => {
      const mockedCopyToClipboard = vi.mocked(copyTextToClipboard);
      const showNotificationSpy = vi.spyOn(notificationsService, 'show');

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.getPrivateShareLink();

      expect(mockedCopyToClipboard).toHaveBeenCalledWith('https://example.com/shared/?folderuuid=item-uuid-123');
      expect(showNotificationSpy).toHaveBeenCalledWith({
        text: 'shared-links.toast.copy-to-clipboard',
        type: ToastType.Success,
      });
    });

    test('When copying private share link fails, then shows error notification', async () => {
      vi.mocked(copyTextToClipboard).mockRejectedValue(new Error());
      const showNotificationSpy = vi.spyOn(notificationsService, 'show');

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.getPrivateShareLink();

      expect(showNotificationSpy).toHaveBeenCalledWith({
        text: 'modals.shareModal.errors.copy-to-clipboard',
        type: ToastType.Error,
      });
    });
  });

  describe('Copy Link', () => {
    test('When access mode is restricted, then copies private share link', async () => {
      const mockedCopyToClipboard = vi.mocked(copyTextToClipboard);
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onCopyLink();

      expect(mockedCopyToClipboard).toHaveBeenCalled();
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: null }));
    });

    test('When access mode is public, then gets public share link', async () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          sharingMeta: null,
          isPasswordProtected: false,
        },
        dispatch: mockActionDispatch,
      });
      const getPublicShareLinkSpy = vi
        .spyOn(shareService, 'getPublicShareLink')
        .mockResolvedValue(mockSharingMeta as any);

      const itemToShare = createItemToShare(false);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
          onShareItem: mockOnShareItem,
        }),
      );

      await result.current.onCopyLink();

      expect(getPublicShareLinkSpy).toHaveBeenCalledWith('item-uuid-123', 'file', undefined);
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: mockSharingMeta }));
      expect(mockOnShareItem).toHaveBeenCalled();
    });
  });

  describe('Password Checkbox Change', () => {
    test('When password sharing is not available, then opens restricted password dialog', () => {
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: false,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      result.current.onPasswordCheckboxChange();

      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
    });

    test('When password is already protected, then opens password disable dialog', () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          sharingMeta: mockSharingMeta,
          isPasswordProtected: true,
        },
        dispatch: mockActionDispatch,
      });

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      result.current.onPasswordCheckboxChange();

      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
    });

    test('When password is not protected, then opens password input', () => {
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      result.current.onPasswordCheckboxChange();

      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
    });
  });

  describe('Save Public Share Password', () => {
    test('When sharing info exists, then saves password', async () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          sharingMeta: mockSharingMeta,
          isPasswordProtected: false,
        },
        dispatch: mockActionDispatch,
      });
      const saveSharingPasswordSpy = vi
        .spyOn(shareService, 'saveSharingPassword')
        .mockResolvedValue(mockSharingMeta as any);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
          onShareItem: mockOnShareItem,
        }),
      );

      await result.current.onSavePublicSharePassword('my-password');

      expect(saveSharingPasswordSpy).toHaveBeenCalledWith('sharing-id-123', 'my-password', 'encrypted-code');
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
      expect(mockOnShareItem).toHaveBeenCalled();
    });

    test('When sharing info does not exist, then creates new public share with password', async () => {
      const createPublicShareFromOwnerUserSpy = vi
        .spyOn(shareService, 'createPublicShareFromOwnerUser')
        .mockResolvedValue(mockSharingMeta as any);

      const itemToShare = createItemToShare(false);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
          onShareItem: mockOnShareItem,
        }),
      );

      await result.current.onSavePublicSharePassword('my-password');

      expect(createPublicShareFromOwnerUserSpy).toHaveBeenCalledWith('item-uuid-123', 'file', 'my-password');
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: mockSharingMeta }));
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
    });

    test('When error occurs, then casts error and closes password input', async () => {
      const error = new Error('Save password failed');
      vi.spyOn(shareService, 'createPublicShareFromOwnerUser').mockRejectedValue(error);
      const castErrorSpy = vi.spyOn(errorService, 'castError');

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onSavePublicSharePassword('my-password');

      expect(castErrorSpy).toHaveBeenCalledWith(error);
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
    });
  });

  describe('Disable Password', () => {
    test('When disabling password successfully, then removes password protection', async () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          sharingMeta: mockSharingMeta,
          isPasswordProtected: true,
        },
        dispatch: mockActionDispatch,
      });
      const removeSharingPasswordSpy = vi.spyOn(shareService, 'removeSharingPassword').mockResolvedValue(undefined);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onDisablePassword();

      expect(removeSharingPasswordSpy).toHaveBeenCalledWith('sharing-id-123');
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
    });

    test('When error occurs, then casts error and closes dialog', async () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          sharingMeta: mockSharingMeta,
          isPasswordProtected: true,
        },
        dispatch: mockActionDispatch,
      });
      const error = new Error('Remove password failed');
      vi.spyOn(shareService, 'removeSharingPassword').mockRejectedValue(error);
      const castErrorSpy = vi.spyOn(errorService, 'castError');

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onDisablePassword();

      expect(castErrorSpy).toHaveBeenCalledWith(error);
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
    });
  });

  describe('Stop Sharing', () => {
    test('When stopping sharing, then dispatches thunk and closes dialog', async () => {
      mockDispatch.mockResolvedValue({ payload: true });

      const itemToShare = createItemToShare(true, 'folder-uuid-456');
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
          onShareItem: mockOnShareItem,
          onStopSharingItem: mockOnStopSharingItem,
        }),
      );

      await result.current.onStopSharing();

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockOnShareItem).toHaveBeenCalled();
      expect(mockOnStopSharingItem).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Remove User', () => {
    test('When removing user successfully, then removes user from state', async () => {
      mockDispatch.mockResolvedValue({ payload: true });

      const user = {
        avatar: null,
        name: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        roleName: 'editor' as const,
        uuid: 'user-uuid-123',
        sharingId: 'sharing-id-456',
      };

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onRemoveUser(user);

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockActionDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: 'user-uuid-123' }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('When user removal fails, then still closes dialog', async () => {
      mockDispatch.mockResolvedValue({ payload: false });

      const user = {
        avatar: null,
        name: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        roleName: 'editor' as const,
        uuid: 'user-uuid-123',
        sharingId: 'sharing-id-456',
      };

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() =>
        useShareItemActions({
          itemToShare,
          isPasswordSharingAvailable: true,
          dispatch: mockDispatch,
          onClose: mockOnClose,
        }),
      );

      await result.current.onRemoveUser(user);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
