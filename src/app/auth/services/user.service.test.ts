import { describe, it, expect, vi, beforeEach } from 'vitest';
import localStorageService from 'app/core/services/local-storage.service';
import userService from './user.service';

const testToken = 'testToken';
const testEmail = 'test@initnxt.com';

const usersClientMock = {
  initialize: vi.fn(),
  refreshUser: vi.fn(),
  getUserData: vi.fn(),
  updateUserProfile: vi.fn(),
  getFriendInvites: vi.fn(),
  //updateUserAvatar: vi.fn(),
  deleteUserAvatar: vi.fn(),
  sendVerificationEmail: vi.fn(),
  getPublicKeyByEmail: vi.fn(),
  preRegister: vi.fn(),
  changeUserEmail: vi.fn(),
  verifyEmailChange: vi.fn(),
  checkChangeEmailExpiration: vi.fn(),
};

const authClientMock = {
  sendUserDeactivationEmail: vi.fn(),
};

vi.spyOn(localStorageService, 'get').mockReturnValue(testToken);
vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createDesktopAuthClient: vi.fn(() => ({
        login: vi.fn(),
      })),
      createNewUsersClient: vi.fn(() => usersClientMock),
      createAuthClient: vi.fn(() => authClientMock),
      createUsersClient: vi.fn(() => usersClientMock),
    })),
    getInstance: vi.fn(() => ({
      createUsersClient: vi.fn(() => usersClientMock),
    })),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize a user', async () => {
    usersClientMock.initialize.mockResolvedValue({ success: true });
    const result = await userService.initializeUser(testEmail, 'mnemonic');
    expect(result).toEqual({ success: true });
    expect(usersClientMock.initialize).toHaveBeenCalledWith(testEmail, 'mnemonic');
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

  it('should refresh user data', async () => {
    usersClientMock.refreshUser.mockResolvedValue({ user: {}, token: 'newToken' });
    const result = await userService.refreshUser();
    expect(result).toEqual({ user: {}, token: 'newToken' });
    expect(usersClientMock.refreshUser).toHaveBeenCalled();
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

  it('should get friend invites', async () => {
    usersClientMock.getFriendInvites.mockResolvedValue([{ id: 1 }]);
    const result = await userService.getFriendInvites();
    expect(result).toEqual([{ id: 1 }]);
    expect(usersClientMock.getFriendInvites).toHaveBeenCalled();
  });

  /*it('should update user avatar', async () => {
    usersClientMock.updateUserAvatar.mockResolvedValue({ avatar: 'avatar-url' });
    const result = await userService.updateUserAvatar({ avatar: new Blob() });
    expect(result).toEqual({ avatar: 'avatar-url' });
    expect(usersClientMock.updateUserAvatar).toHaveBeenCalled();
  });*/

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
});
