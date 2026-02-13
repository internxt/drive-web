import { renderHook } from '@testing-library/react';
import { describe, expect, vi, beforeEach, test, afterEach } from 'vitest';
import { useShareItemUserRoles } from './useShareItemUserRoles';
import shareService from 'app/share/services/share.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'services/error.service';
import { ItemToShare } from 'app/store/slices/storage/types';

const { mockDispatch, mockUseShareDialogContext, mockTranslate } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockUseShareDialogContext: vi.fn(),
  mockTranslate: vi.fn((key: string) => key),
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: mockTranslate }),
}));
vi.mock('../context/ShareDialogContextProvider', () => ({
  useShareDialogContext: mockUseShareDialogContext,
  ShareDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSharingMeta = {
  id: 'sharing-id-123',
  encryptedCode: 'encrypted-code',
  token: 'share-token',
  code: 'share-code',
};

const mockRoles = [
  { id: '1', name: 'OWNER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '2', name: 'EDITOR', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '3', name: 'READER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
];

const mockInvitedUsers = [
  {
    avatar: null,
    name: 'User',
    lastname: 'One',
    email: 'user1@example.com',
    roleName: 'editor' as const,
    uuid: 'user-uuid-1',
    sharingId: 'sharing-id-1',
  },
  {
    avatar: null,
    name: 'User',
    lastname: 'Two',
    email: 'user2@example.com',
    roleName: 'reader' as const,
    uuid: 'user-uuid-2',
    sharingId: 'sharing-id-2',
  },
];

const createItemToShare = (isFolder: boolean, uuid = 'item-uuid-123'): ItemToShare => ({
  item: {
    id: 1,
    uuid,
    name: 'Test Item',
    isFolder,
  } as any,
});

describe('Share Items User Roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShareDialogContext.mockReturnValue({
      state: {
        accessMode: 'restricted',
        roles: mockRoles,
        invitedUsers: mockInvitedUsers,
      },
      dispatch: mockDispatch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Change Item Access', () => {
    test('When restricted sharing is not available, then opens restricted sharing dialog', async () => {
      const updateSharingTypeSpy = vi.spyOn(shareService, 'updateSharingType');
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: false, itemToShare }));

      await result.current.changeAccess('public');

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SELECTED_USER_LIST_INDEX', payload: null }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_IS_RESTRICTED_SHARING_DIALOG_OPEN', payload: true }),
      );
      expect(updateSharingTypeSpy).not.toHaveBeenCalled();
    });

    test('When access mode is the same, then nothing happens', async () => {
      const updateSharingTypeSpy = vi.spyOn(shareService, 'updateSharingType');
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.changeAccess('restricted');

      expect(updateSharingTypeSpy).not.toHaveBeenCalled();
    });

    test('When changing to restricted mode for folder, then updates sharing type to private', async () => {
      mockUseShareDialogContext.mockReturnValue({
        state: {
          accessMode: 'public',
          roles: mockRoles,
          invitedUsers: mockInvitedUsers,
        },
        dispatch: mockDispatch,
      });
      const updateShareTypeSpy = vi.spyOn(shareService, 'updateSharingType').mockResolvedValue(undefined);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.changeAccess('restricted');

      expect(updateShareTypeSpy).toHaveBeenCalledWith('item-uuid-123', 'folder', 'private');
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_ACCESS_MODE', payload: 'restricted' }),
      );
    });

    test('When changing to public mode for file, then updates sharing type and creates public share', async () => {
      const mockShareInfo = { token: 'share-token', code: 'share-code' };
      const updateShareTypeSpy = vi.spyOn(shareService, 'updateSharingType').mockResolvedValue(undefined);
      const createPublicShareFromOwnerUserSpy = vi
        .spyOn(shareService, 'createPublicShareFromOwnerUser')
        .mockResolvedValue(mockShareInfo as any);

      const itemToShare = createItemToShare(false);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.changeAccess('public');

      expect(updateShareTypeSpy).toHaveBeenCalledWith('item-uuid-123', 'file', 'public');
      expect(createPublicShareFromOwnerUserSpy).toHaveBeenCalledWith('item-uuid-123', 'file');
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SHARING_META', payload: mockShareInfo }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_IS_PASSWORD_PROTECTED', payload: false }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_ACCESS_MODE', payload: 'public' }),
      );
    });

    test('When changing access mode sets loading states correctly', async () => {
      vi.spyOn(shareService, 'updateSharingType').mockResolvedValue(undefined);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.changeAccess('public');

      const calls = mockDispatch.mock.calls;
      expect(calls[1]).toEqual([expect.objectContaining({ type: 'SET_IS_LOADING', payload: true })]);
      expect(calls.at(-1)).toEqual([expect.objectContaining({ type: 'SET_IS_LOADING', payload: false })]);
    });

    test('When error occurs, then shows error notification and reports error', async () => {
      const error = new Error('Update failed');
      vi.spyOn(shareService, 'updateSharingType').mockRejectedValue(error);
      const reportErrorSpy = vi.spyOn(errorService, 'reportError').mockReturnValue(undefined);
      const showNotificationSpy = vi.spyOn(notificationsService, 'show');

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.changeAccess('public');

      expect(reportErrorSpy).toHaveBeenCalledWith(error);
      expect(showNotificationSpy).toHaveBeenCalledWith({
        text: 'modals.shareModal.errors.update-sharing-access',
        type: ToastType.Error,
      });
    });
  });

  describe('User Role Change Handler', () => {
    test('When changing user role successfully, then updates role in state', async () => {
      const updateUserRoleOfSharedFolderSpy = vi
        .spyOn(shareService, 'updateUserRoleOfSharedFolder')
        .mockResolvedValue(mockSharingMeta as any);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.handleUserRoleChange('user1@example.com', 'reader');

      expect(updateUserRoleOfSharedFolderSpy).toHaveBeenCalledWith({
        sharingId: 'sharing-id-1',
        newRoleId: '3',
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_INVITED_USERS',
          payload: [{ ...mockInvitedUsers[0], roleId: '3', roleName: 'reader' }, mockInvitedUsers[1]],
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_SELECTED_USER_LIST_INDEX', payload: null }),
      );
    });

    test('When user email is not found, then nothing happens', async () => {
      const itemToShare = createItemToShare(true);
      const updateUserRoleOfSharedFolderSpy = vi
        .spyOn(shareService, 'updateUserRoleOfSharedFolder')
        .mockResolvedValue(mockSharingMeta as any);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.handleUserRoleChange('unknown@example.com', 'reader');

      expect(updateUserRoleOfSharedFolderSpy).not.toHaveBeenCalled();
    });

    test('When role name is not found, then does not update role', async () => {
      const itemToShare = createItemToShare(true);
      const updateUserRoleOfSharedFolderSpy = vi
        .spyOn(shareService, 'updateUserRoleOfSharedFolder')
        .mockResolvedValue(mockSharingMeta as any);

      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.handleUserRoleChange('user1@example.com', 'ADMIN');

      expect(updateUserRoleOfSharedFolderSpy).not.toHaveBeenCalled();
    });

    test('When an error occurs, then shows error notification and reports the error', async () => {
      const error = new Error('Update role failed');
      const showNotificationServiceSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(shareService, 'updateUserRoleOfSharedFolder').mockRejectedValue(error);
      const reportErrorSpy = vi.spyOn(errorService, 'reportError').mockReturnValue(undefined);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemUserRoles({ isRestrictedSharingAvailable: true, itemToShare }));

      await result.current.handleUserRoleChange('user1@example.com', 'reader');

      expect(reportErrorSpy).toHaveBeenCalledWith(error);
      expect(showNotificationServiceSpy).toHaveBeenCalledWith({
        text: 'modals.shareModal.errors.updatingRole',
        type: ToastType.Error,
      });
    });
  });
});
