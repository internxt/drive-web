import { CompleteAccountSetupPayload, RegisterResponse } from '@internxt/sdk/dist/auth/types';

export const getCompleteAccountSetupResponse = (
  payload: CompleteAccountSetupPayload,
  overrides: Partial<RegisterResponse> = {},
): RegisterResponse =>
  ({
    token: 'legacy-session-token',
    newToken: 'session-token',
    uuid: 'user-uuid',
    user: {
      uuid: 'user-uuid',
      userId: 'user-id',
      email: 'paid-user@internxt.com',
      name: payload.name,
      lastname: payload.lastname,
      mnemonic: payload.mnemonic,
      rootFolderId: 'root-folder-uuid',
      referralCode: 'referral-code',
      keys: {
        ecc: { publicKey: payload.keys.ecc.publicKey, privateKey: payload.keys.ecc.privateKeyEncrypted },
        kyber: {
          publicKey: payload.keys.kyber.publicKey ?? '',
          privateKey: payload.keys.kyber.privateKeyEncrypted ?? '',
        },
      },
    },
    ...overrides,
  }) as RegisterResponse;
