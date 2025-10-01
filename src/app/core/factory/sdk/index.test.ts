/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SdkFactory } from './index';
import { LocalStorageService } from '../../services/local-storage.service';
import { userThunks } from '../../../store/slices/user';
import { Workspace } from '../../types';
import { STORAGE_KEYS } from '../../services/storage-keys';

vi.mock('app/core/services/env.service', () => ({
  default: {
    getVariable: vi.fn((key: string) => {
      if (key === 'newApi') return 'https://api.internxt.com';
      if (key === 'payments') return 'https://payments.internxt.com';
      return '';
    }),
  },
}));

vi.mock('../../../store/slices/user', () => ({
  userThunks: {
    logoutThunk: vi.fn(),
  },
}));

describe('SdkFactory', () => {
  let mockDispatch: any;
  let mockLocalStorage: LocalStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn();
    mockLocalStorage = {
      get: vi.fn(),
      getWorkspace: vi.fn(),
    } as any;

    SdkFactory.initialize(mockDispatch, mockLocalStorage);
  });

  describe('getNewApiSecurity', () => {
    it('should return ApiSecurity with token and default unauthorized callback', () => {
      const mockToken = 'test-token';
      const mockWorkspace = Workspace.Individuals;

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockToken;
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      expect(apiSecurity.token).toBe(mockToken);
      expect(apiSecurity.workspaceToken).toBeUndefined();
      expect(apiSecurity.unauthorizedCallback).toBeDefined();
    });

    it('should use custom unauthorized callback when provided', () => {
      const mockToken = 'test-token';
      const mockWorkspace = Workspace.Individuals;
      const customCallback = vi.fn();

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockToken;
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity(customCallback);

      expect(apiSecurity.unauthorizedCallback).toBe(customCallback);
    });

    it('should include workspace token when workspace credentials exist', () => {
      const mockToken = 'test-token';
      const mockWorkspaceToken = 'workspace-token';
      const mockWorkspace = Workspace.Individuals;
      const mockWorkspaceId = 'workspace-123';
      const mockCredentials = {
        tokenHeader: mockWorkspaceToken,
      };

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockToken;
        if (key === STORAGE_KEYS.B2B_WORKSPACE) return mockWorkspaceId;
        if (key === STORAGE_KEYS.WORKSPACE_CREDENTIALS) return JSON.stringify(mockCredentials);
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      expect(apiSecurity.token).toBe(mockToken);
      expect(apiSecurity.workspaceToken).toBe(mockWorkspaceToken);
    });

    it('should call default unauthorized callback and dispatch logout', async () => {
      const mockToken = 'test-token';
      const mockWorkspace = Workspace.Individuals;

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockToken;
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      await apiSecurity.unauthorizedCallback();

      expect(mockDispatch).toHaveBeenCalledWith(userThunks.logoutThunk());
    });

    it('should return token for Business workspace', () => {
      const mockToken = 'team-token';
      const mockWorkspace = Workspace.Business;

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xTokenTeam') return mockToken;
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      expect(apiSecurity.token).toBe(mockToken);
    });

    it('should return empty string when no token exists', () => {
      const mockWorkspace = Workspace.Individuals;

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockReturnValue(null);

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      expect(apiSecurity.token).toBe('');
    });

    it('should handle workspace token when workspace credentials is null', () => {
      const mockToken = 'test-token';
      const mockWorkspace = Workspace.Individuals;
      const mockWorkspaceId = 'workspace-123';

      vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
      vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
        if (key === 'xNewToken') return mockToken;
        if (key === STORAGE_KEYS.B2B_WORKSPACE) return mockWorkspaceId;
        if (key === STORAGE_KEYS.WORKSPACE_CREDENTIALS) return null;
        return null;
      });

      const instance = SdkFactory.getNewApiInstance();
      const apiSecurity = (instance as any).getNewApiSecurity();

      expect(apiSecurity.token).toBe(mockToken);
      expect(apiSecurity.workspaceToken).toBeUndefined();
    });
  });
});
