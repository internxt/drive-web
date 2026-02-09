import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { SdkFactory } from './index';
import { LocalStorageService } from 'services/local-storage.service';
import { userThunks } from '../../../store/slices/user';
import { Workspace } from '../../types';
import { STORAGE_KEYS } from 'services/storage-keys';
import { Share, Users } from '@internxt/sdk/dist/drive';
import packageJson from '../../../../../package.json';
import { Auth } from '@internxt/sdk/dist/auth';
import { Location } from '@internxt/sdk';

const MOCKED_NEW_API = 'https://api.internxt.com';
const MOCKED_PAYMENTS = 'https://payments.internxt.com';
const MOCKED_LOCATION = 'https://location.internxt.com';

vi.mock('@internxt/sdk/dist/drive', () => ({
  Users: {
    client: vi.fn(),
  },
  Share: {
    client: vi.fn(),
  },
}));

vi.mock('@internxt/sdk/dist/auth', () => ({
  Auth: {
    client: vi.fn(),
  },
}));

vi.mock('@internxt/sdk', () => ({
  Location: {
    client: vi.fn(),
  },
}));

vi.mock('services/env.service', () => ({
  default: {
    getVariable: vi.fn((key: string) => {
      if (key === 'newApi') return MOCKED_NEW_API;
      if (key === 'payments') return MOCKED_PAYMENTS;
      if (key === 'location') return MOCKED_LOCATION;
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

    describe('Creating the user client', () => {
      test('When the user creates the client without captcha, then the app details are the defined by default', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createUsersClient();

        expect(Users.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
          },
          expect.any(Object),
        );
      });

      test('When the user creates the client with captcha, then the app details include the captcha header', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;
        const captchaToken = 'captcha-token-123';

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createUsersClient(captchaToken);

        expect(Users.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
            customHeaders: {
              'x-internxt-captcha': captchaToken,
            },
          },
          expect.any(Object),
        );
      });
    });

    describe('Creating the share client', () => {
      test('When the Share creates the client without captcha, then the app details are the defined by default', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createShareClient();

        expect(Share.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
          },
          expect.any(Object),
        );
      });

      test('When the Share creates the client with captcha, then the app details include the captcha header', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;
        const captchaToken = 'captcha-token-123';

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createShareClient(captchaToken);

        expect(Share.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
            customHeaders: {
              'x-internxt-captcha': captchaToken,
            },
          },
          expect.any(Object),
        );
      });
    });

    describe('Creating the auth client', () => {
      test('When the Auth creates the client without captcha, then the app details are the defined by default', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createAuthClient();

        expect(Auth.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
          },
          expect.any(Object),
        );
      });

      test('When the Auth creates the client with captcha, then the app details include the captcha header', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;
        const captchaToken = 'captcha-token-123';

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createAuthClient({ captchaToken });

        expect(Auth.client).toHaveBeenCalledWith(
          MOCKED_NEW_API,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
            customHeaders: {
              'x-internxt-captcha': captchaToken,
            },
          },
          expect.any(Object),
        );
      });
    });

    describe('Creating the location client', () => {
      test('When the Location client is created, then it uses the location API URL and default app details', () => {
        const mockToken = 'test-token';
        const mockWorkspace = Workspace.Individuals;

        vi.spyOn(mockLocalStorage, 'getWorkspace').mockReturnValue(mockWorkspace);
        vi.spyOn(mockLocalStorage, 'get').mockImplementation((key: string) => {
          if (key === 'xNewToken') return mockToken;
          return null;
        });

        const instance = SdkFactory.getNewApiInstance();
        instance.createLocationClient();

        expect(Location.client).toHaveBeenCalledWith(
          MOCKED_LOCATION,
          {
            clientName: packageJson.name,
            clientVersion: packageJson.version,
          },
          expect.any(Object),
        );
      });
    });
  });
});
