import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as opaque from '@serenity-kit/opaque';
import { describe, expect, it, vi } from 'vitest';
import { SdkFactory } from '../../core/factory/sdk';
import * as authOpaqueService from './auth.opaque';
import { v4 as uuidV4 } from 'uuid';
import { RegisterOpaqueDetails, UserKeys } from '@internxt/sdk';
import { decryptUserKeysAndMnemonic } from './auth.crypto';
import localStorageService from 'app/core/services/local-storage.service';
import { hash } from 'internxt-crypto';

function getMockUser(registerDetails: RegisterOpaqueDetails) {
  const mockUser: UserSettings = {
    uuid: 'mock-uuid',
    email: registerDetails.email,
    privateKey: registerDetails.keys.ecc.privateKey,
    mnemonic: registerDetails.mnemonic,
    userId: 'mock-userId',
    name: registerDetails.name,
    lastname: registerDetails.lastname,
    username: 'mock-username',
    bridgeUser: 'mock-bridgeUser',
    bucket: 'mock-bucket',
    backupsBucket: null,
    root_folder_id: 0,
    rootFolderId: 'mock-rootFolderId',
    rootFolderUuid: undefined,
    sharedWorkspace: false,
    credit: 0,
    publicKey: registerDetails.keys.ecc.publicKey,
    revocationKey: '',
    keys: registerDetails.keys,
    appSumoDetails: null,
    registerCompleted: false,
    hasReferralsProgram: false,
    createdAt: new Date(),
    avatar: null,
    emailVerified: false,
  };

  return mockUser;
}

