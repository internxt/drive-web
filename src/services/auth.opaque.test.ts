import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { server } from '@serenity-kit/opaque';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import * as authOpaqueService from './auth.opaque';
import { RegisterOpaqueDetails, UserKeys } from '@internxt/sdk';
import { decryptUserKeysAndMnemonic, safeBase64ToBytes } from './auth.crypto';
import localStorageService from 'app/core/services/local-storage.service';
import { computeMac } from 'internxt-crypto/hash';
import { base64ToUint8Array, generateID, uuidToBytes } from 'internxt-crypto/utils';

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
  const mockTwoFactorCode = '123456';
  const mockEmail = 'test-email';
  const mockPassword = 'password123';
  const mockCaptcha = 'captcha';
  const mockReferrer = 'referrer';
  const mockReferral = 'referral';

  beforeAll(() => {
    const serverSetup = server.createSetup();
    const registrationRecords = new Map<string, string>();
    const users = new Map<string, UserSettings>();
    const logedInUsers = new Map<string, { email: string; sessionKey: string }>();
    const serverLoginStates = new Map<string, string>();

    const mockLocalStorage = (() => {
      let store: Record<string, string> = {};

      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    mockLocalStorage.clear();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockImplementation(() => {
        return {
          registerOpaqueStart: vi.fn().mockImplementation((email: string, registrationRequest: string) => {
            const { registrationResponse } = server.createRegistrationResponse({
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

                const { loginResponse, serverLoginState } = server.startLogin({
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

              const { loginResponse, serverLoginState } = server.startLogin({
                userIdentifier: email,
                registrationRecord: registrationRecords.get(email),
                serverSetup,
                startLoginRequest,
              });

              serverLoginStates.set(email, serverLoginState);

              return { loginResponse };
            }),

          loginOpaqueFinish: vi.fn().mockImplementation((email: string, finishLoginRequest: string) => {
            const { sessionKey } = server.finishLogin({
              finishLoginRequest,
              serverLoginState: serverLoginStates.get(email) ?? '',
            });

            const user = users.get(email);
            if (!user) {
              throw new Error('User is not found');
            }
            const sessionID = generateID();

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
              const sessionKeyBytes = safeBase64ToBytes(sessionKey);

              const correctMac = computeMac(sessionKeyBytes, [Buffer.from(twoFactorCode), uuidToBytes(sessionID)]);
              if (correctMac === mac) {
                return true;
              } else throw new Error('HMAC is incorrect');
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
              const sessionKeyBytes = safeBase64ToBytes(sessionKey);
              const correctMac = computeMac(sessionKeyBytes, [
                safeBase64ToBytes(registrationRequest),
                uuidToBytes(sessionID),
              ]);
              if (correctMac !== mac) {
                throw new Error('HMAC is incorrect');
              }
              const email = record.email ?? '';

              const { registrationResponse } = server.createRegistrationResponse({
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

                const sessionKeyBytes = safeBase64ToBytes(sessionKey);
                const correctMac = computeMac(sessionKeyBytes, [
                  safeBase64ToBytes(registrationRecord),
                  base64ToUint8Array(encMnemonic),
                  base64ToUint8Array(encKeys.ecc.privateKey),
                  base64ToUint8Array(encKeys.ecc.publicKey),
                  base64ToUint8Array(encKeys.kyber.privateKey),
                  base64ToUint8Array(encKeys.kyber.publicKey),
                  safeBase64ToBytes(startLoginRequest),
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

                const { loginResponse, serverLoginState } = server.startLogin({
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
  });
  it('should successfully sign up', async () => {
    const { xUser, xNewToken, xToken, mnemonic } = await authOpaqueService.doSignUpOpaque(
      mockEmail,
      mockPassword,
      mockCaptcha,
    );
    expect(xUser).toBeDefined();
    expect(xNewToken).toBeDefined();
    expect(xToken).toBeDefined();
    expect(mnemonic).toBeDefined();
  });

  it('should successfully log in', async () => {
    const { user, newToken, token, mnemonic } = await authOpaqueService.doLoginOpaque(
      mockEmail,
      mockPassword,
      mockTwoFactorCode,
    );
    expect(user).toBeDefined();
    expect(newToken).toBeDefined();
    expect(token).toBeDefined();
    expect(mnemonic).toBeDefined();
  });

  let sessionKeyTest, sessionIdTest, exportKeyTest: string;
  it('should successfully sign up and then log in', async () => {
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

    localStorageService.set('xNewToken', sessionID);

    const { keys, mnemonic } = await decryptUserKeysAndMnemonic(user.mnemonic, user.keys, exportKeyLogin);

    const clearUser = {
      ...user,
      mnemonic,
      privateKey: keys.ecc.privateKey,
      keys,
    };

    localStorageService.set('xUser', JSON.stringify(clearUser));
    sessionKeyTest = sessionKeyLogin;
    exportKeyTest = exportKeyLogin;
    sessionIdTest = sessionID;

    await authOpaqueService.setSessionKey(mockPassword, sessionKeyLogin);

    expect(sessionKeyLogin).not.toEqual(sessionKeySignup);
    expect(exportKeyLogin).toEqual(exportKeySignUp);
  });

  it('should not log in with a wrong passwor or 2FA code', async () => {
    await expect(authOpaqueService.loginOpaque(mockEmail, 'wrong pwd', mockTwoFactorCode)).rejects.toThrow(
      'Login failed',
    );

    await expect(authOpaqueService.loginOpaque(mockEmail, mockPassword, 'wrong 2FA code')).rejects.toThrow(
      'Two factor code is incorrect',
    );
  });

  it('should successfully deactivate 2FA verification', async () => {
    const result = await authOpaqueService.deactivate2FAOpaque(mockPassword, mockTwoFactorCode);
    expect(result).toBeTruthy();
  });

  it('should not deactivate 2FA verification with a wrong 2FA code', async () => {
    expect(authOpaqueService.deactivate2FAOpaque(mockPassword, 'wrong 2FA code')).rejects.toThrow(
      'Two factor code is incorrect',
    );
  });

  it('should change the password and then successfully log in with the new password', async () => {
    const mockNewPassword = 'newPassword123';
    const {
      exportKey: exportKeyPwdChange,
      sessionID: sessionIdPwdChange,
      sessionKey: sessionKeyPwdChange,
    } = await authOpaqueService.doChangePasswordOpaque(mockNewPassword, mockPassword, sessionIdTest);
    const {
      sessionKey: sessionKeyNewLogin,
      exportKey: exportKeyNewLogin,
      sessionID: newSessionID,
    } = await authOpaqueService.loginOpaque(mockEmail, mockNewPassword, mockTwoFactorCode);

    expect(sessionKeyTest).not.toEqual(sessionKeyNewLogin);
    expect(newSessionID).not.toEqual(sessionIdTest);
    expect(exportKeyNewLogin).not.toEqual(exportKeyTest);

    expect(sessionKeyTest).not.toEqual(sessionKeyPwdChange);
    expect(newSessionID).not.toEqual(sessionIdPwdChange);
    expect(exportKeyNewLogin).toEqual(exportKeyPwdChange);
  });
});
