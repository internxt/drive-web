import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAccessRequests } from './useAccessRequests';
import { useAppDispatch } from 'app/store/hooks';
import shareService from 'app/share/services/share.service';
import { localStorageService, errorService } from 'services';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { aes, stringUtils } from '@internxt/lib';
import { sharedActions } from 'app/store/slices/sharedLinks';
import { getUser } from 'testUtils/fixtures/users.fixtures';
import { getCastedError } from 'testUtils/fixtures/drive.fixtures';

vi.mock('app/store/hooks', () => ({
  useAppDispatch: vi.fn(),
}));

vi.mock('i18next', () => ({
  t: (key: string) => key,
}));

vi.mock('app/share/services/share.service', () => ({
  default: {
    acceptSharedFolderInvite: vi.fn(),
    declineSharedFolderInvite: vi.fn(),
  },
}));

vi.mock('services', () => ({
  localStorageService: { getUser: vi.fn() },
  errorService: { castError: vi.fn() },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: vi.fn() },
  ToastType: { Error: 'error', Success: 'success' },
}));

vi.mock('@internxt/lib', () => ({
  aes: { encrypt: vi.fn() },
  stringUtils: { generateRandomStringUrlSafe: vi.fn() },
}));

vi.mock('app/store/slices/sharedLinks', () => ({
  sharedActions: { popAccessRequest: vi.fn() },
}));

describe('Access Requests - Custom Hook', () => {
  const mockDispatch = vi.fn();
  const mockPopAccessRequestAction = { type: 'shared/popAccessRequest', payload: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppDispatch).mockReturnValue(mockDispatch);
    vi.spyOn(sharedActions, 'popAccessRequest').mockReturnValue(mockPopAccessRequestAction as any);
  });

  describe('Accepting the access request', () => {
    it('When a user accepts a folder access request, then the mnemonic is encrypted and the invite is accepted with the correct payload', async () => {
      const invitationId = 'invite-111';
      const roleId = 'role-editor';
      const user = getUser();
      const randomCode = 'rnd8code';
      const encryptedMnemonic = 'encrypted-mnemonic-value';

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(user as any);
      const generateRandomStringSpy = vi.spyOn(stringUtils, 'generateRandomStringUrlSafe').mockReturnValue(randomCode);
      const aesEncryptSpy = vi.spyOn(aes, 'encrypt').mockReturnValue(encryptedMnemonic);
      const acceptSharedFolderInviteSpy = vi
        .spyOn(shareService, 'acceptSharedFolderInvite')
        .mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onAcceptAccessRequest(invitationId, { roleId });

      expect(generateRandomStringSpy).toHaveBeenCalledWith(8);
      expect(aesEncryptSpy).toHaveBeenCalledWith(user.mnemonic, randomCode);
      expect(acceptSharedFolderInviteSpy).toHaveBeenCalledWith({
        invitationId,
        acceptInvite: {
          encryptionKey: encryptedMnemonic,
          encryptionAlgorithm: 'inxt-v2',
          roleId,
        },
      });
    });

    it('When a folder access request is accepted successfully, then the invitation is removed from the pending list', async () => {
      const invitationId = 'invite-222';
      const roleId = 'role-viewer';

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(getUser() as any);
      vi.spyOn(stringUtils, 'generateRandomStringUrlSafe').mockReturnValue('abcd1234');
      vi.spyOn(aes, 'encrypt').mockReturnValue('enc-mnemonic');
      vi.spyOn(shareService, 'acceptSharedFolderInvite').mockResolvedValue(undefined as any);
      const popAccessRequestSpy = vi
        .spyOn(sharedActions, 'popAccessRequest')
        .mockReturnValue(mockPopAccessRequestAction as any);

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onAcceptAccessRequest(invitationId, { roleId });

      expect(popAccessRequestSpy).toHaveBeenCalledWith(invitationId);
      expect(mockDispatch).toHaveBeenCalledWith(mockPopAccessRequestAction);
    });

    it('When the share service rejects while accepting a request, then an error notification is displayed and the invitation is NOT removed from the list', async () => {
      const invitationId = 'invite-333';
      const roleId = 'role-owner';
      const networkError = new Error('Network failure');
      const castedError = getCastedError({ requestId: 'req-999' });

      vi.spyOn(localStorageService, 'getUser').mockReturnValue(getUser() as any);
      vi.spyOn(stringUtils, 'generateRandomStringUrlSafe').mockReturnValue('xy8zcode');
      vi.spyOn(aes, 'encrypt').mockReturnValue('enc-mnemonic');
      vi.spyOn(shareService, 'acceptSharedFolderInvite').mockRejectedValue(networkError);
      const castErrorSpy = vi.spyOn(errorService, 'castError').mockReturnValue(castedError as any);
      const notificationServiceSpy = vi.spyOn(notificationsService, 'show');
      const popAccessRequestSpy = vi
        .spyOn(sharedActions, 'popAccessRequest')
        .mockReturnValue(mockPopAccessRequestAction as any);

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onAcceptAccessRequest(invitationId, { roleId });

      expect(castErrorSpy).toHaveBeenCalledWith(networkError);
      expect(notificationServiceSpy).toHaveBeenCalledWith({
        text: 'notificationMessages.errorAcceptingAccessRequest',
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
      expect(popAccessRequestSpy).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Declining the access request', () => {
    it('When a user declines a folder access request, then the decline is sent to the share service with the correct invitation ID', async () => {
      const invitationId = 'invite-444';

      const declineSharedFolderInviteSpy = vi
        .spyOn(shareService, 'declineSharedFolderInvite')
        .mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onDeclineAccessRequest(invitationId);

      expect(declineSharedFolderInviteSpy).toHaveBeenCalledWith({ invitationId });
    });

    it('When a folder access request is declined successfully, then the invitation is removed from the pending list', async () => {
      const invitationId = 'invite-555';

      vi.spyOn(shareService, 'declineSharedFolderInvite').mockResolvedValue(undefined as any);
      const popAccessRequestSpy = vi
        .spyOn(sharedActions, 'popAccessRequest')
        .mockReturnValue(mockPopAccessRequestAction as any);

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onDeclineAccessRequest(invitationId);

      expect(popAccessRequestSpy).toHaveBeenCalledWith(invitationId);
      expect(mockDispatch).toHaveBeenCalledWith(mockPopAccessRequestAction);
    });

    it('When the share service rejects while declining a request, then an error notification is displayed and the invitation is NOT removed from the list', async () => {
      const invitationId = 'invite-666';
      const networkError = new Error('Service unavailable');
      const castedError = getCastedError({ requestId: 'req-777' });

      vi.spyOn(shareService, 'declineSharedFolderInvite').mockRejectedValue(networkError);
      const notificationServiceSpy = vi.spyOn(notificationsService, 'show');
      const castErrorSpy = vi.spyOn(errorService, 'castError').mockReturnValue(castedError as any);
      const popAccessRequestSpy = vi.spyOn(sharedActions, 'popAccessRequest');

      const { result } = renderHook(() => useAccessRequests());

      await result.current.onDeclineAccessRequest(invitationId);

      expect(castErrorSpy).toHaveBeenCalledWith(networkError);
      expect(notificationServiceSpy).toHaveBeenCalledWith({
        text: 'notificationMessages.errorDecliningAccessRequest',
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
      expect(popAccessRequestSpy).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
