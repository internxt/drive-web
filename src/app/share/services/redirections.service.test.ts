import { createMemoryHistory, History } from 'history';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import navigationService from '../../core/services/navigation.service';
import workspacesService from '../../core/services/workspace.service';
import { AppView } from '../../core/types';

import { AxiosError } from 'axios';
import { handlePrivateSharedFolderAccess } from './redirections.service';
import shareService from './share.service';

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'shared.errors.folderNotExists': 'This folder not exists',
      'shared.errors.generic': 'The folder could not be accessed',
    };
    return translations[key] || key;
  }),
}));

vi.mock('../../core/services/navigation.service', () => ({
  default: {
    push: vi.fn(),
  },
}));

vi.mock('../../core/services/workspace.service', () => ({
  default: {
    getAllWorkspaceTeamSharedFolderFiles: vi.fn(),
  },
}));

vi.mock('./share.service', () => ({
  default: {
    getSharedFolderContent: vi.fn(),
  },
}));

describe('handlePrivateSharedFolderAccess', () => {
  let history: History;
  let navigateToFolder: Mock;
  let onError: Mock;
  const mockFolderUUID = 'test-folder-uuid';
  const mockWorkspaceId = 'test-workspace-id';
  const mockTeamId = 'test-team-id';

  const mockSharedFolderResponse = {
    name: 'Test Shared Folder',
    encryptionKey: 'test-encryption-key',
    bucket: 'test-bucket',
    token: 'test-token',
    credentials: { networkPass: 'password', networkUser: 'user' },
  };

  const expectedSharedFolderData = {
    plainName: 'Test Shared Folder',
    uuid: mockFolderUUID,
    isFolder: true,
    encryptionKey: 'test-encryption-key',
    credentials: { networkPass: 'password', networkUser: 'user' },
    bucket: 'test-bucket',
    token: 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    history = createMemoryHistory();
    navigateToFolder = vi.fn();
    onError = vi.fn();
  });

  describe('Successful access scenarios', () => {
    it('should successfully access private shared folder without workspace', async () => {
      (shareService.getSharedFolderContent as Mock).mockResolvedValue(mockSharedFolderResponse);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(shareService.getSharedFolderContent).toHaveBeenCalledWith(mockFolderUUID, 'folders', '', 0, 0);
      expect(navigateToFolder).toHaveBeenCalledWith(expectedSharedFolderData);
      expect(onError).not.toHaveBeenCalled();
      expect(navigationService.push).not.toHaveBeenCalled();
    });

    it('should successfully access private shared folder with workspace', async () => {
      const mockPromise = Promise.resolve(mockSharedFolderResponse);
      (workspacesService.getAllWorkspaceTeamSharedFolderFiles as Mock).mockReturnValue([mockPromise]);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: { workspaceId: mockWorkspaceId, teamId: mockTeamId },
      });

      expect(workspacesService.getAllWorkspaceTeamSharedFolderFiles).toHaveBeenCalledWith(
        mockWorkspaceId,
        mockFolderUUID,
        0,
        0,
      );
      expect(navigateToFolder).toHaveBeenCalledWith(expectedSharedFolderData);
      expect(onError).not.toHaveBeenCalled();
      expect(navigationService.push).not.toHaveBeenCalled();
    });
  });

  describe('Error scenarios', () => {
    it('should handle 403 error (access denied) and navigate to request access', async () => {
      const error403 = new AxiosError('Forbidden');
      error403.status = 403;
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(error403);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(navigationService.push).toHaveBeenCalledWith(AppView.RequestAccess, {
        folderuuid: mockFolderUUID,
      });
      expect(navigateToFolder).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle 404 error (folder not found) and show appropriate error', async () => {
      const error404 = new AxiosError('Not Found');
      error404.status = 404;
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(error404);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(navigationService.push).toHaveBeenCalledWith(AppView.Shared);
      expect(onError).toHaveBeenCalledWith('This folder not exists');
      expect(navigateToFolder).not.toHaveBeenCalled();
    });

    it('should handle generic error and show default error message', async () => {
      const genericError = new AxiosError('Server Error');
      genericError.status = 500;
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(genericError);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(navigationService.push).toHaveBeenCalledWith(AppView.Shared);
      expect(onError).toHaveBeenCalledWith('The folder could not be accessed');
      expect(navigateToFolder).not.toHaveBeenCalled();
    });

    it('should handle error without status code and show default error message', async () => {
      const errorWithoutStatus = new AxiosError('Unknown error');
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(errorWithoutStatus);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(navigationService.push).toHaveBeenCalledWith(AppView.Shared);
      expect(onError).toHaveBeenCalledWith('The folder could not be accessed');
      expect(navigateToFolder).not.toHaveBeenCalled();
    });

    it('should handle workspace generic error', async () => {
      const workspaceError = new AxiosError('Workspace Error');
      workspaceError.status = 500;
      const mockPromise = Promise.reject(workspaceError);
      (workspacesService.getAllWorkspaceTeamSharedFolderFiles as Mock).mockReturnValue([mockPromise]);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: { workspaceId: mockWorkspaceId },
      });

      expect(workspacesService.getAllWorkspaceTeamSharedFolderFiles).toHaveBeenCalledWith(
        mockWorkspaceId,
        mockFolderUUID,
        0,
        0,
      );
      expect(navigationService.push).toHaveBeenCalledWith(AppView.Shared);
      expect(onError).toHaveBeenCalledWith('The folder could not be accessed');
      expect(navigateToFolder).not.toHaveBeenCalled();
    });
  });

  describe('URL updates', () => {
    it('should update URL after successful access', async () => {
      history.push('/shared?folderuuid=valor');
      (shareService.getSharedFolderContent as Mock).mockResolvedValue(mockSharedFolderResponse);
      const replaceSpy = vi.spyOn(history, 'replace');

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(replaceSpy).toHaveBeenCalledWith('/shared');
    });

    it('should update URL after error (except 403)', async () => {
      history.push('/shared?folderuuid=valor');
      const error404 = new Error('Not Found');
      (error404 as any).status = 404;
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(error404);
      const replaceSpy = vi.spyOn(history, 'replace');

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(replaceSpy).toHaveBeenCalledWith('/shared');
    });

    it('should NOT update URL for 403 errors', async () => {
      history.push('/shared?folderuuid=valor&other=param');
      const error403 = new Error('Forbidden');
      (error403 as any).status = 403;
      (shareService.getSharedFolderContent as Mock).mockRejectedValue(error403);
      const replaceSpy = vi.spyOn(history, 'replace');

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it('should handle URL without folderuuid parameter', async () => {
      history.push('/shared');
      (shareService.getSharedFolderContent as Mock).mockResolvedValue(mockSharedFolderResponse);
      const replaceSpy = vi.spyOn(history, 'replace');

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: {},
      });

      expect(replaceSpy).toHaveBeenCalledWith('/shared');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined workspaceItemData', async () => {
      (shareService.getSharedFolderContent as Mock).mockResolvedValue(mockSharedFolderResponse);

      await handlePrivateSharedFolderAccess({
        folderUUID: mockFolderUUID,
        history,
        navigateToFolder,
        onError,
        workspaceItemData: undefined as any,
      });

      expect(shareService.getSharedFolderContent).toHaveBeenCalledWith(mockFolderUUID, 'folders', '', 0, 0);
      expect(navigateToFolder).toHaveBeenCalledWith(expectedSharedFolderData);
    });
  });
});
