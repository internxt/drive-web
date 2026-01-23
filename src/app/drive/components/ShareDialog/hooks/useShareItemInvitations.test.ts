import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, test, afterEach } from 'vitest';
import { useShareItemInvitations } from './useShareItemInvitations';
import shareService from 'app/share/services/share.service';
import * as utils from '../utils';
import { ItemToShare } from 'app/store/slices/storage/types';

const { mockDispatch, mockUseShareDialogContext } = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockUseShareDialogContext: vi.fn(),
}));

vi.mock('../utils');
vi.mock('../context/ShareDialogContextProvider', () => ({
  useShareDialogContext: mockUseShareDialogContext,
  ShareDialogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Share item Invitations', () => {
  const mockRoles = [
    { id: '1', name: 'OWNER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    { id: '2', name: 'EDITOR', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
    { id: '3', name: 'READER', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  ];

  const mockOwnerData = {
    avatar: null,
    name: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    uuid: 'user-uuid-123',
    sharingId: '',
    role: {
      id: 'NONE',
      name: 'OWNER',
      createdAt: '',
      updatedAt: '',
    },
  };

  const mockUsers = [
    {
      email: 'user1@example.com',
      role: { id: '2', name: 'EDITOR' },
      name: 'User',
      lastname: 'One',
    },
    {
      email: 'user2@example.com',
      role: { id: '3', name: 'READER' },
      name: 'User',
      lastname: 'Two',
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShareDialogContext.mockReturnValue({
      state: { roles: mockRoles },
      dispatch: mockDispatch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inviting a user', () => {
    test('When the user wants to share an item, then the invite modal is opened', () => {
      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: true }));

      result.current.onInviteUser();

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: 'invite' }));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: null }));
    });
  });

  describe('Get and update invited users', () => {
    test('When there is no item, then does not fetch users', async () => {
      const getUsersOfSharedFolderSpy = vi.spyOn(shareService, 'getUsersOfSharedFolder');
      const { result } = renderHook(() =>
        useShareItemInvitations({ itemToShare: { item: undefined } as any, isUserOwner: true }),
      );

      await result.current.getAndUpdateInvitedUsers();

      expect(getUsersOfSharedFolderSpy).not.toHaveBeenCalled();
    });

    test('When the item is a folder, then fetches users with folder type', async () => {
      const getUSerOfSharedFolderSpy = vi
        .spyOn(shareService, 'getUsersOfSharedFolder')
        .mockResolvedValue({ users: mockUsers } as any);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: true }));

      await result.current.getAndUpdateInvitedUsers();

      expect(getUSerOfSharedFolderSpy).toHaveBeenCalledWith({
        itemType: 'folder',
        folderId: 'item-uuid-123',
      });
    });

    test('When the item is a file, then fetches users with file type', async () => {
      const getUSerOfSharedFolderSpy = vi
        .spyOn(shareService, 'getUsersOfSharedFolder')
        .mockResolvedValue({ users: mockUsers } as any);

      const itemToShare = createItemToShare(false);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: true }));

      await result.current.getAndUpdateInvitedUsers();

      expect(getUSerOfSharedFolderSpy).toHaveBeenCalledWith({
        itemType: 'file',
        folderId: 'item-uuid-123',
      });
    });

    it('When users are fetched successfully, then updates invited users with roleName', async () => {
      vi.spyOn(shareService, 'getUsersOfSharedFolder').mockResolvedValue({ users: mockUsers } as any);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: true }));

      await result.current.getAndUpdateInvitedUsers();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: [
            { ...mockUsers[0], roleName: 'editor' },
            { ...mockUsers[1], roleName: 'reader' },
          ],
        }),
      );
    });

    test('When an error occurs and user is owner, then sets owner data as invited user', async () => {
      const unexpectedError = new Error('No users found');
      vi.spyOn(shareService, 'getUsersOfSharedFolder').mockRejectedValue(unexpectedError);
      vi.mocked(utils.getLocalUserData).mockReturnValue(mockOwnerData);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: true }));

      await result.current.getAndUpdateInvitedUsers();

      expect(utils.getLocalUserData).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: [{ ...mockOwnerData, roleName: 'owner' }],
        }),
      );
    });

    test('When an error occurs and user is not owner, then nothing happens', async () => {
      const unexpectedError = new Error('No users found');
      vi.spyOn(shareService, 'getUsersOfSharedFolder').mockRejectedValue(unexpectedError);

      const itemToShare = createItemToShare(true);
      const { result } = renderHook(() => useShareItemInvitations({ itemToShare, isUserOwner: false }));

      await result.current.getAndUpdateInvitedUsers();

      expect(utils.getLocalUserData).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
