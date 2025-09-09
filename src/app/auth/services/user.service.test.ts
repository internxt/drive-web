import localStorageService from 'app/core/services/local-storage.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userService from './user.service';

const testToken = 'testToken';
const testEmail = 'test@initnxt.com';

const usersClientMock = {
  getUserData: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserAvatar: vi.fn(),
  sendVerificationEmail: vi.fn(),
  getPublicKeyByEmail: vi.fn(),
  preRegister: vi.fn(),
  changeUserEmail: vi.fn(),
  verifyEmailChange: vi.fn(),
  checkChangeEmailExpiration: vi.fn(),
  getPublicKeyWithPrecreation: vi.fn(),
};

const authClientMock = {
  sendUserDeactivationEmail: vi.fn(),
};

vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createDesktopAuthClient: vi.fn(() => ({
        login: vi.fn(),
      })),
      createAuthClient: vi.fn(() => authClientMock),
      createUsersClient: vi.fn(() => usersClientMock),
    })),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(localStorageService, 'get').mockReturnValue(testToken);
  });

  it('should send a deactivation email', async () => {
    authClientMock.sendUserDeactivationEmail.mockResolvedValue({ success: true });
    const result = await userService.sendDeactivationEmail();
    expect(result).toEqual({ success: true });
    expect(authClientMock.sendUserDeactivationEmail).toHaveBeenCalledWith(testToken);
  });

  it('should pre-create user', async () => {
    usersClientMock.preRegister.mockResolvedValue('mockPreCreate');
    const response = await userService.preCreateUser(testEmail);
    expect(response).toBe('mockPreCreate');
  });

  it('should update user profile', async () => {
    usersClientMock.updateUserProfile.mockResolvedValue({ success: true });
    await userService.updateUserProfile({
      name: 'New Name',
      lastname: 'New Lastname',
    });
    expect(usersClientMock.updateUserProfile).toHaveBeenCalledWith(
      { name: 'New Name', lastname: 'New Lastname' },
      testToken,
    );
  });

  it('should delete user avatar', async () => {
    usersClientMock.deleteUserAvatar.mockResolvedValue({ success: true });
    await userService.deleteUserAvatar();
    expect(usersClientMock.deleteUserAvatar).toHaveBeenCalledWith(testToken);
  });

  it('should send a verification email', async () => {
    usersClientMock.sendVerificationEmail.mockResolvedValue({ success: true });
    await userService.sendVerificationEmail();
    expect(usersClientMock.sendVerificationEmail).toHaveBeenCalled();
  });

  it('should get public key by email', async () => {
    usersClientMock.getPublicKeyByEmail.mockResolvedValue({ publicKey: 'key' });
    const result = await userService.getPublicKeyByEmail(testEmail);
    expect(result).toEqual({ publicKey: 'key' });
    expect(usersClientMock.getPublicKeyByEmail).toHaveBeenCalledWith({ email: testEmail });
  });

  it('should change email', async () => {
    await userService.changeEmail('newtest@inxt.com');
    expect(usersClientMock.changeUserEmail).toHaveBeenCalledWith('newtest@inxt.com');
  });

  it('should verify email change', async () => {
    usersClientMock.verifyEmailChange.mockResolvedValue('mockVerifyResponse');
    const response = await userService.verifyEmailChange('verifyToken');
    expect(response).toBe('mockVerifyResponse');
  });

  it('should check change email link expiration', async () => {
    usersClientMock.checkChangeEmailExpiration.mockResolvedValue('mockExpirationResponse');
    const response = await userService.checkChangeEmailLinkExpiration('verifyToken');
    expect(response).toBe('mockExpirationResponse');
  });

  it('should download the avatar', async () => {
    const downloadAvatarSpy = vi.spyOn(userService, 'downloadAvatar');
    const abortController = new AbortController();

    await userService.downloadAvatar('testSrcURL', abortController.signal);

    expect(downloadAvatarSpy).toHaveBeenCalledWith('testSrcURL', expect.any(AbortSignal));
  });

  it('should get public key with precreation with given email', async () => {
    const mockResponse = {
      publicKey: 'key123',
      publicKyberKey: 'kyberKey456',
    };
    usersClientMock.getPublicKeyWithPrecreation.mockResolvedValue(mockResponse);

    const result = await userService.getPublicKeyWithPrecreation(testEmail);

    expect(result).toEqual(mockResponse);
    expect(usersClientMock.getPublicKeyWithPrecreation).toHaveBeenCalledWith({ email: testEmail });
  });

  it('should check avatar URL working', async () => {
    const checkAvatarUrlWorkingSpy = vi.spyOn(userService, 'checkAvatarUrlWorking');

    await userService.checkAvatarUrlWorking('testAvatarUrl');

    expect(checkAvatarUrlWorkingSpy).toHaveBeenCalledWith('testAvatarUrl');
  });

  it('should check avatar URL working with null', async () => {
    const checkAvatarUrlWorkingSpy = vi.spyOn(userService, 'checkAvatarUrlWorking');

    await userService.checkAvatarUrlWorking(null);

    expect(checkAvatarUrlWorkingSpy).toHaveBeenCalledWith(null);
  });
});
