import { CompleteAccountSetupPayload } from '@internxt/sdk/dist/auth/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { decryptText, decryptTextWithKey, passToHash } from 'app/crypto/services/utils';
import { planThunks } from 'app/store/slices/plan';
import { userThunks } from 'app/store/slices/user';
import { validateMnemonic } from 'bip39';
import { Buffer } from 'node:buffer';
import encryptedStorageService from 'services/encrypted-storage.service';
import envService from 'services/env.service';
import { getCompleteAccountSetupResponse } from 'testUtils/fixtures/accountSetup.fixtures';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { completeAccountSetup } from './completeAccountSetup';

const { authClient, createAuthClient } = vi.hoisted(() => {
  const authClient = { completeAccountSetup: vi.fn() };
  return { authClient, createAuthClient: vi.fn() };
});

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: () => ({ createAuthClient }) },
}));
vi.mock('services/encrypted-storage.service', () => ({
  default: { setToken: vi.fn(), getToken: vi.fn(), getUser: vi.fn(), clear: vi.fn() },
}));
vi.mock('services/local-storage.service', () => ({
  default: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));
vi.mock('app/store/slices/user', () => ({
  initializeUserThunk: vi.fn(),
  userThunks: { setUserThunk: vi.fn(), initializeUserThunk: vi.fn() },
}));
vi.mock('app/store/slices/plan', () => ({ planThunks: { initializeThunk: vi.fn() } }));
vi.mock('app/store/slices/workspaces/workspacesStore', () => ({
  workspaceThunks: { fetchWorkspaces: vi.fn(), checkAndSetLocalWorkspace: vi.fn() },
}));
vi.mock('services/navigation.service', () => ({ default: { push: vi.fn(), isCurrentPath: vi.fn() } }));
vi.mock('app/analytics/impact.service', () => ({ trackSignUp: vi.fn() }));
vi.mock('app/analytics/meta.service', () => ({ trackLead: vi.fn() }));

const SETUP_TOKEN = 'setup-token-from-email';
const PASSWORD = 'Correct-Horse-Battery-9!';
const CAPTCHA_TOKEN = 'captcha-token';

const sentPayload = (): CompleteAccountSetupPayload => authClient.completeAccountSetup.mock.calls[0][0];

describe('Completing the setup of a paid account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.Buffer = Buffer;
    globalThis.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: vi.fn().mockResolvedValue(CAPTCHA_TOKEN),
    } as never;
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => (key === 'secret' ? 'crypto-secret' : 'value'));
    createAuthClient.mockReturnValue(authClient);
    authClient.completeAccountSetup.mockImplementation(async (payload: CompleteAccountSetupPayload) =>
      getCompleteAccountSetupResponse(payload),
    );
  });

  test('When the account is set up, then the chosen password never leaves the browser in plain text', async () => {
    await completeAccountSetup({ setupToken: SETUP_TOKEN, password: PASSWORD, dispatch: vi.fn() });

    const payload = sentPayload();
    expect(JSON.stringify(payload)).not.toContain(PASSWORD);
    const salt = decryptText(payload.salt);
    expect(decryptText(payload.password)).toBe(passToHash({ password: PASSWORD, salt }).hash);
  });

  test('When the account is set up, then a new recovery phrase and key pair protected by the password are sent with the link token', async () => {
    await completeAccountSetup({ setupToken: SETUP_TOKEN, password: PASSWORD, dispatch: vi.fn() });

    const payload = sentPayload();
    expect(payload.token).toBe(SETUP_TOKEN);
    expect(payload).toMatchObject({ name: 'My', lastname: 'Internxt' });
    expect(validateMnemonic(decryptTextWithKey(payload.mnemonic, PASSWORD))).toBe(true);
    expect(Buffer.from(payload.keys.ecc.publicKey, 'base64').toString()).toContain('BEGIN PGP PUBLIC KEY');
    expect(payload.keys.kyber.publicKey).toBeTruthy();
    expect(createAuthClient).toHaveBeenCalledWith({ captchaToken: CAPTCHA_TOKEN });
  });

  test('When the account is set up, then the user is logged in with their decrypted keys and paid plan', async () => {
    const dispatch = vi.fn();

    const session = await completeAccountSetup({ setupToken: SETUP_TOKEN, password: PASSWORD, dispatch });

    expect(encryptedStorageService.setToken).toHaveBeenCalledWith('session-token');
    expect(validateMnemonic(session.mnemonic)).toBe(true);
    const loggedUser: UserSettings = vi.mocked(userThunks.setUserThunk).mock.calls[0][0];
    expect(loggedUser.mnemonic).toBe(session.mnemonic);
    expect(Buffer.from(loggedUser.keys.ecc.privateKey, 'base64').toString()).toContain('BEGIN PGP PRIVATE KEY');
    expect(planThunks.initializeThunk).toHaveBeenCalled();
  });

  test('When the link is rejected, then the error reaches the caller and nobody is logged in', async () => {
    const expiredLinkError = Object.assign(new Error('Token expired'), { status: 403 });
    authClient.completeAccountSetup.mockRejectedValue(expiredLinkError);

    await expect(completeAccountSetup({ setupToken: SETUP_TOKEN, password: PASSWORD, dispatch: vi.fn() })).rejects.toBe(
      expiredLinkError,
    );
    expect(encryptedStorageService.setToken).not.toHaveBeenCalled();
    expect(userThunks.setUserThunk).not.toHaveBeenCalled();
  });
});