describe('logIn', () => {
  it('opaque signUp, login, disable2FA and changePassword work', async () => {
    const mockTwoFactorCode = '123456';
    const serverSetup = opaque.server.createSetup();
    const registrationRecords = new Map<string, string>();
    const users = new Map<string, UserSettings>();
    const logedInUsers = new Map<string, { email: string; sessionKey: string }>();
    const serverLoginStates = new Map<string, string>();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockImplementation(() => {
        return {
          registerOpaqueStart: vi.fn().mockImplementation((email: string, registrationRequest: string) => {
            const { registrationResponse } = opaque.server.createRegistrationResponse({
              serverSetup,
              userIdentifier: email,
              registrationRequest,
            });

            return { signUpResponse: registrationResponse };
          }),

          registerOpaqueFinish: vi
            .fn()
            .mockImplementation(
              (registrationRecord: string, registerDetails: RegisterOpaqueDetails, startLoginRequest: string) => {
                const email = registerDetails.email;
                registrationRecords.set(email, registrationRecord);

                const { loginResponse, serverLoginState } = opaque.server.startLogin({
                  userIdentifier: email,
                  registrationRecord,
                  serverSetup,
                  startLoginRequest,
                });
                const user = getMockUser(registerDetails);
                users.set(email, user);

                serverLoginStates.set(email, serverLoginState);

                return { loginResponse };
              },
            ),

          loginOpaqueStart: vi
            .fn()
            .mockImplementation((email: string, startLoginRequest: string, twoFactorCode: string) => {
              if (twoFactorCode !== mockTwoFactorCode) {
                throw new Error('Two factor code is incorrect');
              }

              const { loginResponse, serverLoginState } = opaque.server.startLogin({
                userIdentifier: email,
                registrationRecord: registrationRecords.get(email),
                serverSetup,
                startLoginRequest,
              });

              serverLoginStates.set(email, serverLoginState);

              return { loginResponse };
            }),

          loginOpaqueFinish: vi.fn().mockImplementation((email: string, finishLoginRequest: string) => {
            const { sessionKey } = opaque.server.finishLogin({
              finishLoginRequest,
              serverLoginState: serverLoginStates.get(email) ?? '',
            });

            const user = users.get(email);
            if (!user) {
              throw new Error('User is not found');
            }
            const sessionID = uuidV4();

            logedInUsers.set(sessionID, { sessionKey, email });

            return { user, sessionID };
          }),
          disableTwoFactorAuth: vi
            .fn()
            .mockImplementation(async (mac: string, twoFactorCode: string, sessionID: string) => {
              if (twoFactorCode !== mockTwoFactorCode) {
                throw new Error('Two factor code is incorrect');
              }

              const record = logedInUsers.get(sessionID);
              if (!record?.sessionKey) {
                throw new Error('Session ID is incorrect');
              }

              const sessionKey = record.sessionKey;

              const correctMac = await hash.computeMac(sessionKey, [twoFactorCode, sessionID]);
              if (correctMac !== mac) {
                throw new Error('HMAC is incorrect');
              } else return true;
            }),
        };
      }),
      createUsersClient: vi.fn().mockImplementation(() => {
        return {
          changePwdOpaqueStart: vi
            .fn()
            .mockImplementation(async (mac: string, sessionID: string, registrationRequest: string) => {
              const record = logedInUsers.get(sessionID);
              if (!record?.sessionKey) {
                throw new Error('Session ID is incorrect');
              }

              const sessionKey = record.sessionKey;

              const correctMac = await hash.computeMac(sessionKey, [registrationRequest, sessionID]);
              if (correctMac !== mac) {
                throw new Error('HMAC is incorrect');
              }
              const email = record.email ?? '';

              const { registrationResponse } = opaque.server.createRegistrationResponse({
                serverSetup,
                userIdentifier: email,
                registrationRequest,
              });

              return { registrationResponse };
            }),
          changePwdOpaqueFinish: vi
            .fn()
            .mockImplementation(
              async (
                mac: string,
                sessionID: string,
                registrationRecord: string,
                encMnemonic: string,
                encKeys: UserKeys,
                startLoginRequest: string,
              ) => {
                const record = logedInUsers.get(sessionID);
                if (!record?.sessionKey) {
                  throw new Error('Session ID is incorrect');
                }

                const sessionKey = record.sessionKey;

                const correctMac = await hash.computeMac(sessionKey, [
                  registrationRecord,
                  encMnemonic,
                  JSON.stringify(encKeys),
                  startLoginRequest,
                ]);
                if (correctMac !== mac) {
                  throw new Error('HMAC is incorrect');
                }
                const email = record.email ?? '';

                if (correctMac !== mac) {
                  throw new Error('HMAC is incorrect');
                }

                const oldUser = users.get(email);
                if (!oldUser) {
                  throw new Error('No user found');
                }
                const newUser = {
                  ...oldUser,
                  encKeys,
                  encMnemonic,
                };

                users.set(email, newUser);
                registrationRecords.set(email, registrationRecord);

                const { loginResponse, serverLoginState } = opaque.server.startLogin({
                  userIdentifier: email,
                  registrationRecord,
                  serverSetup,
                  startLoginRequest,
                });

                serverLoginStates.set(email, serverLoginState);

                return { loginResponse };
              },
            ),
        };
      }),
    } as any);

    const mockEmail = 'test-email';
    const mockPassword = 'password123';
    const mockCaptcha = 'captcha';
    const mockReferrer = 'referrer';
    const mockReferral = 'referral';

    const { sessionKey: sessionKeySignup, exportKey: exportKeySignUp } = await authOpaqueService.signupOpaque(
      mockEmail,
      mockPassword,
      mockCaptcha,
      mockReferrer,
      mockReferral,
    );
    const {
      sessionKey: sessionKeyLogin,
      exportKey: exportKeyLogin,
      sessionID,
      user,
    } = await authOpaqueService.loginOpaque(mockEmail, mockPassword, mockTwoFactorCode);

    expect(sessionKeyLogin).not.toEqual(sessionKeySignup);
    expect(exportKeyLogin).toEqual(exportKeySignUp);

    const mockStorage = new Map();
    mockStorage.set('xNewToken', sessionID);

    const { keys, mnemonic } = await decryptUserKeysAndMnemonic(user.mnemonic, user.keys, exportKeyLogin);

    const clearUser = {
      ...user,
      mnemonic,
      privateKey: keys.ecc.privateKey,
      keys,
    };

    vi.spyOn(localStorageService, 'getUser').mockReturnValue(clearUser);
    vi.spyOn(localStorageService, 'set').mockImplementation((key, value) => {
      mockStorage.set(key, value);
    });
    vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
      return mockStorage.get(key);
    });

    await authOpaqueService.setSessionKey(mockPassword, sessionKeyLogin);
    const result = await authOpaqueService.deactivate2FAOpaque(mockPassword, mockTwoFactorCode);
    expect(result).toBeTruthy();

    const mockNewPassword = 'newPassword123';
    const {
      exportKey: exportKeyPwdChange,
      sessionID: sessionIdPwdChange,
      sessionKey: sessionKeyPwdChange,
    } = await authOpaqueService.doChangePasswordOpaque(mockNewPassword, mockPassword, sessionID);
    const {
      sessionKey: sessionKeyNewLogin,
      exportKey: exportKeyNewLogin,
      sessionID: newSessionID,
    } = await authOpaqueService.loginOpaque(mockEmail, mockNewPassword, mockTwoFactorCode);

    expect(sessionKeyLogin).not.toEqual(sessionKeyNewLogin);
    expect(newSessionID).not.toEqual(sessionID);
    expect(exportKeyNewLogin).not.toEqual(exportKeyLogin);

    expect(sessionKeyLogin).not.toEqual(sessionKeyPwdChange);
    expect(newSessionID).not.toEqual(sessionIdPwdChange);
    expect(exportKeyNewLogin).toEqual(exportKeyPwdChange);
  });
});
